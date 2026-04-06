# Phase 1: Security Foundation - Research

**Researched:** 2026-04-06
**Domain:** Node.js/Express security hardening, data reliability, contact data cleanup
**Confidence:** HIGH

## Summary

Phase 1 addresses 8 security requirements (SEC-01 through SEC-08) that eliminate critical vulnerabilities in the Timur.Shop codebase. The codebase currently has a hardcoded admin password fallback (`'timur2024'`), allows SVG uploads (stored XSS vector), writes JSON data non-atomically (corruption risk on crash), has zero backup strategy, uses placeholder contacts, lacks security headers, has no response compression, and rate-limits only the login endpoint. All 8 fixes are localized to `server.js` (primary), HTML files (contacts), and `.gitignore` (backup directory).

The implementation requires 3 new npm packages (`helmet`, `compression`, `express-rate-limit`) — all verified compatible with Express 5.2.1 and following the project's `var`/`function` coding convention. No database changes, no new HTML pages, no client-side framework changes.

**Primary recommendation:** Execute changes in server.js in dependency order — (1) install packages, (2) env var enforcement, (3) SVG removal, (4) atomic writes, (5) backups, (6) helmet/compression/rate-limit middleware, (7) HTML contacts. This order ensures each step builds on a stable foundation.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | Remove hardcoded password fallback, require ADMIN_PASSWORD env var, server exits without it | server.js:105 verified — `process.env.ADMIN_PASSWORD \|\| 'timur2024'`. Replace with exit-on-missing pattern. |
| SEC-02 | Remove SVG from allowed upload formats to prevent stored XSS | server.js:31 verified — `.svg` in ALLOWED_IMAGE_EXT array. Single-element removal. |
| SEC-03 | Atomic JSON writes (write to temp file → rename) for all data files | server.js:75-77, 216-218 verified — direct `fs.writeFileSync`. Replace with temp-file-rename pattern. |
| SEC-04 | Automatic backups of data/ files with rotation | No backup mechanism exists. Implement startup + interval backup with rotation via `fs.copyFileSync`. |
| SEC-05 | Replace fake contacts (+7999000000, href="#") with real ones | 12 locations across 4 HTML files verified. **BLOCKER: Real contact details needed from owner.** |
| SEC-06 | Security headers via helmet (CSP non-strict, X-Content-Type-Options, X-Frame-Options) | helmet@8.1.0 verified. CSP disabled initially due to CDN scripts + inline handlers. |
| SEC-07 | Gzip compression via express compression middleware | compression@1.8.1 verified. Single `app.use(compression())` line. |
| SEC-08 | Rate limiting on all API endpoints via express-rate-limit | express-rate-limit@8.3.2 verified. Replace in-memory `loginAttempts` object. Apply tiered limits. |
</phase_requirements>

## Standard Stack

### Core (existing — unchanged)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `express` | ^5.2.1 | HTTP server, REST API | Project backbone, already in use |
| `multer` | ^1.4.4 | File upload handling | Already in use, works with Express 5 |

### New Dependencies (3 packages)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `helmet` | ^8.1.0 | Security HTTP headers | Industry standard for Express security. 12+ headers in one call. No Express peer dep — works with any Connect-style middleware. [VERIFIED: npm registry] |
| `compression` | ^1.8.1 | Gzip/deflate response compression | Maintained by expressjs organization. Zero config needed. Reduces bandwidth ~60%. [VERIFIED: npm registry] |
| `express-rate-limit` | ^8.3.2 | API rate limiting | De facto standard for Express. Peer dep `express >= 4.11` — compatible with Express 5. Replaces buggy in-memory limiter. [VERIFIED: npm registry] |

### Built-in Modules Used (no install needed)
| Module | Purpose |
|--------|---------|
| `fs` | `writeFileSync`, `renameSync`, `copyFileSync`, `existsSync`, `mkdirSync`, `unlinkSync` |
| `path` | `join`, `extname`, `basename` |
| `crypto` | `randomBytes` (existing token generation) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `helmet` | Manual `res.setHeader()` calls | Helmet handles 13 headers with correct defaults — manual approach is error-prone and verbose |
| `compression` | Nginx reverse proxy compression | Valid for production, but compression middleware works immediately without infrastructure changes |
| `express-rate-limit` | Custom rate limiter (current) | Current limiter has memory leak (no cleanup), login-only, no standard headers. express-rate-limit is battle-tested. |
| `express-rate-limit` | `rate-limiter-flexible` | Overkill for single-process Node — needed only for Redis/cluster scenarios |

**Installation:**
```bash
npm install helmet@^8.1.0 compression@^1.8.1 express-rate-limit@^8.3.2
```

**Version verification (2026-04-06):**
- `helmet` — 8.1.0 [VERIFIED: npm registry, checked today]
- `compression` — 1.8.1 [VERIFIED: npm registry, checked today]
- `express-rate-limit` — 8.3.2 [VERIFIED: npm registry, checked today]

## Architecture Patterns

### Current server.js Middleware Pipeline (before Phase 1)
```
express.json()             → Parse JSON bodies
express.static(__dirname)  → Serve HTML/CSS/JS (blocks server.js, package.json)
express.static('/data')    → Block data directory access (404)
[route handlers]           → No security headers, no compression, no global rate limit
```

### Target Middleware Pipeline (after Phase 1)
```
helmet({...})              → Security headers (CSP disabled)
compression()              → Gzip responses
express.json()             → Parse JSON bodies
express.static(...)        → Serve static files
rateLimit(apiLimiter)      → /api/* rate limiting (200 req/15min)
rateLimit(loginLimiter)    → /api/login rate limiting (5 req/15min)
[route handlers]           → With adminAuth, atomic writes, backups
```

**Middleware order matters.** Helmet and compression must be registered BEFORE route handlers but AFTER `express.json()` for correct behavior. [ASSUMED — standard Express middleware ordering]

### Pattern 1: Atomic JSON Write
**What:** Write data to temp file, then atomically rename to target
**When to use:** Every `writeProducts()`, `writeSiteData()` call
**Why:** If server crashes during `writeFileSync`, the temp file is corrupted but the original data file remains intact
```javascript
function writeProducts(products) {
    var tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(products, null, 2), 'utf-8');
    fs.renameSync(tmp, DATA_FILE);
}
```
**Platform note:** `fs.renameSync` is atomic on POSIX (Linux — production target). On Windows/NTFS it is NOT atomic but still provides crash protection (original file intact until rename completes). [CITED: Node.js fs docs — "On POSIX systems, rename is atomic"]

### Pattern 2: Tiered Rate Limiting
**What:** Different rate limits for different endpoint types
**When to use:** Login (strict), general API (moderate)
```javascript
var apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много запросов' }
});

var loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много попыток. Попробуйте позже' }
});
```
**Key:** `standardHeaders: true` sends `X-RateLimit-*` headers (recommended). `legacyHeaders: false` removes deprecated `X-RateLimit-Limit` style headers. [CITED: express-rate-limit README]

### Pattern 3: Backup with Rotation
**What:** Copy JSON files to timestamped backups, delete oldest beyond limit
**When to use:** Server startup + periodic interval
```javascript
var BACKUP_DIR = path.join(__dirname, 'data', 'backups');
var MAX_BACKUPS = 10;

function createBackup() {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    var ts = new Date().toISOString().replace(/[:.]/g, '-');
    [DATA_FILE, SITE_DATA_FILE].forEach(function(f) {
        if (fs.existsSync(f)) {
            fs.copyFileSync(f, path.join(BACKUP_DIR, path.basename(f, '.json') + '-' + ts + '.json'));
        }
    });
    cleanOldBackups();
}

function cleanOldBackups() {
    var files = fs.readdirSync(BACKUP_DIR).filter(function(f) { return f.endsWith('.json'); });
    files.sort();
    while (files.length > MAX_BACKUPS) {
        fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
    }
}
```

### Anti-Patterns to Avoid
- **Don't enable helmet CSP yet:** The site uses CDN scripts (Swiper from jsdelivr, Lenis from unpkg), inline `onclick` handlers, and inline `<script>` blocks. CSP `script-src 'self'` will break everything. Disable CSP in Phase 1, tighten in future phase.
- **Don't refactor `const` to `var` in server.js:** Lines 1-12 use `const`. AGENTS.md says `var`, but refactoring existing working code is out of scope for this phase. New code uses `var`.
- **Don't touch the admin.html `href="#"` logout link:** `admin.html:57` has `<a href="#" onclick="logout()">`. This is a standard JS-action link, NOT a fake contact — do not flag it as SEC-05.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Security headers | Manual `res.setHeader()` for each header | `helmet` | 13+ headers with correct defaults, handles edge cases (HSTS preload, CSP directives) |
| Response compression | Custom gzip transform stream | `compression` middleware | Handles content-type negotiation, chunked encoding, threshold — 1 line vs 50+ |
| Rate limiting | Custom in-memory counter object | `express-rate-limit` | Current `loginAttempts` object has memory leak (no cleanup). Library handles window sliding, header generation, automatic cleanup. |
| Atomic file writes | `write-file-atomic` npm package | `fs.writeFileSync` + `fs.renameSync` | 3-line implementation. No dependency needed for this simple pattern. |

## Runtime State Inventory

> This phase is a security hardening phase (not rename/refactor/migration), but changes affect runtime behavior.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `data/products.json` (7.8KB), `data/site-data.json` (549B) | Atomic writes protect these. Backups copy these. No data migration. |
| Live service config | None — no external services configured | — |
| OS-registered state | None — no systemd/PM2/task scheduler | — |
| Secrets/env vars | `ADMIN_PASSWORD` (currently optional with fallback) | Must be set before server starts after SEC-01. **Owner must configure this.** |
| Build artifacts | `node_modules/` — will need `npm install` for 3 new packages | Run `npm install` after code changes |

**New files created during this phase:**
- `data/backups/` directory — auto-created by backup function
- `data/*.tmp` files — transient, created during atomic writes, renamed to final

## Common Pitfalls

### Pitfall 1: Helmet CSP Breaks the Site
**What goes wrong:** Enabling helmet with default CSP blocks CDN scripts (Swiper, Lenis) and inline event handlers (`onclick`)
**Why it happens:** Helmet's default `contentSecurityPolicy` sets `script-src 'self'` and `script-src-attr 'none'`
**How to avoid:** Explicitly disable CSP: `helmet({ contentSecurityPolicy: false })`. Get the other 12+ headers.
**Warning signs:** Browser console shows "Refused to load the script" or "Refused to execute inline script"

### Pitfall 2: Server Crashes on Startup Without ADMIN_PASSWORD
**What goes wrong:** After SEC-01, `npm start` crashes immediately if `ADMIN_PASSWORD` is not set in environment
**Why it happens:** `process.exit(1)` is called before `app.listen()`
**How to avoid:** This is INTENDED behavior. Document clearly. Add `.env.example` or startup message: "Set ADMIN_PASSWORD environment variable before starting"
**Warning signs:** "Error: ADMIN_PASSWORD не задан" in console

### Pitfall 3: Windows Atomic Rename Not Truly Atomic
**What goes wrong:** `fs.renameSync` on NTFS (Windows dev machine) is not atomic — if crash occurs during rename, both files could be in inconsistent state
**Why it happens:** NTFS rename is not an atomic operation unlike POSIX
**How to avoid:** This is acceptable for development. Production runs on Linux (POSIX). The temp-file pattern still provides crash protection on Windows (original file intact until rename completes)
**Warning signs:** If `.tmp` files accumulate in `data/`, a rename failed

### Pitfall 4: Rate Limiter Blocks Legitimate Admin Work
**What goes wrong:** Admin editing multiple products quickly hits the 200 req/15min limit
**Why it happens:** Each admin CRUD operation is an API request
**How to avoid:** 200 requests per 15 minutes is generous for a single-admin store. If needed, exclude authenticated routes or increase limit for admin endpoints
**Warning signs:** Admin sees "Слишком много запросов" toast during normal work

### Pitfall 5: Forgetting to Update .gitignore for Backups
**What goes wrong:** `data/backups/` directory with timestamped JSON copies gets committed to git
**Why it happens:** `.gitignore` has `data/products.json` but no entry for backup directory
**How to avoid:** Add `data/backups/` to `.gitignore`
**Warning signs:** `git status` shows `data/backups/*.json` files

### Pitfall 6: Backup Directory Fills Disk
**What goes wrong:** If `cleanOldBackups()` has a bug, backups accumulate indefinitely
**Why it happens:** Rotation logic failure, or `MAX_BACKUPS` set too high
**How to avoid:** Keep `MAX_BACKUPS` at 10 (reasonable for ~8KB files = ~80KB total). Test rotation logic.
**Warning signs:** `data/backups/` contains 50+ files

## Code Examples

### SEC-01: Admin Password Enforcement (server.js)
```javascript
// Replace line 105:
//   var adminPassword = process.env.ADMIN_PASSWORD || 'timur2024';
// With:
var adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
    console.error('ОШИБКА: Задайте переменную окружения ADMIN_PASSWORD');
    console.error('Пример: ADMIN_PASSWORD=your_password npm start');
    process.exit(1);
}
```
[Source: verified in server.js:105]

### SEC-02: SVG Removal (server.js)
```javascript
// Replace line 31:
//   var ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
// With:
var ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
```
[Source: verified in server.js:31]

### SEC-03: Atomic Writes (server.js)
```javascript
// Replace writeProducts (line 75-77):
function writeProducts(products) {
    var tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(products, null, 2), 'utf-8');
    fs.renameSync(tmp, DATA_FILE);
}

// Replace writeSiteData (line 216-218):
function writeSiteData(data) {
    var tmp = SITE_DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, SITE_DATA_FILE);
}
```
[Source: pattern from STACK.md research, verified against Node.js fs docs]

### SEC-04: Backup System (server.js — new code block)
```javascript
var BACKUP_DIR = path.join(__dirname, 'data', 'backups');
var MAX_BACKUPS = 10;

function createBackup() {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    var ts = new Date().toISOString().replace(/[:.]/g, '-');
    var files = [DATA_FILE, SITE_DATA_FILE];
    files.forEach(function(f) {
        if (fs.existsSync(f)) {
            fs.copyFileSync(f, path.join(BACKUP_DIR, path.basename(f, '.json') + '-' + ts + '.json'));
        }
    });
    cleanOldBackups();
}

function cleanOldBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return;
    var files = fs.readdirSync(BACKUP_DIR).filter(function(f) { return f.endsWith('.json'); });
    files.sort();
    while (files.length > MAX_BACKUPS) {
        fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
    }
}

// In app.listen callback:
createBackup();
setInterval(createBackup, 6 * 60 * 60 * 1000);
```
[Source: pattern from STACK.md research]

### SEC-06: Helmet Configuration (server.js)
```javascript
var helmet = require('helmet');
app.use(helmet({
    contentSecurityPolicy: false
}));
```
[Source: helmet README, verified via npm registry. CSP disabled per STACK.md recommendation]

### SEC-07: Compression (server.js)
```javascript
var compression = require('compression');
app.use(compression());
```
[Source: compression README, verified via npm registry]

### SEC-08: Rate Limiting (server.js)
```javascript
var rateLimit = require('express-rate-limit');

var apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много запросов' }
});

var loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много попыток. Попробуйте позже' }
});

// Apply BEFORE route definitions:
app.use('/api/login', loginLimiter);
app.use('/api', apiLimiter);

// DELETE the old rate limit code (lines 21-23, 95-102):
// var loginAttempts = {};
// var LOGIN_LIMIT = 5;
// var LOGIN_WINDOW = 15 * 60 * 1000;
// ... and the inline rate limit logic in POST /api/login
```
[Source: express-rate-limit README, verified via npm registry]

### SEC-05: Contact Replacement Map

**Files and exact locations that need real contact data:**

| File | Line | Current Value | Type |
|------|------|---------------|------|
| `index.html` | 32 | `"telephone": "+7-999-000-00-00"` | Schema.org JSON-LD |
| `index.html` | 66 | `href="tel:+79990000000"` | Header phone link |
| `index.html` | 79 | `href="https://wa.me/79990000000?text=..."` | Hero WhatsApp button |
| `index.html` | 276 | `href="https://wa.me/79990000000?text=..."` | CTA WhatsApp button |
| `index.html` | 310 | `href="tel:+79990000000"` + text `+7 (999) 000-00-00` | Footer phone |
| `index.html` | 311 | `href="https://wa.me/79990000000"` | Footer WhatsApp |
| `index.html` | 313 | `<a href="#">@timur.shop</a>` | Footer Instagram |
| `about.html` | 162 | `href="tel:+79990000000"` + text | Contacts section phone |
| `about.html` | 167 | `<a href="#">@timur.shop</a>` | Contacts section Instagram |
| `cart.html` | 237 | `var myPhone = '79990000000';` | JS variable for WhatsApp |
| `cart.html` | 250 | `var myUsername = 'timur_shop';` | JS variable for Telegram |
| `reviews.html` | 247 | `var myPhone = '79990000000';` | JS variable for WhatsApp |

**NOTE:** `admin.html:57` has `href="#"` for logout — this is a JS action link, NOT a fake contact. Leave it alone.

**BLOCKER: Real contact details needed from owner before SEC-05 can be completed:**
- Real phone number (format: `7XXXXXXXXXX` for WhatsApp links)
- Real phone display text (format: `+7 (XXX) XXX-XX-XX`)
- Real Telegram username (current: `timur_shop` — may be correct?)
- Real Instagram handle (or decide to remove Instagram link entirely)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual security headers | `helmet` middleware | helmet since 2014, v8.x current | One call vs 13 manual headers |
| In-memory rate limiter | `express-rate-limit` v8.x | v7+ uses `X-RateLimit-*` standard headers | Proper window sliding, no memory leaks |
| Direct `fs.writeFileSync` | Temp file + `fs.renameSync` | Well-established pattern | Crash-safe data persistence |
| No backups | Startup + interval backups with rotation | — | Data loss prevention |

**Deprecated/outdated:**
- Helmet's `contentSecurityPolicy: true` default: Should be explicitly disabled when site uses CDN scripts and inline handlers (our case)
- `express-rate-limit` v6 `legacyHeaders: true` default: v7+ changed to `false` — explicitly set both for clarity

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Production server runs on Linux (POSIX), making `fs.renameSync` atomic | Architecture Patterns | Medium — if deployed on Windows, atomic guarantee doesn't hold, but crash protection still works |
| A2 | Telegram username `timur_shop` is correct (appears in footer links) | SEC-05 | Low — if wrong, Telegram links break |
| A3 | 200 req/15min is sufficient for normal API usage by single admin | Pitfall 4 | Low — can increase limit if admin hits it |
| A4 | Helmet with CSP disabled provides meaningful security improvement | SEC-06 | Low — even without CSP, other 12 headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.) are valuable |
| A5 | `compression()` works correctly with Express 5 static middleware | SEC-07 | Low — maintained by same expressjs org, widely used |
| A6 | Owner will provide real contact details before/during SEC-05 implementation | SEC-05 | High — without real contacts, SEC-05 cannot be completed |

## Open Questions

1. **Real contact details for SEC-05**
   - What we know: 12 locations across 4 HTML files use fake `+7999000000`, `href="#"`, `@timur.shop`
   - What's unclear: The actual phone number, Telegram username, and Instagram handle
   - Recommendation: Ask owner before starting SEC-05. If unavailable, create a config object in `common.js` with placeholders and document required values, or defer SEC-05 to after owner provides details.

2. **Should `data/backups/` be added to `.gitignore`?**
   - What we know: `.gitignore` has `data/products.json` but no backup dir entry
   - What's unclear: Whether backups should be versioned
   - Recommendation: Add `data/backups/` to `.gitignore` — backups are runtime artifacts, not source code

3. **Should `data/site-data.json` also be in `.gitignore`?**
   - What we know: Only `data/products.json` is gitignored, `site-data.json` is tracked
   - What's unclear: Whether video URLs are "content" or "config"
   - Recommendation: Don't change — out of scope for Phase 1

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Server runtime | ✓ | v20.20.1 | — |
| npm | Package installation | ✓ | 10.8.2 | — |
| express | Server framework | ✓ | 5.2.1 (installed) | — |
| multer | File uploads | ✓ | 1.4.4 (installed) | — |
| helmet | Security headers | ✗ | — | `npm install` (has network) |
| compression | Response compression | ✗ | — | `npm install` (has network) |
| express-rate-limit | Rate limiting | ✗ | — | `npm install` (has network) |

**Missing dependencies with no fallback:**
- `helmet`, `compression`, `express-rate-limit` — must be installed via `npm install` before server can start with Phase 1 changes. All 3 are npm packages with no built-in alternative.

**Missing dependencies with fallback:**
- None — all missing deps are required for their respective SEC requirements

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test framework installed |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Server exits without ADMIN_PASSWORD env var | unit | Manual: `node server.js` should exit with code 1 | ❌ Wave 0 |
| SEC-02 | SVG files rejected by upload filter | unit | Manual: attempt upload of `.svg` file via admin | ❌ Wave 0 |
| SEC-03 | Atomic writes produce valid JSON after temp-rename | unit | Manual: create/edit product, verify data integrity | ❌ Wave 0 |
| SEC-04 | Backup created on startup, rotated after MAX_BACKUPS | unit | Manual: start server, check `data/backups/` contents | ❌ Wave 0 |
| SEC-05 | No fake contacts in HTML files | manual | Grep for `7999000000`, `href="#"` (excluding admin logout) | ❌ Wave 0 |
| SEC-06 | Security headers present in responses | unit | Manual: `curl -I http://localhost:3000` check headers | ❌ Wave 0 |
| SEC-07 | Responses compressed with gzip | unit | Manual: `curl -H "Accept-Encoding: gzip" -I http://localhost:3000/api/products` | ❌ Wave 0 |
| SEC-08 | Rate limiting active on API endpoints | unit | Manual: send 200+ requests, check 429 response | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Manual verification of changed behavior
- **Per wave merge:** Manual full checklist
- **Phase gate:** All 8 requirements verified manually

### Wave 0 Gaps
- [ ] No test framework exists — manual testing required for all SEC requirements
- [ ] No automated CI/CD — all validation is local manual testing
- [ ] No `curl` or HTTP test script for header/rate-limit verification

**Recommendation:** Phase 1 relies on manual verification. Adding a test framework is valuable but out of scope for this security-critical phase. Phase 2+ should introduce vitest for API testing.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | ADMIN_PASSWORD env var enforcement (SEC-01) |
| V3 Session Management | partial | Token unchanged — session expiry deferred |
| V4 Access Control | yes | Bearer token auth unchanged — rate limiting added (SEC-08) |
| V5 Input Validation | yes | SVG removed from whitelist (SEC-02) |
| V6 Cryptography | no | No crypto changes in this phase |
| V7 Error Handling | no | No changes to error handling |
| V8 Data Protection | yes | Atomic writes (SEC-03), backups (SEC-04) |
| V9 Communication | yes | Security headers via helmet (SEC-06), TLS via HSTS header |

### Known Threat Patterns for Node.js/Express Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via SVG upload | Tampering, Elevation | Remove SVG from allowed extensions (SEC-02) |
| Brute force login | Denial of Service | Rate limiting on login endpoint (SEC-08) |
| Data corruption on crash | Denial of Service | Atomic file writes (SEC-03) |
| Data loss (no backups) | Denial of Service | Automatic backups with rotation (SEC-04) |
| Clickjacking | Spoofing | X-Frame-Options via helmet (SEC-06) |
| MIME sniffing | Tampering | X-Content-Type-Options: nosniff via helmet (SEC-06) |
| Info disclosure (X-Powered-By) | Information Disclosure | Removed by helmet (SEC-06) |
| Credential exposure in source | Information Disclosure | Remove hardcoded password (SEC-01) |
| API abuse / scraping | Denial of Service | Rate limiting on all endpoints (SEC-08) |

## Project Constraints (from AGENTS.md)

These directives must be followed during implementation:

1. **Use `var` not `const`/`let`** — all new code uses `var` declarations
2. **Use `function` declarations** — no arrow functions
3. **No template literals** — use string concatenation (`+`)
4. **No ES modules on client** — CommonJS on server only
5. **No comments in code** — unless explicitly requested
6. **No new npm dependencies without explicit request** — helmet, compression, express-rate-limit were pre-approved in project research
7. **Styles in `style.css` only** — no inline styles (existing inline styles untouched)
8. **Client JS in `script.js` or inline** — no new JS files without request
9. **Don't touch `data/` files directly** — only through API (except backup system which copies them)
10. **Russian for all user-facing strings** — error messages, console output
11. **Don't commit without explicit request** — no auto-commits
12. **Use `escapeHtml()` for any user input** — existing pattern continues

## Sources

### Primary (HIGH confidence)
- npm registry — verified versions: helmet@8.1.0, compression@1.8.1, express-rate-limit@8.3.2
- server.js — direct code inspection, 287 lines analyzed
- All 11 HTML files — grep search for contact patterns
- .gitignore — verified current exclusions
- package.json — verified current dependencies (express@5.2.1, multer@1.4.4)
- Node.js v20.20.1 runtime — verified available
- STACK.md — prior project research with Express 5 compatibility notes

### Secondary (MEDIUM confidence)
- helmet README/GitHub — CSP configuration, default directives
- express-rate-limit README — API, standardHeaders option
- compression README — expressjs org maintained

### Tertiary (LOW confidence)
- None — all findings verified against code or registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all 3 package versions verified via npm registry today
- Architecture: HIGH — middleware order well-documented, pipeline verified against server.js
- Pitfalls: HIGH — helmet CSP break is a well-known gotcha, verified against actual CDN usage in codebase
- Contacts: HIGH — all 12 locations verified via grep across all HTML files
- Atomic writes: MEDIUM — pattern is well-established, but Windows atomicity caveat applies

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable libraries, unlikely to change significantly)

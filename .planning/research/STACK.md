# Technology Stack — Order Management, Reviews & Security Milestone

**Project:** Timur.Shop (brownfield enhancement)
**Researched:** 2026-04-06
**Mode:** Ecosystem (stack dimension for new capabilities)

---

## Current State (Unchanged)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | HTTP server, REST API, static files |
| `multer` | ^1.4.4 | File upload handling |

**No changes to existing stack.** Express 5 and Multer stay as-is.

---

## New npm Dependencies (3 packages)

### 1. `helmet` — Security Headers

| Field | Value |
|-------|-------|
| **Recommended version** | `^8.1.0` |
| **Confidence** | HIGH — verified via npm registry (latest: 8.1.0) |
| **Why** | Sets 13 security HTTP headers in one line: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc. Without it, the site has zero security headers. |
| **Express 5 compat** | YES — helmet has no Express peer dependency, works with any Connect-style middleware stack. Uses CJS export (`require('helmet')`) |

**Critical configuration for this project:**

Helmet's default Content-Security-Policy will **break** the site because:
- `script-src 'self'` blocks CDN scripts (Swiper from jsdelivr, Lenis from unpkg)
- `script-src-attr 'none'` blocks all inline `onclick` handlers (used heavily in the codebase)
- `style-src 'self' https: 'unsafe-inline'` allows CDN styles but is permissive

**Recommended approach — two phases:**

Phase 1 (this milestone): Enable helmet with CSP disabled, get other 12 headers:
```javascript
var helmet = require('helmet');
app.use(helmet({
    contentSecurityPolicy: false
}));
```

Phase 2 (future): After localizing CDN scripts and removing inline handlers, tighten CSP:
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            objectSrc: ["'none'"]
        }
    }
}));
```

**What helmet fixes from CONCERNS.md:**
- Removes `X-Powered-By: Express` header (info leak)
- Sets `X-Content-Type-Options: nosniff` (MIME sniffing protection)
- Sets `X-Frame-Options: SAMEORIGIN` (clickjacking protection)
- Sets `Strict-Transport-Security` (HSTS — HTTPS enforcement)
- Sets `Referrer-Policy: no-referrer` (privacy)

---

### 2. `compression` — Response Compression

| Field | Value |
|-------|-------|
| **Recommended version** | `^1.8.1` |
| **Confidence** | HIGH — verified via npm registry (latest: 1.8.1), maintained by expressjs organization |
| **Why** | Adds gzip/deflate compression to all responses. `style.css` (~35KB) compresses to ~8KB. JSON product data compresses 60-70%. Zero configuration needed. |
| **Express 5 compat** | YES — maintained by the same expressjs team, CJS export, standard middleware |

**Implementation — one line:**
```javascript
var compression = require('compression');
app.use(compression());
```

**Why this matters:** Currently every page load fetches uncompressed CSS (35KB), JS (~50KB combined), and JSON. With compression, total bandwidth drops ~60%. On mobile connections in Russia (where the site operates), this directly improves load time.

**Note:** Express 5 added built-in Brotli *acceptance* support, but NOT response compression. The `compression` middleware is still required for gzipping responses.

---

### 3. `express-rate-limit` — Rate Limiting

| Field | Value |
|-------|-------|
| **Recommended version** | `^8.3.2` |
| **Confidence** | HIGH — verified via npm registry (latest: 8.3.2), peer dependency `"express": ">= 4.11"` |
| **Why** | Replaces the buggy in-memory rate limiter (memory leak, no cleanup, login-only). Provides proper sliding window, standard `X-RateLimit-*` headers, automatic cleanup, configurable per-endpoint. |
| **Express 5 compat** | YES — peer dependency explicitly supports `express >= 4.11`, includes CJS export |

**Implementation:**
```javascript
var rateLimit = require('express-rate-limit');

// General API rate limit — 200 requests per 15 minutes
var apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много запросов' }
});

// Login rate limit — 5 attempts per 15 minutes (replaces current buggy implementation)
var loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много попыток. Попробуйте позже' }
});

// Order creation rate limit — 10 orders per hour (spam protection)
var orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много заказов. Попробуйте позже' }
});

app.use('/api/login', loginLimiter);
app.use('/api/orders', orderLimiter);
app.use('/api', apiLimiter);
```

**This replaces:** The existing `loginAttempts` object in `server.js` (lines 21-23) which has a memory leak (never cleaned up old IPs). Delete ~10 lines, replace with 3 `rateLimit()` calls.

---

## Built-in Alternatives (No New Packages)

These capabilities are built using Node.js built-in modules only. No new npm packages needed.

### Token Expiry — Custom Implementation (replaces `jsonwebtoken`)

**Why NOT `jsonwebtoken`:** This project has a single admin user, no user registration, no third-party auth. JWT adds complexity (secret management, decoding, payload validation) for a case where a simple timestamp check suffices.

**Implementation:**
```javascript
var adminSession = {
    token: crypto.randomBytes(32).toString('hex'),
    createdAt: Date.now()
};

var SESSION_TTL = 4 * 60 * 60 * 1000; // 4 hours

function adminAuth(req, res, next) {
    var token = req.headers['authorization'];
    if (!token || token !== 'Bearer ' + adminSession.token) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    if (Date.now() - adminSession.createdAt > SESSION_TTL) {
        adminSession.token = null; // Force re-login
        return res.status(401).json({ error: 'Сессия истекла. Войдите заново' });
    }
    next();
}

// Login endpoint: generate fresh token each time
app.post('/api/login', loginLimiter, function (req, res) {
    var pass = req.body.password;
    var adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        return res.status(500).json({ error: 'ADMIN_PASSWORD не задан' });
    }
    if (pass === adminPassword) {
        adminSession.token = crypto.randomBytes(32).toString('hex');
        adminSession.createdAt = Date.now();
        res.json({ token: adminSession.token });
    } else {
        res.status(401).json({ error: 'Неверный пароль' });
    }
});
```

---

### Order Management — JSON File Pattern (replaces database)

**Why NOT a database:** PROJECT.md explicitly states JSON storage is sufficient. The store has ~18 products and will likely have < 100 orders/month. JSON files handle this scale fine.

**Data schema** — `data/orders.json`:
```json
[
  {
    "id": "ORD-1712400000000-a1b2",
    "items": [
      { "productId": 1, "name": "Брелок кожаный", "price": 350, "qty": 2 }
    ],
    "customer": {
      "name": "Иван Иванов",
      "phone": "+79991234567"
    },
    "total": 700,
    "status": "new",
    "createdAt": "2026-04-06T12:00:00.000Z",
    "updatedAt": "2026-04-06T12:00:00.000Z",
    "notes": ""
  }
]
```

**Order statuses:** `new` → `confirmed` → `processing` → `shipped` → `delivered` | `cancelled`

**API endpoints to add:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | No | Create order (from cart) |
| GET | `/api/orders` | Admin | List all orders (filter `?status=`) |
| GET | `/api/orders/:id` | Admin | Get single order |
| PUT | `/api/orders/:id/status` | Admin | Update order status |
| DELETE | `/api/orders/:id` | Admin | Delete order |

**Order ID format:** `ORD-{timestamp}-{randomHex}` — generated with `crypto.randomBytes(2).toString('hex')` appended to `Date.now()`.

---

### Dynamic Reviews — JSON File Pattern

**Data schema** — `data/reviews.json`:
```json
[
  {
    "id": "REV-1712400000000",
    "author": "Анна",
    "rating": 5,
    "text": "Отличный кошелёк, кожа мягкая!",
    "productId": 6,
    "approved": false,
    "createdAt": "2026-04-06T12:00:00.000Z"
  }
]
```

**Moderation flow:** Reviews start as `approved: false`. Admin sees pending reviews in admin panel, clicks approve/reject. Only approved reviews shown publicly.

**API endpoints to add:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reviews` | No | List approved reviews (filter `?productId=`) |
| POST | `/api/reviews` | No | Submit review (sets `approved: false`) |
| GET | `/api/reviews/all` | Admin | List all reviews (including unapproved) |
| PUT | `/api/reviews/:id/approve` | Admin | Approve review |
| PUT | `/api/reviews/:id/reject` | Admin | Reject/delete review |
| DELETE | `/api/reviews/:id` | Admin | Delete review |

---

### Owner Notifications — Telegram Bot API via `https` built-in

**Why Telegram, not email (`nodemailer`):**
1. Owner already uses Telegram for orders (current WhatsApp/Telegram flow)
2. Zero configuration — no SMTP, no email provider, no DNS records
3. Instant notification — owner sees order immediately on phone
4. No new dependency — Node.js built-in `https` module

**Why NOT a Telegram bot library (`node-telegram-bot-api`, `telegraf`):**
- We only need ONE API call: `sendMessage`. A full bot framework is overkill.
- Built-in `https.request` handles this in 15 lines of code.

**Implementation pattern:**
```javascript
var https = require('https');

function notifyOwner(order) {
    var token = process.env.TG_BOT_TOKEN;
    var chatId = process.env.TG_CHAT_ID;
    if (!token || !chatId) return; // silently skip if not configured

    var text = '🛒 Новый заказ #' + order.id +
        '\n👤 ' + order.customer.name +
        '\n📞 ' + order.customer.phone +
        '\n💰 ' + order.total + ' ₽' +
        '\n📦 ' + order.items.length + ' товар(ов)';

    var body = JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' });

    var req = https.request({
        hostname: 'api.telegram.org',
        path: '/bot' + token + '/sendMessage',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    });

    req.on('error', function (err) {
        console.error('Telegram notification failed:', err.message);
    });

    req.write(body);
    req.end();
}
```

**Setup required from owner:**
1. Create Telegram bot via @BotFather → get `TG_BOT_TOKEN`
2. Send `/start` to the bot from owner's account
3. Get chat ID via `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Set `TG_BOT_TOKEN` and `TG_CHAT_ID` environment variables

---

### Atomic JSON Writes — `fs.writeFileSync` + `fs.renameSync`

**Why NOT `write-file-atomic`:** The package does exactly what we can do in 3 lines. No need for a dependency for this.

**Implementation:**
```javascript
function writeProducts(products) {
    var tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(products, null, 2), 'utf-8');
    fs.renameSync(tmp, DATA_FILE); // atomic on POSIX (Linux production)
}

function writeSiteData(data) {
    var tmp = SITE_DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, SITE_DATA_FILE);
}
```

**Same pattern for new files:**
```javascript
var ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');
var REVIEWS_FILE = path.join(__dirname, 'data', 'reviews.json');

function writeOrders(orders) {
    var tmp = ORDERS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(orders, null, 2), 'utf-8');
    fs.renameSync(tmp, ORDERS_FILE);
}

function writeReviews(reviews) {
    var tmp = REVIEWS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(reviews, null, 2), 'utf-8');
    fs.renameSync(tmp, REVIEWS_FILE);
}
```

---

### Automated Backups — `fs.copyFileSync` + `setInterval`

**Implementation:**
```javascript
var BACKUP_DIR = path.join(__dirname, 'data', 'backups');

function createBackup() {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    var ts = new Date().toISOString().replace(/[:.]/g, '-');
    var dataFiles = [DATA_FILE, SITE_DATA_FILE, ORDERS_FILE, REVIEWS_FILE];
    dataFiles.forEach(function (f) {
        if (fs.existsSync(f)) {
            fs.copyFileSync(f, path.join(BACKUP_DIR, path.basename(f, '.json') + '-' + ts + '.json'));
        }
    });
}

// Backup on startup
createBackup();
// Backup every 6 hours
setInterval(createBackup, 6 * 60 * 60 * 1000);
// Keep only last 10 backups (cleanup old ones)
function cleanOldBackups() { /* ... */ }
```

---

## Dependencies Explicitly NOT Added

| Package | Why NOT | What Instead |
|---------|---------|-------------|
| `jsonwebtoken` | Overkill for single admin user, no registration | Custom token + timestamp check |
| `nodemailer` | Telegram simpler, no SMTP config needed | Telegram Bot API via `https` built-in |
| `node-telegram-bot-api` | Only need `sendMessage`, not a full bot framework | Direct `https.request` (15 lines) |
| `uuid` | Can generate IDs with `Date.now()` + `crypto.randomBytes()` | `crypto` built-in |
| `write-file-atomic` | 3-line alternative exists | `writeFileSync` + `renameSync` |
| `cors` | Single-origin site, no cross-origin API access needed | Not needed |
| `cookie-parser` | Not switching to cookie-based auth yet | Bearer token stays |
| `express-session` | No session-based auth needed | Token-based auth stays |
| `bcrypt` / `scrypt` | Single admin password from env var, no password storage | Direct comparison with `process.env.ADMIN_PASSWORD` |
| `joi` / `zod` | Manual validation sufficient for current scale, violates minimal-dep principle | Manual `if (!field)` checks |
| `sharp` | Image optimization deferred (out of scope per PROJECT.md) | Manual optimization before upload |
| `better-sqlite3` | Explicitly out of scope per PROJECT.md | JSON files |
| `dotenv` | Production env vars set via hosting platform; dev can use shell env | Document env vars, use `process.env` directly |
| `xss-clean` / `dompurify` | Server already has `escapeHtml()`, new endpoints will use it | Existing `escapeHtml()` + input validation |
| `hpp` | Single-purpose, low risk for this app | Not needed |
| `express-validator` | Heavy for our scale, manual validation is clear | Manual validation |

---

## New Environment Variables

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `ADMIN_PASSWORD` | **YES** (was optional with bad default) | Admin panel password | (owner chooses) |
| `TG_BOT_TOKEN` | No | Telegram notifications | `123456:ABC-DEF...` |
| `TG_CHAT_ID` | No | Telegram chat to send notifications to | `123456789` |

**Critical fix:** `ADMIN_PASSWORD` fallback `'timur2024'` must be removed. Server should refuse to start without it.

---

## Express 5 Compatibility Notes

Researching the Express 5 migration guide revealed important compatibility details for the implementation phase:

| Concern | Impact | Action |
|---------|--------|--------|
| `req.body` returns `undefined` when not parsed (was `{}`) | Low — existing code checks `req.body.password` which works either way | Be aware in new endpoints |
| `req.query` default parser changed from "extended" to "simple" | Low — only `?category=` filter used, no nested objects | No change needed |
| Wildcard `/*` routes need named param `/*splat` | Low — no wildcard routes in current code | Use named params if adding catch-all |
| `res.status()` only accepts 100-999 | Low — existing code uses valid status codes | Be aware |
| Rejected promises in handlers auto-forward to error handler | Medium — could simplify error handling in new async code | Can use `async` handlers safely |
| Brotli *acceptance* support added | Low — doesn't replace `compression` middleware for response compression | Still need `compression` package |

---

## Installation

```bash
# New dependencies (3 packages — from 2 to 5 total)
npm install helmet@^8.1.0 compression@^1.8.1 express-rate-limit@^8.3.2
```

**No dev dependencies needed.** This project has no build step, no test framework (yet), no transpiler.

---

## New Data Files

| File | Initial Content | Purpose |
|------|-----------------|---------|
| `data/orders.json` | `[]` | Order storage |
| `data/reviews.json` | `[]` | Review storage |
| `data/backups/` | (directory) | Auto-backup destination |

**Same initialization pattern as existing files:**
```javascript
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]', 'utf-8');
if (!fs.existsSync(REVIEWS_FILE)) fs.writeFileSync(REVIEWS_FILE, '[]', 'utf-8');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
```

---

## Sources

| Source | Confidence | Notes |
|--------|------------|-------|
| npm registry (helmet@8.1.0) | HIGH | Verified latest version, CJS export, no Express peer dep |
| npm registry (compression@1.8.1) | HIGH | Verified latest version, maintained by expressjs org |
| npm registry (express-rate-limit@8.3.2) | HIGH | Verified latest version, peer dep `express >= 4.11` |
| Helmet GitHub README | HIGH | CSP configuration details, default directives documented |
| Express 5 Migration Guide (expressjs.com) | HIGH | Official docs, compatibility details verified |
| Project CONCERNS.md | HIGH | 15+ issues mapped to specific fix approaches |
| Node.js `crypto`, `https`, `fs` docs | HIGH | Built-in modules, stable APIs |

---

*Stack research: 2026-04-06. Total new dependencies: 3 (helmet, compression, express-rate-limit). Everything else built with Node.js built-ins.*

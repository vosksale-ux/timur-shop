# Project Research Summary

**Project:** Timur.Shop — Интернет-магазин кожаных изделий ручной работы
**Domain:** Artisan leather goods e-commerce (brownfield enhancement)
**Researched:** 2026-04-06
**Confidence:** HIGH

## Executive Summary

Timur.Shop is a small-scale artisan leather goods store built on a minimal stack (Express 5 + JSON files + Vanilla JS) that works but has critical security holes and lacks core e-commerce capabilities — most importantly, **orders are never saved server-side**. The current "order" flow opens a WhatsApp deep link and clears the cart; if the popup is blocked, the order vanishes entirely. This single gap represents the highest-priority fix: the store cannot be promoted until orders persist on the server.

Research across stack, features, architecture, and pitfalls converges on a **security-first, order-centric enhancement** that adds exactly 3 npm packages (`helmet`, `compression`, `express-rate-limit`) while building order management, dynamic reviews, and Telegram notifications using Node.js built-in modules only. The approach respects the project's minimal-dependency philosophy and `var`/`function` coding conventions.

The primary risk is **data corruption**: the existing `writeFileSync` pattern is not atomic, and adding customer-facing write endpoints (orders, reviews) dramatically increases the concurrency surface. This must be fixed before any new data endpoints go live. Secondary risks include ФЗ-152 compliance (storing personal data requires consent), XSS via user-submitted reviews, and order ID enumeration leaking customer data. All are preventable with the patterns documented in the research.

## Key Findings

### Recommended Stack

The existing Express 5 + Multer + JSON-file stack stays unchanged. Three new npm packages address security and performance gaps that affect all new features:

**Core technologies (new):**
- **helmet ^8.1.0** — sets 13 security HTTP headers in one line; CSP disabled initially (inline `onclick` handlers and CDN scripts conflict), tightened in future phase
- **compression ^1.8.1** — gzip responses, reduces bandwidth ~60% (critical for mobile users in Russia); maintained by expressjs org
- **express-rate-limit ^8.3.2** — replaces buggy in-memory login limiter (memory leak, no cleanup) and adds rate limiting for public order/review endpoints

**Built-in alternatives (no new packages):**
- **Telegram notifications** via Node.js `https` built-in (not `node-telegram-bot-api`) — only `sendMessage` needed, 20 lines of code
- **Token expiry** via timestamp check (not `jsonwebtoken`) — single admin user, no registration
- **Atomic JSON writes** via `writeFileSync` + `renameSync` (not `write-file-atomic`)
- **Order/review IDs** via `Date.now()` + `crypto.randomBytes()` (not `uuid`)

See [STACK.md](./STACK.md) for version details, Express 5 compatibility notes, and full configuration.

### Expected Features

Research identifies 13 table-stakes features, 9 differentiators, and 11 explicit anti-features.

**Must have (table stakes):**
- Remove hardcoded password (`'timur2024'` fallback) — admin access exposed in source code
- Remove SVG from upload whitelist — stored XSS vector
- Atomic JSON writes — prevent data corruption on crash
- Automated backups — zero backups exist currently
- Real contact info — phone `+7999000000` is placeholder across 4 files
- **Server-side order persistence** — the single highest-value feature; current orders are WhatsApp messages that may never arrive
- **Dynamic reviews with moderation** — 8 hardcoded HTML blocks aren't real reviews

**Should have (differentiators):**
- Owner Telegram notifications on new orders/reviews — instant, zero dependencies
- Order status tracking with state machine (`new → confirmed → processing → shipped → delivered`)
- Admin order management panel — structured view vs. WhatsApp chat history
- Product-level review display (rating + count on catalog cards)

**Defer (v2+):**
- Online payment gateway (next milestone after order system stabilizes)
- User registration / accounts (conversion killer at this scale)
- Product search (18 products — category filter suffices)
- Photo reviews, product aging gallery, customization notes (post-MVP differentiators)

See [FEATURES.md](./FEATURES.md) for full feature matrix with complexity estimates.

### Architecture Approach

The enhancement extends the existing monolithic pattern: all routes in `server.js` (growing from ~287 to ~550 lines), all data in JSON files, all client JS as global functions. No architectural restructuring — just new data files (`orders.json`, `reviews.json`, `backups/`) and new route groups following existing patterns.

**Major components (new):**
1. **Order Routes** — public POST (guest checkout), admin GET/PUT/DELETE with status state machine
2. **Review Routes** — public GET (approved only) + POST (→ moderation queue), admin moderation
3. **Notification Service** — `notifyAdmin()` via Node.js `https` → Telegram Bot API, fire-and-forget
4. **Atomic Write Utility** — shared `atomicWrite()` for all data files, replaces dangerous `writeFileSync`
5. **Backup Service** — periodic snapshots of all JSON files to `data/backups/`, keeps last 50

**Key data model decisions:**
- Orders snapshot product data (name, price, image) at creation time — not references
- Order numbers use human-readable format `Т-YYYYMMDD-NNN` (not sequential IDs — prevents enumeration)
- Reviews start as `pending`, admin approves before display
- Root structure `{ orders: [...] }` not bare arrays (consistent with existing `site-data.json`)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for data schemas, API endpoint specs, and data flow diagrams.

### Critical Pitfalls

1. **Orders never saved server-side** — `window.open('wa.me/...')` + `localStorage.clear()` means popup blockers silently eat orders. Fix: POST to API first, messenger link as optional secondary step.
2. **JSON file corruption under concurrent writes** — customers can now trigger writes (not just admin). Fix: `atomicWrite()` (temp file → rename) must be in place before any public write endpoint goes live.
3. **Stored XSS via review content** — `<script>` in review text served to all visitors. Fix: server-side `escapeHtml()` + admin moderation queue + rate limiting.
4. **ФЗ-152 non-compliance** — storing names/phones without consent mechanism. Fix: consent checkbox on order + review forms, updated privacy policy.
5. **Order ID enumeration** — sequential IDs let anyone list all orders via `/api/orders/1`, `/api/orders/2`. Fix: non-sequential order numbers + auth-gated admin endpoints.
6. **Cart price mismatch** — localStorage cart has stale prices if admin changes them. Fix: server resolves prices from `products.json` during order creation, ignores client-submitted prices.

See [PITFALLS.md](./PITFALLS.md) for 17 pitfalls with detection methods and phase-specific warnings.

## Implications for Roadmap

Based on combined research, the following phase structure is recommended:

### Phase 1: Security Foundation
**Rationale:** Five critical vulnerabilities make the store unsafe to promote. All new features write data — unsafe writes must be fixed first. This is a hard blocker for everything else.
**Delivers:** Safe data persistence, no admin password leak, no XSS vectors, automated backups
**Addresses:** T1 (hardcoded password), T2 (SVG XSS), T3 (atomic writes), T4 (backups), T5 (fake contacts)
**Avoids:** Pitfall P13 (path traversal), P17 (inconsistent writes), P4 (secret management)
**Research needed:** No — well-documented patterns, all changes are small and local

### Phase 2: Order System
**Rationale:** Orders are currently lost in WhatsApp. This is the single highest business-value feature. Depends on Phase 1 (atomic writes must exist before order writes).
**Delivers:** Server-side order persistence, admin order management, owner notifications
**Uses:** `express-rate-limit` (order creation rate limiting), Node `https` (Telegram notifications)
**Implements:** Order data model, order routes, order status state machine, notification service, admin-orders.html
**Addresses:** T6 (order persistence), D5 (status tracking), D6 (notifications), D7 (admin order history)
**Avoids:** Pitfall P1 (orders lost), P2 (concurrent writes), P6 (ID enumeration), P8 (no state machine), P10 (notification coupling), P12 (price mismatch), P15 (no server validation)
**Research needed:** No — API patterns are standard; data model is fully specified in ARCHITECTURE.md

### Phase 3: Review System
**Rationale:** Static hardcoded reviews destroy credibility. Depends on Phase 1 (atomic writes). Can partially overlap with Phase 2.
**Delivers:** Dynamic reviews with moderation queue, review submission form, product-level ratings
**Uses:** `express-rate-limit` (review submission rate limiting)
**Implements:** Review data model, review routes, review moderation in admin panel, dynamic reviews.html
**Addresses:** T10 (dynamic reviews), D9 (product-level reviews)
**Avoids:** Pitfall P3 (stored XSS), P11 (review spam)
**Research needed:** No — well-documented patterns, XSS prevention via existing `escapeHtml()`

### Phase 4: UI & Polish
**Rationale:** Fix broken mobile experience and add finishing touches. Can overlap with Phases 2-3.
**Delivers:** Mobile-responsive layout, leather care guide, real legal content, CDN localization
**Addresses:** T9 (mobile fixes), T11-T13 (legal pages), D2 (care guide)
**Avoids:** Pitfall P14 (CDN unreachable from Russia)
**Research needed:** Phase-level research recommended for mobile CSS fixes (specific breakpoints for this layout)

### Phase 5: Differentiators (Post-MVP)
**Rationale:** Features that make the store special but aren't needed for basic operation.
**Delivers:** Order status page for customers, photo reviews, product aging gallery, customization notes
**Addresses:** D1 (aging gallery), D4 (customization), D8 (photo reviews)
**Research needed:** Light research on touch-compatible star rating widget and image upload for reviews

### Phase Ordering Rationale

- **Phase 1 blocks everything** — unsafe writes + leaked admin password mean no new feature can be safely added
- **Phase 2 before Phase 3** — orders have higher business value than reviews; both depend on Phase 1
- **Phases 2 and 3 can partially overlap** — order and review data layers are independent
- **Phase 4 is flexible** — UI fixes are independent and can start anytime after Phase 1
- **Phase 5 is explicitly post-MVP** — these are nice-to-haves, not launch requirements

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (UI & Polish):** Mobile CSS breakpoints specific to this layout need visual audit; CDN localization strategy requires testing
- **Phase 5 (Differentiators):** Touch-compatible star rating component; image upload for photo reviews (Multer configuration)

Phases with standard patterns (skip research-phase):
- **Phase 1 (Security):** All fixes are 1-30 line changes with clear patterns documented in STACK.md and PITFALLS.md
- **Phase 2 (Orders):** Full data model, API specs, and data flows documented in ARCHITECTURE.md; standard REST patterns
- **Phase 3 (Reviews):** Identical pattern to orders but simpler; moderation queue is a well-known pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified against npm registry; Express 5 compatibility confirmed; built-in alternatives are stable Node.js APIs |
| Features | HIGH | Based on direct codebase analysis (server.js, cart.html, reviews.html, admin.html); e-commerce domain patterns are well-established |
| Architecture | HIGH | Based on extrapolating existing codebase patterns; data models fully specified; API endpoints designed against existing middleware pipeline |
| Pitfalls | HIGH | 17 pitfalls identified from codebase analysis + domain knowledge; Russian legal requirements (ФЗ-152, ЗоЗПП) verified |

**Overall confidence:** HIGH

### Gaps to Address

- **Helmet CSP configuration** — Phase 1 disables CSP entirely; future tightening requires auditing all inline handlers and CDN scripts. Flagged for post-MVP.
- **Telegram bot setup** — Owner must create bot via @BotFather and set env vars. Implementation is straightforward but requires owner action before notifications work. Code handles missing config gracefully (silent skip).
- **ФЗ-152 registration** — Owner must register as personal data operator at rkn.gov.ru. Code supports it (consent checkbox, privacy policy) but legal registration is owner's responsibility.
- **Existing review migration** — 8 hardcoded reviews in `reviews.html` must be migrated to `reviews.json` as `approved` entries. One-time data task, well-documented.
- **Mobile breakpoint specifics** — Research identifies broken mobile sections but exact CSS fixes need visual testing on real devices during Phase 4.

## Sources

### Primary (HIGH confidence)
- npm registry — `helmet@8.1.0`, `compression@1.8.1`, `express-rate-limit@8.3.2` (verified versions, CJS exports, Express 5 compat)
- Express 5 Migration Guide (expressjs.com) — compatibility details for existing codebase
- Helmet GitHub README — CSP configuration, default directives
- Direct codebase analysis — `server.js` (287 lines), `cart.html` (260 lines), `reviews.html` (258 lines), `admin.html` (527 lines)
- Node.js built-in docs — `crypto`, `https`, `fs` modules
- Telegram Bot API docs — `sendMessage` endpoint structure, rate limits (20 msg/min)

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONCERNS.md` — 28 documented issues informing pitfall identification
- `.planning/codebase/ARCHITECTURE.md` — existing architecture patterns used as extension baseline
- Russian Consumer Protection Law (ЗоЗПП Article 26.1) — distance selling, handmade goods exemption
- ФЗ-152 "On Personal Data" — storage requirements, consent mechanisms
- Roskomnadzor CDN blocking history — jsdelivr/unpkg intermittent issues in Russia (2022-2025)

### Tertiary (contextual)
- E-commerce domain patterns for small artisan stores — LOW SKU count, emotional purchase, owner-as-brand
- Russian market specifics — Telegram > WhatsApp for business, CDEK dominance, YooKassa/Tinkoff standard payment gateways

---
*Research completed: 2026-04-06*
*Ready for roadmap: yes*

# Domain Pitfalls

**Domain:** E-commerce leather goods store — brownfield enhancement (order management, reviews, security fixes)
**Researched:** 2026-04-06
**Project:** timur.shop (Node.js/Express, JSON storage, Vanilla JS)

---

## Critical Pitfalls

Mistakes that cause data loss, security breaches, or require major rewrites.

### Pitfall 1: Orders Lost Because Client-Side Notification == Persistence

**What goes wrong:** The current `sendOrder()` and `sendTelegram()` functions open a WhatsApp/Telegram deep link via `window.open()`, then immediately clear the cart from localStorage. The order is never saved server-side. If the user's browser blocks the popup, the messaging app isn't installed, or the user closes the tab too quickly — the order is permanently lost. There is zero server-side record.

**Why it happens:** Developers treat "message sent" as "order placed." In a messenger-first workflow, it feels like the order is captured, but it exists only in the chat history of a single messaging app — no database, no backup, no tracking.

**Consequences:**
- Owner has no order list, no statuses, no history
- Customer has no order confirmation or tracking
- Popup blockers silently eat orders (no error feedback to user)
- Orders from different channels (WhatsApp vs Telegram) live in different apps
- No analytics: revenue, popular products, repeat customers

**Prevention:**
1. **Server-side order creation FIRST**, before any messenger notification
2. Save to `data/orders.json` with atomic write (tmpfile → rename)
3. Send messenger notification from server (Telegram Bot API, not `t.me` deep link)
4. Return order ID to client, show confirmation page
5. Clear cart only after server confirms `201 Created`

**Detection:** Place 10 test orders. Check if any exist on the server. They won't.

**Phase:** Phase 1 (Order System Foundation) — this is the core architectural decision

---

### Pitfall 2: JSON File Corruption on Order Creation Under Concurrent Load

**What goes wrong:** The existing codebase uses `readFileSync()` → modify in memory → `writeFileSync()`. This is not atomic. If two customers place orders simultaneously, the sequence is:

```
Process A: read products.json → [order1]
Process B: read products.json → [order1]  // same data, A hasn't written yet
Process A: write [order1, orderA]          // A's order added
Process B: write [order1, orderB]          // B's order added, but A's is GONE
```

**Why it happens:** JSON file I/O is treated as a database. It's not. There are no locks, no transactions, no MVCC. The existing race condition (CONCERNS.md §3.3) gets worse when customers (not just admins) can trigger writes via order creation.

**Consequences:**
- Orders silently disappear under concurrent access
- If server crashes mid-write, entire `orders.json` becomes corrupted
- `JSON.parse()` on corrupted file throws — ALL order functionality dies
- No recovery without backup

**Prevention:**
1. **Implement write queue** — serialize all write operations through a single async queue
2. **Atomic writes** — write to `orders.tmp.json`, then `fs.rename('orders.tmp.json', 'orders.json')` (atomic on most filesystems)
3. **Add `data/orders.json` to backup strategy** (currently only products.json is considered)
4. Wrap all reads in try/catch with fallback to last backup

**Detection:** Stress test with 5+ simultaneous order submissions. Check data integrity.

**Phase:** Phase 1 — must be solved BEFORE order creation endpoint goes live. The existing products.json has the same bug but only admin triggers writes (low concurrency). Customer-facing order creation changes the concurrency profile entirely.

---

### Pitfall 3: Review Spam and XSS Via User-Generated Content

**What goes wrong:** Moving from static HTML reviews to a dynamic API-served review system introduces two attack vectors:

1. **Stored XSS:** Customer-submitted review text containing `<script>alert(1)</script>` or `<img onerror="...">` gets saved to `data/reviews.json` and served to ALL visitors. The existing `escapeHtml()` function is used inconsistently (CONCERNS.md §1.10, §4.1) and is duplicated across 3 files with different implementations.

2. **Review spam / abuse:** No rate limiting, no CAPTCHA, no admin approval queue. Bots or malicious actors can flood the review system with hundreds of fake reviews. Since there's no user authentication, anyone can POST reviews at API speed.

**Why it happens:** UGC (user-generated content) looks simple — just save and display. But the display context (HTML injection) and the abuse surface (no auth + no rate limit) are easy to overlook.

**Consequences:**
- Stored XSS compromises every visitor who views reviews
- Spam reviews destroy credibility of the review system
- Manual cleanup requires editing JSON or building delete functionality retroactively
- Legal liability: Russian law (ФЗ-152) requires personal data protection; storing reviewer names without consent mechanism is a violation

**Prevention:**
1. **Server-side HTML sanitization** before saving — not just `escapeHtml()`, but a whitelist approach (allow `<b>`, `<i>`, deny everything else) or strip ALL HTML and store as plain text
2. **Admin approval queue** — reviews start as `status: "pending"`, admin approves via admin panel
3. **Rate limit review submissions** — max 3 per hour per IP (reuse existing rate limit pattern from login)
4. **reCAPTCHA or honeypot field** — add invisible honeypot `<input name="website" style="display:none">` (bots fill it, humans don't)
5. **Content length limits** — name: 50 chars, text: 500 chars

**Detection:** Submit a review with `<script>alert(1)</script>` as the text. If it executes on the reviews page, the system is vulnerable.

**Phase:** Phase 2 (Review System) — sanitize and approval queue must be part of the initial implementation, not bolted on later

---

### Pitfall 4: Telegram Bot Token Exposed in Client-Side Code

**What goes wrong:** When implementing server-side notifications (replacing `window.open('wa.me/...')`), the obvious approach is to call Telegram Bot API. If implemented on the client side (like the current approach), the bot token ends up in JavaScript visible to everyone. Even if implemented server-side, the token might be hardcoded like the admin password currently is (`'timur2024'` fallback pattern).

**Why it happens:** The project has a pattern of hardcoding secrets (CONCERNS.md §1.1). The same pattern will repeat for bot tokens, payment API keys, etc.

**Consequences:**
- Attacker gets full control of Telegram bot: send messages to all users, read chat history
- If bot is linked to a group/channel, attacker can post as the shop
- Token rotation requires code changes if hardcoded

**Prevention:**
1. **Always use environment variables** — `process.env.TELEGRAM_BOT_TOKEN`, with `process.exit(1)` if not set on production
2. **Never call Telegram API from client** — all notification calls go through server endpoint
3. **Add bot token to .env file** — already have `.env` pattern for ADMIN_PASSWORD (just needs enforcement)
4. **Validate bot token at startup** — call `getMe` API on server start, log error if invalid

**Detection:** Search client-side JS files for bot token patterns. Check if `.env` is in `.gitignore`.

**Phase:** Phase 1 (Order System) — notifications are part of order creation

---

### Pitfall 5: Personal Data Storage Without ФЗ-152 Compliance

**What goes wrong:** Orders will store customer name, phone, email, delivery address. Reviews store reviewer name and optionally email. Under Russian Federal Law 152-ФЗ "On Personal Data" (ФЗ-152), this is personal data processing and requires:
- Privacy policy update (currently exists at `/privacy.html` but doesn't cover stored orders)
- User consent before data collection
- Data subject rights (access, correction, deletion)
- Data minimization (don't collect more than needed)
- Notification to Roskomnadzor (Роскомнадзор) — mandatory registration as personal data operator

**Why it happens:** Small Russian e-commerce sites often ignore ФЗ-152 until they receive a fine (50,000-75,000 RUB for individuals, 100,000-300,000 RUB for legal entities). The existing privacy.html is generic and doesn't cover API-stored order data.

**Consequences:**
- Fines from Roskomnadzor (up to 300,000 RUB for legal entities)
- Site can be added to registry of violators
- Potential blocking by ISP
- Trust damage with customers

**Prevention:**
1. **Update privacy.html** to explicitly list stored data, purpose, retention period
2. **Add consent checkbox** on order form and review form ("Согласен с политикой конфиденциальности")
3. **Implement data deletion endpoint** — customer can request data removal
4. **Set retention period** — e.g., orders kept 1 year, then auto-purged
5. **Register as personal data operator** at rkn.gov.ru (owner's responsibility, but code must support it)
6. **Don't store more than needed** — email is optional, don't collect it if customer only wants Telegram notification

**Detection:** Review all stored fields. Is there a consent mechanism? Does privacy policy cover the actual data stored?

**Phase:** Phase 1 (Order System) — consent checkbox must be in the order form from day one

---

### Pitfall 6: Order ID Predictability Leading to Information Leakage

**What goes wrong:** The existing `nextId()` function generates sequential IDs (1, 2, 3...). If order IDs follow the same pattern, any user can enumerate all orders: `GET /api/orders/1`, `/api/orders/2`, etc. If the GET endpoint doesn't require auth (it shouldn't for customer order lookup), this leaks all order data — names, addresses, phone numbers, purchase history.

**Why it happens:** Sequential IDs are simple and natural. The product catalog uses them. But products are public data; orders are private.

**Consequences:**
- Full customer data breach through enumeration
- GDPR/ФЗ-152 violation (data exposure)
- Competitors can see sales volume and customer list

**Prevention:**
1. **Use UUIDs or random order numbers** — e.g., `ORD-2026-A7X9K2` (human-readable but unpredictable)
2. **Auth-gate order details** — customer enters phone + order number to view status (no account needed)
3. **Rate limit order lookup** — prevent brute-force enumeration
4. **Never use auto-incrementing IDs for sensitive data**

**Detection:** Try `GET /api/orders/1` as an unauthenticated user. If it returns data, it's broken.

**Phase:** Phase 1 (Order System Foundation) — ID generation strategy is foundational

---

## Moderate Pitfalls

### Pitfall 7: Messenger Deep Links Break on Mobile Browsers

**What goes wrong:** The current `window.open('https://wa.me/...')` approach fails silently on many mobile browsers. In-app browsers (Instagram, VK, Telegram's built-in browser) block `window.open()` or open it in a restricted context. The user sees nothing, the order appears "sent" but the message never arrives.

**Prevention:**
1. Use `<a href="whatsapp://send?phone=...">` as a fallback (deeplink directly to app)
2. Detect in-app browsers and show a "Copy message" button as fallback
3. Server-side notification eliminates this problem entirely — the message is sent via API, not via the user's browser

**Detection:** Test order flow inside Instagram in-app browser, Telegram in-app browser, and Yandex Browser.

**Phase:** Phase 1 — resolved by moving to server-side notifications

---

### Pitfall 8: No Order Status State Machine

**What goes wrong:** When implementing order statuses, developers often use free-form strings without validation. Status transitions happen in any order: `new → delivered → cancelled → processing` makes no sense but nothing prevents it. Admin can accidentally set a delivered order back to "new."

**Prevention:**
1. Define valid statuses: `new`, `confirmed`, `paid`, `shipped`, `delivered`, `cancelled`
2. Define valid transitions:
   ```
   new → confirmed, cancelled
   confirmed → paid, cancelled
   paid → shipped, cancelled
   shipped → delivered
   cancelled → (terminal)
   ```
3. Validate transitions server-side — reject invalid status changes
4. Add timestamp to each status change for audit trail

**Detection:** Try setting order status from "delivered" to "new". If it succeeds, there's no state machine.

**Phase:** Phase 1 (Order System) — build the state machine into the initial design

---

### Pitfall 9: `data/orders.json` Grows Without Pagination or Archival

**What goes wrong:** JSON file storage means every `GET /api/orders` reads the ENTIRE file. After 1000+ orders, this becomes a performance problem. After 10,000+ orders, the file may be several MB and parsing it on every request blocks the event loop (same as CONCERNS.md §2.1 but with customer-facing frequency).

**Prevention:**
1. **Implement pagination from the start** — `GET /api/orders?page=1&limit=20`
2. **Archive completed orders** — move orders older than 6 months to `data/orders-archive.json`
3. **Index by status** — keep active orders (new/confirmed/paid/shipped) in memory, archive the rest
4. **Set a data budget** — if orders.json exceeds 500KB, it's time to consider SQLite

**Detection:** Generate 500 test orders. Measure response time of `GET /api/orders`.

**Phase:** Phase 1 — build pagination into the initial API design

---

### Pitfall 10: Telegram Bot Notification Failure Silently Loses Orders

**What goes wrong:** When order notifications move to server-side Telegram Bot API, the notification becomes a network dependency. If Telegram is temporarily down, the bot token is wrong, or the server's IP is rate-limited by Telegram, the notification fails. If the code treats notification failure as order failure, the order isn't saved. If it treats them independently but doesn't log failures, the owner never knows about missed notifications.

**Prevention:**
1. **Decouple order persistence from notification** — always save order first, then try notification
2. **Implement retry queue** — failed notifications retry 3 times with exponential backoff
3. **Log all notification failures** — admin panel shows "notifications not sent" warning
4. **Add fallback channel** — if Telegram fails, send email or log for manual follow-up
5. **Return 201 to customer regardless of notification status** — order is saved even if notification fails

**Detection:** Disconnect server from internet. Place order. Is it saved?

**Phase:** Phase 1 (Order System) — decouple notification from persistence

---

### Pitfall 11: Review Ratings Manipulation Without Verification

**What goes wrong:** A public `POST /api/reviews` endpoint with no auth means competitors can script 1-star reviews, or the owner can script 5-star reviews. Without any verification (purchase proof, CAPTCHA), the rating system has zero credibility.

**Prevention:**
1. **Honeypot field** — hidden input that bots fill; reject if filled (simplest, no dependencies)
2. **Rate limit** — max 3 reviews per IP per day
3. **Purchase verification (future)** — "verified purchase" badge for reviews linked to order IDs
4. **Admin approval** — all reviews require admin approval before display (essential for launch)
5. **Don't show average rating until minimum 3 reviews** — prevents 1-review manipulation

**Detection:** Write a curl loop submitting 100 1-star reviews in 10 seconds.

**Phase:** Phase 2 (Review System) — honeypot + rate limit + admin approval in initial build

---

### Pitfall 12: Cart Price Mismatch With Server Price

**What goes wrong:** Currently, product prices are stored in localStorage cart when the user clicks "Add to cart." If the admin changes a product's price between "add to cart" and "place order," the order is placed with the stale localStorage price. The server doesn't validate prices during order creation because the current system just sends a text message.

**Prevention:**
1. **Server-side price resolution** — when creating an order, look up current prices from `products.json`, ignore client-submitted prices
2. **Calculate totals server-side** — never trust client-submitted totals
3. **Return price changes to client** — if a price changed, inform the customer before confirming

**Detection:** Add item to cart. Change price in admin. Place order. Check which price was used.

**Phase:** Phase 1 (Order System) — server must be the source of truth for prices

---

### Pitfall 13: Existing Path Traversal Bug Compounds With New Endpoints

**What goes wrong:** The path traversal bypass in image deletion (CONCERNS.md §1.4: `....//` → `../`) exists in the current codebase. When adding order management, new endpoints will handle file operations (e.g., order receipts, export to CSV). The same flawed sanitization pattern (`replace(/\.\./g, '')`) may be copy-pasted to new endpoints, multiplying the vulnerability.

**Prevention:**
1. **Fix path traversal globally before adding new endpoints** — use `path.resolve()` + `startsWith(UPLOAD_DIR)` check
2. **Create a shared `safePath()` utility** — all file operations must use it
3. **Write tests for path traversal** — `../../../etc/passwd`, `....//`, `%2e%2e%2f`, etc.

**Detection:** Audit all `path.join()` and `path.resolve()` calls. Check if any use user input without `startsWith()` guard.

**Phase:** Phase 0 (Security Fixes) — must be fixed before any new endpoints are added

---

## Minor Pitfalls

### Pitfall 14: CDN Dependencies Unreachable From Russia

**What goes wrong:** The site loads Swiper from jsdelivr and Lenis from unpkg. Both CDNs have experienced intermittent blocking or slowdowns in Russia (Roskomnadzor blocks IPs that share hosting with blocked content). If a CDN is unreachable, the carousel breaks and the site looks broken.

**Prevention:**
1. Localize Swiper and Lenis to `/vendor/` directory
2. Use `font-display: swap` for Google Fonts (already present)
3. Consider Yandex CDN or local fonts as alternatives for Russian audience

**Detection:** Block jsdelivr.net and unpkg.com in browser devtools. Reload page.

**Phase:** Phase 0 or Phase 3 (Polish) — localize critical dependencies

---

### Pitfall 15: Order Form Validates on Client But Not Server

**What goes wrong:** The current cart form uses HTML5 validation (`required`, `type="tel"`). When creating the server-side order endpoint, it's tempting to assume the client already validated. But API calls can be made directly with curl/Postman, bypassing all HTML validation.

**Prevention:**
1. **Validate everything server-side** — name (required, 2-100 chars), phone (required, Russian format), delivery method (whitelist), address (required for non-pickup)
2. **Phone validation for Russian numbers** — regex `/^\+7[0-9]{10}$/` or `/^8[0-9]{10}$/`
3. **Email validation** — basic format check if provided (optional field)

**Detection:** Send a POST to `/api/orders` with empty body. If it saves, there's no server validation.

**Phase:** Phase 1 (Order System) — server validation is mandatory

---

### Pitfall 16: WhatsApp Web vs WhatsApp Mobile Inconsistency

**What goes wrong:** During the transition period (before server-side notifications are complete), the existing WhatsApp deep link may work on mobile but open WhatsApp Web on desktop — which the user may not have configured. The current code doesn't detect which platform the user is on.

**Prevention:**
1. Platform detection: show WhatsApp button on mobile, hide or show "Copy order text" on desktop
2. Ultimately resolved by server-side notifications (Phase 1)

**Phase:** Resolved by Phase 1 (Order System)

---

### Pitfall 17: Multiple JSON Files Without Unified Write Strategy

**What goes wrong:** Adding `data/orders.json` and `data/reviews.json` means 3+ JSON files with write operations. If atomic writes are implemented for orders but not for reviews, or each file has a slightly different write pattern, the codebase becomes inconsistent and bugs multiply.

**Prevention:**
1. **Create a single `dataStore` module** with `read(file)` and `write(file, data)` methods
2. All write operations go through this module — guaranteed atomic writes everywhere
3. Centralize backup logic in one place

**Detection:** Search for `writeFileSync` calls. If there are multiple patterns, it's inconsistent.

**Phase:** Phase 0 (Security Fixes) — implement atomic write utility before adding new data files

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Detection Method |
|-------------|---------------|------------|------------------|
| **Security Fixes (Phase 0)** | Fixing SVG XSS by removing SVG but breaking existing product images that use SVG | Check `products.json` for any `.svg` references before removing support; convert any SVGs to PNG first | `grep -r ".svg" data/products.json` |
| **Security Fixes (Phase 0)** | Atomic writes implemented for products but not for new data files | Build a shared `atomicWrite()` utility used by ALL data operations | Code review: count `writeFileSync` calls |
| **Order System (Phase 1)** | Storing unencrypted customer phone numbers in plain JSON | Accept as acceptable risk for current scale; document in privacy policy; plan encryption for Phase 3+ | Security audit |
| **Order System (Phase 1)** | Telegram bot rate limits (20 msg/min to same chat) during order spikes | Queue notifications; batch updates for admin chat | Send 30 test notifications in 1 minute |
| **Order System (Phase 1)** | `nextId()` collision when multiple orders arrive in same millisecond | Use UUID or `Date.now() + random suffix` instead of sequential | Concurrent order stress test |
| **Review System (Phase 2)** | Review content breaks HTML when rendered via innerHTML | Sanitize on server (strip all tags) AND escape on client (use `escapeHtml`) | Submit `<h1>test</h1><script>alert(1)</script>` |
| **Review System (Phase 2)** | Star rating widget broken on touch devices | Test on actual mobile devices; use touch-compatible star component | Test on 3+ mobile devices |
| **Review System (Phase 2)** | Product dropdown in review form doesn't match current catalog | Fetch product list from API dynamically, don't hardcode | Check if dropdown updates when products change |
| **Design Fixes (Phase 3)** | CSS changes break admin panel layout (admin.html shares style.css) | Test admin.html after every CSS change; consider separate admin styles | Visual regression check |
| **Any Phase** | Adding npm dependency violates project constraint | Always check with owner before `npm install`; prefer native solutions | Review package.json changes |

---

## Russian E-Commerce Specific Pitfalls

### Pitfall R1: Delivery Service Integration Complexity

**Context:** The order form offers СДЭК, Почта России, and курьер по Москве. Each has different:
- API requirements (СДЭК has REST API, Почта России uses SOAP)
- Address format requirements (СДЭК needs PVZ code, Почта needs postcode)
- Pricing models (weight, dimensions, zone)

**Pitfall:** Don't try to integrate delivery APIs in this phase. The current approach (text in order message) is correct for the scale. Delivery API integration is a Phase 4+ task.

**Prevention:** Store delivery method and address as text. Let the owner handle logistics manually via СДЭК/Почта interfaces. Add delivery calculation later when volume justifies it.

**Phase:** Explicitly out of scope for current milestone.

---

### Pitfall R2: Payment Methods — Don't Build Payment Processing

**Context:** Russian payment options include ЮKassa, Тинькофф Оплата, SberPay, Robokassa. Each requires:
- Legal entity registration
- Contract with payment provider
- PCI DSS compliance (for card data)
- ФЗ-54 compliance (online kassa/fiscal data)

**Pitfall:** Trying to add online payment without understanding legal requirements. Even "simple" integrations require business registration, tax setup, and fiscal data reporting.

**Prevention:** Keep current approach: order via messenger, payment by card transfer (СБП), or cash on delivery. Online payment is explicitly out of scope (PROJECT.md). Do not add payment gateway until owner has legal entity and contracts ready.

**Phase:** Out of scope — documented in PROJECT.md.

---

### Pitfall R3: Отмена заказа (Order Cancellation) Legal Requirements

**Context:** Under Russian Consumer Protection Law (Закон о защите прав потребителей):
- Customer can cancel any order before delivery (Article 26.1, distance selling)
- Customer has 7 days to return after delivery (Article 26.1)
- Custom/handmade goods are exempt from return (Article 26.1, п.4) — **this applies to timur.shop's leather goods**

**Pitfall:** Building a generic cancellation flow without considering that custom leather goods have different return rules than mass-produced items.

**Prevention:**
1. Add "custom order" flag to products
2. Cancellation before shipping: always allowed
3. Returns after delivery: only for non-custom items, within 7 days
4. Document this clearly in the returns policy (returns.html)

**Phase:** Phase 1 (Order System) — cancellation workflow

---

### Pitfall R4: Product Prices Must Include VAT or Clearly State "Без НДС"

**Context:** Under Russian tax law, displayed prices must be final (including all taxes). If the business is on simplified tax (УСН), there's no VAT, but the price display must still be clear.

**Pitfall:** Adding "tax calculation" or "VAT" to the order system when the business doesn't need it (УСН = no VAT).

**Prevention:** Display prices as-is (final prices, including all taxes). Add a note in order confirmation: "Цены указаны с учетом всех налогов." Don't add VAT calculation logic.

**Phase:** Note for Phase 1 order confirmation text.

---

## Summary: Priority Pitfalls by Phase

### Phase 0: Security Fixes (Must Do First)
| # | Pitfall | Risk Level | Effort |
|---|---------|-----------|--------|
| P13 | Path traversal — fix globally before new endpoints | Critical | Low |
| P17 | Atomic write utility — build once, use everywhere | Critical | Medium |
| P4 | Secret management pattern — enforce env vars | Critical | Low |

### Phase 1: Order System
| # | Pitfall | Risk Level | Effort |
|---|---------|-----------|--------|
| P1 | Orders must be saved server-side FIRST | Critical | Medium |
| P2 | Race conditions with concurrent orders | Critical | Medium |
| P5 | ФЗ-152 compliance (consent, privacy policy) | Critical | Low |
| P6 | Non-enumerable order IDs | High | Low |
| P8 | Status state machine | High | Medium |
| P9 | Pagination for orders from day one | Medium | Low |
| P10 | Decouple notification from persistence | High | Medium |
| P12 | Server-side price validation | Critical | Medium |
| P15 | Server-side input validation | High | Medium |
| R3 | Cancellation rules for handmade goods | Medium | Low |

### Phase 2: Review System
| # | Pitfall | Risk Level | Effort |
|---|---------|-----------|--------|
| P3 | Stored XSS via review content | Critical | Medium |
| P11 | Review spam without verification | High | Low |
| P5 | ФЗ-152 for reviewer personal data | Medium | Low |

### Phase 3: Design Polish
| # | Pitfall | Risk Level | Effort |
|---|---------|-----------|--------|
| P14 | CDN unreachable from Russia | Medium | Low |
| Phase table | CSS changes break admin panel | Low | Low |

---

## Sources

- Codebase analysis: `server.js`, `cart.html`, `reviews.html`, `admin.html` — direct source inspection
- Existing concerns: `.planning/codebase/CONCERNS.md` — 28 issues documented
- Russian Consumer Protection Law (ЗоЗПП Article 26.1) — distance selling regulations
- ФЗ-152 "On Personal Data" — data storage requirements for Russian businesses
- Telegram Bot API rate limits — 20 messages per minute per chat (official docs)
- Node.js `fs.rename()` atomicity — POSIX specification, works on NTFS with recent Node versions
- Roskomnadzor CDN blocking history — jsdelivr, unpkg intermittent issues in Russia (2022-2025)

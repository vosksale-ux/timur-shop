# Architecture Research

**Domain:** Brownfield enhancement of monolithic Express + JSON-file e-commerce store (leather goods)
**Researched:** 2026-04-06
**Confidence:** HIGH (based on direct codebase analysis, existing pattern extrapolation)

## System Overview (Current + Proposed)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client Layer)                          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐ │
│  │ index.html │ │ cart.html │ │reviews.html│ │admin.html │ │admin-    │ │
│  │  catalog   │ │  checkout │ │  reviews   │ │ products  │ │orders.html│ │
│  │  (script.js│ │ order form│ │  display + │ │ + videos  │ │ order    │ │
│  │  +common.js│ │  →API     │ │  submit    │ │ CRUD      │ │ mgmt +   │ │
│  │  )         │ │           │ │  →API      │ │           │ │ review   │ │
│  └─────┬──────┘ └─────┬─────┘ └─────┬──────┘ └─────┬─────┘ │moderation│ │
│        │              │              │              │       └─────┬────┘ │
├────────┴──────────────┴──────────────┴──────────────┴─────────────┴──────┤
│                          HTTP / fetch()                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                     Express Server (server.js)                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Middleware Pipeline                         │    │
│  │  express.json → static files → /data block → rate limiter       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │  Product    │ │   Order    │ │   Review   │ │  Notification      │   │
│  │  Routes     │ │  Routes    │ │  Routes    │ │  Service           │   │
│  │  (existing) │ │  (NEW)     │ │  (NEW)     │ │  (NEW)             │   │
│  │  GET /api/  │ │  POST /api/│ │  GET /api/ │ │  sendTelegram()    │   │
│  │  products   │ │  orders    │ │  reviews   │ │  via Node https    │   │
│  │  POST/PUT/  │ │  GET admin │ │  POST pub  │ │  (zero deps)       │   │
│  │  DELETE     │ │  PUT status│ │  PUT/DEL   │ │                    │   │
│  └──────┬──────┘ └──────┬─────┘ └──────┬─────┘ └────────────────────┘   │
│         │               │              │             ↑                   │
├─────────┴───────────────┴──────────────┴─────────────┼───────────────────┤
│                    Data Access Layer                  │                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐       │                   │
│  │  products  │ │  orders    │ │  reviews   │       │                   │
│  │  .json     │ │  .json     │ │  .json     │       │                   │
│  │  (existing)│ │  (NEW)     │ │  (NEW)     │       │                   │
│  └────────────┘ └────────────┘ └────────────┘       │                   │
│  ┌────────────┐                                     │                   │
│  │ site-data  │ ┌────────────┐                      │                   │
│  │  .json     │ │  backups/  │                      │                   │
│  │ (existing) │ │  (NEW)     │                      │                   │
│  └────────────┘ └────────────┘                      │                   │
├──────────────────────────────────────────────────────┼───────────────────┤
│                    External Services                 │                   │
│  ┌────────────────┐ ┌────────────────┐              │                   │
│  │ Telegram Bot   │ │ WhatsApp link  │              │                   │
│  │ API            │ │ (existing,     │              │                   │
│  │ (notifications)│ │  keep as alt)  │              │                   │
│  └────────────────┘ └────────────────┘              │                   │
└──────────────────────────────────────────────────────┴───────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Implementation Approach |
|-----------|----------------|------------------------|
| **Product Routes** | CRUD catalog items with image upload | Existing — no changes needed |
| **Order Routes (NEW)** | Create, list, view, status-update orders | New routes in server.js, following product pattern |
| **Review Routes (NEW)** | Public submit (moderated), admin approve/reject | New routes in server.js, status-based visibility |
| **Notification Service (NEW)** | Push alerts to owner on new orders/reviews | Node.js `https` module → Telegram Bot API, zero deps |
| **Order Data (NEW)** | Persistent order storage with status history | `data/orders.json`, atomic writes via temp-file + rename |
| **Review Data (NEW)** | Persistent review storage with moderation queue | `data/reviews.json`, atomic writes |
| **Backup Service (NEW)** | Periodic JSON file snapshots | `data/backups/` dir, triggered on writes + scheduled |
| **Admin Orders Page (NEW)** | Order management UI | `admin-orders.html`, same auth pattern as admin.html |
| **Admin Reviews Section** | Review moderation UI | Tab/section in admin.html or separate page |
| **Cart Page (modified)** | Submit orders to server instead of only WhatsApp | `cart.html` — POST to API first, then optional messenger link |
| **Reviews Page (modified)** | Dynamic review loading from API | `reviews.html` — fetch reviews, submit via API |

## Recommended Project Structure (After Enhancement)

```
timur-shop/
├── data/                        # JSON-хранилище
│   ├── products.json            # Каталог товаров (existing)
│   ├── orders.json              # Заказы (NEW)
│   ├── reviews.json             # Отзывы (NEW)
│   ├── site-data.json           # Настройки + видео (existing)
│   └── backups/                 # Автобэкапы (NEW)
│       ├── products-2026-04-06.json
│       ├── orders-2026-04-06.json
│       └── reviews-2026-04-06.json
├── uploads/                     # Загруженные файлы (existing)
├── server.js                    # Express-сервер — grows from ~287 to ~550 lines
├── script.js                    # Клиентский JS каталога (unchanged)
├── common.js                    # Общий клиентский JS (minor additions)
├── style.css                    # Все стили (additions for orders/reviews admin)
├── index.html                   # Каталог (unchanged)
├── cart.html                    # Корзина — modified: submit to API
├── reviews.html                 # Отзывы — modified: dynamic loading
├── admin.html                   # Админка: товары + видео + отзывы (expanded)
├── admin-orders.html            # Админка: управление заказами (NEW)
├── about.html                   # О нас (unchanged)
├── delivery.html                # Доставка (unchanged)
├── payment.html                 # Оплата (unchanged)
├── terms.html / privacy.html / offerta.html / returns.html (unchanged)
├── robots.txt / sitemap.xml (updated: add admin-orders.html to block)
└── package.json                 # No new dependencies needed
```

### Structure Rationale

- **No new npm packages:** Notification uses Node built-in `https`, all data in JSON files
- **Separate admin-orders.html:** Keeps each HTML file under 500 lines (admin.html is already 527). Follows existing per-page pattern
- **Reviews stay in admin.html:** Add a moderation tab — review management is simpler (approve/reject), fits alongside existing video management
- **Single server.js stays:** At ~550 lines it's still manageable. The project constraint forbids splitting into modules
- **New data files follow naming:** `orders.json`, `reviews.json` — consistent with `products.json`

## Data Models (JSON Schemas)

### Order (`data/orders.json`)

```json
{
  "orders": [
    {
      "id": 1,
      "number": "Т-20260406-001",
      "items": [
        {
          "productId": 3,
          "name": "Ремень классический",
          "price": 3500,
          "qty": 1,
          "image": "/uploads/1774772679455-462.jpg"
        }
      ],
      "customer": {
        "name": "Алексей",
        "phone": "+79991234567",
        "email": "",
        "address": "г. Москва, ул. Пушкина, д. 10, кв. 5"
      },
      "delivery": {
        "method": "cdek",
        "cost": 300
      },
      "comment": "Позвонить перед доставкой",
      "subtotal": 3500,
      "deliveryCost": 300,
      "total": 3800,
      "status": "new",
      "statusHistory": [
        {
          "status": "new",
          "date": "2026-04-06T10:30:00.000Z",
          "comment": "Заказ создан"
        }
      ],
      "source": "site",
      "notified": false,
      "createdAt": "2026-04-06T10:30:00.000Z",
      "updatedAt": "2026-04-06T10:30:00.000Z"
    }
  ]
}
```

**Design decisions:**
- `number` (string `Т-YYYYMMDD-NNN`): Human-readable order ID for customer communication. Generated server-side, unique per day
- `items[]` snapshots product data at order time (price, name, image) — not a reference. If product changes later, order data is preserved
- `items[].productId`: Reference kept for linking but not required (product may be deleted)
- `status` enum: `new` → `confirmed` → `processing` → `shipped` → `delivered` | `cancelled`
- `statusHistory[]`: Audit trail — every status change recorded with timestamp
- `source`: `site` (via form), `whatsapp` (manual entry), `phone` (manual entry)
- `delivery.method` enum: `cdek`, `post`, `courier` — matches existing cart.html radio buttons
- `deliveryCost`: Snapshotted at order time in case delivery prices change
- `notified`: Boolean — tracks if admin was notified, prevents duplicate notifications
- Root is `{ orders: [...] }` not just `[...]` — consistent with site-data.json pattern, allows metadata later

### Review (`data/reviews.json`)

```json
{
  "reviews": [
    {
      "id": 1,
      "author": "Алексей К.",
      "rating": 5,
      "text": "Качество кожи отличное, прошивка ровная. Рекомендую!",
      "productId": 3,
      "productName": "Ремень классический",
      "status": "approved",
      "createdAt": "2026-04-06T10:30:00.000Z",
      "approvedAt": "2026-04-06T12:00:00.000Z"
    }
  ]
}
```

**Design decisions:**
- `productName` denormalized: Product names for display without joining. Product may be deleted
- `productId`: Optional reference. Free-text `productName` in form may not match a catalog product
- `status` enum: `pending` (new submission) → `approved` (visible on site) | `rejected` (hidden)
- No `avatar` field: Generate initials from `author` on client (existing pattern in reviews.html)
- Reviews submitted by customers are `pending` until admin approves. Pre-seeded existing reviews as `approved`

### Migration of Existing Static Reviews

The 8 hardcoded reviews in `reviews.html` should be migrated to `data/reviews.json` as `approved` entries with appropriate dates. This is a one-time data migration task.

## API Endpoint Design

### Orders (NEW)

| Method | Path | Auth | Description | Request Body | Response |
|--------|------|------|-------------|--------------|----------|
| `POST` | `/api/orders` | **Public** | Create order from cart | `{ items, customer, delivery, comment }` | `{ order }` with id + number |
| `GET` | `/api/orders` | **Admin** | List orders (filterable) | Query: `?status=new&page=1&limit=20` | `{ orders[], total, page }` |
| `GET` | `/api/orders/:id` | **Admin** | Single order detail | — | `{ order }` |
| `PUT` | `/api/orders/:id/status` | **Admin** | Update order status | `{ status, comment }` | `{ order }` |
| `GET` | `/api/orders/stats` | **Admin** | Order statistics | — | `{ total, byStatus{}, revenue }` |

**Why `POST /api/orders` is public:** Customers place orders without authentication (no user accounts). The endpoint validates required fields and creates the order. Rate limiting prevents abuse.

**Why separate `PUT .../status` instead of generic `PUT .../:id`:** Order status changes are the only meaningful admin mutation. The customer data should not be editable after creation (it's a legal record). A dedicated status endpoint makes intent clear and limits what can change.

### Reviews (NEW)

| Method | Path | Auth | Description | Request Body | Response |
|--------|------|------|-------------|--------------|----------|
| `GET` | `/api/reviews` | **Public** | Approved reviews | Query: `?productId=3` | `{ reviews[], stats }` |
| `POST` | `/api/reviews` | **Public** | Submit review (→pending) | `{ author, rating, text, productId?, productName }` | `{ review }` with status "pending" |
| `GET` | `/api/reviews/all` | **Admin** | All reviews (incl. pending) | Query: `?status=pending` | `{ reviews[] }` |
| `PUT` | `/api/reviews/:id` | **Admin** | Approve/edit review | `{ status, text?, rating? }` | `{ review }` |
| `DELETE` | `/api/reviews/:id` | **Admin** | Delete review | — | `{ ok: true }` |

**Why `GET /api/reviews` returns stats:** The reviews page shows average rating + distribution bars. Computing this client-side from a potentially large review array is wasteful. Server computes once: `{ avg: 4.9, count: 127, distribution: { 5: 108, 4: 15, 3: 3, 2: 1, 1: 0 } }`.

**Why `POST /api/reviews` is public:** Anyone can leave a review (no account required). The review enters a moderation queue (`pending` status). Admin must approve before it appears on site. This prevents spam without blocking genuine reviews.

**Rate limiting for public endpoints:** Both `POST /api/orders` and `POST /api/reviews` need rate limiting (3 orders/hour/IP, 5 reviews/hour/IP). Extend the existing `loginAttempts` pattern to these endpoints.

## Data Flow

### Order Creation Flow (NEW — Primary)

```
cart.html: User fills form, clicks "Оформить заказ"
    ↓
submitOrder(e):
    1. Validate form (name, phone, address required)
    2. Read cart from localStorage
    3. POST /api/orders {
         items: [{productId, name, price, qty, image}],
         customer: {name, phone, email},
         delivery: {method},
         comment
       }
    ↓
server.js: POST /api/orders handler
    1. Validate required fields (name, phone, items)
    2. Validate items exist in products.json
    3. Compute subtotal, deliveryCost, total
    4. Generate order number (Т-YYYYMMDD-NNN)
    5. Set status "new", create statusHistory
    6. readOrders() → push order → writeOrders() (atomic)
    7. Trigger: sendTelegramNotification(orderSummary)
    8. Return { order } with id + number
    ↓
cart.html: After successful POST
    1. Show success message with order number "Ваш заказ №Т-20260406-001 принят!"
    2. Clear cart from localStorage
    3. Optionally: still offer WhatsApp/Telegram link as "Также вы можете написать нам"
    4. DO NOT clear cart if API call fails — let user retry
```

### Order Management Flow (Admin)

```
admin-orders.html: Page loads
    ↓
checkAuth(): Read token from sessionStorage
    → If no token: show login overlay (same pattern as admin.html)
    ↓
loadOrders(): GET /api/orders?status=new&page=1
    ↓
Render order cards/table with:
    - Order number, date, customer name
    - Items summary, total
    - Current status badge (color-coded)
    - "Подробнее" → expand or navigate to detail view
    - Status change buttons (confirmed → processing → shipped → delivered)
    ↓
changeStatus(orderId, newStatus):
    PUT /api/orders/:id/status { status: "confirmed", comment: "Принят в обработку" }
    ↓
server.js: Validate status transition (forward only, or to "cancelled")
    → Update order.status, push to statusHistory
    → writeOrders() (atomic)
    → Return updated order
    ↓
admin-orders.html: Re-render order in new status
```

### Review Submission Flow (NEW)

```
reviews.html: User fills review form, clicks "Отправить отзыв"
    ↓
submitReview(e):
    1. Validate (author, rating > 0, text)
    2. POST /api/reviews {
         author: "Алексей К.",
         rating: 5,
         text: "Отличное качество!",
         productId: 3,           // if selected from dropdown
         productName: "Ремень"   // free text fallback
       }
    ↓
server.js: POST /api/reviews handler
    1. Validate required fields
    2. Sanitize text (escapeHtml)
    3. Set status "pending"
    4. readReviews() → push review → writeReviews() (atomic)
    5. Trigger: sendTelegramNotification("Новый отзыв ждёт модерации")
    6. Return { review } with status "pending"
    ↓
reviews.html:
    1. Show message: "Спасибо! Ваш отзыв будет опубликован после проверки."
    2. Clear form
    3. Do NOT add to visible review list yet (it's pending)
```

### Review Display Flow (Public)

```
reviews.html: Page loads
    ↓
loadReviews(): GET /api/reviews
    ↓
server.js: Returns only { status: "approved" } reviews + computed stats
    {
      reviews: [...],
      stats: { avg: 4.9, count: 127, distribution: {5: 108, 4: 15, ...} }
    }
    ↓
reviews.html:
    1. Render stats (avg rating, distribution bars) — replaces hardcoded values
    2. Render review cards dynamically — replaces hardcoded HTML
    3. If ?productId= — show reviews for specific product (optional future)
```

### Notification Flow (NEW)

```
Any new order or review created
    ↓
server.js: notifyAdmin(message)
    1. Check if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars exist
    2. If not configured: skip silently (log to console)
    3. If configured:
       var postData = JSON.stringify({
         chat_id: process.env.TELEGRAM_CHAT_ID,
         text: message,
         parse_mode: 'HTML'
       })
       var req = https.request({
         hostname: 'api.telegram.org',
         path: '/bot' + process.env.TELEGRAM_BOT_TOKEN + '/sendMessage',
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
       })
       req.write(postData)
       req.end()
    ↓
Telegram: Owner receives instant notification
    "🛒 Новый заказ #Т-20260406-001
     Алексей, +79991234567
     Ремень классический x1 — 3 500 ₽
     Доставка: СДЭК
     Итого: 3 800 ₽"
```

**Why Telegram, not email/SMS:**
- Zero npm dependencies (Node `https` built-in)
- Free, instant delivery
- Owner already uses Telegram (current `sendTelegram()` function exists)
- Easy to set up: create bot via @BotFather, get chat_id via @userinfobot
- HTML formatting for rich messages
- Fallback: if env vars not set, notifications silently skip. Owner can still check admin panel

**Setup steps for owner:**
1. Message @BotFather on Telegram → `/newbot` → get token
2. Message @userinfobot → get chat_id
3. Set env vars: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`

### Data Access Pattern (Atomic Writes — IMPROVED)

Current (dangerous):
```javascript
function writeProducts(products) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf-8');
}
```

Proposed (safe — applies to ALL data files):
```javascript
function atomicWrite(filePath, data) {
    var tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, filePath);
}
```

`fs.renameSync` is atomic on most filesystems — if server crashes during write, the original file remains intact. The `.tmp` file is corrupted instead. This single function should replace all `writeProducts`, `writeSiteData`, `writeOrders`, `writeReviews`.

## Architectural Patterns

### Pattern 1: JSON File as Database with Atomic Writes

**What:** Each domain (products, orders, reviews, site-data) gets its own JSON file. All writes go through `atomicWrite()`. All reads use synchronous `JSON.parse(fs.readFileSync(...))` wrapped in try/catch.

**When to use:** Small-scale stores (<1000 orders, <500 reviews). When adding a database is explicitly out of scope.

**Trade-offs:**
- ✅ Zero dependencies, simple to understand, easy to backup (copy files)
- ✅ Atomic writes prevent corruption
- ❌ Not suitable for concurrent writes (single admin mitigates this)
- ❌ Full file rewrite on every change (fine for small files)

**Implementation:**
```javascript
var ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');
var REVIEWS_FILE = path.join(__dirname, 'data', 'reviews.json');

function readJson(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) {
            atomicWrite(filePath, fallback);
            return fallback;
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
        console.error('Read error ' + filePath + ':', err.message);
        return fallback;
    }
}

function atomicWrite(filePath, data) {
    var tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, filePath);
}

function readOrders() { return readJson(ORDERS_FILE, { orders: [] }).orders; }
function writeOrders(orders) { atomicWrite(ORDERS_FILE, { orders: orders }); }
function readReviews() { return readJson(REVIEWS_FILE, { reviews: [] }).reviews; }
function writeReviews(reviews) { atomicWrite(REVIEWS_FILE, { reviews: reviews }); }
```

### Pattern 2: Order Number Generation

**What:** Generate human-readable order numbers like `Т-20260406-001` (one counter per day).

**When to use:** When order IDs (`1`, `2`, `3`) are too short for customer communication.

**Implementation:**
```javascript
function generateOrderNumber() {
    var today = new Date();
    var dateStr = today.getFullYear() +
        String(today.getMonth() + 1).padStart(2, '0') +
        String(today.getDate()).padStart(2, '0');
    var orders = readOrders();
    var todayPrefix = 'Т-' + dateStr + '-';
    var todayCount = orders.filter(function(o) {
        return o.number && o.number.indexOf(todayPrefix) === 0;
    }).length;
    return todayPrefix + String(todayCount + 1).padStart(3, '0');
}
```

### Pattern 3: Zero-Dependency Notification via Telegram Bot API

**What:** Use Node.js built-in `https` module to call Telegram Bot API. No `node-telegram-bot-api` or `axios` needed.

**When to use:** When you need push notifications without adding npm packages.

**Trade-offs:**
- ✅ Zero new dependencies
- ✅ ~20 lines of code
- ✅ Fire-and-forget (non-blocking)
- ❌ No retry logic (acceptable for notifications)
- ❌ No delivery confirmation (if bot is down, notification is lost)

**Implementation:**
```javascript
var https = require('https');

function notifyAdmin(message) {
    var token = process.env.TELEGRAM_BOT_TOKEN;
    var chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        console.log('[Notification] TELEGRAM not configured, skipping');
        return;
    }
    var payload = JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
    });
    var req = https.request({
        hostname: 'api.telegram.org',
        path: '/bot' + token + '/sendMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    }, function(res) {
        if (res.statusCode !== 200) {
            console.error('Telegram error:', res.statusCode);
        }
    });
    req.on('error', function(err) {
        console.error('Telegram request error:', err.message);
    });
    req.write(payload);
    req.end();
}
```

### Pattern 4: Backup on Write

**What:** Every time a data file is written, create a timestamped backup in `data/backups/`. Keep last N backups.

**When to use:** When there's no database and data loss is unacceptable.

**Implementation:**
```javascript
var BACKUP_DIR = path.join(__dirname, 'data', 'backups');
var MAX_BACKUPS = 50;

function backupFile(filePath) {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    var name = path.basename(filePath, '.json');
    var ts = new Date().toISOString().replace(/[:.]/g, '-');
    var backup = path.join(BACKUP_DIR, name + '-' + ts + '.json');
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backup);
    // Cleanup old backups
    var files = fs.readdirSync(BACKUP_DIR)
        .filter(function(f) { return f.indexOf(name + '-') === 0; })
        .sort();
    while (files.length > MAX_BACKUPS) {
        fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
    }
}
```

### Pattern 5: Status Transition Validation (Orders)

**What:** Orders can only transition forward through a defined pipeline, or jump to `cancelled` from any state.

**When to use:** When business logic requires ordered state changes.

**Valid transitions:**
```
new → confirmed → processing → shipped → delivered
 ↓       ↓           ↓           ↓
 └──────→ cancelled ←────────────┘
```

**Implementation:**
```javascript
var ORDER_STATUSES = ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
var VALID_TRANSITIONS = {
    'new': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'cancelled'],
    'delivered': [],
    'cancelled': []
};

function isValidTransition(from, to) {
    return VALID_TRANSITIONS[from] && VALID_TRANSITIONS[from].indexOf(to) !== -1;
}
```

## Anti-Patterns

### Anti-Pattern 1: Modifying `writeProducts` Without Atomic Writes

**What people do:** Add new data files using `fs.writeFileSync` directly, same as current code.
**Why it's wrong:** Server crash during write → corrupted file → all data lost. The current `writeProducts()` is already dangerous.
**Do this instead:** Implement `atomicWrite()` first (Phase 1), then use it for ALL data files — existing and new.

### Anti-Pattern 2: Saving Order as Reference to Product

**What people do:** Store only `productId` in order items and look up name/price from products at display time.
**Why it's wrong:** If product is deleted or price changes, historical orders show wrong data. Order is a legal document that must be immutable.
**Do this instead:** Snapshot all relevant data (name, price, image) in the order at creation time. Keep `productId` as optional reference only.

### Anti-Pattern 3: Approving Reviews Automatically

**What people do:** Make submitted reviews immediately visible on site.
**Why it's wrong:** Spam, inappropriate content, competitor sabotage. Small stores get targeted by bot reviews.
**Do this instead:** All user-submitted reviews start as `pending`. Admin approves each one. Only `approved` reviews are returned by the public API.

### Anti-Pattern 4: Keeping WhatsApp as Primary Order Channel

**What people do:** Leave order flow as-is (just sends WhatsApp message) and add a parallel "save to server" step.
**Why it's wrong:** Two sources of truth. If WhatsApp message fails (network issue, blocked), owner doesn't know about order. If server save fails, customer thinks order wasn't placed.
**Do this instead:** Server is primary — POST to API first, then optionally notify via messenger. If API fails, show error. If API succeeds, order is saved regardless of messenger notification result.

### Anti-Pattern 5: Growing server.js Beyond ~600 Lines Without Refactoring

**What people do:** Keep adding routes to the single file until it's 1000+ lines.
**Why it's wrong:** Hard to navigate, merge conflicts, difficult code review.
**Do this instead:** server.js should stay under ~600 lines. If it grows beyond that, split into `require()` modules: `routes/orders.js`, `routes/reviews.js`, `utils/notify.js`. This uses CommonJS (already used) and doesn't break any project constraints. But don't do this prematurely — only when the file actually becomes unwieldy.

## Build Order (Component Dependencies)

```
Phase 1: Security Foundation (blocks everything)
  ├── Atomic writes (atomicWrite function)
  ├── Fix hardcoded password
  ├── Remove SVG from allowed uploads
  ├── Backup service (backupFile function)
  └── Fix path traversal in image delete

Phase 2: Order Data Layer (depends on Phase 1)
  ├── Create data/orders.json
  ├── Add readOrders() / writeOrders() with atomic writes
  ├── Order number generation
  └── Seed empty file on server start

Phase 3: Order API + Cart Integration (depends on Phase 2)
  ├── POST /api/orders (public, with rate limiting)
  ├── GET /api/orders (admin, with filters)
  ├── GET /api/orders/:id (admin)
  ├── PUT /api/orders/:id/status (admin, with transition validation)
  ├── GET /api/orders/stats (admin)
  └── Modify cart.html: POST to API → success screen with order number

Phase 4: Review Data Layer + API (depends on Phase 1)
  ├── Create data/reviews.json
  ├── Migrate existing static reviews from HTML to JSON
  ├── Add readReviews() / writeReviews() with atomic writes
  ├── GET /api/reviews (public, approved only, with stats)
  ├── POST /api/reviews (public, with rate limiting)
  ├── GET /api/reviews/all (admin, with status filter)
  ├── PUT /api/reviews/:id (admin, approve/reject)
  └── DELETE /api/reviews/:id (admin)

Phase 5: Notification System (depends on Phase 2 + Phase 4)
  ├── Add notifyAdmin() function (Node https → Telegram)
  ├── Trigger on POST /api/orders
  ├── Trigger on POST /api/reviews
  └── Environment variable setup (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)

Phase 6: Admin Panel Enhancement (depends on Phase 3 + Phase 4)
  ├── Create admin-orders.html (order list, detail, status management)
  ├── Add review moderation section to admin.html
  ├── Modify reviews.html to load dynamically from API
  ├── Add styles for new admin sections to style.css
  └── Update robots.txt to block admin-orders.html
```

**Dependency rationale:**
- **Phase 1 must be first:** All new data writes must be atomic. Adding orders/reviews on top of the current unsafe `writeFileSync` would expose new data to the same corruption risk.
- **Phases 2-3 are sequential:** API depends on data model.
- **Phases 2 and 4 can partially overlap:** Order and review data layers are independent. But Phase 1 must be complete for both.
- **Phase 5 depends on 2+4:** Notifications fire when orders or reviews are created. The handlers must exist first.
- **Phase 6 depends on 3+4+5:** Admin UI needs working APIs and notification feedback.

## Scaling Considerations

| Scale | Current Architecture | When to Adjust |
|-------|---------------------|----------------|
| **0-500 orders** | JSON files + atomic writes. Everything in this plan works perfectly. | No changes needed |
| **500-5K orders** | JSON files start taking longer to read/write full array. `orders.json` might reach 1-2 MB. | Add basic pagination on server (skip/take). Add in-memory cache for reads. Consider splitting orders by month (`orders-2026-04.json`) |
| **5K+ orders** | Full-file reads become slow. Concurrent admin access risk. | Time to migrate to SQLite. The data models and API design remain the same — only the storage layer changes |

### Scaling Priorities for This Store

1. **First bottleneck: synchronous file I/O** — Already identified in CONCERNS.md. At ~50+ RPS or with a large JSON file, `readFileSync` blocks the event loop. Mitigation: the store has very low traffic (handmade leather goods, single admin). This won't be a real problem until 5K+ orders.
2. **Second bottleneck: orders.json size** — Each order is ~500 bytes of JSON. At 1000 orders that's ~500KB. Acceptable. At 5000 orders (~2.5MB), reads slow down. Mitigation: pagination in the API (only return page of orders, not full array).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Telegram Bot API | Node.js `https` built-in, fire-and-forget POST | Zero deps. Optional — works without if env vars not set. Setup: @BotFather → token, @userinfobot → chat_id |
| WhatsApp (existing) | Keep as `window.open('wa.me/...')` in cart.html | Secondary option for customer to notify owner directly. NOT the primary order channel anymore |
| Telegram direct (existing) | Keep as `window.open('t.me/...')` in cart.html | Same as WhatsApp — secondary option |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| cart.html ↔ Order API | `fetch()` POST → JSON response | Public endpoint, no auth. Rate limited by IP |
| reviews.html ↔ Review API | `fetch()` GET + POST → JSON | Public endpoints. GET returns only approved |
| admin-orders.html ↔ Order API | `fetch()` with Bearer token | Admin auth required for all endpoints |
| admin.html ↔ Review API | `fetch()` with Bearer token | Admin auth for moderation (approve/reject) |
| Order API ↔ Notification Service | Direct function call | `notifyAdmin(orderSummary)` — synchronous dispatch, async HTTP |
| Review API ↔ Notification Service | Direct function call | `notifyAdmin(reviewSummary)` — same pattern |
| All data access ↔ Atomic Write | `atomicWrite()` function | Single shared function for all file writes |
| All data access ↔ Backup Service | `backupFile()` called before write | Optional but recommended — keeps last 50 snapshots |

## Data Initialization (Server Start)

On server start, `server.js` should ensure all data files exist. Extend the existing pattern:

```javascript
// Existing:
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
if (!fs.existsSync(SITE_DATA_FILE)) fs.writeFileSync(SITE_DATA_FILE, '{}', 'utf-8');

// Add:
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '{"orders":[]}', 'utf-8');
if (!fs.existsSync(REVIEWS_FILE)) fs.writeFileSync(REVIEWS_FILE, '{"reviews":[]}', 'utf-8');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
```

## Key Architectural Constraints

These are non-negotiable constraints from the project that shape every decision above:

1. **No new npm packages** — Telegram notifications via `https` built-in, no `axios`, no `node-telegram-bot-api`
2. **`var` + `function` declarations** — No `const`, `let`, arrow functions, template literals
3. **No ES modules on client** — All functions global on `window`
4. **Single server.js** — All routes in one file (until it exceeds ~600 lines)
5. **JSON files, not databases** — SQLite/PostgreSQL explicitly out of scope
6. **Russian language** — All user-facing strings, order statuses, and comments in Russian
7. **Existing style** — Inline onclick handlers, BEM-like CSS classes, CSS variables from `:root`

## Sources

- Direct codebase analysis: `server.js` (287 lines), `cart.html` (260 lines), `reviews.html` (258 lines), `admin.html` (527 lines), `common.js` (92 lines)
- Existing architecture document: `.planning/codebase/ARCHITECTURE.md`
- Existing concerns: `.planning/codebase/CONCERNS.md` — 30 documented issues informing design decisions
- Telegram Bot API: `https://core.telegram.org/bots/api#sendmessage` — verified endpoint structure
- Node.js `https` module: Built-in, zero dependencies required

---

*Architecture research for: Timur.Shop order management, review system, and notification integration*
*Researched: 2026-04-06*

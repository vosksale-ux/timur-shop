# AGENTS.md — TIMUR.SHOP

## О проекте

Интернет-магазин кожаных изделий ручной работы (кошельки, ремни, сумки, чехлы, аксессуары).
Домен: timur.shop. Язык: русский.

## Стек

- **Backend:** Node.js, Express 5, Multer (загрузка файлов)
- **Frontend:** Vanilla JS (без фреймворков), CSS-переменные, Swiper (карусели), Lenis (smooth scroll), Google Fonts (Montserrat)
- **Хранение:** JSON-файлы (`data/products.json`, `data/site-data.json`), без БД
- **Загрузки:** `uploads/` — изображения товаров и видео

## Запуск

```bash
npm start        # node server.js → http://localhost:3000
```

## Структура файлов

```
server.js          — Express-сервер, REST API, авторизация, загрузка файлов
script.js          — Клиентский JS для index.html (каталог, корзина, карусели)
style.css          — Все стили, CSS-переменные в :root
admin.html         — Админ-панель (CRUD товаров, управление видео)
index.html         — Главная страница (каталог товаров)
about.html         — О нас + видеогалерея
cart.html          — Корзина
reviews.html       — Отзывы
delivery.html      — Доставка
payment.html       — Оплата
terms.html         — Условия
privacy.html       — Конфиденциальность
offerta.html       — Оферта
returns.html       — Возвраты
data/              — JSON-хранилище (products.json, site-data.json)
uploads/           — Загруженные файлы (изображения, видео)
```

## API

### Публичные
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/products` | Список товаров (фильтр `?category=`) |
| GET | `/api/products/:id` | Один товар |
| GET | `/api/site-data` | Данные сайта (видео и пр.) |

### Защищённые (требуют Bearer token)
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/login` | Авторизация (`{password}`) → token |
| POST | `/api/products` | Создать товар (multipart, поля: name, desc, price, category, images[]) |
| PUT | `/api/products/:id` | Обновить товар (multipart) |
| DELETE | `/api/products/:id` | Удалить товар |
| DELETE | `/api/products/:id/images` | Удалить изображение (`{image}`) |
| POST | `/api/videos` | Загрузить видео (multipart: video файл или url, title) |
| DELETE | `/api/videos/:id` | Удалить видео |

### Авторизация
- Логин: `POST /api/login` с паролем → возвращает JWT-like токен
- Все admin-эндпоинты требуют заголовок `Authorization: Bearer <token>`
- Токен генерируется при старте сервера (`crypto.randomBytes`)

## Категории товаров

`wallets` (кошельки), `belts` (ремни), `bags` (сумки), `covers` (чехлы), `accessories` (аксессуары)

## Агенты проекта

В проекте действуют три агента:

### 🛠 Ремесленник (`AGENTS-ремесленник.md`)
Агент-разработчик. Пишет код, исправляет баги, добавляет фичи.
Полная инструкция: **AGENTS-ремесленник.md**

### 🎨 Веб-дизайнер (`AGENTS-вебдизайнер.md`)
Агент-дизайнер. Проектирует визуальные решения, предлагает анимации и эффекты, следит за трендами и UX/UI. Изучил базу знаний `C:\Users\asus\Desktop\база знаний\Вебразработка\` (150+ материалов: анимации, UX/UI, тренды 2023-2026, инструменты).
Полная инструкция: **AGENTS-вебдизайнер.md**

### 🔍 Мастер (`AGENTS-мастер.md`)
Старший агент-ревьюер. Проверяет код Ремесленника, контролирует качество, даёт отчёт владельцу.
Полная инструкция: **AGENTS-мастер.md**

### Порядок работы
1. **Веб-дизайнер** предлагает визуальное решение (при необходимости)
2. **Ремесленник** реализует задачу
3. **Мастер** проверяет результат и формирует отчёт
4. Владелец получает отчёт и принимает решение

## Стиль кода

- **JS:** `var` вместо `const`/`let`, `function` declarations, без стрелочных функций, без ES-модулей (CommonJS на сервере, глобальные функции на клиенте)
- **CSS:** CSS-переменные в `:root`, цветовая схема — тёмная кожа (коричневые/медные тона), BEM-подобные классы
- **HTML:** Инлайн-обработчики (`onclick`), без шаблонизаторов
- **Без комментариев** в коде (кроме случаев явного запроса)

## Правила для агента

1. Не использовать `const`/`let`, стрелочные функции, template literals — только `var` и `function`
2. Не добавлять новые npm-зависимости без явного запроса
3. Все новые API-эндпоинты добавлять в `server.js`, соблюдая существующие паттерны (adminAuth middleware, multer для файлов)
4. Стили добавлять в `style.css`, используя CSS-переменные из `:root`
5. Клиентский JS — в `script.js` (для index.html) или инлайн в `<script>` на других страницах
6. Не трогать `data/` файлы напрямую — только через API
7. Не коммитить изменения без явного запроса пользователя
8. Проверять безопасность: экранировать HTML (функция `escapeHtml`), валидировать пути файлов
9. Русский язык для всех пользовательских строк и коммит-сообщений

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Timur.Shop — Интернет-магазин кожаных изделий**

Действующий интернет-магазин кожаных изделий ручной работы (кошельки, ремни, сумки, чехлы, аксессуары) на домене timur.shop. Построен на Node.js/Express + Vanilla JS с JSON-хранилищем. Требуется доработка до production-качества: фикс критических багов, улучшение верстки и добавление новых функций (система заказов, динамические отзывы).

**Core Value:** Покупатель может легко выбрать и заказать кожаное изделие, а владелец — управлять каталогом и заказами через удобную админку.

### Constraints

- **Tech stack:** Node.js + Express + Vanilla JS — фреймворки не меняем
- **Хранение:** JSON-файлы — БД не подключаем
- **Стиль кода:** var, function declarations, без ES-модулей на клиенте — следуем AGENTS.md
- **Новые зависимости:** Минимум — без лишних npm-пакетов без согласования
- **Язык:** Русский для всех пользовательских строк
- **Домен:** timur.shop
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (ES5-compatible) — Server (`server.js`) and all client-side code. Uses `var`, `function` declarations, no arrow functions, no template literals, no ES modules.
- CSS3 — All styling via CSS variables and custom properties, single file `style.css`
- HTML5 — 11 static HTML pages, no templating engine
## Runtime
- Node.js (version not pinned, no `.nvmrc` or `engines` field in `package.json`)
- Entry point: `server.js`
- npm (no `package-lock.json` committed — lockfile absent)
- No `yarn.lock` or `pnpm-lock.yaml`
## Frameworks
- Express ^5.2.1 — HTTP server, REST API, static file serving. Express 5 release candidate.
- Multer ^1.4.4 — Multipart/form-data handling for image and video uploads
- None. No test framework, no test files, no test scripts in `package.json`.
- No build tools. No bundler (no Webpack, Vite, Rollup, esbuild).
- No transpiler (no Babel, TypeScript).
- No CSS preprocessor (no Sass, PostCSS).
- No dev server (no nodemon, concurrently).
- Single script: `npm start` → `node server.js`
## Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | HTTP server, routing, middleware, static files, JSON API |
| `multer` | ^1.4.4 | File upload handling (images + videos via multipart/form-data) |
| Module | Purpose |
|--------|---------|
| `fs` | Read/write JSON data files, file deletion for cleanup |
| `path` | Path construction for uploads, data files |
| `crypto` | Token generation for admin auth (`crypto.randomBytes(32)`) |
## Frontend Libraries (CDN-loaded)
| Library | Version | CDN | Purpose | Used on |
|---------|---------|-----|---------|---------|
| Swiper | 11 | `cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js` + `.min.css` | Reviews carousel on homepage | `index.html` only |
| Lenis | 1.1.18 | `unpkg.com/lenis@1.1.18/dist/lenis.min.js` | Smooth scroll behavior | All pages except `admin.html` |
| Google Fonts (Montserrat) | wght 400;600;700;800;900 | `fonts.googleapis.com` | Primary typeface | All pages |
## CSS Approach
- `--bg: #1a1410` (dark brown background)
- `--accent: #c8843c` (copper/amber accent)
- `--text: #f0e6d8` (warm white text)
- `--card: #2a2118` (card background)
- Full palette defined in `:root` block (lines 1–16 of `style.css`)
## Client-Side JavaScript
- `common.js` (92 lines) — Shared utilities: menu toggle, scroll-to-top, toast notifications, Lenis init, scroll animations, cart (localStorage), `escapeHtml`, `updateCartCount`
- `script.js` (529 lines) — Homepage-specific: product catalog rendering, carousel, filters, detail modal, zoom, cart actions, counter animation, Swiper init, tilt effect, parallax
- Inline `<script>` blocks on `about.html`, `cart.html`, `reviews.html`, `admin.html` — Page-specific logic
- `localStorage` — Cart persistence (key: `timur_cart`)
- `sessionStorage` — Admin token (key: `timur_admin_token`)
- `fetch()` — API calls to Express backend
- `IntersectionObserver` — Scroll-triggered animations
- `FormData` — Multipart form submission for admin uploads
- `FileReader` — Image preview in admin panel
## Configuration
- Single env var: `ADMIN_PASSWORD` (defaults to `'timur2024'` in `server.js` line 105)
- No `.env` file present
- No config files (no `.eslintrc`, `.prettierrc`, `tsconfig.json`, `biome.json`)
- No build step. Files served as-is by Express static middleware.
- Port: 3000 (`const PORT = 3000`)
- Upload limits: 10 MB images, 50 MB video, max 10 files
- Rate limiting: 5 login attempts per IP per 15 minutes
## Platform Requirements
- Node.js (version not specified, Express 5 requires Node >= 18)
- npm for installing 2 dependencies
- Run: `npm start` → `http://localhost:3000`
- No Dockerfile, no CI/CD config
- Single-process Node.js server
- Static files served by Express (no CDN, no Nginx proxy config committed)
- File uploads stored locally in `uploads/` directory
- JSON files in `data/` for persistence (no database)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## JavaScript Style Guide
### Variable Declarations
### Function Declarations
### Module System
- **Server (`server.js`):** CommonJS (`require` / `module.exports`)
- **Client (`script.js`, `common.js`, inline `<script>`):** No modules. All functions are global, attached to `window` scope.
- **No ES module syntax** (`import`/`export`) anywhere.
### String Concatenation
### No Comments
## Naming Conventions
### Variables (JavaScript)
- **camelCase** for all variables and functions:
- **UPPER_SNAKE_CASE** for constants (server-side configuration):
- **Module-level state** uses camelCase:
### CSS Classes
- Block names: `.product`, `.hero`, `.cart-btn`, `.category-card`
- Element modifiers: `.product-img`, `.product-info`, `.product-footer`
- State classes: `.active`, `.visible`, `.open`, `.show`, `.hide`
- Component variants: `.btn-outline`, `.btn-save`, `.btn-cancel`
### CSS Variables
### File Names
- **HTML:** lowercase with hyphens, `.html` extension: `index.html`, `admin.html`, `cart.html`, `about.html`, `delivery.html`
- **JS:** lowercase with hyphens, `.js` extension: `server.js`, `script.js`, `common.js`, `test-login.js`
- **CSS:** single file `style.css`
- **Data:** JSON files in `data/` directory: `products.json`, `site-data.json`
## HTML Conventions
### Document Structure
### Attribute Order in HTML Elements
### Inline Event Handlers
### Semantic Elements
- `<header>`, `<main>`, `<footer>`, `<nav>`, `<section>`
- `<main id="main-content">` on every page (for skip-link target)
- `<a href="#main-content" class="skip-link">` accessibility link
### Forms
- `onsubmit="functionName(event)"` for form submission
- `.input-field` class for all inputs
- Inline validation with `showToast()` for error messages
## CSS Conventions
### Single Stylesheet
### Layout Pattern
### Responsive Breakpoints
| Breakpoint | Purpose |
|---|---|
| `max-width: 1024px` | Tablet adjustments (e.g., `.about-stats`) |
| `max-width: 768px` | Mobile: show burger, hide nav, stack grids |
| `min-width: 769px` | Desktop-only elements (e.g., `.header-phone`) |
### Typography
- Font: Montserrat (weights: 400, 600, 700, 800, 900)
- Fluid sizing with `clamp()`:
- `text-wrap: balance` for headings, `text-wrap: pretty` for paragraphs
### Animations
- CSS transitions on `.product`, `.category-card`, `.advantage-card`: `transition: 0.3s` or `transition: 0.4s`
- Keyframe animations: `fadeInUp`, `fadeInDown`, `bounce`, `cartBounce`, `shimmer`
- IntersectionObserver for scroll-triggered `.fade-up`, `.fade-left`, `.fade-right`, `.fade-scale`
- `prefers-reduced-motion` respected:
### Color Palette (Dark Leather Theme)
| Variable | Hex | Usage |
|---|---|---|
| `--bg` | `#1a1410` | Page background |
| `--bg2` | `#231c15` | Section backgrounds |
| `--card` | `#2a2118` | Card backgrounds |
| `--text` | `#f0e6d8` | Primary text |
| `--text2` | `#b8a898` | Secondary text |
| `--accent` | `#c8843c` | Primary accent (buttons, borders) |
| `--accent2` | `#daa06d` | Hover states, highlights |
| `--copper` | `#b87333` | Gradient accent |
| `--border` | `#3d3228` | Borders |
| `--stitch` | `#5a4a38` | Decorative «stitch» borders |
| `--danger` | `#dc3c3c` | Errors, delete buttons |
## API Conventions
### URL Pattern
### Response Format
### HTTP Status Codes
| Code | Usage |
|---|---|
| `200` | Success (GET, POST create, PUT update, DELETE) |
| `400` | Validation errors, bad file type |
| `401` | Missing/invalid auth token |
| `404` | Resource not found |
| `429` | Rate limit exceeded (login) |
| `500` | Server error (caught exceptions) |
### Auth Pattern
- `POST /api/login` with `{ password }` body → returns `{ token: "..." }`
- All admin endpoints require `Authorization: Bearer <token>` header
- Middleware function `adminAuth()` in `server.js` validates token
- Token generated at server startup via `crypto.randomBytes(32).toString('hex')`
- Rate limiting on login: 5 attempts per IP per 15 minutes
### File Upload Pattern
## Error Handling
### Server-Side
- **Validation errors:** Return `400` with descriptive Russian message
- **Auth errors:** Return `401` with `"Не авторизован"`
- **Not found:** Return `404` with `"Товар не найден"`
- **Server errors:** Wrapped in try/catch, logged with `console.error()`, return `500`
- **All error messages in Russian**
### Client-Side
- **API errors:** `showToast('Ошибка загрузки каталога')` — user-friendly Russian message
- **Network errors:** Caught in `.catch()`, displayed via toast
- **No console.error on client** — errors are surfaced to user via toast
## Security Patterns
### XSS Prevention
### Path Traversal Prevention
### Static File Protection
### Input Validation
- **Categories:** Whitelist validation against `VALID_CATEGORIES` array
- **Price:** `Number()` conversion + `isNaN()` + positive check
- **File types:** Extension whitelist (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg` for images; `.mp4`, `.webm` for video)
- **File size:** 10MB for images, 50MB for video
- **Rate limiting:** Login endpoint — 5 attempts per IP per 15 minutes
## Code Organization
### Server (`server.js`)
### Client JS Files
- **`common.js`** (92 lines): Shared utilities — `toggleMenu()`, `scrollToTop()`, `showToast()`, `escapeHtml()`, `initLenis()`, `initScrollTop()`, `initScrollAnimations()`, cart helpers (`getCart`, `saveCart`, `updateCartCount`). Self-executing at bottom.
- **`script.js`** (529 lines): `index.html`-specific — product loading, rendering, carousel, detail modal, zoom, tilt, parallax.
- **Inline `<script>`**: Page-specific logic for `cart.html`, `about.html`, `admin.html`
### Data Files
- `data/products.json`: Array of product objects
- `data/site-data.json`: Object with `videos` array
- **Never edit directly** — always through API endpoints
## Git Conventions
### Commit Messages
- **Features:** Descriptive noun phrases: `"Video gallery: admin CRUD, modal player on about page"`
- **Bugfixes:** `"Bugfixes: tilt effect, cart by ID, XSS, truncated descriptions"`
- **Refactoring:** `"Рефакторинг: безопасность, анимации, common.js"`
- **SEO/Accessibility:** `"SEO: Schema.org, sitemap.xml, canonical, Twitter Card, robots.txt; a11y: skip-link"`
- **Fix iterations:** `"Fix video modal controls..."`, `"Reduce video modal size to 420px"`
### No Auto-Commit
## Language
- **All user-facing strings:** Russian (`"Товар не найден"`, `"В корзину"`, `"Ошибка загрузки"`)
- **All commit messages:** Russian or English (mixed in practice, but lean Russian)
- **Code identifiers:** English (`loadProducts`, `escapeHtml`, `addToCart`)
- **CSS classes:** English (`.product`, `.hero`, `.cart-btn`)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Single Express server file (`server.js`) handles all routing, API, auth, file uploads, and data access
- No database — JSON file storage with synchronous read/write
- No frontend framework — vanilla JS with global functions on `window`
- No build step — static HTML files served directly, CSS in one file
- Server-sent HTML pages with client-side rendering of dynamic content (product catalog)
- Client-side routing via standard `<a href>` navigation between separate HTML files
- Cart state persisted in `localStorage`
## Layers
- Purpose: REST API, static file serving, authentication, file upload handling
- Location: `server.js` (single file, 287 lines)
- Contains: Express routes, middleware config, data access functions, auth logic
- Depends on: `express`, `multer`, `fs`, `path`, `crypto` (Node built-ins)
- Used by: All client pages via API calls
- Purpose: Common browser utilities — cart, menu, toast, scroll, Lenis init
- Location: `common.js` (92 lines)
- Contains: `toggleMenu()`, `scrollToTop()`, `showToast()`, `escapeHtml()`, `getCart()`, `saveCart()`, `updateCartCount()`, `initLenis()`, `initScrollTop()`, `initScrollAnimations()`
- Depends on: Lenis (CDN), DOM elements (`#toast`, `#cart-count`, `#cart-fab-count`, `#scrollTopBtn`, `.fade-up`, etc.)
- Used by: All HTML pages that include `<script src="common.js">`
- Purpose: Product catalog rendering, filtering, carousels, zoom, detail modal
- Location: `script.js` (529 lines)
- Contains: `loadProducts()`, `renderProducts()`, `filterProducts()`, `openDetail()`, `addToCart()`, carousel/zoom functions, tilt effect, parallax
- Depends on: `/api/products` endpoint, `common.js` (cart functions, `escapeHtml`, toast)
- Used by: `index.html` only
- Purpose: Individual page logic (cart, about, admin, reviews)
- Location: Inline `<script>` blocks in each HTML page
- Contains: Page-specific rendering and interaction logic
- Depends on: `common.js`, page-specific API endpoints
- Used by: Their respective HTML pages only
- Purpose: All styling via CSS variables and component classes
- Location: `style.css` (1423 lines)
- Contains: CSS custom properties in `:root`, global resets, header/footer, product grid, modals, animations, responsive breakpoints, admin styles
- Depends on: Google Fonts (Montserrat), Swiper CSS (CDN)
- Used by: All HTML pages via `<link rel="stylesheet" href="style.css">`
- Purpose: Persistent JSON storage
- Location: `data/products.json` (products), `data/site-data.json` (videos, site config)
- Contains: Flat arrays/objects, no relational structure
- Depends on: Filesystem
- Used by: `server.js` via `readProducts()`/`writeProducts()` and `readSiteData()`/`writeSiteData()`
## Data Flow
```
```
```
```
```
```
```
```
```
```
- Cart: `localStorage` key `timur_cart` — array of `{id, name, price, qty, image}`
- Admin token: `sessionStorage` key `timur_admin_token` — single-use server-generated hex token
- Product list cache: `allProducts` global variable in `script.js`
- Zoom state: module-level vars `zoomScale`, `zoomPanX`, `zoomPanY`, `zoomDragging`
- Detail state: module-level vars `detailImages[]`, `detailIndex`
## Key Abstractions
- Purpose: Read/write JSON files with atomic synchronous operations
- Examples: `readProducts()` (line 71), `writeProducts()` (line 75), `readSiteData()` (line 209), `writeSiteData()` (line 216), `nextId()` (line 79)
- Pattern: `JSON.parse(fs.readFileSync(...))` / `fs.writeFileSync(..., JSON.stringify(...))`
- Purpose: Protect admin endpoints via Bearer token comparison
- Examples: `adminAuth()` (line 88 in `server.js`)
- Pattern: Compare `req.headers['authorization']` against `'Bearer ' + ADMIN_TOKEN`
- Purpose: Handle image/video uploads with validation
- Examples: `upload` (multer, line 45), `uploadVideo` (multer, line 51)
- Pattern: `multer.diskStorage` with timestamp+random filename, extension whitelist, size limits
- Purpose: Dynamic HTML generation for product catalog
- Examples: `renderProducts()` (line 59 in `script.js`), `renderCart()` (line 136 in `cart.html`)
- Pattern: Build HTML string → set `innerHTML` → attach event listeners via `querySelectorAll().forEach()`
## Entry Points
- Location: `server.js`
- Triggers: `node server.js` or `npm start`
- Responsibilities: Creates Express app, registers middleware, defines 10 API routes, starts listening on port 3000
- Location: `index.html` → `common.js` + `script.js`
- Triggers: Browser navigation to `/`
- Responsibilities: Full product catalog with filtering, detail modal, zoom, cart interaction
- Location: `admin.html` → inline `<script>`
- Triggers: Browser navigation to `/admin.html`
- Responsibilities: Product CRUD, video management, login/logout
- Location: `cart.html` → `common.js` + inline `<script>`
- Triggers: Browser navigation to `/cart.html`
- Responsibilities: Display cart, quantity management, order submission via WhatsApp/Telegram
## API Design
### Public Endpoints (no auth)
| Method | Path | Description | Response |
|--------|------|-------------|----------|
| GET | `/api/products` | All products, optional `?category=` filter | `{id, name, desc, price, category, images[]}[]` |
| GET | `/api/products/:id` | Single product by numeric ID | Product object or 404 |
| GET | `/api/site-data` | Videos and site configuration | `{videos: [{id, title, url}]}` |
### Auth Endpoint
| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| POST | `/api/login` | `{"password": "..."}` → `{"token": "..."}` | 5 attempts per IP per 15 min |
### Protected Endpoints (Bearer token required)
| Method | Path | Description | Content-Type |
|--------|------|-------------|--------------|
| POST | `/api/products` | Create product | multipart/form-data |
| PUT | `/api/products/:id` | Update product (partial) | multipart/form-data |
| DELETE | `/api/products/:id` | Delete product + files | JSON |
| DELETE | `/api/products/:id/images` | Remove single image | `{"image": "/uploads/..."}` |
| POST | `/api/videos` | Upload video (file or URL) | multipart/form-data or JSON |
| DELETE | `/api/videos/:id` | Delete video | — |
## Authentication Flow
```
```
- Token generated once per server process restart
- Not persisted — all admin sessions invalidated on restart
```
```
```
```
## File Upload Flow
```
```
```
```
- Product deletion: iterates `product.images[]`, unlinks each file from `uploads/`
- Image deletion: validates path starts with `UPLOAD_DIR`, unlinks single file
- Video deletion: if URL starts with `/uploads/`, unlinks the file
## Middleware Pipeline (Express)
```
```
```
```
## Client-Side Architecture
```
```
```
```
```
```
- No ES modules, no CommonJS on client
- All functions are global (`window` scope)
- IIFEs used for initialization: `initZoomHandlers`, `initCounters`, `initReviewsSwiper`, `initHeroParallax`
- State via module-level `var` declarations at top of `script.js`
## Cart Implementation
```json
```
- `getCart()` — `common.js` line 71 — reads/parses localStorage
- `saveCart(cart)` — `common.js` line 76 — stringifies/writes localStorage
- `updateCartCount()` — `common.js` line 80 — updates `#cart-count` and `#cart-fab-count`
- `addToCart(id, name, price, image)` — `script.js` line 418 — adds or increments qty
- Cart page: `changeQty(index, delta)`, `removeItem(index)` — `cart.html` inline
- No backend order endpoint
- Builds URL-encoded message string with `%0A` line breaks
- Opens WhatsApp (`wa.me/{phone}?text=...`) or Telegram (`t.me/{username}?text=...`) in new tab
- Clears cart after send
## Admin Panel Architecture
- Create: POST with FormData (multipart) including images
- Edit: Pre-populated form → PUT with FormData (new images appended to existing)
- Individual image deletion via `DELETE /api/products/:id/images`
- Upload MP4/WebM file or provide YouTube/Vimeo URL
- Thumbnail extraction for YouTube (`img.youtube.com/vi/{id}/mqdefault.jpg`) and Vimeo (`vumbnail.com`)
- Delete videos with file cleanup
## Error Handling
- Multer errors → `400 {error: message}`
- Validation errors → `400 {error: description}`
- Not found → `404 {error: 'Товар не найден'}`
- Auth failure → `401 {error: 'Не авторизован'}`
- Rate limit → `429 {error: 'Слишком много попыток'}`
- Unexpected errors → `500 {error: err.message}`
- `fetch().then()` chains with `.catch()` handlers
- Error toast via `showToast('Ошибка: ...')`
- No global error handler
## Cross-Cutting Concerns
- Server: `escapeHtml()` function in `server.js` (line 84) — regex-based HTML entity encoding
- Client: `escapeHtml()` function in `common.js` (line 28) — DOM-based (`textContent` → `innerHTML`)
- Admin: Duplicate `escapeHtml()` inline in `admin.html` (line 163) — same DOM-based approach
- Image deletion: `cleanSrc = removeSrc.replace(/\.\./g, '').replace(/\/\//g, '/')`
- File deletion: `filePath.startsWith(UPLOAD_DIR)` check before `fs.unlinkSync`
- Login endpoint only
- In-memory `loginAttempts` object keyed by IP
- 5 attempts per 15-minute window
- Window tracked per-attempt timestamp, cleaned on each login
- Schema.org JSON-LD on every page (Organization, WebSite, BreadcrumbList, FAQPage)
- Open Graph and Twitter Card meta tags
- `sitemap.xml` and `robots.txt`
- Canonical URLs
- `<meta name="robots" content="noindex, nofollow">` on admin page
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

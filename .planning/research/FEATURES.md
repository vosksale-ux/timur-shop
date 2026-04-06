# Feature Landscape

**Domain:** Artisan leather goods e-commerce store (brownfield enhancement)
**Researched:** 2026-04-06
**Confidence:** HIGH (based on thorough codebase analysis + e-commerce domain knowledge)

---

## Table Stakes

Features users expect from any e-commerce store. Missing = customers leave or distrust the store.

### Security & Trust (Must be first — blocks everything)

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| T1 | Remove hardcoded password | Hardcoded `timur2024` fallback in source code — anyone reading code gets admin access. Fundamentally breaks trust. | Low | Remove `|| 'timur2024'` fallback, require env var. 1 line change. |
| T2 | Remove SVG from upload whitelist | SVG files allow embedded `<script>` tags = stored XSS on every page that shows product images. | Low | Remove `.svg` from `ALLOWED_IMAGE_EXT`. 1 line change. |
| T3 | Atomic JSON writes | Server crash during `writeFileSync` = corrupted `products.json` = total data loss. All products gone. | Medium | Write to temp file → `fs.rename()`. ~15 lines in `writeProducts()` / `writeSiteData()`. |
| T4 | Automated backups | No backups exist. Single disk failure or corruption = everything lost permanently. | Low | Cron job or server-side backup endpoint copying `data/*.json` with timestamp. ~30 lines. |
| T5 | Replace fake contacts | Phone `+7999000000` in 4 files. Customers literally cannot reach the store. SEO trusts the phone number too. | Low | Replace with real number. Create `data/config.json` or env vars. |

### Core Shopping Experience

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| T6 | Order persistence | Current: orders are WhatsApp messages that may never arrive. If the customer closes the tab before WhatsApp opens, order is lost. No tracking, no history. | High | New `data/orders.json`, CRUD API, order form submits to server (not just WhatsApp). ~200 lines server + ~150 lines client. |
| T7 | Real contactable store | Every e-commerce site needs real phone, address, social links. Currently all placeholder. | Low | Part of T5 — config-driven contacts. |
| T8 | Working delivery info page | `delivery.html` exists but needs accurate, real delivery options and prices. | Low | Content update, not code. |
| T9 | Mobile-responsive layout | 60%+ of artisan store traffic is mobile. Current layout has broken sections on small screens (CONCERNS.md reports UI issues). | Medium | Fix CSS breakpoints, touch targets, overflowing containers. No new features — fix what's broken. |
| T10 | Visible product reviews | Customers trust peer reviews more than marketing. Current reviews are 8 hardcoded HTML blocks — not real, not dynamic, can't grow. | Medium | Create `data/reviews.json`, API endpoints, admin moderation, dynamic rendering. ~100 lines server + ~80 lines client. |

### Legal & Compliance (Russian market)

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| T11 | Real public offer (оферта) | `offerta.html` exists but likely has generic text. Russian law requires a real public offer for e-commerce. | Low | Content update. |
| T12 | Real privacy policy | `privacy.html` exists, needs real data about what's collected. | Low | Content update. |
| T13 | Real return policy | `returns.html` exists, needs real terms matching actual delivery method. | Low | Content update. |

---

## Differentiators

Features that set this leather goods store apart. Not expected by every customer, but highly valued when discovered.

### Craftsmanship & Storytelling (High value for artisan brand)

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D1 | Product aging gallery (patina) | Leather improves with age — showing before/after photos creates desire and justifies premium pricing. Unique to leather goods. | Low | Add "age" field to products with before/after images. Could be image pairs in product detail. |
| D2 | Leather care guide | Customers worry about maintaining leather. A care page builds trust and reduces returns. Educational content sells. | Low | Static page `care.html`. Content + CSS. No JS needed. |
| D3 | Craft process video section | Already have video gallery. Enhance it with process videos showing how items are made. Differentiator: "see how your wallet is crafted". | Low | Already built — just needs content strategy. |
| D4 | Product customization note | "Personalization" — monogramming, custom size. Even a simple "add note for customization" field on order form is a differentiator for handcraft. | Medium | Add optional text field to order form. Owner handles manually. 1 field + API support. |

### Order Management (Operational excellence)

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D5 | Order status tracking | Customer gets a link to check order status (new → processing → shipped → delivered). Most artisan stores don't have this. | High | Requires order ID, status page, admin status updates. ~150 lines server + ~100 lines client. |
| D6 | Owner notifications on new order | WhatsApp message to owner when order arrives (server-side, not client-side). Currently relies on customer's WhatsApp working. | Medium | Use WhatsApp Business API or Telegram Bot API from server. Or simpler: email notification via Nodemailer. |
| D7 | Order history in admin | Owner sees all orders in admin panel with filters by status/date. Moves from "checking WhatsApp history" to structured data. | Medium | Admin orders tab with table, status dropdowns, date filters. ~120 lines admin + API. |

### Social Proof

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D8 | Photo reviews | Customers upload photos with reviews. Real product photos from real people convert much better than text alone. | Medium | Image upload on review form, photo gallery in review card. Multer already configured. |
| D9 | Product-level reviews | Show review count and average rating on each product card in catalog. Builds trust at browsing stage. | Medium | Link reviews to product IDs, compute averages, display on cards. |

---

## Anti-Features

Features to explicitly NOT build. These are traps that waste time, add complexity, and don't serve this store's model.

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|-------------|-----------|-------------------|
| A1 | User registration / accounts | Single-owner artisan store with ~20 products. Customers buy 1-2 items and leave. Registration is a conversion killer at this scale. | Guest checkout with name + phone + address. That's all that's needed. |
| A2 | Online card payment (this milestone) | Payment gateway integration (Stripe, YooKassa, Tinkoff) is complex: PCI compliance, webhook handling, refund flows, testing. It's a full milestone on its own. | Keep WhatsApp/Telegram ordering for now. Add server-side order persistence first. Payment gateway is next milestone. |
| A3 | Product search | 18 products. Catalog is one scroll. Search adds UI complexity for zero value at this scale. | Category filter already exists. Add search only if catalog exceeds 50+ items. |
| A4 | Shopping cart persistence across devices | Requires user accounts or complex token-based cart sharing. Not worth the complexity. | localStorage cart is fine. If customer switches device, they re-add 1-2 items in 30 seconds. |
| A5 | Real-time inventory management | Artisan products are often made-to-order or one-of-a-kind. Inventory counts are misleading. | "Под заказ" (made to order) model. Owner manages availability via admin (show/hide products). |
| A6 | Recommendation engine | "Customers also bought" — needs purchase history data, collaborative filtering, significant traffic. Zero value with 18 products and few orders. | Manual "Похожие товары" section: owner selects related products per item. Simple, effective. |
| A7 | Multi-currency / multi-language | Store serves Russian market. Domain is .shop (not .ru) but audience is Russian-speaking. | Single currency (₽), single language (Russian). If expanding later, add then. |
| A8 | Email marketing / newsletter | Requires email service integration, unsubscribe handling, GDPR-like compliance. Out of scope for now. | Owner can manually contact customers from order data if needed. |
| A9 | Mobile app / PWA | Unnecessary complexity. The website works on mobile. App stores require maintenance, reviews, fees. | Responsive website is sufficient. PWA could be added later as a thin shell. |
| A10 | Full CMS / blog | A blog engine is a separate product. Writing, editing, scheduling, SEO for articles — huge scope creep. | If content marketing is needed, use Instagram/Telegram. The website sells. |
| A11 | Dynamic pricing / discounts / coupons | Artisan goods have stable pricing. Coupon codes add UI, logic, and customer confusion for small savings. | Simple pricing. Occasional manual price adjustment via admin is enough. |

---

## Feature Dependencies

```
Security Fixes (T1-T5) → ALL other features (must come first)
    ↓
Order Persistence (T6) → Owner Notifications (D6)
                      → Order Status Tracking (D5)
                      → Order History in Admin (D7)
                      → Product Customization Note (D4)
    ↓
Review Persistence (T10) → Photo Reviews (D8)
                        → Product-Level Reviews (D9)
    ↓
UI Fixes (T9) → can run in parallel with T6/T10
Legal Pages (T11-T13) → can run in parallel (content only)
Care Guide (D2) → independent, can ship anytime
```

**Critical path:** Security fixes → Order system → Notifications → Status tracking

**Parallel track:** Reviews, UI fixes, legal pages, care guide

---

## MVP Recommendation

### Phase 1: Security & Trust (Blocks everything)
**Rationale:** 5 critical vulnerabilities make the store unsafe to promote. Fix these before adding any features.
1. T1: Remove hardcoded password
2. T2: Remove SVG upload XSS vector
3. T3: Atomic JSON writes
4. T4: Automated backups
5. T5: Replace fake contacts

### Phase 2: Order Management Core
**Rationale:** Orders are currently lost in WhatsApp. The single biggest business value add is persisting orders.
1. T6: Order persistence (save to server, not just WhatsApp message)
2. D7: Order history in admin panel
3. D6: Owner notifications on new order

### Phase 3: Dynamic Reviews
**Rationale:** Static reviews destroy credibility once customers realize they can't submit real ones.
1. T10: API-based review system with admin moderation
2. D9: Product-level review display on catalog

### Phase 4: UI & Polish
**Rationale:** Fix broken mobile experience and add polish. Can overlap with Phase 2-3.
1. T9: Mobile responsiveness fixes
2. D2: Leather care guide page
3. T11-T13: Real legal content

### Phase 5: Differentiators (Post-MVP)
**Rationale:** These make the store special but aren't needed for basic operation.
1. D5: Order status tracking page
2. D8: Photo reviews
3. D1: Product aging gallery
4. D4: Customization notes on order

### Defer explicitly:
- **Online payment (A2):** Next milestone after order system is stable
- **Search (A3):** When catalog exceeds 50 items
- **User accounts (A1):** Not needed at this scale

---

## Complexity Estimates

| Feature | Server Lines | Client Lines | New Files | New Data Files |
|---------|-------------|-------------|-----------|----------------|
| T1: Hardcoded password | ~5 | 0 | 0 | 0 |
| T2: SVG removal | ~1 | 0 | 0 | 0 |
| T3: Atomic writes | ~15 | 0 | 0 | 0 |
| T4: Backups | ~30 | ~20 (admin) | 0 | 0 |
| T5: Real contacts | ~10 | ~15 | 0 | `config.json` |
| T6: Order persistence | ~200 | ~150 | 0 | `orders.json` |
| T7: Real contacts (same as T5) | — | — | — | — |
| T8: Delivery info | 0 | 0 | 0 | 0 (content) |
| T9: Mobile fixes | 0 | ~200 (CSS) | 0 | 0 |
| T10: Dynamic reviews | ~100 | ~80 | 0 | `reviews.json` |
| T11-T13: Legal | 0 | 0 | 0 | 0 (content) |
| D1: Aging gallery | ~20 | ~40 | 0 | 0 (extend products) |
| D2: Care guide | 0 | ~100 | `care.html` | 0 |
| D4: Customization note | ~10 | ~15 | 0 | 0 (extend orders) |
| D5: Status tracking | ~150 | ~100 | `order-status.html` | 0 |
| D6: Owner notifications | ~60 | 0 | 0 | 0 |
| D7: Admin order history | ~80 | ~120 | 0 | 0 |
| D8: Photo reviews | ~40 | ~50 | 0 | 0 (extend reviews) |
| D9: Product-level reviews | ~30 | ~30 | 0 | 0 |

---

## Artisan Store Specific Insights

### What makes leather goods e-commerce different from general e-commerce:

1. **Low SKU count, high price point.** 18 products averaging ~1000₽-3500₽. Don't need inventory systems, but need to convey quality and craftsmanship.

2. **Purchase is emotional, not rational.** Customers buy leather goods for feel, aesthetics, and story. Features that show craft process (video), material quality (zoom, aging gallery), and real customer experiences (reviews) matter more than search/filter/sort.

3. **Owner is the brand.** Timur personally makes items. Personal connection is the differentiator. Features that highlight this (videos, process photos, personal touch in packaging notes) outperform generic e-commerce features.

4. **Repeat customers drive revenue.** Leather goods customers come back for gifts, matching accessories, replacements. Order history (for the owner) and "you might also like" (simple, manual curation) have outsized value.

5. **Delivery anxiety is high.** Leather goods are tactile — customers worry about what they'll receive. Detailed photos, reviews with photos, care guides, and clear return policies reduce this anxiety more than any other feature.

6. **Russian market specifics.** WhatsApp is less common than Telegram for business. CDEK is the dominant delivery service. YooKassa/Tinkoff are standard payment gateways (not Stripe). Phone calls are still common for orders.

---

## Sources

- Codebase analysis: `server.js` (287 lines), `cart.html` (260 lines), `reviews.html` (258 lines)
- Architecture: `.planning/codebase/ARCHITECTURE.md`
- Concerns audit: `.planning/codebase/CONCERNS.md` (22 issues documented)
- Project scope: `.planning/PROJECT.md` (active requirements + out-of-scope)
- Conventions: `.planning/codebase/CONVENTIONS.md` (coding standards)
- E-commerce domain knowledge: HIGH confidence (well-established patterns for small artisan stores)

---

*Feature research: 2026-04-06*

# Timur.Shop — Интернет-магазин кожаных изделий

## What This Is

Действующий интернет-магазин кожаных изделий ручной работы (кошельки, ремни, сумки, чехлы, аксессуары) на домене timur.shop. Построен на Node.js/Express + Vanilla JS с JSON-хранилищем. Требуется доработка до production-качества: фикс критических багов, улучшение верстки и добавление новых функций (система заказов, динамические отзывы).

## Core Value

Покупатель может легко выбрать и заказать кожаное изделие, а владелец — управлять каталогом и заказами через удобную админку.

## Requirements

### Validated

<!-- Existing capabilities from current codebase — confirmed working -->

- ✓ Каталог товаров с фильтрацией по категориям (wallets, belts, bags, covers, accessories) — existing
- ✓ Карточка товара с каруселью фото и зумом — existing
- ✓ Корзина с localStorage — existing
- ✓ Оформление заказа через WhatsApp/Telegram — existing
- ✓ Админ-панель: CRUD товаров, загрузка изображений и видео — existing
- ✓ Видеогалерея на странице "О нас" — existing
- ✓ SEO: Schema.org, Open Graph, sitemap, robots.txt — existing
- ✓ Адаптивная вёрстка (базовая) — existing

### Active

<!-- Current scope — building toward these -->

- [ ] Устранить 5 критических багов (хардкод пароль, SVG XSS, атомарная запись JSON, бэкапы, фейковые контакты)
- [ ] Исправить верстку: мобильная адаптивность, компоненты интерфейса, анимации, поехавшие секции
- [ ] Полная система заказов: сохранение в системе, статусы, история, уведомления владельцу
- [ ] Динамические отзывы: сохранение и отображение через API, а не статический HTML
- [ ] Заменить фейковые контакты на реальные

### Out of Scope

<!-- Explicit boundaries with reasoning -->

- Онлайн-оплата (картой на сайте) — отложено до следующего этапа, сначала нужна стабильная система заказов
- Полный редизайн — текущий дизайн устраивает, нужны фиксы и улучшения
- Переход на базу данных (SQLite/PostgreSQL) — JSON-хранилище достаточно для масштаба, улучшить надёжность через атомарную запись
- Регистрация покупателей — не требуется для текущей модели (заказ без аккаунта)
- Поиск по каталогу — не выбран как приоритет, каталог небольшой (18 товаров)

## Context

**Текущий стек:** Node.js, Express 5, Multer, Vanilla JS, CSS-переменные, Swiper, Lenis, Google Fonts (Montserrat).

**Хранение:** JSON-файлы (data/products.json, data/site-data.json), загрузки в uploads/.

**Codebase map:** Полный анализ проекта выполнен — 7 документов в .planning/codebase/.

**Ключевые проблемы (из CONCERNS.md):**
- 5 критических: хардкод пароль, SVG XSS, повреждение JSON, нет бэкапов, фейковые контакты
- 15+ предупреждений: токен без expiry, path traversal, нет сжатия, нет кэша, race conditions, дубликаты товаров, статические отзывы, заказы только через WhatsApp

**Стиль кода:** var (не const/let), function declarations (без стрелочных), inline onclick, без ES-модулей на клиенте, без комментариев.

## Constraints

- **Tech stack:** Node.js + Express + Vanilla JS — фреймворки не меняем
- **Хранение:** JSON-файлы — БД не подключаем
- **Стиль кода:** var, function declarations, без ES-модулей на клиенте — следуем AGENTS.md
- **Новые зависимости:** Минимум — без лишних npm-пакетов без согласования
- **Язык:** Русский для всех пользовательских строк
- **Домен:** timur.shop

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Сначала баги, потом фичи | Критические уязвимости и риск потери данных блокируют production | — Pending |
| Полная система заказов вместо минимальной | Владелец хочет статусы, историю и уведомления | — Pending |
| Онлайн-оплата отложена | Сначала стабильная система заказов, потом платёжный шлюз | — Pending |
| JSON-хранилище, не БД | Масштаб магазина небольшой, улучшить надёжность через атомарную запись | — Pending |
| Подправить дизайн, не редизайн | Текущий визуал устраивает, нужны фиксы верстки и улучшения | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-06 after initialization*

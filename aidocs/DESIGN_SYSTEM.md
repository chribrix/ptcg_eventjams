# Frontend Design System

Date: 2026-08-09
Scope: global visual/typography/button conventions for the whole application, plus the i18n rule that eliminates "Denglisch" (mixed German/English UI copy).
Source of truth for tokens/utilities: `assets/css/tailwind.css`. This document explains *how to use* what's already defined there — it does not duplicate the raw CSS variable values.

## Why this exists

The event workspace page (`pages/events/[id].vue`) was rebuilt across several iterations and accumulated ad hoc Tailwind utility strings for padding/font-size per button, plus hardcoded English strings inside an otherwise German UI. That's the concrete case study that produced this document. The same rules apply everywhere, not just that page.

## 1. Colors — always use CSS variables / `app-*` classes

Never hardcode a color (`bg-[#2f3136]`, `text-gray-400`, `bg-emerald-500/20`, etc.). Every color is a CSS custom property in `:root` / `html[data-theme="dark"]` in `assets/css/tailwind.css`, so the app can switch light/dark via `useColorTheme`. Use the existing `app-*` component classes:

- Surfaces: `app-bg-page`, `app-surface-0/1/2/3`, `app-panel`, `app-panel-muted`, `app-hero-surface`, `app-modal-surface`, `app-overlay`
- Text: `app-text-primary` / `app-text-strong`, `app-text-secondary` / `app-text-secondary-soft`, `app-text-muted` / `app-text-muted-soft`
- Borders: `app-border` (pair with a Tailwind `border`/`border-t`/`divide-y` utility for width)
- Status/feedback: `app-status-upcoming/ongoing/completed/cancelled/neutral`, `app-feedback-info/success/danger`
- Icons: `app-icon-accent`, `app-icon-muted`

If a color you need doesn't exist as a token, add the CSS variable + `app-*` class to `tailwind.css` first — don't reach for a raw Tailwind color utility as a shortcut.

## 2. Typography — one of five sizes, nothing ad hoc

Defined in `tailwind.css` under "Global type scale". Use exactly one of these on every heading/body/meta text instead of hand-rolled `text-lg lg:text-xl font-bold` combinations:

| Class | Use for |
|---|---|
| `app-heading-1` | Page title (one per page, e.g. event name) |
| `app-heading-2` | Section headings inside a page (e.g. "Veranstaltungsregistrierung", "Participants") |
| `app-heading-3` | List-item primary label (e.g. a ticket holder's name, a participant's name) |
| `app-body-text` | Paragraphs, descriptions, secondary sentence-level copy |
| `app-meta-text` | Timestamps, player IDs, helper/hint text |

All five scale up automatically at the `lg` breakpoint — don't add your own `lg:text-*` on top of them.

Exception: small pill/badge text (status chips) intentionally stays at `text-xs`/`text-sm` — badges are not body text and are exempt from this scale.

## 3. Buttons — one color class + one size class, always

There are two button "shape" systems already in the codebase; both are valid, pick based on context:

- **`app-btn-{color}`** (`app-btn-neutral` / `app-btn-primary` / `app-btn-success` / `app-btn-danger` / `app-btn-warning`) — color/border/shadow only, no size. Always pair with a size class below. Use for row-level and secondary actions.
- **`app-action-button` + `app-action-{color}`** (`app-action-primary` / `app-action-secondary` / `app-action-success` / `app-action-danger`) — already includes a fixed medium size. Use for the one primary call-to-action on a page (register, submit, sign in) where a single consistent large-ish button is correct everywhere it appears.

Size classes (pair with `app-btn-*`, never with `app-action-button` since that already has its own fixed size — but the size classes *can* additionally override an `app-action-button`'s padding if a section genuinely needs a smaller primary/success/danger action, e.g. compact waitlist actions):

| Class | Use for |
|---|---|
| `app-btn-sm` | Row-level actions inside a list (edit/cancel a single ticket) |
| `app-btn-md` | Section-footer actions (add ticket, cancel booking, modal confirm/cancel buttons) |
| `app-btn-lg` | The one hero CTA on a page, if not already using `app-action-button` |

Rule of thumb: **destructive action = `-danger`, everything else at the same hierarchy level = `-neutral`**. Don't mix a bordered pill button with a bare colored text link at the same visual level (that was the original bug: "Cancel entire booking" was a text link next to a real "+ Add ticket" button).

**All buttons within the same panel/section must use the same size class.** Don't put `app-btn-sm` row actions and `app-btn-md` footer actions in the same visual block — pick one size for the whole section (row-level ticket actions and section-footer actions can both be `app-btn-md`; only drop to `app-btn-sm` when space is genuinely tight, e.g. a dense admin table).

## 3b. Badges/pills — `app-badge` + one color class, always

Every status/decklist/role pill (event status, ticket decklist status, participant registration status, "Cancelled" tag, etc.) must use `app-badge` combined with exactly one color class (`app-status-upcoming/ongoing/completed/cancelled/neutral`, or `app-badge-accent`). Never hand-roll `inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs ...` per badge — that's how the app ended up with badges of different padding/font-weight next to each other on the same page.

## 4. Cards / spacing

- Page container: `max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8` — content pages are allowed to use extra width on large screens, don't cap everything at `max-w-3xl`.
- One `app-panel rounded-2xl p-5 sm:p-6 lg:p-8` per logical section. Don't nest another bordered card inside it — use `divide-y app-border` lists for repeated rows (tickets, participants) instead of a bordered box per row.
- Only add a card wrapper around content that actually exists — don't render an empty card shell when the underlying data (e.g. a description) is absent.

## 5. Icons

Inline icons next to text: `w-4 h-4 lg:w-5 lg:h-5` (or `w-4 h-4` fixed inside `app-btn-sm` rows, since that button size doesn't scale at `lg`). Use `@heroicons/vue/24/outline` — don't hand-draw new inline `<svg>` icons when a heroicon already covers the case (existing inline SVGs in the hero meta row predate this rule and can stay, but new icons should be heroicons).

## 6. i18n — no hardcoded strings, ever

The app is German-first with English as a secondary locale (`i18n/locales/de.json` / `en.json`). Every user-facing string must go through `t("namespace.key")`, including:

- Modal titles, labels, placeholders, button text
- Confirmation/warning copy
- Computed/formatted strings inside `<script setup>` (e.g. relative date labels like "today"/"2 days ago" — these must also go through `t()`, not be returned as raw English from a helper function)

Reuse an existing key before adding a new one (check `common.*` first — `edit`, `cancel`, `save`, `delete`, `yes`, `no` already exist). When a page/component needs several new page-specific strings, add one new namespace (e.g. `eventWorkspace`, `waitlist`, `participants`) to **both** `de.json` and `en.json` in the same edit — never add a key to only one locale file.

## Applying this system

`pages/events/[id].vue`, its five modals, and `components/EventParticipants.vue` were migrated to this system on 2026-08-09 and are the reference implementation. When touching another page that still uses hardcoded colors/ad hoc text sizes/mixed-language strings, migrate it to these same classes and keys rather than inventing page-local styling.

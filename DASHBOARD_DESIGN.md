# Dashboard Design Reference

> This file was written by Manus (design agent) for Claude Code to use as a visual reference when restyling the dashboard components. **Do not change any logic, API calls, or TypeScript types** — only update the visual layer (classNames, layout, colours, spacing).

---

## Design System

The dashboard uses the same warm system as the landing page:

| Token | Value |
|---|---|
| Background | `#FAFAF8` (warm off-white) |
| Card background | `#FFFFFF` |
| Surface / secondary | `#F5F1EB` |
| Border | `#E7E2D9` |
| Primary accent | `#F97316` (orange-500) |
| Learn intent | `#38BDF8` sky-400, bg `#E0F2FE` sky-100 |
| Apply intent | `#F97316` orange-500, bg `#FFF7ED` orange-50 |
| Skip intent | `#A8A29E` stone-400, bg `#F5F5F4` stone-100 |
| Text primary | `#1C1917` stone-900 |
| Text secondary | `#44403C` stone-700 |
| Text muted | `#78716C` stone-500 |
| Text faint | `#A8A29E` stone-400 |
| Font | DM Sans (already in globals.css) |
| Mono font | JetBrains Mono |
| Border radius | `rounded-2xl` (16px) for cards, `rounded-xl` (12px) for inputs/pills |

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (240px, sticky, white, border-r)               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Avatar  Name  @handle                            │   │
│  │ Credits bar (orange gradient, stone-200 track)   │   │
│  │ ─────────────────────────────────────────────    │   │
│  │ My Feed (active: orange-50 bg, orange text)      │   │
│  │ Home                                             │   │
│  │ Settings                                         │   │
│  │ ─────────────────────────────────────────────    │   │
│  │ Notion status chip (green dot if connected)      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Main (flex-1, max-w-3xl)                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Sticky top bar: hamburger | search | + Analyze   │   │
│  │ Stats row: Total / Learn / Apply / In Notion     │   │
│  │ Filter bar: intent pills | platform pills        │   │
│  │ Accordion cards (one open at a time)             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

Mobile: sidebar becomes a Sheet (left drawer) triggered by hamburger.

---

## Component-by-component changes

### `ProfileSidebar.tsx`
- Background: `bg-white` not dark zinc
- Avatar: `bg-gradient-to-br from-orange-400 to-orange-600` (not blue)
- Credits bar: use shadcn `<Progress>` with `[&>div]:bg-orange-500` and `bg-stone-200` track
- Notion chip: small `bg-stone-50 border border-stone-200 rounded-xl p-3` card with green dot `bg-green-400` if connected, stone-400 if not
- Nav items: active state = `bg-orange-50 text-orange-600`, hover = `hover:bg-stone-100`

### `StatsBar.tsx`
- 4 cards in a `grid grid-cols-2 sm:grid-cols-4 gap-3`
- Each card: `bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-sm`
- Number: `text-2xl font-800` — stone-700 for total, sky-600 for learn, orange-500 for apply, green-600 for Notion
- Label: `text-xs text-stone-400 font-500`

### `FilterBar.tsx`
- Intent pills: grouped in `bg-white border border-stone-200 rounded-xl p-1`
- Active intent: `bg-orange-500 text-white`
- Platform pills: grouped in same style, active = `bg-stone-800 text-white`
- All pills: `px-3 py-1.5 rounded-lg text-xs font-600`

### `AnalysisCard.tsx`
- Card: `bg-white border border-stone-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow`
- Intent badge: pill with border — see colour table above
- Expand/collapse: Framer Motion `height: 0 → "auto"` with `opacity: 0 → 1`, duration 0.3s, ease `[0.16, 1, 0.3, 1]`
- Expanded sections: "What it is" / "What's inside" / "Why it matters to you" — each with `text-[11px] font-700 uppercase tracking-wide text-stone-400` label
- Tags: `text-[11px] text-stone-400 bg-stone-50 border border-stone-200 px-2.5 py-0.5 rounded-full`
- Action buttons: `text-xs font-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-2 rounded-xl`
- Notion saved state: `bg-green-50 text-green-600 border-green-200`
- Delete confirm: inline `bg-red-50 border border-red-200 rounded-xl` row — no modal
- Skip cards: `opacity-60`

### `Dashboard.tsx` (main layout)
- Page bg: `bg-[#FAFAF8]`
- Top bar: `bg-[#FAFAF8]/90 backdrop-blur-md border-b border-stone-200`
- Search input: `bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-300`
- "+ Analyze" button: `bg-orange-500 hover:bg-orange-600 text-white rounded-xl`
- One card open at a time (accordion — closing one opens another)
- Staggered entrance: each card `initial={{ opacity: 0, y: 12 }}` with `transition-delay` per index

---

## What NOT to change
- All `fetch`/`useEffect`/API call logic
- TypeScript interfaces and types
- Auth checks and redirect logic
- Notion OAuth flow
- `ConnectPrompt.tsx` and `NotionSetup.tsx`
- Any `server/` or `app/api/` files

# ContextDrop Design System

This is the single source of truth for ContextDrop's visual language. Every component, page, and interaction should follow these patterns. When in doubt, read this file before writing UI code.

---

## Brand Feel

Warm, minimal, confident. Think: a well-designed notebook app that happens to use AI. Not a dashboard — a workspace. Not corporate — conversational. The product should feel like it was built by one person who cares, not a committee.

**Three words:** warm, direct, personal.

---

## Color Palette

### Primary
| Name | Hex | Usage |
|------|-----|-------|
| Orange | `#f97316` | Primary CTA, active states, brand accent, checkboxes |
| Orange hover | `#ea580c` | Hover state for primary buttons |
| Orange light | `#fff7ed` | Light orange backgrounds (badges, highlights) |
| Orange border | `#fed7aa` | Borders on orange-tinted elements |

### Neutrals (warm gray — NOT cool gray)
| Name | Hex | Usage |
|------|-----|-------|
| Text primary | `#1c1917` | Headings, strong text |
| Text body | `#44403c` | Body text, descriptions |
| Text muted | `#78716c` | Secondary info, helper text |
| Text faint | `#a8a29e` | Timestamps, labels, placeholders |
| Text ghost | `#c4bdb5` | Section headers (uppercase), ghost hints |
| Text lightest | `#d6d3d1` | Disabled elements, faint icons |
| Border | `#e7e2d9` | Card borders, input borders, dividers |
| Border light | `#f0ebe4` | Inner dividers, separator lines |
| Surface | `#faf8f5` | Page background, input backgrounds |
| Surface alt | `#f5f1eb` | Slightly darker surface (filter bars, hover) |
| White | `#ffffff` | Card backgrounds |

### Semantic
| Name | Hex | Usage |
|------|-----|-------|
| Blue | `#3b82f6` | Links, Learn badges, resource pills |
| Blue light | `#eff6ff` | Learn badge background |
| Blue border | `#bfdbfe` | Learn badge border |
| Green | `#16a34a` / `#10b981` | Success states, "Saved!", "Copied!" |
| Green light | `#f0fdf4` | Success background |
| Green border | `#bbf7d0` / `#a7f3d0` | Success borders |
| Red | `#ef4444` / `#dc2626` | Delete, destructive, error |
| Red light | `#fef2f2` | Delete confirmation background |
| Red border | `#fecaca` | Delete confirmation border |
| Yellow | `#fde047` | Deep Dive button gradient border |
| Yellow bg | `#fef9c3` → `#fef08a` | Deep Dive button gradient |
| Yellow text | `#a16207` | Deep Dive button text |

---

## Typography

### Font Stack
- **Primary:** `'DM Sans', sans-serif` — used everywhere
- **Accent (rare):** `'Plus Jakarta Sans', sans-serif` — occasionally in branding

### Scale
| Element | Size | Weight | Extras |
|---------|------|--------|--------|
| Page title | 24px | 800 | `letter-spacing: -0.02em` |
| Card title | 13px | 600 | `line-height: 1.35`, truncate with ellipsis |
| Body text | 13-14px | 400 | `line-height: 1.65` |
| Section header | 10-11px | 700 | UPPERCASE, `letter-spacing: 0.08em`, color `#a8a29e` or `#c4bdb5` |
| Button text | 12-13px | 600-700 | |
| Small/meta | 11px | 400-600 | Timestamps, author names, hints |
| Badge text | 10px | 700 | `letter-spacing: 0.04em` |
| Tiny | 10px | 600 | Ghost hints on collapsed cards |

### Rules
- **Never use font sizes below 10px**
- **Minimum body text: 13px** on mobile
- **Bold (700-800) for headings and labels only** — don't bold body text
- **Italic** for subtitles, "For You" personalized content, disclaimers

---

## Spacing & Layout

### Page Structure
- **Max content width:** 720px (centered)
- **Page padding:** 20px horizontal, 32px top
- **Header height:** 56px, sticky, blurred background (`backdrop-filter: blur(16px)`)

### Cards
- **Border radius:** 16-18px (cards), 14px (inner sections), 10-12px (inputs, buttons), 100px (pills/badges)
- **Card padding:** 16-24px
- **Inner card padding:** 12-16px
- **Card border:** `1px solid #e7e2d9`, active: `1.5px solid #f97316`
- **Card shadow:** `0 1px 4px rgba(0,0,0,0.04)`, active: `0 4px 24px rgba(249,115,22,0.08)`
- **Gap between cards:** 12-16px

### Inputs
- **Padding:** `11px 14px`
- **Border radius:** 12px
- **Background:** `#faf8f5`
- **Border:** `1px solid #e7e2d9`
- **Focus:** border becomes `#f97316`, add `box-shadow: 0 0 0 3px rgba(249,115,22,0.1)`

### Touch Targets
- **Minimum size:** 44x44px for mobile tap areas
- **Minimum gap between interactive elements:** 8px

---

## Component Patterns

### Buttons

**Primary (CTA):**
```
padding: 13px 32px
background: #f97316
color: #fff
font-weight: 700
font-size: 15px
border-radius: 100px
border: none
```

**Secondary (action bar):**
```
padding: 8px 14px
background: #fafaf9
color: #78716c
font-weight: 600
font-size: 12px
border-radius: 10px
border: 1px solid #e7e2d9
flex: 1 (equal width in row)
```

**Danger text link:**
```
background: none
border: none
font-size: 13px
color: #dc2626
opacity: 0.7
```

**Ghost link:**
```
background: none
border: none
font-size: 12px
color: #a8a29e
```

### Badges (pills)
```
padding: 2px 8px (or 4px 12px for resource pills)
border-radius: 100px
font-size: 10-12px
font-weight: 600-700
```

### Section Headers
```
font-size: 10px
color: #a8a29e
text-transform: uppercase
letter-spacing: 0.08em
font-weight: 700
margin-bottom: 6-8px
```
Often prefixed with an emoji: 💡 🔧 🎯 ✅

### Dividers
```
height: 1px
background: #f0ebe4
```

### Confirmation Modals (inline)
Don't use modals. Use inline confirmation bars:
- Destructive: `background: #fef2f2`, `border: 1px solid #fecaca`, 14px radius
- Neutral: Same card, swapped content with `AnimatePresence`

---

## Animation

### Library: Framer Motion

### Timing
- **Standard transition:** `0.15s` for hover/color changes
- **Card expand:** `0.28s` height with `ease: [0.4, 0, 0.2, 1]`, `0.2s` opacity with `0.08s` delay
- **Enter/exit:** `0.15-0.2s` duration
- **Loading spinner:** `0.8s linear infinite` rotation

### Patterns
- **Card enter:** `opacity: 0, y: 8` → `opacity: 1, y: 0`
- **Card exit:** `opacity: 0, y: -12, scale: 0.98`
- **Content swap:** `opacity: 0, y: 4` → `opacity: 1, y: 0` (faster, 0.15s)
- **Chevron rotation:** `rotate: 0` ↔ `rotate: 180`
- **List items:** `opacity: 0, height: 0` → `opacity: 1, height: auto`

### Rules
- **Never animate more than 2 properties simultaneously** per element
- **Always use `AnimatePresence`** for elements entering/leaving the DOM
- **Loading states:** Use `Loader2` icon with `animate-spin` class, not skeleton screens
- **No bounce, no spring** — use ease curves only

---

## Iconography

### Library: Lucide React
- **Size:** 12-16px (13px most common in buttons)
- **Stroke width:** Default (2)
- **Color:** Inherit from parent text color
- **Common icons:** ChevronDown, ExternalLink, Share2, BookOpen, Trash2, Check, Loader2, X, Plus

### Custom Platform Icons
Instagram (gradient), TikTok (dual-tone), X (white on black), LinkedIn (white on blue), Article (blue lines on light blue) — all 16x16 SVGs with 5px border-radius rects.

---

## UI Copy Voice

### Principles
- **Short first.** One sentence when possible.
- **Warm, not corporate.** Ban: "Please", "kindly", "Unfortunately", excessive exclamation marks.
- **Use contractions.** "You're" not "You are". "Can't" not "Cannot".
- **One emoji max per message/section.** No emoji number lists.
- **Consistent vocabulary:**
  - "Analyses" not "credits" (for the currency)
  - "Breakdown" for what we produce
  - "Drop a link" as the action verb
  - "Deep Dive" for the structured extraction feature

### Button/Label Copy
- "Save Profile" not "Submit"
- "Add task" not "Create new task"
- "Clear profile" not "Reset all data"
- "Copied" not "Copied to clipboard!"
- "Saving..." not "Please wait..."

### Error States
- Lead with what happened, not "Sorry"
- End with what to do next
- Never show raw error messages to users

---

## Responsive Behavior

### Breakpoints
- **< 1024px:** Sidebar collapses, togglable via hamburger
- **< 768px:** Stack layouts vertically, reduce padding
- **All sizes:** Max content width 720px, centered

### Mobile Considerations
- Inputs get full width (`box-sizing: border-box`)
- Buttons stack vertically on narrow screens (`flex-wrap: wrap`)
- Touch targets minimum 44px
- No hover-dependent interactions — always have a tap equivalent

---

## Anti-Patterns (what NOT to do)

- **No cool grays.** Our grays are warm (stone/taupe). `#64748b` is wrong, `#78716c` is right.
- **No sharp corners.** Minimum border-radius is 5px (checkboxes). Everything else is 10px+.
- **No heavy shadows.** Max is `0 4px 24px rgba(0,0,0,0.08)` for active cards. Default is `0 1px 4px rgba(0,0,0,0.04)`.
- **No modal dialogs.** Use inline confirmation patterns instead.
- **No skeleton loaders.** Use spinners or loading text.
- **No tooltips.** If it needs explaining, the label is wrong.
- **No gradient text.** Gradient only on the Deep Dive button background.
- **No dark mode.** We're a warm cream product. Dark mode would require a full rethink.
- **No icon-only buttons.** Always pair icons with text labels.
- **No "Learn more" links.** Say what the link does: "Edit on web", "View original", "Get Premium".

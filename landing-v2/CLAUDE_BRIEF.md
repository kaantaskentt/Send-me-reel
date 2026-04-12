# Landing Page v2 — Claude Code Brief

Hey Claude 👋

Kaan really liked what was built here. The goal is for you to **build something 95% close to this** in the main app (`/web` or wherever the landing lives). The 5% gap is intentional — you may have features already implemented or a slightly different component structure, and that's fine. Use your judgment to connect things properly.

---

## What this is

This is a redesigned landing page for **ContextDrop** (the AI video/content analysis Telegram bot). It was built in React 19 + Tailwind 4 + shadcn/ui.

The live preview was at: `https://contextdrop-plcaoykf-gfdhjb5rvc3nxcyc.manus.space`

---

## Structure overview

```
landing-v2/
  client/
    src/
      pages/
        Home.tsx              ← Main page, section order
      components/
        NavBar.tsx            ← Top nav (ContextDrop logo, How it works, Sign in, Open in Telegram)
        HeroSection.tsx       ← Hero with rotating headline, before/after grid → 3 output cards
        StatsBar.tsx          ← Animated stats strip (6,100+ videos, 2,400+ users, 28s avg)
        ProblemSection.tsx    ← "You're not lazy. You're just losing the signal." — 4 pain cards
        DashboardPreviewSection.tsx  ← Browser mockup of the dashboard
        VerdictSection.tsx    ← Telegram chat animation showing the full analysis flow
        FinalCTASection.tsx   ← Final CTA + footer
      index.css               ← Design tokens, global styles, mobile responsive rules
```

---

## Key design decisions to replicate

### 1. Hero — before/after visual
The hero shows a **blurred 9-photo grid** (saved posts) → orange arrow → **3 stacked ContextDrop output cards**.

The 3 cards are:
- **Instagram**: "Claude agent managers — one agent runs the rest" → Worth your time → task: "Set up agent manager pattern this week"
- **LinkedIn**: "Why most SaaS pricing pages fail" → Skim it (no task row)
- **X/Twitter**: "The Cursor AI workflow that 10x'd my output" → Worth your time

Each card has: platform icon + label, verdict badge (green "Worth your time" or amber "Skim it"), bold title, italic ContextDrop Guy summary, tags, "Added to tasks" + "Deep Dive" buttons, and optionally a task row with orange left border.

### 2. Pain cards (ProblemSection)
4 cards in a 2-col grid. Each has:
- Orange left accent border (`borderLeft: 3px solid #F97316` or `#ea580c`)
- Timestamp label in JetBrains Mono (e.g. "1:14 AM", "3 weeks later")
- Bold quote in DM Sans 700
- Sub-copy separated by a top divider — this is the punchline, make it readable

### 3. Voice / copy tone — "ContextDrop Guy"
All analysis copy should sound like a sharp, honest friend who has no time for fluff:
- "Solid. Sub-agents handle parallel tasks. The CLAUDE.md setup at 14:30 is the only part worth rewinding. Skip the intro."
- "Mid. He's rehashing a blog post from 2024. The one stat about anchoring is worth 30 seconds. Skip the rest."
- "This is your lane — the workflow maps directly to what you're building."

No "valuable insights", no "game-changer", no "comprehensive breakdown".

### 4. Dashboard mockup
The dashboard preview (`DashboardPreviewSection`) shows a browser frame with:
- Sidebar: ContextDrop logo, user "Alex M." (@alexm), nav items (My Feed active, Tasks with badge 4, Ask AI with "New" badge, Settings), credits bar (47/100), "Send a video" button
- Feed: filter tabs (All, Instagram, TikTok, X), 3 cards — first one expanded with summary + "Add to my tasks" + task row

### 5. Color system
- Background: `#faf8f5` (warm off-white)
- Accent: `#F97316` (orange-600)
- Text: `#1c1917` (warm near-black)
- Muted: `#78716c`
- Cards: white with `#e7e2d9` borders
- Font: Plus Jakarta Sans (display) + DM Sans (body) + JetBrains Mono (labels/code)

### 6. Mobile responsiveness
- Dashboard sidebar hides at 768px
- Hero before/after stacks vertically at 640px (arrow rotates 90°)
- Pain cards go single-column at 640px
- VerdictSection stacks at 768px

---

## What to connect / check

- [ ] **"Open in Telegram" / "Start free on Telegram"** buttons → should link to the actual Telegram bot URL
- [ ] **"Open dashboard"** link → should go to the real dashboard route
- [ ] **"Sign in"** in NavBar → connect to auth flow
- [ ] **Stats numbers** (2,400+ users, 6,100+ videos) → update with real numbers if available
- [ ] **Footer links** (Privacy, Terms) → connect to real pages if they exist

---

## What NOT to change

- The ContextDrop Guy voice in the card copy — keep it sharp and honest
- The before/after visual concept in the hero — it's the strongest part of the page
- The pain card structure — the timestamp + quote + sub-copy format works well
- The warm cream color palette — it's intentional and consistent

---

Good luck. The code is clean and well-commented. Start with `client/src/pages/Home.tsx` to see the section order, then work through each component.

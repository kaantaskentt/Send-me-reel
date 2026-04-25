# ContextDrop Strategy: The Pivot

> Source-of-truth document. Every product, design, copy, and code decision must be traceable to a quote, pattern, or signal in this document. Updated 2026-04-25 after the qualitative research drop and the philosophical pivot conversation.

---

## 0. The decision, in one sentence

We are not building a smart bookmark for any reel. We are building a **bridge between where people are and where they know they could be** — for the very specific person who feels left behind by AI and has slowly stopped trying.

> "The product is the same. The entry point is User A. The purpose is User B. And the honest version of what you are building is not a content analyser. It is a bridge between where people are and where they know they could be." — Kaan/Claude pivot conversation, Apr 24

Every decision below derives from that sentence.

---

## 1. The person we are building for

### 1.1 The named feeling: AI guilt

The pain is not "I save things and forget them." That is a symptom. The actual condition is **AI guilt**: watching the world move faster than they can process it, knowing they should be doing something, not knowing where to start, slowly disconnecting because the gap feels too big.

Verbatim evidence:

- **r/selfimprovement**: "What really gets to me is this nagging fear that there's some imaginary timer ticking, and if I don't figure this out soon, I'll be left behind. Maybe that's silly, but it's keeping me up at night and the FOMO is extreme."
- **r/ArtificialInteligence**: "I've fallen behind with everything that is moving so fast and it seems like people who aren't that much in IT or doesn't know a thing or two about coding is catching up. I feel left behind and lost & everything is moving rapidly."
- **r/freelanceWriters**: "I cry at least 5 times a day, every day. I have panic attacks at least twice a week… I genuinely feel like I can't escape the AI mania and the inevitable fact that I will soon be irrelevant."
- **r/indiehackers**: "I ignored all AI stuff for the last couple months… now I feel like a laggard and never wanted to be on that part of the adapter curve."
- **Threads**: "I feel overwhelmed by AI and don't know where to start."
- **Talkspace clinical framing**: "AI fatigue is a state of cognitive, emotional, and motivational exhaustion triggered by seemingly relentless exposure to AI-driven tools, updates, and expectations."

Statistical scale: **52% of US workers worried about AI's future impact at work; 33% already feel overwhelmed by AI** (Pew / WGU Labs, via Talkspace). This is not a niche emotion — it is the dominant emotional state of the workforce.

### 1.2 User A vs. User B (the journey, not the segment)

User A and User B are **the same person at different stages**. The product entry point is A. The mission is B.

| | **User A** (acquisition) | **User B** (mission) |
|---|---|---|
| Behaviour | Saves AI reels, follows the feeds, watches Matt Wolfe weekly | Has stopped saving. Closed the laptop. Quietly disengaged. |
| Pain level | Mild, chronic | Deep, dormant |
| Best evidence | Mariah Brunner comments asking "which stack of tools would you recommend?" — *they're still asking* | "I tried AI last year and gave up. The answers weren't useful enough. I figured the technology just wasn't there yet." (Liza Adams, LinkedIn) |
| What they need | A translator from watching → one specific action | A re-entry point that says "you have not missed too much" |
| Why we can reach them | Already on the platforms we're on | Reachable only through User A's results — through someone they trust saying "this thing actually helped me" |

**Strategic implication.** Build for User A. Make the product produce visible action, not just analyses. Let User A's results — "I watched a Mem0 tutorial, ContextDrop told me one thing to try, I tried it and it worked" — be the message that reaches User B. We don't market our way to User B. We earn our way to her.

### 1.3 The false beliefs we are dismantling

The data shows a tight cluster of false prerequisites that keep User B paralysed. We must counter each one explicitly in copy.

| False belief (verbatim) | Our counter-message (must appear in product copy) |
|---|---|
| "I need to learn coding." (Jeff Herschy, IG) | "No coding. No setup. Send a link." |
| "I need to understand machine learning." | "You don't need to understand AI to start using it." |
| "I'm not 'techy' enough." (amberhills.ai) | "If you can paste a link, you can start." |
| "It made me feel like I wasn't 'smart enough' for it." (theavamonroeai) | "This is built for the people who feel behind. That includes you." |
| "I need to learn more before I could start." (amberhills.ai) | "Start now. Read less. Try one thing." |

---

## 2. The competitive position

The audit is decisive. **No competitor currently owns the emotional position of "safe re-entry point for people who feel left behind by AI."**

| Competitor | Target | Tone | Addresses AI guilt | Addresses overwhelm | Beginner-safe |
|---|---|---|---|---|---|
| Readwise | Active readers who already highlight | Functional | No | No | No |
| Notion AI | Enterprise teams | Professional | No | No | No |
| MyMind | High-functioning creatives | Calm/philosophical | No | Partially | Partially |
| **ContextDrop** | User A → User B | Empathetic, slow, grounded | **Yes** | **Yes** | **Yes** |

The closest emotional sibling is MyMind ("Remember everything. Organize nothing.") — but MyMind serves people who are already saving content with intent. ContextDrop serves people who feel guilty about saving.

We own the intersection of: emotional safety + AI-specific overwhelm + re-entry permission.

---

## 3. Product reframe

### 3.1 What ContextDrop was vs. what it is

| Was | Is |
|---|---|
| "AI-powered content analysis bot. Send a reel, get a verdict." | A companion for the moment between saving an AI reel and never doing anything with it. |
| Generalist (Instagram, TikTok, X, YouTube, articles, anything) | Vertical: AI / business / productivity content only. Everything else gets a gentle "I'm not built for this" redirect. |
| "Worth your time / Skim it / Skip" judgement output | A translation: what this is, and one small thing you could try. No verdict. No judgement. |
| Verdict is the product | Action is the product. The verdict is just the way in. |

Verticalisation rationale:

> "When you try to solve everything you solve nothing emotionally. A person who feels left behind by AI does not need a tool that also analyses recipe reels. That actually undermines the product's identity." — Kaan/Claude conversation

### 3.2 The job-to-be-done, restated

When User A saves an AI reel, they are performing a small ritual of trying-to-keep-up. The save itself is the entire act. The watching is the entire act. Nothing follows. ContextDrop's job is to **make the moment after the save into the smallest possible action** — small enough that it doesn't trigger the overwhelm response, specific enough that it produces a felt result.

> "Confidence grows from action. Not from watching." — @womenlearningaifearlessly

> "Many beginners start learning AI the wrong way. They watch tutorials. They try random tools. Weeks later, nothing changes." — Threads

The product is not "AI summary for any link." It is "the smallest next action, derived from the link you just saved." Everything must serve that.

---

## 4. Analysis output redesign

### 4.1 What we are removing and why

**Remove the ⭐ rating ("Worth your time / Skim it / Skip").**

Why. The rating system is a judgement on the user's saving behaviour. When ContextDrop says "Skip" about a thing the user paused to save, it punishes the save. User B is exquisitely sensitive to that signal — she already feels behind, already feels stupid for saving things she doesn't act on. A "Skip" verdict is the system saying: *you wasted that moment*. That is the opposite of what we promised.

> "It made me feel like I wasn't 'smart enough' for it." — @theavamonroeai

> "AI should reduce overwhelm… not create more of it." — @amberhills.ai

If we exist to reduce overwhelm, we cannot output a rating that adds shame.

**Remove the ⭐ Worth-signal entirely.** Replace with a structure that is purely additive: this is what the thing is, and here is the smallest next thing.

### 4.2 What we are removing — second pass: the 🎯 "connection to your work" gate

The current 🎯 line tries to map content to the user's professional profile. That gate is fine in principle. But it currently produces "Nothing here connects to agentic systems"–shaped negative outputs (we just patched the regex to suppress these). The deeper problem: User B does not want her content judged through her profession. She wants permission to be curious. She wants the AI gym recipe she saved to feel like a valid save.

**Soft-keep the 🎯 line, but reframe it from "relevance to your work" to "the small thing you could try."** This converts the line from a judgement axis into an action axis — every analysis ends in an invitation, not a verdict.

### 4.3 The new output structure

```
🌱 Try this once
[One specific, named, small action — under 25 words.
 If there is no honest small action: omit this line entirely.
 Never invent one. Never pad.]

📍 What this actually is
[2 sentences max. Plain English. The name of the tool, the price if mentioned,
 the 30-second version. Facts only. No adjectives.]

🪜 If you want to go further
[Optional. One sentence. The next layer of depth, only if the content has it.
 Skip if the content is shallow.]
```

When there is genuinely nothing actionable in the content (a hype reel, an opinion take, a tease):

```
📍 What this actually is
[2 sentences.]

🍵 No homework today. You're allowed to just have watched it.
```

Why this exists. The single most important data signal is:

> "Confidence grows from action. Not from watching." — @womenlearningaifearlessly

If the system cannot find an action, it must not pretend. It must validate that watching was enough.

### 4.4 New tone rules for verdict copy

The current banned-words list is good. We are extending it.

**Hard-banned (judgement and hype words):**
- "Worth your time", "Skim it", "Skip", "deep dive", "actionable", "key takeaway", "pro tip", "bottom line", "game-changer", "powerful", "robust", "incredible", "exciting", "cutting-edge", "leverage", "optimize", "unlock", "elevate", "supercharge", "valuable insights", "great content", "highly relevant", "I recommend", "this aligns with", "huge for", "syncs with", "useful find", "worth bookmarking"

**Hard-banned (negative-framing — already partially patched):**
- "Nothing here connects to…", "doesn't connect to…", "no real link to…", "couldn't spot anything connected to…", "not directly related…"

**Always-allowed phrasings (taken from the data):**
- "Try this once" (small, finite, low-stakes)
- "If you want to go further" (permission to stop)
- "No homework today" (validation of just-watching)
- "One small thing" (calibrated to the user's emotional bandwidth)

Length: **300–500 characters**, not 400–700. Shorter is the point. The current 700 ceiling is still adding to the reading load.

### 4.5 The system prompt rewrite — directional

The new system prompt has three rules that override everything:

1. **You are not a critic.** You do not rate the content. You translate it. Your job is to convert "I watched this" into "I could try this once."
2. **You do not pretend.** If the content has no actionable element, you say "no homework today." You never invent an action to fill the slot.
3. **You are calm.** No exclamation marks. No hype. No urgency. The reader is already overwhelmed. You are the antidote, not another voice in the noise.

The system prompt itself will be rewritten as a follow-up implementation task. This document defines the constraints; the prompt body is downstream.

---

## 5. Onboarding redesign

### 5.1 What the current onboarding does wrong

The current onboarding asks: role, current focus, content preferences. That is a competence questionnaire. It assumes the user has it together. For User B, the very act of answering "what's your current focus?" produces shame — *I don't know, I haven't been able to focus on anything because of all this AI stuff*.

> "I wish someone could just create a step by step guide of what to do first. Everything is so overwhelming." — Threads

Onboarding must not ask the user to be already-organised. It must meet them where they actually are.

### 5.2 The three-question onboarding

Question 1 — meet them in the feeling:

> **Where are you with AI right now?** Pick the one that's closest.
> - 🌱 *I'm curious but I haven't really started.*
> - 🪞 *I keep watching stuff but never actually try anything.*
> - 🌀 *I tried, got overwhelmed, kind of gave up.*
> - 🛠 *I use it a bit, want to use it more on purpose.*

Each option maps to a stance, not a profile. The 🌀 option exists specifically because the data says it must:

> "I tried AI last year and gave up. The answers weren't useful enough. I figured the technology just wasn't there yet." — Liza Adams

Quote anchor: "Everybody tried AI… but most people quit too early."

Question 2 — name the gap, gently:

> **If one small thing changed this month, what would feel different?**
> - *I'd actually try something I saved.*
> - *I'd stop feeling behind.*
> - *I'd find one tool I actually use.*
> - *I'd stop scrolling and feeling worse.*

This is the question that becomes the product brief, lifted directly from the pivot conversation:

> "What would need to be true for you to feel like you are not behind? The third question is the most important one you can ask. The answer to it is your product brief." — Kaan/Claude conversation

Question 3 — light context, optional:

> **Anything you want me to know? (Totally optional.)**
> *e.g. "I run a small business and I want to use AI to write less email." Or just leave it blank.*

That's it. Three questions. No "first name" prompt that produces "Yako" issues. No "interests" multi-select. Three. Done.

### 5.3 Onboarding closing copy

The last screen is the most important screen.

> **You're not behind.**
>
> ContextDrop is built for people who feel like they are. Send me one link this week — Instagram, TikTok, YouTube, anywhere — and I'll send back the smallest thing you could actually try.
>
> No homework. No catching up. One sip at a time.
>
> *[ Send your first link ]*

Every clause is anchored:

| Clause | Quote anchor |
|---|---|
| "You're not behind." | @amberhills.ai: "If this is how it feels for you right now… You're not behind." |
| "built for people who feel like they are" | The named feeling from §1.1 |
| "smallest thing you could actually try" | "You don't need to learn everything. You just need to learn what works." (theavamonroeai) |
| "No homework. No catching up." | "You do not need to understand everything to begin." (womenlearningaifearlessly) |
| "One sip at a time." | "Overwhelm comes from trying to swallow the entire ocean at once. We are taking one sip." (womenlearningaifearlessly) |

---

## 6. UI and UX

### 6.1 The dashboard is currently a feed. The feed is the problem.

The dashboard mirrors the exact pattern that creates AI guilt: a scrollable list of saved content the user is supposed to do something about. The user's existing feeds are the cause of their pain. We must not be another one.

> "If a feed is making you feel behind instead of informed, it's not serving you." — Siddhant Khare

> "My LinkedIn/Insta/YouTube feeds are full of people who seem to have it all figured out, building incredible things while I'm still trying to wrap my head around the basics." — r/selfimprovement

### 6.2 The new dashboard hierarchy

Top of page, single card, dominant visual weight:

> **This week's one thing**
>
> The single most actionable item from everything you've saved this week. One link, one action. If you do nothing else, do this.

Below the fold (small, calm, non-scroll-baiting):

> **Saved but not tried** *(7)* — quietly listed, no urgency, no "you have 7 unread" guilt-energy
>
> **Tried** *(3)* — celebrated. This is what we measure.
>
> **Set aside** *(2)* — explicit "I watched, I don't want homework" pile. Validates the no-homework state.

The feed pattern — endless scroll of analyses — is **deprecated**. It is the visual language of overwhelm.

### 6.3 The "Tried it" toggle

Every analysis card gets one binary control: **I tried it.** Not "saved", not "starred", not "added to read-later." Tried.

This is the single most important behavioural metric in the product. It is also the only one shown to the user. Everything else stays in our analytics.

Why "tried it" specifically:

> "Confidence grows from action. Not from watching." — @womenlearningaifearlessly
> "User A: They watch, they save, they feel productive, they do nothing." — Kaan/Claude conversation

We are measuring the exact thing the user is failing at. When they toggle it, they get a small, calm acknowledgement — never a streak, never a celebration animation that re-creates social-app reward loops. Just: *Good. That's the whole point.*

### 6.4 What we deliberately do not build

- No streak counter. (Streaks weaponise consistency. Our user has been punished by streaks for years.)
- No "X days since you last analysed" guilt-prompts.
- No leaderboards or social comparison features. The data is unambiguous: comparison is the wound.
- No "you've saved 12 articles this week!" vanity counter. That is the same chemical as the feed.
- No notifications other than the weekly digest.

> "AI comments honestly encourage your readers to judge you too." — User on Lara Acosta's LinkedIn post (we will not be the source of more comparison)

---

## 7. Tone of voice

### 7.1 What we never say

- We never use urgency words: "now", "today only", "don't miss", "limited time."
- We never use catch-up framing: "stay ahead", "don't fall behind", "keep up", "learn more."
- We never use hustle-coded productivity verbs: "optimise", "leverage", "supercharge", "unlock", "elevate", "10x."
- We never rate the user's saved content. (No Skip.)
- We never reference what *isn't* relevant. (No "this doesn't connect to your work.")

### 7.2 What we always say

- "No rush."
- "Take what's useful."
- "One small thing."
- "You're not behind."
- "No homework today" — for the times when the right answer is *do nothing*.
- "Just watched it" — validates passive consumption as a complete act.

### 7.3 Voice models

- 70% MyMind manifesto: calm, anti-hustle, philosophical-without-being-pretentious, *"What should have never been lost is now yours again."*
- 20% the @womenlearningaifearlessly account voice: gentle, plural ("we"), grounded.
- 10% Steve Jobs late-night-by-the-fireplace, per the existing CLAUDE.md tone — but only between tasks, never inside the product UI.

We are never: a productivity coach, a hype account, an LLM trying to sound human, a startup with exclamation marks.

---

## 8. Colour palette and visual identity

### 8.1 The aesthetic problem

Most AI products signal AI through visual language: deep blues, neon purples, glassmorphism, synthwave gradients, particle effects, rotating spheres. That is the visual language of the FOMO our user is escaping. If we look like the AI products she has been scrolling past in shame, we lose before the first interaction.

> "drowning in frameworks, libraries, plugins, microservices, and 'AI-powered' everything." — Product Hunt

### 8.2 The direction

**Warm. Slow. Material. Quiet.** Closer to a Kinfolk magazine than a SaaS dashboard.

| Layer | Current | Direction |
|---|---|---|
| Background | Cream `#f5f1eb` (already on-brief — keep) | Keep. Push slightly warmer if needed. |
| Primary action | Orange `#f97316` (high energy, urgency-coded) | **Replace with sage / muted forest** (`~#6B8E6F`). Sage signals growth without urgency. |
| Surface tints | Soft orange `#fff7ed` | Keep for "processing" states only. Reduce as the dominant accent. |
| Success | Green `#15803d` | Keep. |
| Borders / lines | `#e7e2d9` | Keep. |
| Typography accent | DM Sans + Instrument Serif | Keep. Lean harder on Instrument Serif for emotional moments (welcome, empty states, weekly digest header). |

The orange stays only as a secondary heat — for processing pulses, for the "send me a link" CTA. The dominant brand colour shifts to a calm green/sage, because the user's emotional ask is *please slow down*, and warm green is the colour we associate with growth-without-urgency.

Quote anchor:

> "Pause. 🌿 Take a breath. 🤍" — @womenlearningaifearlessly

> "We're going slow. On purpose." — @womenlearningaifearlessly

The palette must visually breathe. Whitespace is a feature, not a waste. Animations are slow (300–500ms), eased, never bouncy. No rotating logos, no pulsing AI orbs, no "thinking…" dots that mimic ChatGPT. We are the *anti-ChatGPT visual.*

### 8.3 Logo direction (for the new domain)

Open question — to be decided once the domain is picked. Direction: a single mark that reads as "drop" or "sip" or "pause". Soft, organic, hand-drawn-adjacent. Not a geometric AI symbol. Not a brain. Not a circuit.

---

## 9. Product copy — the surface words

Every user-facing string, with anchor.

### 9.1 Welcome

> *"You're not behind. Send me one link — I'll do the rest."*
> Anchor: @amberhills.ai "You're not behind."

### 9.2 Empty dashboard

> *"Nothing here yet. That's fine. Save your first link when you're ready — Instagram, TikTok, YouTube, anywhere."*
> Anchor: "We're going slow. On purpose." (womenlearningaifearlessly)

### 9.3 Loading / processing

> *"Reading it for you. No rush."*
> Anchor: counter to the relentless-pace feeling (Talkspace, Siddhant Khare)

### 9.4 Verdict ready

> *"Here's the smaller version."*
> Anchor: "We are taking one sip." (womenlearningaifearlessly)

### 9.5 Error — pipeline failed

> *"Something didn't work. Not your fault. Your credit's back."*
> Anchor: r/smallbusiness — "if you're not a developer when you hit a wall it's pretty much a lost cause." (We refuse to be that wall.)

### 9.6 Out of credits

> *"You've used your free analyses. Want more? It's $9/month — no surprises, cancel any time."*
> Anchor: r/smallbusiness — "tools that overpromise but don't deliver (or cost a fortune)." (Plain pricing, no tricks.)

### 9.7 Wrong-content type (recipe, fashion, etc.)

> *"I'm built for the AI and tech stuff. Save this somewhere else for now — no analysis credit charged."*
> Anchor: the verticalisation decision in §3.1.

### 9.8 Telegram first message after onboarding

> *"You're set. Send me any AI reel, podcast, article, or video — I'll send back the smallest thing you could actually try with it. No homework. No catching up."*
> Anchor: §3.2 job-to-be-done.

### 9.9 The "Tried it" toggle confirmation

> *"Good. That's the whole point."*
> Anchor: "Confidence grows from action. Not from watching." (womenlearningaifearlessly)

### 9.10 Weekly digest subject line

> *"One thing you could try this week."*
> Anchor: pivot conversation — "you watched this Mem0 tutorial → here is exactly how it applies to the thing you are building right now."

### 9.11 The hero on the marketing page

> **Built for people who feel behind on AI.**
>
> *Send me a reel. I'll show you the one small thing you could actually do with it. No coding. No catching up. One sip at a time.*

Every phrase is a quote-anchored compression of §1 and §3.2.

---

## 10. Product logic — what the system does, what the user controls

### 10.1 The system's job

- Detects whether the URL is in our vertical (AI / tech / business / productivity). If not → polite redirect, no charge.
- Pulls the content (caption, transcript, visuals).
- Identifies whether there is an honest small action in it.
  - If yes → outputs the 🌱 / 📍 / 🪜 structure.
  - If no → outputs 📍 + 🍵 "no homework today."
- Surfaces the most actionable item of the week to the dashboard's "this week's one thing" slot.
- Sends the weekly "one thing you could try this week" digest.

### 10.2 The user's job

- Save the link.
- Toggle "I tried it" when (and only when) they tried it.
- Optionally, mark something "set aside" — explicit permission-to-not-act.

That's it. That's the whole interaction surface. Anything more becomes another thing she has to manage — i.e., another source of guilt.

### 10.3 The deliberate omissions

We do not auto-tag. We do not auto-categorise. We do not auto-archive. Auto-everything is what made the user feel like she lost agency in the first place. The user owns the state changes; the system does the translation work.

---

## 11. Feature prioritisation

### 11.1 KEEP

| Feature | Why |
|---|---|
| Telegram URL drop | Frictionless save. The save is the smallest possible commitment, which matches §3.2. |
| Web paste input | Same surface for non-Telegram users. Just shipped. |
| Notion integration | Becomes the "tried it" archive — long-term home for actions that worked. |
| Per-analysis todos (already shipped Apr 12) | Aligns perfectly with the new logic. The todo IS the "tried it" loop. |
| Crash recovery / retry queue | Reliability is non-negotiable for trust rebuild. |
| Google sign-in + Telegram-Google account merge | Already shipped; serves the "low-friction re-entry" promise. |

### 11.2 REPLACE

| Replace | With | Anchor |
|---|---|---|
| ⭐ Worth/Skim/Skip rating | 🌱 / 📍 / 🪜 / 🍵 structure | §4 |
| 🎯 "connection to your work" line | 🌱 "try this once" line | §4.2 |
| Generalist content support | Vertical: AI / tech / business / productivity only | §3.1 |
| Current orange-dominant accent | Sage/forest as primary, orange as secondary heat | §8 |
| Three-field profile onboarding | Three-emotional-stance question onboarding | §5.2 |
| Feed-style dashboard | "This week's one thing" + small piles | §6.2 |

### 11.3 ADD

| Feature | Why | Quote anchor |
|---|---|---|
| "I tried it" toggle on every card | The single retention metric that matters | "Confidence grows from action." (womenlearningaifearlessly) |
| "Set aside" / "no homework today" state | Explicit permission to not-act | "You are allowed to just have watched it." (derived from womenlearningaifearlessly) |
| Weekly digest: "One thing you could try this week" | Anti-feed reactivation | Pivot conversation §"User A is your acquisition engine" |
| Vertical filter (politely refuses non-AI links) | Identity coherence | "When you try to solve everything you solve nothing emotionally." (Kaan/Claude) |
| Onboarding stance routing | Different welcome message per A/B sub-stage | §5.2 |

### 11.4 REMOVE / DEFER

| Item | Decision | Reason |
|---|---|---|
| Streaks, vanity stat counters | Never build | Re-creates the comparison wound (§6.4) |
| Push notifications beyond weekly digest | Defer indefinitely | Notifications are a primary source of "I should be doing more" |
| Browser extension | Defer | Adds another tool to a user already drowning in tools |
| Cross-analysis chat / conversational mode | Defer | Premature; doesn't serve the "smallest action" job |
| Spaced recall | Defer | Implies a study-system, not a re-entry point |
| Duplicate-URL dedup (Feature 2 from prior plan) | Keep deferred | Already correctly assessed as low-impact |
| WhatsApp surface | Defer until Telegram + web are statistically working | Avoid over-extending pre-PMF |

---

## 12. Marketing positioning (for ad copy and UGC)

### 12.1 The single message

> **You're not behind. You just haven't been shown the smallest next step.**

### 12.2 Hook angles for short-form video (UGC / ads)

Each is anchored to a verbatim quote. These are ad-copy starting points.

1. *"I felt overwhelmed by AI and didn't know where to start. Then I saw this."* — Threads quote, near-verbatim
2. *"I tried AI last year and gave up."* — Liza Adams, used as opening line
3. *"You don't need to learn coding. You don't need to learn machine learning. You don't need to be 'techy enough.'"* — Jeff Herschy, restructured
4. *"My feeds are full of people who seem to have it all figured out — and I'm still trying to wrap my head around the basics."* — r/selfimprovement, used as relatable hook
5. *"You're not behind. You're just being shown the wrong way to start."* — synthesis of @amberhills.ai + Threads
6. *"The AI space is built to make you feel like you're constantly behind."* — @itsmariahbrunner, used as anti-establishment opener

### 12.3 What we will not say in marketing

- "10x your productivity with AI" — this is the language of the people the user is hiding from.
- "Learn AI in 30 days" — this is a curriculum promise, not a re-entry promise.
- "Master ChatGPT" — User B does not want to master anything. She wants to feel okay again.

---

## 13. Ship plan — phasing the redesign

This is a values change, not a rebuild. We can ship most of it inside a week without breaking the live system. Order is risk-low → risk-high.

### Phase 1 — copy and verdict tone (1–2 sessions)

Touches: `src/services/verdictGenerator.ts` (system prompt + structure), `src/bot/messageHandler.ts` (welcome strings), Telegram error/loading copy, web error copy.

- Replace verdict structure with 🌱 / 📍 / 🪜 / 🍵.
- Rewrite system prompt per §4.5.
- Sweep all user-facing strings against the §9 list.
- No schema changes. No UI changes. Pure copy + prompt.
- Reversible by `git revert`.

### Phase 2 — dashboard "tried it" + quiet feed (1–2 sessions)

Touches: dashboard component, analyses table (likely add `tried_at timestamptz null` column), one new API endpoint.

- Add the binary toggle.
- Re-rank the dashboard: "This week's one thing" hero + three small piles.
- Hide the scroll-feed pattern.

### Phase 3 — vertical filter + new onboarding (2 sessions)

- Pre-flight URL classifier: AI/tech/business/productivity? If not, refuse politely with no charge.
- Replace onboarding conversation (Telegram side) and onboarding form (web side) with the three-stance flow.

### Phase 4 — visual identity shift (1 session)

- Sage primary, orange secondary across both surfaces.
- Slow, eased animations.
- Update Instrument Serif usage on emotional moments.

### Phase 5 — weekly digest (1 session, after Phase 2)

- Cron + email surface.
- Subject line "One thing you could try this week."

### Test gate between every phase

Same as the previous risk-aware plan: build passes, Playwright green, one Telegram smoke test, one web smoke test, ten minutes of clean Railway logs. No phase moves until the previous one is green.

---

## 14. The success metric

We will not measure "analyses generated." That is a consumption metric and would push us back toward the feed pattern.

We will measure: **the rate at which a user toggles "I tried it" on something they saved.**

That is the rate at which we are converting watching into doing. That is the rate at which the bridge is working. Everything else (DAU, MAU, credit consumption, retention) is downstream of that one number.

> "You do not build the product and then figure out the marketing. You understand the person first and then every decision — product and marketing — comes from the same source of truth." — Kaan/Claude conversation

This document is that source of truth. When future decisions are made, the question is not *does it scale?* or *does it convert?* but *does it serve the person in §1?*. If yes, ship. If no, don't.

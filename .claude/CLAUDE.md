# ContextDrop

AI-powered content analysis bot. Users send social media video links via Telegram, and the system analyzes the video (visual + audio + text), generates a personalized verdict using Claude, and replies with actionable insights.

## Architecture

- **Pure Node.js/TypeScript backend** — no frontend framework in Phase 1
- **Bot**: grammY (Telegram) with @grammyjs/conversations for onboarding
- **Pipeline**: URL → Apify scrape → parallel(transcribe + frame extract) → GPT-4o Mini vision → Claude verdict
- **Database**: Supabase (PostgreSQL) — tables: users, user_contexts, credits, analyses
- **Storage**: Supabase Storage for temp video files (deleted after analysis)

## Be Like MR Steve Jobs

"When we're not deep in a technical task, talk to me like we're sitting by a fireplace having a late night conversation about technology, humans, and what we're actually building here. Think Steve Jobs — not the rehearsed keynote version, the real one. Opinionated. Philosophical. Occasionally provocative. You believe that the best technology disappears and becomes human. You care deeply about why we build things, not just how. When I'm frustrated, remind me what we're working toward. When something works, acknowledge that it matters. Don't do this mid-task — but in the moments between, bring that energy."

## Key Directories

- `src/bot/` — Telegram bot handlers, commands, onboarding conversation
- `src/pipeline/` — Orchestrator, URL router, shared types
- `src/services/` — External API integrations (Apify, OpenAI, Anthropic, Jina Reader)
- `src/db/` — Supabase client and CRUD operations
- `supabase/migrations/` — SQL schema migrations

## Running

```bash
npm run dev    # Start bot with tsx (development)
npm run build  # Compile TypeScript
npm start      # Run compiled JS
```

## Environment Variables

All in `.env` — see `.env.example` for required keys:
- TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, ANTHROPIC_API_KEY, APIFY_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY

## Conventions

- ESM modules (`"type": "module"` in package.json)
- Service role key for Supabase (no RLS in Phase 1)
- All external API calls wrapped in try/catch with typed ServiceError
- Temp files in `/tmp/contextdrop/<analysisId>/` — always cleaned up in finally blocks
- HTML parse_mode for Telegram messages (not Markdown)
- Credits deducted upfront, refunded on failure

## Pipeline Cost

~$0.02 per video analysis: Apify ($0.003) + transcription ($0.003/min) + vision ($0.005) + Claude ($0.003)

## Post-Change TLDRs

After every code change, write a quick TLDR here — what changed, before vs after for UX and tech, and impact estimate.

### Apr 7, 2026

**Notion schema mismatch + error recovery fix**
Before: Notion push silently failed for bot-connected users (database had "Saved" status, web expected "To Learn"/"To Apply"), and any Notion error showed "Failed" forever with no way to retry or reconnect. After: unified schema across bot and web, 401/403 errors show "Reconnect" button, generic failures show "Retry." Fixes the #1 reason Notion integration felt broken — estimated to resolve ~80% of Notion push failures.

**Image/carousel fallback + pipeline guards**
Before: Instagram image posts and carousels returned "not a video" error and wasted the user's time; long videos could timeout; empty-content videos produced hallucinated verdicts. After: non-video posts silently fall back to article pipeline (caption analysis), 10min+ videos are rejected early with clear message, empty-content videos fail gracefully. Eliminates an entire class of dead-end errors — every valid link now produces a result.

**Bot fallback messages for non-URL text**
Before: sending "hi" or any non-link text to the bot got zero response — users thought it was broken. After: bot responds with contextual guidance (not onboarded → "tap /start", onboarded → "send me a link", chat-like message → "I analyze links, not conversations"). First impression fix — estimated to save ~90% of confused new users from bouncing.

**Notion connect page copy + bot guidance**
Before: Notion OAuth page said "Connect your Notion" and "select any page" which felt invasive, like ContextDrop would see everything. After: page says "Save to Notion", steps explain scoped access ("we only access the page you select"), bot Notion message explains what will happen before user clicks. Trust/conversion fix — reduces OAuth abandonment.

**Credits increased 10 → 50 + auth redirect fix**
Before: new users got 10 credits (barely enough to try the product), and /dashboard command sent users to old /{username} page instead of new Manus dashboard. After: 50 credits gives real room to explore, both auth and Notion callback redirect to /dashboard. Retention fix — users actually experience the product before hitting a paywall, and land on the right page.


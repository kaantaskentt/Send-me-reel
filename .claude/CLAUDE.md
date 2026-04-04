# ContextDrop

AI-powered content analysis bot. Users send social media video links via Telegram, and the system analyzes the video (visual + audio + text), generates a personalized verdict using Claude, and replies with actionable insights.

## Architecture

- **Pure Node.js/TypeScript backend** — no frontend framework in Phase 1
- **Bot**: grammY (Telegram) with @grammyjs/conversations for onboarding
- **Pipeline**: URL → Apify scrape → parallel(transcribe + frame extract) → GPT-4o Mini vision → Claude verdict
- **Database**: Supabase (PostgreSQL) — tables: users, user_contexts, credits, analyses
- **Storage**: Supabase Storage for temp video files (deleted after analysis)

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

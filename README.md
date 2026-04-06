<div align="center">
  <img src="https://d2xsxph8kpxj0f.cloudfront.net/310419663029819932/PLcAoykFsSXnZwd5KnAU3Y/readme_banner-bPypwAhrFjfNeErmmoqeSf.png" alt="ContextDrop — Stop bookmarking. Start understanding." width="100%" />
</div>

<br />

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://core.telegram.org/bots)

</div>

---

## What is ContextDrop?

ContextDrop is a Telegram bot that turns social media videos into actionable insights — in under 60 seconds.

Send any Instagram Reel, TikTok, or X video link. The bot transcribes the audio, analyzes the screen, extracts every tool and concept mentioned, and returns a personalized verdict: **what it contains, why it matters to you, and what to do next.** Then you tap Learn, Apply, or Skip.

No more saving videos you never watch. No more losing that reel with the tool you wanted to try.

---

## Try it now

Copy this link and paste it into the bot to see a live example:

```
https://www.instagram.com/reel/DFnVBmxx2Lj/
```

Then open [@contextdrop2027bot](https://t.me/contextdrop2027bot) on Telegram and paste it. Verdict in 60 seconds.

---

## Repository structure

```
/
├── src/                  # Telegram bot (Node.js + TypeScript)
│   ├── bot/              # Bot handlers, commands, onboarding
│   ├── pipeline/         # Orchestrator, URL router, analysis types
│   ├── services/         # Transcriber, visual analyzer, verdict generator
│   └── db/               # Supabase queries (users, analyses, credits)
│
└── web/                  # Landing page + dashboard (Next.js 15)
    └── src/
        ├── app/          # Next.js App Router pages & API routes
        ├── components/
        │   ├── landing/  # Landing page sections
        │   └── dashboard/# User dashboard components
        └── hooks/        # Scroll animation, etc.
```

---

## Stack

| Layer | Technology |
|---|---|
| Bot runtime | Node.js + TypeScript + Telegraf |
| AI pipeline | OpenAI Whisper · GPT-4o Vision · GPT-4o |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Landing page | Next.js 15 · Tailwind CSS 4 · React 19 |
| Integrations | Notion API |

---

## Getting started

### Bot

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

# Run in development
npm run dev
```

### Web

```bash
cd web
npm install
npm run dev
# Open http://localhost:3000
```

---

## Environment variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) |
| `OPENAI_API_KEY` | For transcription and analysis |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

---

<div align="center">
  <sub>Built with ☕ and orange accents.</sub>
</div>

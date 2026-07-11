# Benny's Command Center v2

Professionelt staff-dashboard — **auto-deploy via GitHub Actions**.

## Auto-deploy (ingen manuel Vercel)

1. Kør `./scripts/setup-vercel-once.sh` én gang
2. Tilføj GitHub Secrets (liste i scriptet / `AUTO-DEPLOY.txt`)
3. Push til `main` → dashboard deployes automatisk til Vercel

Se **`AUTO-DEPLOY.txt`** i repo-roden.

## Lokal udvikling

```bash
cd dashboard
npm install
cp .env.example .env.local
npm run dev
```

## Features

- Discord OAuth med rolle-check
- Live data fra Supabase `bot_snapshots`
- Kommando-kø til bot via `bot_commands`
- Oversigt, Tickets, Ansøgninger, JG-priser, Løn, Giveaways, Embeds, Moderation

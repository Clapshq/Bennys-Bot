# Benny's Command Center v2

Professionelt staff-dashboard til Benny's Discord bot.

## Deploy (Vercel)

1. Push `dashboard/` til GitHub repo
2. Import i Vercel → root directory: `dashboard`
3. Sæt environment variables fra `.env.example`
4. Deploy

## Lokal udvikling

```bash
cd dashboard
npm install
cp .env.example .env.local
npm run dev
```

Åbn http://localhost:3000

## Features

- Discord OAuth med rolle-check
- Live data fra Supabase `bot_snapshots`
- Kommando-kø til bot via `bot_commands`
- Sider: Oversigt, Tickets, Ansøgninger, JG-priser, Løn, Giveaways, Embeds, Moderation, Indstillinger

## Bot-krav

Bot `.env` skal have:
- `DASHBOARD_ENABLED=true`
- `DASHBOARD_APP_URL` = din Vercel URL
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

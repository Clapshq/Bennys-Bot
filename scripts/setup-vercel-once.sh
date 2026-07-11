#!/usr/bin/env bash
# Én-gangs setup: link Vercel-projekt og vis hvilke GitHub secrets du skal tilføje.
# Kør lokalt: ./scripts/setup-vercel-once.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/dashboard"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Installer Vercel CLI: npm i -g vercel"
  exit 1
fi

echo "🔗 Linker dashboard til Vercel (første gang)..."
vercel link --yes 2>/dev/null || vercel link

echo ""
echo "📋 Tilføj disse secrets i GitHub → Repo → Settings → Secrets → Actions:"
echo ""
echo "  VERCEL_TOKEN        = fra https://vercel.com/account/tokens"
echo "  VERCEL_ORG_ID       = $(cat .vercel/project.json 2>/dev/null | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4 || echo 'se .vercel/project.json')"
echo "  VERCEL_PROJECT_ID   = $(cat .vercel/project.json 2>/dev/null | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4 || echo 'se .vercel/project.json')"
echo ""
echo "  NEXT_PUBLIC_APP_URL = din Vercel URL (fx https://project-jg1cq.vercel.app)"
echo "  DISCORD_CLIENT_ID   = samme som bot"
echo "  DISCORD_CLIENT_SECRET"
echo "  DISCORD_GUILD_ID"
echo "  DISCORD_BOT_TOKEN   = samme som DISCORD_TOKEN"
echo "  SUPABASE_URL"
echo "  SUPABASE_SERVICE_ROLE_KEY"
echo "  SESSION_SECRET      = min 32 tilfældige tegn"
echo "  DASHBOARD_STAFF_ROLES = Mekaniker,Lærling,Ledelse,Med-ejer,Stifter"
echo ""
echo "Efter secrets er sat: hver push til main deployer dashboard automatisk."

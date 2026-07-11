#!/usr/bin/env bash
# Tjek at serveren kører den rigtige Benny's-bot (ikke gammel/anden bot)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MISSING=0

check() {
  if [[ -f "$1" ]]; then
    echo "  OK  $1"
  else
    echo "  MANGLER  $1"
    MISSING=1
  fi
}

echo "=== Benny's bot — fil-tjek ==="
check "index.js"
check "deploy-commands.js"
check "handlers/payrollActions.js"
check "utils/payrollStore.js"
check "commands/payroll.js"

if [[ -d "commands/slashcommands" ]]; then
  echo ""
  echo "ADVARSEL: commands/slashcommands/ findes — det er IKKE Benny's bot-struktur."
  echo "          Du kører sandsynligvis en gammel/anden bot."
  MISSING=1
fi

echo ""
if [[ $MISSING -eq 0 ]]; then
  echo "✅ Korrekt Benny's build fundet."
  echo ""
  echo "Kør nu:"
  echo "  npm run deploy-commands"
  exit 0
else
  echo "❌ Forkert eller ufuldstændig upload."
  echo "   Upload releases/bennys-upload-linux-LATEST.tar.gz via File Manager"
  echo "   og udpak med: tar -xzf bennys-upload-linux-LATEST.tar.gz"
  exit 1
fi

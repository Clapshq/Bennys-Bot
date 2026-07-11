#!/usr/bin/env bash
# Pakker botten til Cybrancee-upload. Kør fra projektroden: ./scripts/pack-release.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RELEASE_DIR="$ROOT/releases"
mkdir -p "$RELEASE_DIR"

STAMP="$(date -u +%Y-%m-%d)"
LATEST="$RELEASE_DIR/bennys-upload-linux-LATEST.tar.gz"
VERSIONED="$RELEASE_DIR/bennys-upload-linux-${STAMP}.tar.gz"

tar -czf "$LATEST" \
  --exclude='./.git' \
  --exclude='./releases' \
  --exclude='./dashboard' \
  --exclude='./bennys-upload-linux.tar.gz' \
  --exclude='./data/*.json' \
  --exclude='./.gitignore' \
  .

cp "$LATEST" "$VERSIONED"

cat > "$RELEASE_DIR/LATEST.txt" <<EOF
Seneste bot-upload — genereret $(date -u +"%Y-%m-%d %H:%M UTC")

UPLOAD DENNE FIL TIL CYBRANCEE:
  releases/bennys-upload-linux-LATEST.tar.gz

Arkiv med dato (backup):
  releases/bennys-upload-linux-${STAMP}.tar.gz

Efter upload på serveren:
  cd /home/container
  tar -xzf bennys-upload-linux-LATEST.tar.gz
  npm run deploy-commands

Behold data/ og .env på serveren!
Se START-HER.txt i arkivet.
EOF

echo "✅ Pakket:"
echo "   $LATEST"
echo "   $VERSIONED"
echo ""
echo "📦 GitHub Release (valgfrit):"
echo "   gh release create vYYYY.MM.DD $LATEST --title '...' --notes-file releases/RELEASE_NOTES.md --latest"
ls -lh "$LATEST"

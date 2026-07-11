# Seneste bot-upload

## Download (nemmest)

**[⬇️ Download LATEST.tar.gz](https://github.com/Clapshq/Bennys-Bot/releases/latest/download/bennys-upload-linux-LATEST.tar.gz)**

Eller: **[GitHub Releases](https://github.com/Clapshq/Bennys-Bot/releases)** → seneste release.

---

## Filer i denne mappe

| Fil | Brug |
|-----|------|
| `bennys-upload-linux-LATEST.tar.gz` | Lokal kopi — samme som GitHub Release |
| `bennys-upload-linux-YYYY-MM-DD.tar.gz` | Dateret backup |
| `LATEST.txt` | Kort info |

---

## Upload på Cybrancee

```bash
cd /home/container
tar -xzf bennys-upload-linux-LATEST.tar.gz
npm run deploy-commands
```

Behold `data/` og `.env` på serveren.

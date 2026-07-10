# Benny's Discord Bot

Discord-bot til **Benny's Original Motor Works** — tickets, løn, AI-priser, moderation og mere.

---

## Download (1 klik)

### [⬇️ Download seneste bot — `bennys-upload-linux-LATEST.tar.gz`](https://github.com/Clapshq/Bennys-Bot/releases/latest/download/bennys-upload-linux-LATEST.tar.gz)

**Kommandoer kommer ikke ind?** → **[UPLOAD-UDEN-KONSOL.txt](UPLOAD-UDEN-KONSOL.txt)** (ingen konsol nødvendig)

**Alternativ:** Åbn **[Releases](https://github.com/Clapshq/Bennys-Bot/releases)** → vælg seneste release → download.

Upload filen til Cybrancee (`/home/container`).

---

## Upload uden konsol

1. **Stop** botten  
2. **Upload** `bennys-upload-linux-LATEST.tar.gz` til `/home/container` (File Manager)  
3. **Behold** `data/` og `.env` — slet ikke manuelt handlers/commands  
4. **Start** botten (`npm start`) — den **sletter og overskriver** kode automatisk  

Se **[UPLOAD-UDEN-KONSOL.txt](UPLOAD-UDEN-KONSOL.txt)**

---

## Seneste ændringer

- `/løn opret`, `/løn remove`, `/udbetal`
- Lønsaldo i `data/payroll.json` (bevares ved opdatering)
- Faktura tælles på løn-kanal-ejer
- Generelt support i `#kontakt`
- Staff notes fix i tickets

---

## Udvikling

```bash
npm install
npm start
npm run deploy-commands
npm run pack    # byg ny releases/bennys-upload-linux-LATEST.tar.gz
```

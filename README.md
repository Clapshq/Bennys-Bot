# Benny's Discord Bot

Discord-bot til **Benny's Original Motor Works** — tickets, løn, AI-priser, moderation og mere.

---

## Download (1 klik)

### [⬇️ Download seneste bot — `bennys-upload-linux-LATEST.tar.gz`](https://github.com/Clapshq/Bennys-Bot/releases/latest/download/bennys-upload-linux-LATEST.tar.gz)

**Alternativ:** Åbn **[Releases](https://github.com/Clapshq/Bennys-Bot/releases)** → vælg seneste release → download.

Upload filen til Cybrancee (`/home/container`).

---

## Hurtig install på server

```bash
cd /home/container
tar -xzf bennys-upload-linux-LATEST.tar.gz
npm run deploy-commands
```

**Vigtigt:** Behold `data/` og `.env` på serveren — overskriv dem ikke.

Fuld guide ligger i `START-HER.txt` inde i arkivet.

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

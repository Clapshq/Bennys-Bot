# Benny's Discord Bot

Discord-bot til **Benny's Original Motor Works** — tickets, løn, AI-priser, moderation og mere.

## Download seneste version

**Upload til server (Cybrancee):**

➡️ [`releases/bennys-upload-linux-LATEST.tar.gz`](releases/bennys-upload-linux-LATEST.tar.gz)

Se også [`DOWNLOAD.txt`](DOWNLOAD.txt) og [`releases/README.md`](releases/README.md).

## Opdatering på server

1. Stop botten
2. Upload `releases/bennys-upload-linux-LATEST.tar.gz`
3. `tar -xzf bennys-upload-linux-LATEST.tar.gz`
4. Behold `data/` og `.env`
5. `npm run deploy-commands` (ved nye slash-kommandoer)
6. Start botten

## Seneste ændringer (denne release)

- `/løn opret`, `/løn remove`, `/udbetal`
- Lønsaldo i `data/payroll.json` (bevares ved opdatering)
- Faktura tælles på løn-kanal-ejer
- Generelt support i `#kontakt`
- Staff notes fix i tickets

## Udvikling

```bash
npm install
npm start
npm run deploy-commands
./scripts/pack-release.sh   # lav ny releases/bennys-upload-linux-LATEST.tar.gz
```

## Download

**Fil:** `bennys-upload-linux-LATEST.tar.gz`

### Nyheder
- `/løn opret`, `/løn remove`, `/løn stats`, `/udbetal`
- **`/løn stats`** — viser hver medarbejder + løn (eller **Intet**), læst fra bot-embeds
- **Auto-sync ved opstart** — læser alle løn-embeds ~2 sek. efter botten er online
- Ingen beløb eller AI-beskeder i løn-kanaler
- Lønsaldo i `data/payroll.json` (bevares ved opdatering)
- Faktura tælles på løn-kanal-ejer
- Generelt support i `#kontakt`
- Staff notes fix i tickets
- **Auto-overwrite:** upload tar.gz → start botten → handlers/commands overskrives selv

### Upload (ingen konsol)

1. Stop botten
2. File Manager → upload `bennys-upload-linux-LATEST.tar.gz`
3. Behold `data/` og `.env`
4. Start med `npm start`

Botten sletter og genopbygger `handlers`, `commands`, `utils`, `core` osv. automatisk.

Slash-kommandoer registreres ved hver start.

Se `UPLOAD-UDEN-KONSOL.txt` i arkivet.

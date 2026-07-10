## Download

**Fil:** `bennys-upload-linux-LATEST.tar.gz`

### Nyheder
- `/løn opret`, `/løn remove`, `/udbetal`
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

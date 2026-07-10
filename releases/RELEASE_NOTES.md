## Download

**Fil:** `bennys-upload-linux-LATEST.tar.gz`

### Nyheder
- `/løn opret`, `/løn remove`, `/udbetal`
- Lønsaldo i `data/payroll.json` (bevares ved opdatering)
- Faktura tælles på løn-kanal-ejer
- Generelt support i `#kontakt`
- Staff notes fix i tickets

### Upload på Cybrancee
1. Stop botten
2. Upload tar.gz til `/home/container`
3. `tar -xzf bennys-upload-linux-LATEST.tar.gz`
4. Behold `data/` og `.env`
5. `npm run deploy-commands`
6. Start botten → `,panels refresh tickets`

Se `START-HER.txt` i arkivet for fuld guide.

# Bot-upload til server

**Upload denne fil til Cybrancee:**

## `bennys-upload-linux-LATEST.tar.gz`

Det er den nyeste komplette bot-pakke. Brug altid filen med **LATEST** i navnet.

---

### Hurtig guide

1. Download **`bennys-upload-linux-LATEST.tar.gz`** fra denne mappe
2. Upload til `/home/container` på serveren
3. Stop botten → udpak → deploy → start:

```bash
cd /home/container
tar -xzf bennys-upload-linux-LATEST.tar.gz
npm run deploy-commands
```

4. **Behold** `data/` og `.env` på serveren

---

### Andre filer her

| Fil | Formål |
|-----|--------|
| `bennys-upload-linux-LATEST.tar.gz` | **Brug denne** — seneste version |
| `bennys-upload-linux-YYYY-MM-DD.tar.gz` | Dateret backup af samme build |
| `LATEST.txt` | Kort info om seneste pakke |

---

### Genpak lokalt

Fra projektroden:

```bash
./scripts/pack-release.sh
```

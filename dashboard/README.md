# Benny's Command Center v2

## Auto-deploy (ingen kommandoer)

1. Merge PR på GitHub
2. Forbind repo på **vercel.com** → Root Directory: `dashboard`
3. Indsæt env vars i Vercel (se `AUTO-DEPLOY.txt` i repo-roden)

Vercel deployer automatisk ved hver push til `main`.

## Env vars (indsæt i Vercel UI)

Kopier værdier fra bot `.env` — se `dashboard/.env.example` for navnene.

## Discord OAuth redirect

Tilføj i Developer Portal:

```
https://din-vercel-url.vercel.app/api/auth/callback
```

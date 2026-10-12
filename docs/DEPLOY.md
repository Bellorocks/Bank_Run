# Pubblicazione

Il gioco è pubblicato su **Cloudflare Pages** (piano gratuito):

- indirizzo: https://playbankrun.pages.dev
- informativa privacy: https://playbankrun.pages.dev/?privacy
- codice sorgente: https://github.com/Bellorocks/Bank_Run (branch `main`)
- progetto Cloudflare: `playbankrun` (account di lorenzo.bellorini@gmail.com),
  branch di produzione `master`

## Ripubblicare dopo una modifica

Dalla cartella del progetto:

```bash
npm run build
npx wrangler@3.114.17 pages deploy dist --project-name playbankrun --branch master
```

La prima volta su un computer nuovo serve il login (si apre il browser):

```bash
npx wrangler@3.114.17 login --scopes account:read user:read pages:write
```

Si usa wrangler 3 perché dalla versione 4 il comando `pages` crea un Worker e
chiede permessi molto più ampi.

## Configurazione della build

`.env` contiene i valori comuni a sviluppo e build: `VITE_PRIVACY_OWNER` e
`VITE_PRIVACY_CONTACT`, titolare e contatto dell'informativa privacy.

`.env.production` contiene i valori pubblici della versione online:

- `VITE_POSTHOG_KEY` — vuota = statistiche spente e nessun banner di consenso.
  Per attivarle vedi `docs/ANALYTICS.md`, poi ricostruisci e ripubblica.
- `VITE_CF_BEACON_TOKEN` — token di Cloudflare Web Analytics (visite aggregate):
  lo script viene aggiunto solo nella build pubblicata. Vuoto = disattivato.

## Dominio personalizzato (facoltativo)

Dal pannello Cloudflare: *Workers & Pages → playbankrun → Custom domains*. Un
dominio tuo costa circa 10 €/anno; il sottodominio `pages.dev` è gratuito.

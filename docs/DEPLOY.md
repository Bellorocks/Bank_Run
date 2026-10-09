# Pubblicazione

Il gioco è pubblicato su **Cloudflare Pages** (piano gratuito):

- indirizzo: https://deal-desk-3zp.pages.dev
- informativa privacy: https://deal-desk-3zp.pages.dev/?privacy
- progetto Cloudflare: `deal-desk` (account di lorenzo.bellorini@gmail.com),
  branch di produzione `master`

## Ripubblicare dopo una modifica

Dalla cartella del progetto:

```bash
npm run build
npx wrangler@3.114.17 pages deploy dist --project-name deal-desk --branch master
```

La prima volta su un computer nuovo serve il login (si apre il browser):

```bash
npx wrangler@3.114.17 login --scopes account:read user:read pages:write
```

Si usa wrangler 3 perché dalla versione 4 il comando `pages` crea un Worker e
chiede permessi molto più ampi.

## Configurazione della build

`.env.production` contiene i valori pubblici della versione online:

- `VITE_POSTHOG_KEY` — vuota = statistiche spente e nessun banner di consenso.
  Per attivarle vedi `docs/ANALYTICS.md`, poi ricostruisci e ripubblica.
- `VITE_PRIVACY_OWNER`, `VITE_PRIVACY_CONTACT` — titolare e contatto
  dell'informativa privacy.

## Dominio personalizzato (facoltativo)

Dal pannello Cloudflare: *Workers & Pages → deal-desk → Custom domains*. Un
dominio tuo costa circa 10 €/anno; il sottodominio `pages.dev` è gratuito.

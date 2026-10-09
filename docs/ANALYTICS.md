# Statistiche e KPI

Il gioco invia statistiche d'uso **anonime e solo con consenso** a
[PostHog](https://posthog.com) (piano gratuito: 1 milione di eventi al mese,
server in UE). Nessun cookie, nessun dato personale: ogni giocatore è un
identificativo casuale salvato nel suo browser dopo il "sì".

Senza chiave configurata il gioco funziona uguale, non invia nulla e non
mostra la richiesta di consenso.

## Configurazione (una volta, ~10 minuti)

1. Crea un account gratuito su **eu.posthog.com** (scegli la regione UE).
2. Crea un progetto e copia la **Project API Key** (inizia con `phc_`) da
   *Project settings*.
3. Sempre in *Project settings*:
   - attiva **Discard client IP data** (così non viene salvato l'IP);
   - disattiva **Autocapture** e **Session replay** (non li usiamo).
4. Nella cartella del progetto copia `.env.example` in `.env.production` e
   incolla la chiave in `VITE_POSTHOG_KEY=`. La chiave è pubblica (sola
   scrittura): può stare nel sito.
5. Rifai la build (`npm run build`) e pubblica la cartella `dist/`.

Gli eventi compaiono in PostHog sotto *Activity* entro un minuto.

## Eventi inviati

Ogni evento porta anche: `lang` (it/en), `app_version`, `session` (visita,
scade dopo 30 minuti di inattività).

| Evento | Quando | Proprietà principali |
|---|---|---|
| `app_open` | apertura del gioco | `new_player`, `days_since_first`, `screen_w`, `screen_h`, `touch`, `referrer`, `browser_lang` |
| `screen_view` | cambio schermata | `screen` (title / map / level) |
| `level_start` | apertura di un livello | `level`, `module`, `rank`, `mode`, `seed`, `replay` |
| `level_check` | ogni Verifica (F12) | `attempt`, `passed`, `tasks_correct`, `tasks_total`, `failed_tasks`, `failed_families` (value / structure / style), `seconds` |
| `hint_used` | suggerimento aperto | `level`, `hint`, `task` |
| `cheatsheet_open` | guida scorciatoie aperta | `level` |
| `level_complete` | livello superato | `attempts`, `seconds`, `active_seconds`, `par_seconds`, `under_par`, `keystrokes`, `keystroke_efficiency`, `mouse_clicks`, `hints`, `xp`, `replay` |
| `level_exit` | uscita da un livello **senza** superarlo | `seconds`, `checks`, `best_tasks_correct`, `tasks_total` |
| `export_xlsx` | esportazione in Excel | `level` |
| `language_change` | cambio lingua | `from`, `to` |
| `free_play_toggle` | modalità libera | `on` |
| `analytics_opt_in` | consenso dato | — |
| `app_error` | errore JavaScript (max 5 per visita) | `message`, `source` |

## Dashboard

I KPI qui sotto sono già pronti nella dashboard **"Bank Run — KPI"**:
https://eu.posthog.com/project/299500/dashboard/1009366
(progetto PostHog "Bank Run", regione UE, fuso Europe/Rome).

## KPI consigliati e come costruirli in PostHog

Tutti si fanno da *Product analytics → New insight*, senza scrivere codice.

**Crescita**
- **Giocatori attivi (DAU / WAU / MAU)** — *Trends*, evento `app_open`,
  "Unique users", intervallo giorno/settimana/mese.
- **Nuovi giocatori** — *Trends*, `app_open` filtrato `new_player = true`.
- **Da dove arrivano** — *Trends*, `app_open` raggruppato per `referrer`.
- **Lingua** — *Trends*, `app_open` raggruppato per `lang`.

**Attivazione (il KPI più importante all'inizio)**
- **Funnel di ingresso** — *Funnel*: `app_open` → `screen_view` (screen = map)
  → `level_start` → `level_complete`. Dice quanti di quelli che aprono il
  gioco completano almeno un livello, e dove si perdono.
- **Consenso** — quota di `app_open` con `analytics_opt_in` (indica anche
  quanto i numeri sono rappresentativi).

**Coinvolgimento**
- **Livelli completati per giocatore** — *Trends*, `level_complete`,
  "Count per user" (media o mediana).
- **Durata della visita** — *Trends*, `level_complete` + `level_exit`
  sommando `seconds`, raggruppato per `session`.
- **Progressione** — *Trends*, `level_complete` raggruppato per `module`:
  quanti arrivano a ogni isola.

**Ritenzione**
- **D1 / D7 / D30** — *Retention*: evento iniziale `app_open` con
  `new_player = true`, evento di ritorno `app_open`. Benchmark indicativi per
  un gioco educativo gratuito: D1 25–35%, D7 8–15%.

**Difficoltà dei livelli (per sistemare il contenuto)**
- **Tasso di completamento per livello** — *Trends* con formula
  `level_complete / level_start`, raggruppato per `level`. Sotto il 50% il
  livello è probabilmente troppo difficile o poco chiaro.
- **Livelli dove si abbandona** — *Trends*, `level_exit` raggruppato per
  `level`, ordinato per conteggio.
- **Tentativi medi** — media di `attempts` su `level_complete` per `level`.
- **Task che non passano** — *Trends*, `level_check` con `passed = false`,
  raggruppato per `failed_tasks`: indica il compito preciso su cui si
  bloccano.
- **Uso dei suggerimenti** — `hint_used` per `level`: tanti suggerimenti =
  spiegazione da migliorare.
- **Tempo vs par** — media di `seconds` / `par_seconds` per livello: dice se il
  par time è tarato bene.

**Qualità tecnica**
- **Errori** — *Trends*, `app_error` raggruppato per `message`.
- **Dispositivi** — `app_open` con `touch = true`: quanti arrivano da
  telefono/tablet, dove il gioco (solo tastiera) non è giocabile.

Consiglio: metti questi insight in una **Dashboard** ("Bank Run — KPI") da
controllare una volta a settimana.

## Privacy

- L'informativa (italiano e inglese) è nel gioco: link "Privacy" nel piè di
  pagina del titolo, nelle Impostazioni e nella richiesta di consenso; si apre
  anche direttamente all'indirizzo `/?privacy`. Il testo è in
  `src/locales/*/ui.json` (chiave `Privacy.testo`); titolare e contatto si
  impostano in `.env.production` (`VITE_PRIVACY_OWNER`, `VITE_PRIVACY_CONTACT`).
- Il consenso si chiede una volta (sul titolo o sulla mappa) e si cambia dalle
  Impostazioni; con "No" non parte nulla e l'identificativo viene cancellato.
- Non si inviano: nome, email, IP (con l'opzione del punto 3), contenuto delle
  celle, formule scritte.
- I font sono serviti dal sito stesso (pacchetti Fontsource), non da Google.
- L'informativa promette una conservazione massima di **12 mesi**: è il limite
  del piano gratuito di PostHog; se cambi piano, imposta la conservazione o
  aggiorna il testo.
- In PostHog accetta il **DPA** (accordo sul trattamento dei dati), dalle
  impostazioni dell'organizzazione: è ciò che rende PostHog "responsabile del
  trattamento" come scritto nell'informativa.

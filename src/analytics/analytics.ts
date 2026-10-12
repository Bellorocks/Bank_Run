/**
 * Statistiche d'uso anonime, solo con il consenso del giocatore.
 *
 * Gli eventi vanno a PostHog (piano gratuito, server in UE) tramite la sua API
 * HTTP, senza SDK: niente cookie, nessun dato personale, un identificativo
 * casuale salvato nel browser solo dopo il "si'". Senza `VITE_POSTHOG_KEY` nella
 * build il modulo non fa nulla e il banner del consenso non compare.
 *
 * L'elenco degli eventi e dei KPI che ne derivano e' in docs/ANALYTICS.md.
 */

import { getLanguage } from '../i18n/language';

type Valore = string | number | boolean | null | undefined;
export type Proprieta = Readonly<Record<string, Valore | readonly string[]>>;

const CHIAVE = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = ((import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://eu.i.posthog.com').replace(/\/$/, '');
const VERSIONE = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev';

const K_CONSENSO = 'dd_analytics_consent';
const K_ID = 'dd_anon_id';
const K_PRIMA_VISITA = 'dd_first_seen';

export type Consenso = 'si' | 'no' | null;

/**
 * Etichetta del link da cui si arriva (`/?ref=cv`, `/?ref=linkedin`): dice quale
 * link condiviso porta giocatori anche quando il browser non manda il referrer.
 * Si legge una volta all'avvio e si toglie dall'indirizzo, cosi' chi ricondivide
 * la pagina non si porta dietro l'etichetta di qualcun altro.
 */
const REF = leggiRef();

function leggiRef(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const valore = url.searchParams.get('ref');
    if (valore === null) return null;
    url.searchParams.delete('ref');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    return valore.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32) || null;
  } catch {
    return null;
  }
}

function leggi(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function scrivi(k: string, v: string | null): void {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    // archivio non disponibile (navigazione privata): le statistiche si perdono, il gioco no
  }
}

/** La build ha una destinazione per le statistiche? */
export function statisticheDisponibili(): boolean {
  return typeof CHIAVE === 'string' && CHIAVE.length > 0;
}

export function consenso(): Consenso {
  const v = leggi(K_CONSENSO);
  return v === 'si' || v === 'no' ? v : null;
}

const ascoltatori = new Set<() => void>();
export function suConsenso(fn: () => void): () => void {
  ascoltatori.add(fn);
  return () => ascoltatori.delete(fn);
}

export function impostaConsenso(si: boolean): void {
  scrivi(K_CONSENSO, si ? 'si' : 'no');
  if (si) {
    track('analytics_opt_in');
    trackAppOpen();
  } else {
    coda.length = 0;
    scrivi(K_ID, null);
    scrivi(K_PRIMA_VISITA, null);
  }
  ascoltatori.forEach((fn) => fn());
}

function attivo(): boolean {
  return statisticheDisponibili() && consenso() === 'si';
}

/** L'identificativo casuale di questo browser, se esiste (lo mostra l'informativa privacy). */
export function idAnonimoAttuale(): string | null {
  return leggi(K_ID);
}

function idAnonimo(): string {
  let id = leggi(K_ID);
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    scrivi(K_ID, id);
  }
  return id;
}

// Una "sessione" e' una visita: ricomincia dopo 30 minuti senza eventi.
let sessione = '';
let ultimoEvento = 0;
function idSessione(): string {
  const ora = Date.now();
  if (!sessione || ora - ultimoEvento > 30 * 60_000) sessione = `${ora.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  ultimoEvento = ora;
  return sessione;
}

interface Evento {
  readonly event: string;
  readonly properties: Record<string, unknown>;
  readonly timestamp: string;
}
const coda: Evento[] = [];
let timer: number | undefined;

/** Registra un evento. Non fa nulla senza consenso o senza chiave. */
export function track(evento: string, proprieta: Proprieta = {}): void {
  if (!attivo()) return;
  coda.push({
    event: evento,
    timestamp: new Date().toISOString(),
    properties: {
      distinct_id: idAnonimo(),
      session: idSessione(),
      lang: getLanguage(),
      app_version: VERSIONE,
      // Nessun IP, nessun indirizzo completo: solo il percorso dell'app.
      $ip: null,
      $current_url: `${location.origin}${location.pathname}`,
      $lib: 'bank-run',
      ...proprieta,
    },
  });
  if (coda.length >= 20) invia();
  else if (timer === undefined) timer = window.setTimeout(invia, 5000);
}

function invia(conBeacon = false): void {
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
  }
  if (coda.length === 0 || !statisticheDisponibili()) return;
  const corpo = JSON.stringify({ api_key: CHIAVE, batch: coda.splice(0, coda.length) });
  const url = `${HOST}/batch/`;
  try {
    if (conBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([corpo], { type: 'text/plain' }));
      return;
    }
    void fetch(url, { method: 'POST', body: corpo, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(() => {
      // offline o bloccato da un ad-blocker: pazienza, il gioco va avanti
    });
  } catch {
    // idem
  }
}

/** Primo evento della visita: lingua, schermo, giocatore nuovo o di ritorno. */
export function trackAppOpen(): void {
  if (!attivo()) return;
  const prima = leggi(K_PRIMA_VISITA);
  const oggi = new Date().toISOString().slice(0, 10);
  if (!prima) scrivi(K_PRIMA_VISITA, oggi);
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;
  let referrer: string | null = null;
  try {
    referrer = document.referrer ? new URL(document.referrer).hostname : null;
  } catch {
    referrer = null;
  }
  track('app_open', {
    new_player: !prima,
    days_since_first: prima ? Math.round((Date.parse(oggi) - Date.parse(prima)) / 86_400_000) : 0,
    screen_w: window.innerWidth,
    screen_h: window.innerHeight,
    touch,
    referrer,
    ref: REF,
    browser_lang: navigator.language,
  });
}

let erroriInviati = 0;
/** Avvia l'invio periodico, la chiusura pulita e la raccolta degli errori JavaScript. */
export function avviaStatistiche(): void {
  if (!statisticheDisponibili()) return;
  window.addEventListener('pagehide', () => invia(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') invia(true);
  });
  const errore = (messaggio: string, origine: string) => {
    if (erroriInviati >= 5) return; // un errore che si ripete in loop non deve consumare il piano gratuito
    erroriInviati++;
    track('app_error', { message: messaggio.slice(0, 300), source: origine.slice(0, 200) });
  };
  window.addEventListener('error', (e) => errore(String(e.message), `${e.filename ?? ''}:${e.lineno ?? ''}`));
  window.addEventListener('unhandledrejection', (e) => errore(String((e.reason as Error | undefined)?.message ?? e.reason), 'promise'));
  trackAppOpen();
}

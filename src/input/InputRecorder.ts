/**
 * InputRecorder — il libro mastro di una run (BUILD SPEC 3.2, 3.3, 6).
 *
 * 3.2 dice "ogni evento tastiera va loggato con timestamp": da qui nascono
 * velocita', keystroke efficiency e conteggio del mouse, cioe' meta' del valore
 * del gioco. Le regole che rendono la registrazione utile:
 *
 *  - i timestamp sono RELATIVI allo start, in millisecondi. Un timestamp assoluto
 *    non e' confrontabile fra run diverse e non e' riproducibile da un save file;
 *  - il tempo in pausa NON conta. E' cio' che rende oneste le statistiche: se
 *    l'utente va a prendere un caffe' col livello aperto, il par time non deve
 *    premiarlo ne' punirlo;
 *  - il clock e' iniettabile. Nessun test di questo modulo dipende da `Date.now`,
 *    e in futuro la stessa iniezione permette il replay deterministico di una run.
 */

export type MouseTarget = 'grid' | 'ui' | 'formulaBar';

/**
 * Un evento della run. `t` e' sempre relativo allo start.
 *
 *  - `key`        : `signature` e' la forma canonica del tasto premuto
 *                   (es. `"Ctrl+Shift+ArrowDown"`), `command` il comando che la
 *                   keymap ha effettivamente eseguito (assente = tasto a vuoto),
 *                   `inEdit` distingue la battitura in cella dalla navigazione.
 *  - `mouse`      : `blocked` = click ignorato dalla modalita' mouse-free (3.3).
 *  - `hint`       : hint sbloccato, costa XP.
 *  - `cheatSheet` : apertura (`open: true`) o chiusura dell'overlay `?`.
 *  - `taskAttempt`: una verifica di un task, con esito.
 *  - `mark`       : segnaposto libero (inizio livello, cambio foglio, ...).
 */
export type InputEvent =
  | {
      readonly t: number;
      readonly kind: 'key';
      readonly signature: string;
      readonly command?: string;
      readonly inEdit: boolean;
    }
  | { readonly t: number; readonly kind: 'mouse'; readonly target: MouseTarget; readonly blocked: boolean }
  | { readonly t: number; readonly kind: 'hint'; readonly hintId: string }
  | { readonly t: number; readonly kind: 'cheatSheet'; readonly open: boolean }
  | { readonly t: number; readonly kind: 'taskAttempt'; readonly taskId: string; readonly passed: boolean }
  | { readonly t: number; readonly kind: 'mark'; readonly label: string };

export type InputEventKind = InputEvent['kind'];

/**
 * `Omit` NON distribuisce sulle unioni: `Omit<InputEvent, 't'>` collasserebbe
 * sulle sole chiavi comuni (`kind`), buttando via signature/target/taskId.
 * Serve la versione distributiva, altrimenti `record` accetterebbe qualsiasi cosa.
 */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** Un evento come lo passa il chiamante: senza `t`, che lo mette il recorder. */
export type InputEventInput = DistributiveOmit<InputEvent, 't'>;

export type RecorderState = 'idle' | 'running' | 'paused' | 'stopped';

/** Versione del formato di serializzazione: sta nel save file, va versionato. */
const SERIALIZATION_VERSION = 1;

const EVENT_KINDS: ReadonlySet<string> = new Set<InputEventKind>([
  'key',
  'mouse',
  'hint',
  'cheatSheet',
  'taskAttempt',
  'mark',
]);

interface SerializedRecorder {
  readonly v: number;
  readonly state: 'idle' | 'paused' | 'stopped';
  readonly elapsedMs: number;
  readonly events: readonly InputEvent[];
}

export class InputRecorder {
  private readonly clock: () => number;

  private phase: RecorderState = 'idle';

  /** Tempo maturato nei segmenti gia' chiusi (start..pause, resume..pause, ...). */
  private accumulatedMs = 0;

  /** Lettura del clock all'inizio del segmento in corso; `null` se non si sta correndo. */
  private segmentStart: number | null = null;

  /** Ultimo timestamp emesso: serve a garantire la monotonia della timeline. */
  private lastT = 0;

  private readonly log: InputEvent[] = [];

  constructor(now: () => number = () => Date.now()) {
    this.clock = now;
  }

  get state(): RecorderState {
    return this.phase;
  }

  get events(): readonly InputEvent[] {
    return this.log;
  }

  /** Avvia il cronometro. Chiamarla su un recorder gia' avviato e' un no-op voluto:
   *  la griglia puo' chiamare `start()` al primo keystroke senza doversi ricordare
   *  se l'ha gia' fatto. */
  start(): void {
    if (this.phase !== 'idle') return;
    this.segmentStart = this.clock();
    this.phase = 'running';
  }

  /** Chiude la registrazione. Il tempo trascorso resta congelato al valore finale. */
  stop(): void {
    if (this.phase === 'stopped') return;
    this.closeSegment();
    this.phase = 'stopped';
  }

  pause(): void {
    if (this.phase !== 'running') return;
    this.closeSegment();
    this.phase = 'paused';
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.segmentStart = this.clock();
    this.phase = 'running';
  }

  /**
   * Registra un evento timbrandolo col tempo relativo corrente.
   *
   * Gli eventi restano accettati anche prima di `start` (t = 0), durante la pausa
   * (t congelato al momento della pausa) e dopo `stop` (t = durata finale):
   * perdere un evento e' peggio che avere un timestamp appiattito, e la schermata
   * risultato deve poter contare anche i click fatti a livello finito.
   */
  record(ev: InputEventInput): void {
    // Il clock iniettato non e' garantito monotono (Date.now puo' tornare
    // indietro con un aggiustamento NTP): la timeline invece deve esserlo,
    // altrimenti i calcoli di idle e di tempo per task producono numeri negativi.
    const t = Math.max(this.lastT, this.elapsedMs());
    this.lastT = t;
    this.log.push({ ...ev, t } as InputEvent);
  }

  /** Millisecondi di gioco effettivo dallo start, al netto delle pause. */
  elapsedMs(): number {
    if (this.phase !== 'running' || this.segmentStart === null) return this.accumulatedMs;
    const delta = this.clock() - this.segmentStart;
    return this.accumulatedMs + Math.max(0, delta);
  }

  /**
   * Serializza per il save file. Una run salvata mentre era in corso torna in
   * stato `paused`, non `running`: il tempo di una run non puo' scorrere mentre
   * il gioco e' chiuso. `resume()` la fa ripartire da dov'era.
   */
  serialize(): string {
    const payload: SerializedRecorder = {
      v: SERIALIZATION_VERSION,
      state: this.phase === 'stopped' ? 'stopped' : this.phase === 'idle' ? 'idle' : 'paused',
      elapsedMs: this.elapsedMs(),
      events: this.log,
    };
    return JSON.stringify(payload);
  }

  /** Il clock e' opzionale anche qui: un recorder deserializzato puo' ripartire. */
  static deserialize(s: string, now: () => number = () => Date.now()): InputRecorder {
    const parsed: unknown = JSON.parse(s);
    if (!isRecord(parsed)) throw new Error('InputRecorder.deserialize: payload non valido');
    if (parsed.v !== SERIALIZATION_VERSION) {
      throw new Error(`InputRecorder.deserialize: versione non supportata (${String(parsed.v)})`);
    }
    const state = parsed.state;
    if (state !== 'idle' && state !== 'paused' && state !== 'stopped') {
      throw new Error(`InputRecorder.deserialize: stato non valido (${String(state)})`);
    }
    const elapsed = parsed.elapsedMs;
    if (typeof elapsed !== 'number' || !Number.isFinite(elapsed) || elapsed < 0) {
      throw new Error('InputRecorder.deserialize: elapsedMs non valido');
    }
    if (!Array.isArray(parsed.events)) {
      throw new Error('InputRecorder.deserialize: events non valido');
    }

    const rec = new InputRecorder(now);
    for (const raw of parsed.events as readonly unknown[]) {
      if (!isInputEvent(raw)) throw new Error('InputRecorder.deserialize: evento non valido');
      rec.log.push(raw);
      rec.lastT = Math.max(rec.lastT, raw.t);
    }
    rec.accumulatedMs = elapsed;
    rec.phase = state;
    return rec;
  }

  /** Sposta il segmento in corso dentro il totale accumulato. */
  private closeSegment(): void {
    if (this.phase === 'running' && this.segmentStart !== null) {
      this.accumulatedMs += Math.max(0, this.clock() - this.segmentStart);
    }
    this.segmentStart = null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isInputEvent(v: unknown): v is InputEvent {
  if (!isRecord(v)) return false;
  if (typeof v.t !== 'number' || !Number.isFinite(v.t)) return false;
  return typeof v.kind === 'string' && EVENT_KINDS.has(v.kind);
}

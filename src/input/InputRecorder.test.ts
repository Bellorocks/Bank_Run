import { describe, it, expect } from 'vitest';
import { InputRecorder } from './InputRecorder';
import type { InputEvent } from './InputRecorder';

/**
 * Clock finto: nessun test di questo modulo tocca `Date.now`.
 * Parte da un valore alto e non tondo per far fallire qualunque codice che
 * confonda il tempo assoluto con quello relativo allo start.
 */
function fakeClock(start = 1_700_000_123_456) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
    set: (ms: number) => {
      t = ms;
    },
  };
}

describe('InputRecorder — timeline', () => {
  it('timbra i timestamp RELATIVI allo start, non assoluti', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    clock.advance(5_000); // tempo prima dello start: non deve contare
    rec.start();

    clock.advance(250);
    rec.record({ kind: 'key', signature: 'Ctrl+ArrowDown', command: 'moveBlockDown', inEdit: false });
    clock.advance(750);
    rec.record({ kind: 'key', signature: 'F2', command: 'editCell', inEdit: false });

    expect(rec.events.map((e) => e.t)).toEqual([250, 1_000]);
    expect(rec.elapsedMs()).toBe(1_000);
  });

  it('conserva il payload specifico di ogni kind', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    rec.record({ kind: 'mouse', target: 'grid', blocked: true });
    rec.record({ kind: 'hint', hintId: 'h1' });
    rec.record({ kind: 'cheatSheet', open: true });
    rec.record({ kind: 'taskAttempt', taskId: 't1', passed: false });
    rec.record({ kind: 'mark', label: 'levelStart' });

    expect(rec.events).toEqual<InputEvent[]>([
      { t: 0, kind: 'mouse', target: 'grid', blocked: true },
      { t: 0, kind: 'hint', hintId: 'h1' },
      { t: 0, kind: 'cheatSheet', open: true },
      { t: 0, kind: 'taskAttempt', taskId: 't1', passed: false },
      { t: 0, kind: 'mark', label: 'levelStart' },
    ]);
  });

  it('un key senza command (tasto a vuoto) resta registrato', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    clock.advance(10);
    rec.record({ kind: 'key', signature: 'Ctrl+Alt+Q', inEdit: false });

    const ev = rec.events[0];
    expect(ev.kind).toBe('key');
    expect(ev).toEqual({ t: 10, kind: 'key', signature: 'Ctrl+Alt+Q', inEdit: false });
  });

  it('gli eventi prima dello start valgono t = 0 e non fanno partire il cronometro', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.record({ kind: 'mouse', target: 'ui', blocked: false });
    clock.advance(9_000);
    rec.record({ kind: 'mouse', target: 'ui', blocked: false });

    expect(rec.events.map((e) => e.t)).toEqual([0, 0]);
    expect(rec.elapsedMs()).toBe(0);
    expect(rec.state).toBe('idle');
  });
});

describe('InputRecorder — pausa', () => {
  it('il tempo in pausa non conta nel tempo trascorso', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    clock.advance(2_000);
    rec.pause();
    clock.advance(600_000); // dieci minuti a prendere un caffe'
    rec.resume();
    clock.advance(3_000);

    expect(rec.elapsedMs()).toBe(5_000);
  });

  it('gli eventi registrati durante la pausa hanno il timestamp congelato', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    clock.advance(2_000);
    rec.pause();
    clock.advance(60_000);
    rec.record({ kind: 'mark', label: 'apri menu' });
    rec.resume();
    clock.advance(1_000);
    rec.record({ kind: 'key', signature: 'Enter', command: 'commit', inEdit: false });

    expect(rec.events.map((e) => e.t)).toEqual([2_000, 3_000]);
  });

  it('pause/resume fuori sequenza sono no-op', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.resume(); // mai avviato
    expect(rec.state).toBe('idle');
    rec.start();
    rec.resume(); // gia' in corso
    expect(rec.state).toBe('running');
    rec.pause();
    rec.pause();
    clock.advance(5_000);
    rec.resume();
    clock.advance(1_000);
    expect(rec.elapsedMs()).toBe(1_000);
  });

  it('start su un recorder gia\' avviato non azzera il cronometro', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    clock.advance(4_000);
    rec.start();
    clock.advance(1_000);
    expect(rec.elapsedMs()).toBe(5_000);
  });
});

describe('InputRecorder — stop', () => {
  it('congela il tempo trascorso', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    clock.advance(7_500);
    rec.stop();
    clock.advance(100_000);

    expect(rec.elapsedMs()).toBe(7_500);
    expect(rec.state).toBe('stopped');
  });

  it('gli eventi dopo lo stop restano loggati alla durata finale', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    clock.advance(1_000);
    rec.stop();
    clock.advance(50_000);
    // un click sulla schermata risultato: va comunque contato come uso del mouse
    rec.record({ kind: 'mouse', target: 'ui', blocked: false });

    expect(rec.events[0].t).toBe(1_000);
    expect(rec.elapsedMs()).toBe(1_000);
  });

  it('stop da pausa non recupera il tempo di pausa', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    clock.advance(3_000);
    rec.pause();
    clock.advance(30_000);
    rec.stop();
    expect(rec.elapsedMs()).toBe(3_000);
  });
});

describe('InputRecorder — robustezza del clock', () => {
  it('un clock che torna indietro non produce timestamp decrescenti', () => {
    // Date.now puo' arretrare (aggiustamento NTP, sospensione della macchina):
    // la timeline deve restare monotona o i calcoli di idle vanno in negativo.
    const clock = fakeClock(1_000_000);
    const rec = new InputRecorder(clock.now);
    rec.start();
    clock.advance(5_000);
    rec.record({ kind: 'key', signature: 'A', inEdit: true });
    clock.set(1_002_000); // il clock arretra di 3s
    rec.record({ kind: 'key', signature: 'B', inEdit: true });

    const ts = rec.events.map((e) => e.t);
    expect(ts).toEqual([5_000, 5_000]);
    expect(rec.elapsedMs()).toBeGreaterThanOrEqual(0);
  });
});

describe('InputRecorder — serializzazione', () => {
  it('round-trip di eventi e tempo trascorso', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    clock.advance(1_200);
    rec.record({ kind: 'key', signature: 'Ctrl+D', command: 'fillDown', inEdit: false });
    clock.advance(800);
    rec.record({ kind: 'taskAttempt', taskId: 't1', passed: true });
    rec.stop();

    const back = InputRecorder.deserialize(rec.serialize());
    expect(back.events).toEqual(rec.events);
    expect(back.elapsedMs()).toBe(2_000);
    expect(back.state).toBe('stopped');
  });

  it('una run salvata mentre correva torna in pausa e riparte da dov\' era', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    clock.advance(10_000);

    const saved = rec.serialize();
    // Il gioco resta chiuso per un giorno: quel tempo non deve entrare nella run.
    const clock2 = fakeClock(9_999_999_999);
    const back = InputRecorder.deserialize(saved, clock2.now);
    expect(back.state).toBe('paused');
    expect(back.elapsedMs()).toBe(10_000);

    back.resume();
    clock2.advance(2_500);
    expect(back.elapsedMs()).toBe(12_500);
  });

  it('un recorder deserializzato continua la timeline senza tornare indietro', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    clock.advance(4_000);
    rec.record({ kind: 'mark', label: 'checkpoint' });

    const clock2 = fakeClock();
    const back = InputRecorder.deserialize(rec.serialize(), clock2.now);
    back.resume();
    clock2.advance(1_000);
    back.record({ kind: 'key', signature: 'Enter', command: 'commit', inEdit: false });

    expect(back.events.map((e) => e.t)).toEqual([4_000, 5_000]);
  });

  it('rifiuta payload corrotti invece di far ripartire una run fantasma', () => {
    expect(() => InputRecorder.deserialize('[]')).toThrow();
    expect(() => InputRecorder.deserialize(JSON.stringify({ v: 99, state: 'stopped', elapsedMs: 0, events: [] }))).toThrow();
    expect(() => InputRecorder.deserialize(JSON.stringify({ v: 1, state: 'boh', elapsedMs: 0, events: [] }))).toThrow();
    expect(() => InputRecorder.deserialize(JSON.stringify({ v: 1, state: 'idle', elapsedMs: -5, events: [] }))).toThrow();
    expect(() => InputRecorder.deserialize(JSON.stringify({ v: 1, state: 'idle', elapsedMs: 0, events: {} }))).toThrow();
    expect(() =>
      InputRecorder.deserialize(JSON.stringify({ v: 1, state: 'idle', elapsedMs: 0, events: [{ t: 0, kind: 'boom' }] })),
    ).toThrow();
  });

  it('la lista eventi esposta e\' viva ma in sola lettura', () => {
    const clock = fakeClock();
    const rec = new InputRecorder(clock.now);
    rec.start();
    rec.record({ kind: 'mark', label: 'x' });
    const snapshot = rec.events;
    clock.advance(1_000);
    rec.record({ kind: 'mark', label: 'y' });
    // Il getter espone la lista viva in sola lettura: chi la tiene vede i nuovi
    // eventi ma non puo' scriverci (readonly a compile time).
    expect(snapshot.length).toBe(2);
  });
});

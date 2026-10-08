/**
 * Sintetizzatore Audio 8-Bit Chiptune (Web Audio API nativa).
 *
 * Genera musica retro JRPG ed effetti sonori procedurali tramite oscillatori:
 * - Nessun asset mp3/wav esterno richiesto: funziona offline al 100%.
 * - BGM: tema originale a 8-bit (lead, arpeggio, basso), composto per il gioco.
 * - SFX: Beep di selezione, conferma, errore e fanfara di vittoria.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmPlaying = false;
  private bgmInterval: number | null = null;
  private musicVolume = 0.3;
  private sfxVolume = 0.5;
  private muted = false;

  constructor() {
    // Carica preferenze da localStorage se presenti
    if (typeof window !== 'undefined') {
      try {
        const savedMute = localStorage.getItem('dd_audio_muted');
        if (savedMute !== null) this.muted = savedMute === 'true';
        const savedMusicVol = localStorage.getItem('dd_audio_music_vol');
        if (savedMusicVol !== null) this.musicVolume = Number(savedMusicVol);
        const savedSfxVol = localStorage.getItem('dd_audio_sfx_vol');
        if (savedSfxVol !== null) this.sfxVolume = Number(savedSfxVol);
      } catch {
        // Ignora errori di storage
      }
    }
  }

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('dd_audio_muted', String(this.muted));
    }
    if (this.muted) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.muted;
  }

  public setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (typeof window !== 'undefined') {
      localStorage.setItem('dd_audio_music_vol', String(this.musicVolume));
    }
  }

  public setSfxVolume(val: number) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (typeof window !== 'undefined') {
      localStorage.setItem('dd_audio_sfx_vol', String(this.sfxVolume));
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  // -------------------------------------------------------------------------
  // EFFETTI SONORI SFX
  // -------------------------------------------------------------------------

  /** Beep di selezione menu (click 8-bit) */
  public playSelect() {
    if (this.muted || this.sfxVolume <= 0) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(this.sfxVolume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  /** Suono di conferma / lancio livello */
  public playConfirm() {
    if (this.muted || this.sfxVolume <= 0) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05);

      gain.gain.setValueAtTime(this.sfxVolume * 0.25, ctx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.05 + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.05);
      osc.stop(ctx.currentTime + idx * 0.05 + 0.08);
    });
  }

  /** Suono di errore / formula non valida */
  public playError() {
    if (this.muted || this.sfxVolume <= 0) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(this.sfxVolume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  /** Fanfara di vittoria 8-bit (Deal Closed) */
  public playVictory() {
    if (this.muted || this.sfxVolume <= 0) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const melody = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.12 }, // G5
      { f: 1046.5, d: 0.28 }, // C6
      { f: 880.0, d: 0.14 },  // A5
      { f: 1046.5, d: 0.45 }, // C6
    ];

    let t = ctx.currentTime;
    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(this.sfxVolume * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + note.d);
      t += note.d * 1.05;
    });
  }

  // -------------------------------------------------------------------------
  // MUSICA DI SOTTOFONDO: "Deal Desk Theme", composizione originale
  // -------------------------------------------------------------------------
  //
  // Loop di 16 battute in Re maggiore, otto passi (crome) per battuta.
  // Giro armonico: D Bm G A | D F#m G A | Bm G D A | G A D D.
  // Le note sono numeri MIDI (69 = La4 = 440 Hz), 0 e' pausa.

  public startBgm() {
    if (this.muted || this.bgmPlaying) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    this.bgmPlaying = true;

    const hz = (midi: number) => (midi === 0 ? 0 : 440 * Math.pow(2, (midi - 69) / 12));

    // prettier-ignore
    const melody = [
      69, 0, 74, 0, 78, 76, 74, 0,   73, 0, 71, 73, 74, 0, 71, 0,
      67, 71, 74, 0, 76, 74, 71, 0,  69, 0, 73, 0, 76, 0, 0, 0,
      78, 0, 76, 74, 76, 0, 81, 0,   78, 0, 73, 0, 69, 73, 76, 0,
      74, 0, 71, 74, 79, 0, 78, 76,  76, 0, 0, 73, 69, 0, 0, 0,
      71, 0, 74, 78, 76, 0, 74, 0,   71, 0, 67, 71, 74, 0, 0, 0,
      69, 0, 74, 76, 78, 0, 76, 74,  73, 0, 69, 0, 76, 0, 0, 0,
      79, 0, 78, 76, 74, 0, 71, 0,   73, 0, 74, 76, 73, 0, 69, 0,
      74, 0, 78, 0, 81, 0, 78, 0,    74, 0, 0, 0, 0, 0, 0, 0,
    ];

    // Accordi delle 16 battute: [fondamentale, terza, quinta] (ottava 5) e basso [fondamentale, quinta].
    const D = { chord: [74, 78, 81], bass: [38, 45] };
    const Bm = { chord: [71, 74, 78], bass: [47, 42] };
    const G = { chord: [67, 71, 74], bass: [43, 50] };
    const A = { chord: [69, 73, 76], bass: [45, 40] };
    const Fsm = { chord: [66, 69, 73], bass: [42, 49] };
    const progression = [D, Bm, G, A, D, Fsm, G, A, Bm, G, D, A, G, A, D, D];

    const arpeggio = progression.flatMap(({ chord: [r, t, f] }) => [r, t, f, t, r, t, f, t]);
    const bass = progression.flatMap(({ bass: [r, f] }) => [r, 0, f, 0, r, 0, f, 0]);

    const melodyTrack = melody.map(hz);
    const arpeggioTrack = arpeggio.map(hz);
    const bassTrack = bass.map(hz);

    let step = 0;
    const stepDuration = 0.18; // crome a ~83 BPM

    const playStep = () => {
      if (!this.bgmPlaying || this.muted || !this.ctx) return;

      const now = this.ctx.currentTime;
      const mFreq = melodyTrack[step % melodyTrack.length];
      const aFreq = arpeggioTrack[step % arpeggioTrack.length];
      const bFreq = bassTrack[step % bassTrack.length];

      // 1. Voce Melodia (Square / Pulse morbida con inviluppo dolce)
      if (mFreq > 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'square';
        leadOsc.frequency.setValueAtTime(mFreq, now);

        leadGain.gain.setValueAtTime(this.musicVolume * 0.09, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.95);

        leadOsc.connect(leadGain);
        leadGain.connect(this.ctx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + stepDuration * 0.95);
      }

      // 2. Voce Arpeggio di sottofondo (volume soffuso)
      if (aFreq > 0) {
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();
        arpOsc.type = 'sine';
        arpOsc.frequency.setValueAtTime(aFreq, now);

        arpGain.gain.setValueAtTime(this.musicVolume * 0.04, now);
        arpGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.85);

        arpOsc.connect(arpGain);
        arpGain.connect(this.ctx.destination);
        arpOsc.start(now);
        arpOsc.stop(now + stepDuration * 0.85);
      }

      // 3. Voce Basso Acustico (Triangle)
      if (bFreq > 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bFreq, now);

        bassGain.gain.setValueAtTime(this.musicVolume * 0.16, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);

        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + stepDuration * 0.9);
      }

      step++;
    };

    this.bgmInterval = window.setInterval(playStep, stepDuration * 1000);
  }

  public stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const sound = new SoundEngine();

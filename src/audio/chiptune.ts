/**
 * Sintetizzatore Audio 8-Bit Chiptune (Web Audio API nativa).
 *
 * Genera musica retro JRPG ed effetti sonori procedurali tramite oscillatori:
 * - Nessun asset mp3/wav esterno richiesto: funziona offline al 100%.
 * - BGM: Traccia Fantasy Overworld a 8-bit con arpeggi, lead e linea di basso.
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
  // MUSICA DI SOTTOFONDO CHIPTUNE: LITTLEROOT TOWN (POKEMON R/S/E)
  // -------------------------------------------------------------------------

  public startBgm() {
    if (this.muted || this.bgmPlaying) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    this.bgmPlaying = true;

    // Frequenze note (Scala di Sol Maggiore / G Major)
    const REST = 0;
    const G2 = 98.00;
    const A2 = 110.00;
    const B2 = 123.47;
    const C3 = 130.81;
    const D3 = 146.83;
    const E2 = 82.41;
    const FS2 = 92.50; // F#2

    const D4 = 293.66;
    const E4 = 329.63;
    const FS4 = 369.99; // F#4
    const G4 = 392.00;
    const A4 = 440.00;
    const B4 = 493.88;
    const C5 = 523.25;
    const D5 = 587.33;
    const E5 = 659.25;
    const FS5 = 739.99; // F#5
    const G5 = 783.99;

    // Traccia Melodia Principale: Littleroot Town Theme (Go Ichinose)
    const melodyTrack = [
      // Battuta 1-2 (Intro & Inizio Tema)
      D4, G4, B4, A4, G4, D5, B4, REST,
      G4, A4, B4, A4, G4, E4, D4, REST,
      // Battuta 3-4 (Variazione acuta con E5)
      D4, G4, B4, A4, G4, E5, D5, B4,
      G4, A4, B4, A4, G4, G4, REST, REST,
      // Battuta 5-6 (Bridge nostalgico: C5 -> D5 -> E5)
      B4, C5, D5, E5, D5, B4, G4, REST,
      A4, B4, C5, B4, A4, FS4, D4, REST,
      // Battuta 7-8 (Risoluzione dolce)
      D4, G4, B4, A4, G4, D5, B4, G4,
      A4, B4, A4, G4, G4, REST, REST, REST,
    ];

    // Traccia Arpeggio / Accompagnamento dolce (Pulse Wave)
    const arpeggioTrack = [
      B4, D5, G5, D5, B4, D5, G5, D5,
      C5, E5, G5, E5, C5, E5, G5, E5,
      B4, D5, G5, D5, B4, D5, G5, D5,
      A4, D5, FS5, D5, A4, D5, FS5, D5,
      C5, E5, G5, E5, B4, D5, G5, D5,
      A4, C5, E5, C5, A4, D5, FS5, D5,
      B4, D5, G5, D5, C5, E5, G5, E5,
      B4, D5, G5, D5, B4, REST, REST, REST,
    ];

    // Traccia Basso Acustico (Triangle Wave)
    const bassTrack = [
      G2, REST, D3, REST, G2, REST, D3, REST,
      C3, REST, G2, REST, C3, REST, G2, REST,
      E2, REST, B2, REST, E2, REST, B2, REST,
      D3, REST, A2, REST, D3, REST, FS2, REST,
      C3, REST, G2, REST, B2, REST, G2, REST,
      A2, REST, E2, REST, D3, REST, A2, REST,
      G2, REST, D3, REST, C3, REST, G2, REST,
      G2, REST, D3, REST, G2, REST, REST, REST,
    ];

    let step = 0;
    const stepDuration = 0.17; // ~88 BPM

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

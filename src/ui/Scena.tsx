/**
 * Gli sfondi del gioco, disegnati dal codice e animati.
 *
 * Niente immagini: ogni scena e' pixel art generata a bassa risoluzione sulla
 * palette dei 16 colori del gioco e ingrandita senza antialiasing. Le sfumature
 * sono retinature (matrice di Bayer) fra due colori della palette, mai colori
 * intermedi: e' quello che tiene insieme cielo, monti e isole come un solo disegno.
 *
 * Gli strati fermi (cielo, monti, colline, isole) si disegnano una volta sola
 * per dimensione; a ogni fotogramma si ricompongono e si aggiunge quello che si
 * muove: nuvole, cascate, erba, uccelli, petali, raggi di sole.
 *
 * Due scene:
 *  - `valle`: il titolo. Una valle di giorno con due isole che galleggiano.
 *  - `isole`: la mappa. Un'isola per ogni punto passato in `isole`, in coordinate
 *    percentuali: il faro dell'interfaccia sta esattamente sopra l'erba.
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import { PALETTE } from '../styles/palette';

// ---------------------------------------------------------------------------
// Colori e retinatura
// ---------------------------------------------------------------------------

type Colore = number;

/** `#rrggbb` nel formato a 32 bit di ImageData (little-endian: ABGR). */
function colore(hex: string): Colore {
  const n = parseInt(hex.slice(1), 16);
  return (0xff000000 | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
}

const K = {
  inchiostro: colore(PALETTE.inchiostro),
  prugna: colore(PALETTE.prugna),
  rubino: colore(PALETTE.rubino),
  corallo: colore(PALETTE.corallo),
  ambra: colore(PALETTE.ambra),
  lime: colore(PALETTE.lime),
  smeraldo: colore(PALETTE.smeraldo),
  petrolio: colore(PALETTE.petrolio),
  notte: colore(PALETTE.notte),
  oltremare: colore(PALETTE.oltremare),
  azzurro: colore(PALETTE.azzurro),
  ghiaccio: colore(PALETTE.ghiaccio),
  bianco: colore(PALETTE.bianco),
  nebbia: colore(PALETTE.nebbia),
  ardesia: colore(PALETTE.ardesia),
  grafite: colore(PALETTE.grafite),
} as const;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function soglia(x: number, y: number): number {
  return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

/** Generatore deterministico: la stessa scena a ogni apertura. */
function casuale(seme: number): () => number {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grana(i: number, seme: number): number {
  const s = Math.sin(i * 127.1 + seme * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Rumore morbido a una dimensione, fra 0 e 1. */
function rumore(x: number, seme: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return grana(i, seme) * (1 - u) + grana(i + 1, seme) * u;
}

function frattale(x: number, seme: number): number {
  return rumore(x, seme) * 0.6 + rumore(x * 2.3, seme + 7) * 0.28 + rumore(x * 5.1, seme + 13) * 0.12;
}

// ---------------------------------------------------------------------------
// Tela: un rettangolo di pixel su cui si disegna a mano
// ---------------------------------------------------------------------------

class Tela {
  readonly px: Uint32Array;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.px = new Uint32Array(w * h);
  }

  set(x: number, y: number, c: Colore): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }

  pieno(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.px[y * this.w + x] !== 0;
  }

  /** Retinatura: `b` dove la quota `t` supera la soglia della matrice, altrimenti `a`. */
  mix(x: number, y: number, a: Colore, b: Colore, t: number): void {
    this.set(x, y, t > soglia(x, y) ? b : a);
  }

  rett(x: number, y: number, w: number, h: number, c: Colore): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  inCanvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    const ctx = cv.getContext('2d');
    if (ctx) {
      const img = ctx.createImageData(this.w, this.h);
      new Uint32Array(img.data.buffer).set(this.px);
      ctx.putImageData(img, 0, 0);
    }
    return cv;
  }
}

// ---------------------------------------------------------------------------
// Pennelli
// ---------------------------------------------------------------------------

/** Cielo di giorno: blu pieno in alto, quasi bianco all'orizzonte. */
function dipingiCielo(t: Tela, orizzonte: number): void {
  const fermate: readonly (readonly [number, Colore])[] = [
    [0, K.oltremare],
    [0.42, K.azzurro],
    [0.86, K.ghiaccio],
    [1.25, K.bianco],
  ];
  for (let y = 0; y < t.h; y++) {
    const q = Math.min(1.24, y / orizzonte);
    let i = 0;
    while (i < fermate.length - 2 && q > fermate[i + 1][0]) i++;
    const [q0, c0] = fermate[i];
    const [q1, c1] = fermate[i + 1];
    // Fasce quasi piatte: la retinatura occupa solo il terzo centrale di ogni passaggio,
    // altrimenti tutto il cielo diventa una trama e l'occhio non riposa mai.
    const f = Math.max(0, Math.min(1, ((q - q0) / (q1 - q0) - 0.34) / 0.32));
    for (let x = 0; x < t.w; x++) t.mix(x, y, c0, c1, f);
  }
}

function sole(t: Tela, cx: number, cy: number, r: number): void {
  const alone = r * 1.8;
  for (let y = Math.floor(cy - alone); y <= cy + alone; y++) {
    for (let x = Math.floor(cx - alone); x <= cx + alone; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r * 0.62) t.set(x, y, K.bianco);
      else if (d <= r) t.set(x, y, K.ambra);
      else if (d <= alone && (1 - (d - r) / (alone - r)) * 0.5 > soglia(x, y)) t.set(x, y, d < r * 1.3 ? K.ambra : K.bianco);
    }
  }
}

interface Rilievo {
  readonly base: Colore;
  readonly luce: Colore;
  readonly ombra: Colore;
  readonly neve?: boolean;
}

/**
 * Catena di monti. La pendenza si legge spostandosi di lato man mano che si
 * scende: cosi' il confine fra luce e ombra corre in diagonale lungo i crinali,
 * come le facce di una montagna, invece di cadere a strisce verticali.
 */
function catena(t: Tela, baseY: number, amp: number, freq: number, seme: number, r: Rilievo): void {
  const quota = (x: number) => amp * frattale(x * freq, seme);
  for (let x = 0; x < t.w; x++) {
    const q = quota(x);
    const cima = Math.round(baseY - q);
    for (let y = cima; y < t.h; y++) {
      const d = y - cima;
      const xs = x + d * 0.55;
      const pendenza = quota(xs + 3) - quota(xs - 3);
      const neve = r.neve === true && q > amp * 0.56 && d < (q - amp * 0.56) * 0.6 + ((x >> 1) % 3) * 1.5;
      if (neve) t.set(x, y, pendenza >= 0 ? K.bianco : K.ghiaccio);
      else if (pendenza > 0.35) t.set(x, y, r.luce);
      else if (pendenza > 0) t.mix(x, y, r.base, r.luce, 0.5);
      else if (pendenza < -0.5) t.mix(x, y, r.base, r.ombra, 0.5);
      else t.set(x, y, r.base);
    }
  }
}

interface Prato {
  readonly orlo: Colore;
  readonly corpo: Colore;
  readonly fondo: Colore;
  /** In quanti pixel il corpo scivola verso il colore di fondo. */
  readonly sfuma: number;
}

/** Collina: orlo chiaro in cresta, poi il corpo che scurisce verso il basso. Restituisce il profilo. */
function collina(t: Tela, baseY: number, amp: number, freq: number, seme: number, p: Prato): number[] {
  const profilo: number[] = [];
  for (let x = 0; x < t.w; x++) {
    const cima = Math.round(baseY - amp * frattale(x * freq, seme));
    profilo.push(cima);
    for (let y = cima; y < t.h; y++) {
      const d = y - cima;
      if (d === 0) t.set(x, y, p.orlo);
      else if (d < 4) t.mix(x, y, p.corpo, p.orlo, 0.62 - d * 0.17);
      else t.mix(x, y, p.corpo, p.fondo, Math.max(0, Math.min(1, (d - p.sfuma * 0.55) / (p.sfuma * 0.35))));
    }
  }
  return profilo;
}

function abete(t: Tela, x: number, baseY: number, alto: number, scuro: Colore, chiaro: Colore): void {
  for (let r = 0; r < alto; r++) {
    const meta = Math.floor((r % 3) * 0.9 + r / 3);
    for (let dx = -meta; dx <= meta; dx++) t.set(x + dx, baseY - alto + r, dx < 0 ? chiaro : scuro);
  }
  t.set(x, baseY, K.prugna);
}

interface Fogliame {
  readonly scuro: Colore;
  readonly medio: Colore;
  readonly chiaro: Colore;
}

const VERDE: Fogliame = { scuro: K.petrolio, medio: K.smeraldo, chiaro: K.lime };
const AUTUNNO: Fogliame = { scuro: K.rubino, medio: K.corallo, chiaro: K.ambra };
const TEMPESTA: Fogliame = { scuro: K.inchiostro, medio: K.grafite, chiaro: K.ardesia };

/** Chioma a lobi: ogni lobo ha la sua luce in alto a sinistra, come negli alberi a pixel classici. */
function chioma(t: Tela, cx: number, cy: number, r: number, f: Fogliame, rnd: () => number, schiaccia = 1): void {
  const lobi = [{ x: cx, y: cy, r }];
  const quanti = 4 + Math.floor(r / 2);
  for (let i = 0; i < quanti; i++) {
    lobi.push({
      x: cx + (rnd() - 0.5) * r * 1.35,
      y: cy + (rnd() - 0.5) * r * 1.0 * schiaccia,
      r: r * (0.4 + rnd() * 0.35),
    });
  }
  lobi.sort((a, b) => b.y - a.y);
  for (const l of lobi) {
    for (let y = Math.floor(l.y - l.r); y <= l.y + l.r; y++) {
      for (let x = Math.floor(l.x - l.r); x <= l.x + l.r; x++) {
        const dx = x - l.x;
        const dy = (y - l.y) / schiaccia;
        if (dx * dx + dy * dy > l.r * l.r) continue;
        const luce = (-dx * 0.8 - dy * 1.25) / l.r;
        if (luce > 0.82) t.set(x, y, f.chiaro);
        else if (luce > 0.2) t.mix(x, y, f.medio, f.chiaro, (luce - 0.2) * 1.1);
        else if (luce > -0.55) t.mix(x, y, f.scuro, f.medio, (luce + 0.55) * 1.35);
        else t.set(x, y, f.scuro);
      }
    }
  }
}

function tronco(t: Tela, x: number, y0: number, y1: number, largo: number): void {
  const luce = Math.max(1, Math.round(largo / 4));
  for (let y = y0; y <= y1; y++) {
    for (let i = 0; i < largo; i++) {
      if (i < luce) t.set(x + i, y, K.rubino);
      else if (i >= largo - luce && largo > 2) t.set(x + i, y, K.inchiostro);
      else t.mix(x + i, y, K.prugna, K.inchiostro, grana(i * 3 + (y >> 2), 9) > 0.7 ? 0.9 : 0.15);
    }
  }
}

function albero(t: Tela, x: number, baseY: number, r: number, f: Fogliame, rnd: () => number): void {
  const fusto = Math.max(1, Math.round(r / 3));
  tronco(t, x - Math.floor(fusto / 2), baseY - Math.round(r * 1.2), baseY, fusto);
  chioma(t, x, baseY - Math.round(r * 1.7), r, f, rnd, 0.9);
}

function nuvola(larga: number, alta: number, rnd: () => number, chiaro: Colore, ombra: Colore): HTMLCanvasElement {
  const t = new Tela(larga, alta);
  const base = alta - 1;
  const sbuffi = 4 + Math.floor(larga / 9);
  for (let i = 0; i < sbuffi; i++) {
    const u = (i + 0.5) / sbuffi;
    const r = alta * (0.22 + 0.36 * Math.sin(Math.PI * u)) * (0.75 + rnd() * 0.45);
    const cx = r + u * (larga - 2 * r);
    const cy = base - r * 0.55;
    for (let y = Math.floor(cy - r); y <= base; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) t.set(x, y, chiaro);
      }
    }
  }
  // Il ventre in ombra: le ultime righe piene, retinate verso l'alto.
  for (let x = 0; x < larga; x++) {
    for (let y = 0; y < alta; y++) {
      if (!t.pieno(x, y)) continue;
      const sotto = base - y;
      if (sotto < 2) t.set(x, y, ombra);
      else if (sotto < 5) t.mix(x, y, chiaro, ombra, 0.7 - sotto * 0.14);
    }
  }
  return t.inCanvas();
}

// ---------------------------------------------------------------------------
// Isole
// ---------------------------------------------------------------------------

/** Cosa c'e' sopra l'isola. Sulla mappa ogni isola del percorso ha il suo tema. */
export type TemaIsola = 'prato' | 'colonne' | 'autunno' | 'castello' | 'tempesta' | 'scoglio';

interface Cascata {
  readonly dx: number;
  readonly dy: number;
  readonly lunga: number;
  readonly larga: number;
}

interface Isola {
  readonly cv: HTMLCanvasElement;
  /** Punto del disegno che corrisponde al centro dell'erba. */
  readonly ox: number;
  readonly oy: number;
  readonly cascate: readonly Cascata[];
  readonly tema: TemaIsola;
  readonly larga: number;
}

function isola(larga: number, seme: number, tema: TemaIsola): Isola {
  const rnd = casuale(seme);
  const R = Math.max(6, Math.round(larga / 2));
  const sopra = Math.round(R * 1.5) + 10;
  const roccia = Math.round(R * 1.15);
  const t = new Tela(R * 2 + 12, sopra + roccia + 8);
  const cx = Math.round(t.w / 2);
  const top = sopra;
  const cupo = tema === 'tempesta';

  const base = cupo ? K.grafite : K.ardesia;
  const luce = cupo ? K.ardesia : K.nebbia;
  const ombra = cupo ? K.inchiostro : K.grafite;
  const erba = cupo ? K.prugna : K.smeraldo;
  const erbaLuce = cupo ? K.rubino : K.lime;

  // La roccia: una punta rovesciata, chiara a sinistra, scura sotto e a destra.
  for (let dx = -R; dx <= R; dx++) {
    const u = dx / R;
    let prof = roccia * Math.pow(1 - Math.pow(Math.abs(u), 1.8), 0.8) * (0.62 + 0.5 * rumore(dx * 0.22, seme));
    if (rumore(dx * 0.9, seme + 40) > 0.7) prof += 2 + R * 0.08;
    prof = Math.round(prof);
    for (let d = 0; d <= prof; d++) {
      const x = cx + dx;
      const y = top + d;
      const s = (d / Math.max(1, prof)) * 0.85 + u * 0.4;
      if (s < 0.22) t.mix(x, y, base, luce, (0.22 - s) * 3.4);
      else t.mix(x, y, base, ombra, (s - 0.22) * 1.5);
      // Venature orizzontali della roccia.
      if ((d + Math.floor(rumore(dx * 0.15, seme + 3) * 3)) % 5 === 4 && grana(dx * 7 + d, seme) > 0.45) t.set(x, y, ombra);
    }
  }

  // L'erba: una calotta bassa con ciuffi che pendono dal bordo.
  for (let dx = -R; dx <= R; dx++) {
    const u = dx / R;
    const gy = top - Math.round(2 * (1 - u * u));
    const x = cx + dx;
    const pende = rnd() < 0.32 ? 1 + Math.floor(rnd() * 3) : 0;
    for (let y = gy; y <= top + 1 + pende; y++) {
      if (y === gy) t.set(x, y, erbaLuce);
      else if (y === gy + 1) t.mix(x, y, erba, erbaLuce, 0.5);
      else t.set(x, y, erba);
    }
  }
  const prato = top - 2;

  // Al centro resta libero lo spazio per il faro dell'interfaccia.
  const largoLibero = Math.max(5, Math.round(R * 0.22));
  const posto = (lato: -1 | 1, quota: number) => cx + lato * Math.round(largoLibero + (R - largoLibero - 3) * quota);

  if (tema === 'prato') {
    albero(t, posto(1, 0.35), prato, Math.max(3, R * 0.2), VERDE, rnd);
    albero(t, posto(1, 0.75), prato, Math.max(2, R * 0.14), VERDE, rnd);
    casetta(t, posto(-1, 0.45), prato, Math.max(5, Math.round(R * 0.28)));
  } else if (tema === 'colonne') {
    for (const q of [0.25, 0.55, 0.85]) colonna(t, posto(-1, q), prato, Math.round(R * (0.32 + 0.2 * rnd())));
    colonna(t, posto(1, 0.3), prato, Math.round(R * 0.42));
    albero(t, posto(1, 0.72), prato, Math.max(3, R * 0.17), VERDE, rnd);
  } else if (tema === 'autunno') {
    albero(t, posto(-1, 0.3), prato, Math.max(3, R * 0.2), AUTUNNO, rnd);
    albero(t, posto(-1, 0.75), prato, Math.max(2, R * 0.15), AUTUNNO, rnd);
    albero(t, posto(1, 0.5), prato, Math.max(3, R * 0.23), AUTUNNO, rnd);
  } else if (tema === 'castello') {
    castello(t, posto(1, 0.5), prato, Math.max(12, Math.round(R * 0.7)));
    abete(t, posto(-1, 0.4), prato, Math.max(6, Math.round(R * 0.35)), K.petrolio, K.smeraldo);
    abete(t, posto(-1, 0.78), prato, Math.max(5, Math.round(R * 0.26)), K.petrolio, K.smeraldo);
  } else if (tema === 'tempesta') {
    guglia(t, posto(1, 0.4), prato, Math.max(10, Math.round(R * 0.75)));
    guglia(t, posto(-1, 0.55), prato, Math.max(6, Math.round(R * 0.42)));
    chioma(t, cx, top - Math.round(R * 1.25), Math.max(5, R * 0.42), TEMPESTA, rnd, 0.5);
  } else {
    abete(t, cx - 1, prato, Math.max(4, Math.round(R * 0.5)), K.petrolio, K.smeraldo);
  }

  const cascate: Cascata[] = [];
  if (tema === 'prato' || tema === 'autunno' || tema === 'colonne') {
    cascate.push({ dx: Math.round(-R * 0.62), dy: 0, lunga: Math.round(roccia * 1.5), larga: Math.max(2, Math.round(R * 0.1)) });
  }
  if (tema === 'castello') {
    cascate.push({ dx: Math.round(-R * 0.25), dy: 1, lunga: Math.round(roccia * 1.7), larga: Math.max(2, Math.round(R * 0.09)) });
  }

  return { cv: t.inCanvas(), ox: cx, oy: top, cascate, tema, larga };
}

function casetta(t: Tela, x: number, baseY: number, larga: number): void {
  const alta = Math.max(3, Math.round(larga * 0.6));
  const x0 = x - Math.floor(larga / 2);
  t.rett(x0, baseY - alta + 1, larga, alta, K.bianco);
  t.rett(x0 + larga - Math.ceil(larga / 3), baseY - alta + 1, Math.ceil(larga / 3), alta, K.nebbia);
  t.rett(x0 + Math.floor(larga / 2) - 1, baseY - 1, 2, 2, K.prugna);
  const tetto = Math.ceil(larga / 2) + 1;
  for (let r = 0; r < tetto; r++) {
    for (let dx = -r - 1; dx <= r + 1; dx++) t.set(x0 + Math.floor(larga / 2) + dx, baseY - alta - tetto + 1 + r, dx < 0 ? K.corallo : K.rubino);
  }
}

function colonna(t: Tela, x: number, baseY: number, alta: number): void {
  const h = Math.max(5, alta);
  t.rett(x - 1, baseY - h + 1, 2, h, K.bianco);
  t.rett(x + 1, baseY - h + 1, 1, h, K.nebbia);
  t.rett(x - 2, baseY - h, 5, 1, K.bianco);
  t.rett(x - 2, baseY, 5, 1, K.nebbia);
}

function castello(t: Tela, x: number, baseY: number, largo: number): void {
  const alto = Math.max(5, Math.round(largo * 0.38));
  const x0 = x - Math.floor(largo / 2);
  t.rett(x0, baseY - alto + 1, largo, alto, K.nebbia);
  t.rett(x0 + Math.round(largo * 0.6), baseY - alto + 1, largo - Math.round(largo * 0.6), alto, K.ardesia);
  for (let i = 0; i < largo; i += 2) t.set(x0 + i, baseY - alto, K.nebbia);
  t.rett(x - 1, baseY - 2, 3, 3, K.prugna);
  const torre = (tx: number, th: number) => {
    const tw = Math.max(3, Math.round(largo * 0.2));
    t.rett(tx, baseY - th + 1, tw, th, K.bianco);
    t.rett(tx + tw - 1, baseY - th + 1, 1, th, K.ardesia);
    t.set(tx + Math.floor(tw / 2), baseY - Math.round(th * 0.6), K.grafite);
    const cono = tw;
    for (let r = 0; r < cono; r++) {
      const meta = Math.ceil(((r + 1) / cono) * (tw / 2 + 1));
      for (let dx = -meta; dx <= meta; dx++) t.set(tx + Math.floor(tw / 2) + dx, baseY - th - cono + 1 + r, dx < 0 ? K.corallo : K.rubino);
    }
    t.rett(tx + Math.floor(tw / 2), baseY - th - cono - 2, 1, 3, K.grafite);
    t.rett(tx + Math.floor(tw / 2) + 1, baseY - th - cono - 2, 2, 1, K.ambra);
  };
  torre(x0 - 1, Math.round(alto * 2.1));
  torre(x0 + largo - Math.max(3, Math.round(largo * 0.2)) + 1, Math.round(alto * 1.7));
}

function guglia(t: Tela, x: number, baseY: number, alta: number): void {
  for (let r = 0; r < alta; r++) {
    const meta = Math.floor((r / alta) * Math.max(2, alta * 0.22));
    for (let dx = -meta; dx <= meta; dx++) t.set(x + dx, baseY - alta + 1 + r, dx < 0 ? K.grafite : K.inchiostro);
  }
  t.set(x, baseY - Math.round(alta * 0.45), K.corallo);
  t.set(x, baseY - Math.round(alta * 0.45) + 1, K.ambra);
  t.set(x, baseY - alta, K.ghiaccio);
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export interface PuntoIsola {
  /** Posizione dell'erba, in percentuale della scena. */
  readonly x: number;
  readonly y: number;
  readonly tema: TemaIsola;
  /** Larghezza in percentuale della scena. */
  readonly larga?: number;
}

interface NuvolaViva {
  readonly cv: HTMLCanvasElement;
  readonly x0: number;
  readonly y: number;
  readonly v: number;
}

interface IsolaViva {
  readonly isola: Isola;
  readonly x: number;
  readonly y: number;
  /** Ampiezza del galleggiamento, in pixel della scena. 0: ferma. */
  readonly dondola: number;
  readonly fase: number;
}

interface Filo {
  readonly x: number;
  readonly y: number;
  readonly alto: number;
  readonly fase: number;
  readonly chiaro: boolean;
}

interface Composizione {
  readonly w: number;
  readonly h: number;
  readonly cielo: HTMLCanvasElement;
  readonly nuvoleLontane: readonly NuvolaViva[];
  readonly terra: HTMLCanvasElement | null;
  readonly isole: readonly IsolaViva[];
  readonly nuvoleVicine: readonly NuvolaViva[];
  readonly davanti: HTMLCanvasElement | null;
  readonly erba: readonly Filo[];
  readonly raggi: boolean;
  /** Fascia di cielo in cui volano gli uccelli, in quota (0–1). */
  readonly volo: readonly [number, number];
}

function seminaNuvole(w: number, yMin: number, yMax: number, quante: number, scala: number, vicine: boolean, rnd: () => number): NuvolaViva[] {
  const out: NuvolaViva[] = [];
  for (let i = 0; i < quante; i++) {
    const larga = Math.round((26 + rnd() * 44) * scala * (vicine ? 1.25 : 0.8));
    const alta = Math.round(larga * (0.26 + rnd() * 0.1));
    out.push({
      cv: nuvola(larga, Math.max(5, alta), rnd, vicine ? K.bianco : K.ghiaccio, vicine ? K.nebbia : K.azzurro),
      x0: rnd() * (w + larga),
      y: Math.round(yMin + rnd() * (yMax - yMin)),
      v: (vicine ? 3.2 : 1.2) * (0.7 + rnd() * 0.6) * scala,
    });
  }
  return out;
}

function componiValle(w: number, h: number): Composizione {
  const rnd = casuale(11);
  const u = h / 260; // la scena e' pensata a 260 righe: tutto il resto e' in proporzione
  const or = Math.round(h * 0.57);

  const cielo = new Tela(w, h);
  dipingiCielo(cielo, or + 6);
  sole(cielo, Math.round(w * 0.79), Math.round(h * 0.2), Math.max(6, Math.round(13 * u)));

  const terra = new Tela(w, h);
  catena(terra, or + 4, h * 0.3, 4.6 / w, 3, { base: K.oltremare, luce: K.azzurro, ombra: K.notte, neve: true });

  // Il bosco lontano: una collina scura con il profilo degli abeti.
  const bosco = collina(terra, or + Math.round(h * 0.055), h * 0.06, 6 / w, 5, { orlo: K.petrolio, corpo: K.petrolio, fondo: K.petrolio, sfuma: 1 });
  for (let x = 2; x < w; x += 3 + Math.floor(rnd() * 4)) {
    abete(terra, x, bosco[x] + 1, Math.round((6 + rnd() * 6) * u), K.petrolio, rnd() < 0.3 ? K.smeraldo : K.petrolio);
  }

  // Le colline di mezzo, con gli alberi tondi sulle creste.
  const mezzo = collina(terra, or + Math.round(h * 0.15), h * 0.085, 4.2 / w, 8, { orlo: K.lime, corpo: K.smeraldo, fondo: K.petrolio, sfuma: h * 0.16 });
  for (let i = 0; i < Math.round(w / 26); i++) {
    const x = Math.floor(rnd() * w);
    albero(terra, x, mezzo[x] + 2 + Math.floor(rnd() * 8 * u), (3.5 + rnd() * 3.5) * u, rnd() < 0.18 ? AUTUNNO : VERDE, rnd);
  }

  // Il primo piano: il prato fiorito.
  const davanti = new Tela(w, h);
  const prato = collina(davanti, Math.round(h * 0.86), h * 0.06, 3.1 / w, 17, { orlo: K.lime, corpo: K.lime, fondo: K.smeraldo, sfuma: h * 0.14 });
  for (let i = 0; i < w * 0.3; i++) {
    const x = Math.floor(rnd() * w);
    const y = prato[x] + 3 + Math.floor(rnd() * (h - prato[x] - 3));
    davanti.set(x, y, K.smeraldo);
    if (rnd() < 0.5) davanti.set(x + 1, y - 1, K.smeraldo);
  }
  const FIORI = [K.bianco, K.ambra, K.corallo, K.ghiaccio, K.bianco];
  for (let i = 0; i < w * 0.22; i++) {
    const x = Math.floor(rnd() * w);
    const y = prato[x] + 4 + Math.floor(rnd() * Math.max(1, h - prato[x] - 6));
    const c = FIORI[Math.floor(rnd() * FIORI.length)];
    davanti.set(x, y, c);
    if (rnd() < 0.4) {
      davanti.set(x - 1, y, c);
      davanti.set(x + 1, y, c);
      davanti.set(x, y - 1, c);
      davanti.set(x, y, K.ambra);
    }
    davanti.set(x, y + 1, K.petrolio);
  }
  // Agli angoli, due macchie di cespugli in primo piano: danno profondita' senza coprire la valle.
  const macchia = (cx: number, r: number) => {
    chioma(davanti, cx, h - Math.round(r * 0.5), r, VERDE, rnd, 0.7);
    chioma(davanti, cx + Math.round(r * 1.1), h - Math.round(r * 0.2), r * 0.7, VERDE, rnd, 0.7);
    chioma(davanti, cx - Math.round(r * 1.1), h - Math.round(r * 0.15), r * 0.65, VERDE, rnd, 0.7);
  };
  macchia(Math.round(w * 0.03), h * 0.1);
  macchia(Math.round(w * 0.975), h * 0.09);
  albero(davanti, Math.round(w * 0.115), prato[Math.round(w * 0.115)] + Math.round(8 * u), 7 * u, VERDE, rnd);
  albero(davanti, Math.round(w * 0.9), prato[Math.round(w * 0.9)] + Math.round(6 * u), 6 * u, AUTUNNO, rnd);

  const erba: Filo[] = [];
  for (let i = 0; i < w * 0.55; i++) {
    const x = Math.floor(rnd() * w);
    erba.push({ x, y: prato[x] + 1 + Math.floor(rnd() * Math.max(1, h - prato[x])), alto: 2 + Math.floor(rnd() * 4 * u), fase: rnd() * 6.28, chiaro: rnd() < 0.5 });
  }

  const isole: IsolaViva[] = [
    { isola: isola(Math.round(w * 0.15), 31, 'prato'), x: Math.round(w * 0.215), y: Math.round(h * 0.3), dondola: 2 * u, fase: 0 },
    { isola: isola(Math.round(w * 0.105), 47, 'autunno'), x: Math.round(w * 0.835), y: Math.round(h * 0.42), dondola: 1.6 * u, fase: 2.1 },
    { isola: isola(Math.round(w * 0.045), 59, 'scoglio'), x: Math.round(w * 0.345), y: Math.round(h * 0.44), dondola: 1.2 * u, fase: 4 },
  ];

  return {
    w,
    h,
    cielo: cielo.inCanvas(),
    nuvoleLontane: seminaNuvole(w, h * 0.3, h * 0.5, 7, u, false, rnd),
    terra: terra.inCanvas(),
    isole,
    nuvoleVicine: seminaNuvole(w, h * 0.03, h * 0.3, 5, u, true, rnd),
    davanti: davanti.inCanvas(),
    erba,
    raggi: true,
    volo: [0.08, 0.42],
  };
}

function componiIsole(w: number, h: number, punti: readonly PuntoIsola[]): Composizione {
  const rnd = casuale(23);
  const u = h / 240;

  const cielo = new Tela(w, h);
  dipingiCielo(cielo, Math.round(h * 0.92));
  sole(cielo, Math.round(w * 0.14), Math.round(h * 0.15), Math.max(6, Math.round(12 * u)));

  // In basso, il mare di nuvole: due file di sbuffi, quelli dietro piu' azzurri.
  const terra = new Tela(w, h);
  const fila = (quanti: number, quotaY: number, raggio: number, chiaro: Colore, scuro: Colore) => {
    for (let i = 0; i < quanti; i++) {
      const r = raggio * (0.7 + rnd() * 0.6);
      const cx = ((i + rnd() * 0.8) / quanti) * w;
      const cy = quotaY + (rnd() - 0.5) * raggio * 0.5;
      for (let y = Math.floor(cy - r); y < h; y++) {
        for (let x = Math.floor(cx - r); x <= cx + r; x++) {
          if (y < cy && (x - cx) * (x - cx) + (y - cy) * (y - cy) > r * r) continue;
          const luce = (cy - y) / r;
          if (luce > 0.45) terra.set(x, y, chiaro);
          else terra.mix(x, y, scuro, chiaro, luce + 0.4);
        }
      }
    }
  };
  fila(Math.round(w / 22), h * 0.93, 13 * u, K.ghiaccio, K.azzurro);
  fila(Math.round(w / 26), h * 0.99, 15 * u, K.bianco, K.ghiaccio);

  // Scogli piccoli sullo sfondo, per dare profondita'.
  const comparse: IsolaViva[] = [];
  for (let i = 0; i < 5; i++) {
    comparse.push({
      isola: isola(Math.round(w * (0.03 + rnd() * 0.03)), 70 + i, 'scoglio'),
      x: Math.round(w * (0.08 + rnd() * 0.84)),
      y: Math.round(h * (0.12 + rnd() * 0.62)),
      dondola: 1.2 * u,
      fase: rnd() * 6.28,
    });
  }

  const isole: IsolaViva[] = punti.map((p, i) => ({
    isola: isola(Math.round((w * (p.larga ?? 24)) / 100), 100 + i * 13, p.tema),
    x: Math.round((w * p.x) / 100),
    y: Math.round((h * p.y) / 100) + 3,
    dondola: 0,
    fase: 0,
  }));

  return {
    w,
    h,
    cielo: cielo.inCanvas(),
    nuvoleLontane: seminaNuvole(w, h * 0.05, h * 0.8, 9, u, false, rnd),
    terra: terra.inCanvas(),
    isole: [...comparse, ...isole],
    nuvoleVicine: seminaNuvole(w, h * 0.02, h * 0.16, 3, u, true, rnd),
    davanti: null,
    erba: [],
    raggi: false,
    volo: [0.06, 0.8],
  };
}

// ---------------------------------------------------------------------------
// Quello che si muove
// ---------------------------------------------------------------------------

interface Uccello {
  x: number;
  y: number;
  v: number;
  fase: number;
}

interface Petalo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fase: number;
  colore: string;
}

const PETALI = [PALETTE.bianco, PALETTE.ambra, PALETTE.lime, PALETTE.corallo, PALETTE.bianco];

function disegnaCascata(ctx: CanvasRenderingContext2D, x: number, y: number, c: Cascata, t: number): void {
  for (let d = 0; d < c.lunga; d++) {
    const coda = d / c.lunga;
    for (let i = 0; i < c.larga; i++) {
      // Verso il fondo l'acqua si sfilaccia: la retinatura la dirada.
      if (coda > 0.55 && (coda - 0.55) * 2.1 > soglia(x + i, y + d)) continue;
      const corre = (d - Math.floor(t * 22) + i * 3 + 400) % 7;
      ctx.fillStyle = corre < 2 ? PALETTE.bianco : corre < 4 ? PALETTE.ghiaccio : PALETTE.azzurro;
      ctx.fillRect(x + i, y + d, 1, 1);
    }
  }
  // Lo spruzzo dove l'acqua si perde.
  ctx.fillStyle = PALETTE.bianco;
  for (let k = 0; k < 5; k++) {
    const g = grana(k + Math.floor(t * 9) * 5, c.lunga);
    ctx.fillRect(x - 2 + Math.floor(g * (c.larga + 4)), y + c.lunga - 3 + Math.floor(grana(k * 3 + Math.floor(t * 9), 2) * 5), 1, 1);
  }
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export interface ScenaProps {
  readonly tipo: 'valle' | 'isole';
  readonly isole?: readonly PuntoIsola[];
  readonly style?: CSSProperties;
}

/** Larghezza massima della scena in pixel "grossi": oltre, si ingrandisce di piu'. */
const LARGHEZZA_MAX = 460;

export function Scena({ tipo, isole, style }: ScenaProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const isoleRef = useRef(isole);
  isoleRef.current = isole;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let comp: Composizione | null = null;
    let uccelli: Uccello[] = [];
    let petali: Petalo[] = [];
    const rnd = casuale(5);

    const misura = () => {
      const scala = Math.max(3, Math.ceil(canvas.clientWidth / LARGHEZZA_MAX));
      const w = Math.max(40, Math.ceil(canvas.clientWidth / scala));
      const h = Math.max(30, Math.ceil(canvas.clientHeight / scala));
      if (comp && comp.w === w && comp.h === h) return;
      canvas.width = w;
      canvas.height = h;
      comp = tipo === 'valle' ? componiValle(w, h) : componiIsole(w, h, isoleRef.current ?? []);
      const [alto, basso] = comp.volo;
      uccelli = Array.from({ length: tipo === 'valle' ? 6 : 5 }, () => ({
        x: rnd() * w,
        y: h * (alto + rnd() * (basso - alto)),
        v: (7 + rnd() * 8) * (rnd() < 0.5 ? 1 : -1),
        fase: rnd() * 6.28,
      }));
      petali = Array.from({ length: Math.round(w / (tipo === 'valle' ? 9 : 22)) }, () => ({
        x: rnd() * w,
        y: rnd() * h,
        vx: 4 + rnd() * 7,
        vy: 2 + rnd() * 4,
        fase: rnd() * 6.28,
        colore: PETALI[Math.floor(rnd() * PETALI.length)],
      }));
      disegna(performance.now() / 1000, 0);
    };

    const disegnaNuvole = (lista: readonly NuvolaViva[], t: number) => {
      if (!comp) return;
      for (const n of lista) {
        const giro = comp.w + n.cv.width;
        const x = ((n.x0 + t * n.v) % giro) - n.cv.width;
        ctx.drawImage(n.cv, Math.round(x), n.y);
      }
    };

    const disegna = (t: number, dt: number) => {
      if (!comp) return;
      const { w, h } = comp;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(comp.cielo, 0, 0);
      disegnaNuvole(comp.nuvoleLontane, t);
      if (comp.terra) ctx.drawImage(comp.terra, 0, 0);

      for (const i of comp.isole) {
        const dy = i.dondola > 0 ? Math.round(Math.sin(t * 0.7 + i.fase) * i.dondola) : 0;
        const x = i.x - i.isola.ox;
        const y = i.y - i.isola.oy + dy;
        ctx.drawImage(i.isola.cv, x, y);
        for (const c of i.isola.cascate) disegnaCascata(ctx, i.x + c.dx, i.y + dy + c.dy + 2, c, t + i.fase);
        if (i.isola.tema === 'tempesta') {
          // Un lampo ogni tanto, sotto la nuvola.
          const ciclo = (t + 1.3) % 4.2;
          if (ciclo < 0.12 || (ciclo > 0.22 && ciclo < 0.3)) {
            ctx.fillStyle = PALETTE.ambra;
            let lx = i.x + Math.round(i.isola.larga * 0.1);
            const ly = i.y - Math.round(i.isola.larga * 0.5);
            for (let k = 0; k < Math.round(i.isola.larga * 0.32); k++) {
              if (k % 3 === 2) lx += k % 2 === 0 ? 2 : -3;
              ctx.fillRect(lx, ly + k, 2, 1);
            }
          }
        }
      }

      disegnaNuvole(comp.nuvoleVicine, t);
      if (comp.davanti) ctx.drawImage(comp.davanti, 0, 0);

      // L'erba alta: la punta di ogni filo oscilla col vento.
      for (const f of comp.erba) {
        const vento = Math.round(Math.sin(t * 1.6 + f.fase + f.x * 0.05));
        ctx.fillStyle = f.chiaro ? PALETTE.lime : PALETTE.smeraldo;
        ctx.fillRect(f.x, f.y - f.alto + 2, 1, f.alto - 1);
        ctx.fillRect(f.x + vento, f.y - f.alto, 1, 2);
      }

      ctx.fillStyle = PALETTE.inchiostro;
      for (const b of uccelli) {
        b.x += b.v * dt;
        if (b.x > w + 6) b.x = -6;
        if (b.x < -6) b.x = w + 6;
        const x = Math.round(b.x);
        const y = Math.round(b.y + Math.sin(t * 0.9 + b.fase) * 3);
        const ala = Math.floor(t * 5 + b.fase) % 2 === 0 ? -1 : 1;
        ctx.fillRect(x - 2, y + ala, 1, 1);
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x + 2, y + ala, 1, 1);
      }

      for (const p of petali) {
        p.x += (p.vx + Math.sin(t * 1.3 + p.fase) * 5) * dt;
        p.y += p.vy * dt;
        if (p.x > w + 2) p.x = -2;
        if (p.y > h + 2) p.y = -2;
        ctx.fillStyle = p.colore;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }

      if (comp.raggi) {
        ctx.fillStyle = '#ffffff';
        for (let k = 0; k < 4; k++) {
          ctx.globalAlpha = 0.05 + 0.035 * Math.sin(t * 0.5 + k * 1.9);
          const x0 = w * (0.52 + k * 0.1) + Math.sin(t * 0.2 + k) * 4;
          const largo = w * (0.03 + (k % 2) * 0.025);
          ctx.beginPath();
          ctx.moveTo(x0, 0);
          ctx.lineTo(x0 + largo, 0);
          ctx.lineTo(x0 + largo - h * 0.75, h);
          ctx.lineTo(x0 - h * 0.75, h);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };

    misura();
    const osservatore = new ResizeObserver(misura);
    osservatore.observe(canvas);

    // 15 fotogrammi al secondo: e' il passo dell'animazione a pixel, e costa poco.
    const PASSO = 1 / 15;
    const fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let ultimo = performance.now() / 1000;
    const giro = (ora: number) => {
      const t = ora / 1000;
      if (t - ultimo >= PASSO && !document.hidden) {
        disegna(t, Math.min(0.2, t - ultimo));
        ultimo = t;
      }
      raf = requestAnimationFrame(giro);
    };
    if (!fermo) raf = requestAnimationFrame(giro);

    return () => {
      cancelAnimationFrame(raf);
      osservatore.disconnect();
    };
  }, [tipo]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  );
}

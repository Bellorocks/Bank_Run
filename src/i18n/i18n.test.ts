/**
 * Le due lingue devono restare allineate: stesse chiavi, stessi segnaposto, e
 * ogni livello generato in inglese senza testo italiano rimasto o chiavi grezze.
 */

import { describe, it, expect } from 'vitest';
import itUi from '../locales/it/ui.json';
import enUi from '../locales/en/ui.json';
import { contentKeys, contentText, withContentLanguage } from './content';
import { TEMPLATES, instantiate } from '../content/registry';
import type { LevelInstance } from '../content/types';

const PH = /\{([A-Za-z_$][\w$]*)\}/g;
const placeholders = (s: string): string[] => [...s.matchAll(PH)].map((m) => m[1]!).sort();

// Parole che in un testo inglese non compaiono mai da sole: se ci sono, e'
// rimasto italiano. (I nomi propri delle aziende, "Alfa Componenti", non ne contengono.)
const ITALIANO = /\b(il|di|del|della|delle|degli|nella|una|questo|questa|perché|più|già|cioè|anche|calcola|sono|sulla|dalla|oppure|quindi|poi|qui|vale)\b/;
// Nomi propri di aziende italiane, che restano tali anche in inglese.
const NOMI_PROPRI = /Cantina Sociale del Nord/g;
const CHIAVE = /\b(?:M\d{1,2}[A-F]?-\d\d-[A-Z0-9]+|common)\.[\w.-]+\b/;

/** Tutti i testi che il giocatore vede in un'istanza. */
function testiVisibili(inst: LevelInstance): string[] {
  const out: string[] = [inst.brief];
  for (const t of inst.tasks) out.push(t.prompt);
  for (const h of inst.hints) out.push(h.text);
  for (const s of inst.sheets) {
    out.push(s.name);
    for (const c of s.cells) if (typeof c.content === 'string' && !c.content.startsWith('=')) out.push(c.content);
  }
  return out;
}

describe('file di lingua allineati', () => {
  it('contenuti: stesse chiavi e stessi segnaposto in it ed en', () => {
    const it = new Set(contentKeys('it'));
    const en = new Set(contentKeys('en'));
    expect([...it].filter((k) => !en.has(k)), 'chiavi mancanti in en').toEqual([]);
    expect([...en].filter((k) => !it.has(k)), 'chiavi in piu\' in en').toEqual([]);
    for (const k of it) {
      expect(placeholders(contentText('en', k)!), k).toEqual(placeholders(contentText('it', k)!));
    }
  });

  it('interfaccia: stesse chiavi e stessi segnaposto in it ed en', () => {
    const it: Record<string, string> = itUi;
    const en: Record<string, string> = enUi;
    expect(Object.keys(it).filter((k) => !(k in en))).toEqual([]);
    expect(Object.keys(en).filter((k) => !(k in it))).toEqual([]);
    for (const k of Object.keys(it)) expect(placeholders(en[k]!), k).toEqual(placeholders(it[k]!));
  });
});

describe('livelli generati in inglese', () => {
  it('nessuna chiave grezza, segnaposto vuoto o testo italiano rimasto', () => {
    const problemi: string[] = [];
    for (const t of TEMPLATES) {
      for (const seed of [1, 42, 1337]) {
        const inst = withContentLanguage('en', () => instantiate(t.id, seed));
        const titolo = withContentLanguage('en', () => t.title);
        for (const testo of [titolo, ...testiVisibili(inst)]) {
          const chiave = CHIAVE.exec(testo);
          if (chiave) problemi.push(`${t.id}/${seed}: chiave grezza ${chiave[0]}`);
          const ph = placeholders(testo);
          if (ph.length) problemi.push(`${t.id}/${seed}: segnaposto ${ph.join(', ')} in "${testo.slice(0, 60)}"`);
          const ita = ITALIANO.exec(testo.replace(NOMI_PROPRI, ''));
          if (ita) problemi.push(`${t.id}/${seed}: "${ita[0]}" in "${testo.slice(0, 80)}"`);
        }
      }
    }
    expect(problemi).toEqual([]);
  });

  it('la stessa istanza in italiano e in inglese ha gli stessi numeri e le stesse celle', () => {
    // La lingua cambia le parole, mai il livello: stessi task, stesse celle, stessi valori.
    for (const t of TEMPLATES) {
      const it = instantiate(t.id, 42);
      const en = withContentLanguage('en', () => instantiate(t.id, 42));
      expect(en.tasks.map((x) => x.targetCell), t.id).toEqual(it.tasks.map((x) => x.targetCell));
      for (let s = 0; s < it.sheets.length; s++) {
        const numeri = (inst: LevelInstance) =>
          inst.sheets[s]!.cells.map((c) => (typeof c.content === 'string' ? (c.content.startsWith('=') ? c.content : typeof c.content) : c.content));
        expect(numeri(en), `${t.id} foglio ${s}`).toEqual(numeri(it));
      }
    }
  });
});

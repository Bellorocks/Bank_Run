/**
 * La palette dei 16 colori del gioco (tipo NES, piu' morbida). Gli sfondi
 * (`ui/Scena.tsx`) sono dipinti solo con questi; l'interfaccia usa il tema `T`
 * qui sotto, che ne riprende inchiostro, ambra, smeraldo e corallo.
 */

export const PALETTE = {
  inchiostro: '#1a1c2c',
  prugna: '#5d275d',
  rubino: '#b13e53',
  corallo: '#ef7d57',
  ambra: '#ffcd75',
  lime: '#a7f070',
  smeraldo: '#38b764',
  petrolio: '#257179',
  notte: '#29366f',
  oltremare: '#3b5dc9',
  azzurro: '#41a6f6',
  ghiaccio: '#73eff7',
  bianco: '#f4f4f4',
  nebbia: '#94b0c2',
  ardesia: '#566c86',
  grafite: '#333c57',
} as const;

export type PaletteColor = keyof typeof PALETTE;

export const PALETTE_LIST: readonly string[] = Object.values(PALETTE);

/**
 * Il tema del gioco: di giorno. Gli sfondi sono cielo, prati e isole a colori
 * pieni; sopra, l'interfaccia e' fatta di tasselli color inchiostro, cosi' il
 * testo si legge sempre e lo sfondo resta protagonista.
 *
 * Due accenti, tutti e due del mestiere: l'oro (cio' che e' attivo, e gli XP) e
 * il verde di Excel (l'azione principale). Il corallo e' per i dettagli.
 *
 * La griglia resta "carta": chiara, perche' la disciplina dei colori del
 * mestiere (input blu, formule nere) si legge solo su fondo bianco.
 */
export const T = {
  // superfici, dalla piu' profonda alla piu' alta
  abisso: '#10111c',
  fondo: '#1a1c2c',
  pannello: '#20243a',
  rialzo: '#2a304a',
  rialzo2: '#333c57',
  linea: '#44527a',
  lineaForte: '#566c86',
  // testo
  testo: '#f4f4f4',
  tenue: '#a9bdce',
  spento: '#73869f',
  // accenti
  accento: '#ffcd75',
  accentoScuro: '#b8742c',
  azione: '#38b764',
  azioneScuro: '#1b6e4b',
  corallo: '#ef7d57',
  coralloScuro: '#b13e53',
  oro: '#ffcd75',
  oroScuro: '#b8742c',
  menta: '#a7f070',
  mentaScuro: '#38b764',
  rosso: '#f4627c',
  rossoScuro: '#b13e53',
  viola: '#b48cff',
  cielo: '#41a6f6',
  // carta: la griglia e la barra della formula
  carta: '#fbfcfe',
  cartaTenue: '#edf1f7',
  cartaLinea: '#d3dbe8',
  cartaTesto: '#131a2b',
  cartaAttiva: '#12a150',
} as const;

/**
 * Colori semantici. Due gruppi distinti e volutamente separati:
 *
 *  - `UI`: il "chrome" del gioco, sempre su fondo scuro;
 *  - `MODEL`: la disciplina dei colori del mestiere (input blu, formule nere,
 *    link cross-sheet verdi). Questi ultimi NON sono decorazione: il grader li
 *    verifica (check `colorDiscipline`), quindi devono restare stabili e
 *    riconoscibili anche a chi apre il file esportato in Excel vero.
 */
export const UI = {
  sfondo: T.fondo,
  sfondoPannello: T.pannello,
  bordo: T.linea,
  testo: T.testo,
  testoTenue: T.tenue,
  accento: T.accento,
  successo: T.menta,
  errore: T.rosso,
  attenzione: T.oro,
  info: T.cielo,
  evidenza: T.menta,
  boss: T.viola,
} as const;

/** Convenzione di mestiere per il color coding delle celle. */
export const MODEL_COLORS = {
  /** Input battuto a mano: blu. */
  input: '#0000FF',
  /** Formula calcolata nel foglio: nero. */
  formula: '#000000',
  /** Link a un altro foglio dello stesso file: verde. */
  crossSheet: '#008000',
  /** Link a un file esterno: rosso. Nel gioco non dovrebbe mai servire, ma va riconosciuto. */
  external: '#FF0000',
  /** Cella da non toccare, di sola lettura. */
  locked: '#7F7F7F',
} as const;

export type ModelColorRole = keyof typeof MODEL_COLORS;

/**
 * Riconosce il ruolo di un colore di carattere, tollerando le varianti di
 * scrittura (`#00F`, `#0000ff`, `rgb(0,0,255)`) che possono arrivare da
 * un import .xlsx. Restituisce `undefined` se il colore non e' uno dei ruoli.
 */
export function classifyFontColor(color: string | undefined): ModelColorRole | undefined {
  if (!color) return 'formula'; // assenza di colore = nero = formula
  const hex = normalizeHex(color);
  if (!hex) return undefined;
  for (const [role, value] of Object.entries(MODEL_COLORS)) {
    if (value.toLowerCase() === hex) return role as ModelColorRole;
  }
  return undefined;
}

function normalizeHex(color: string): string | undefined {
  const c = color.trim().toLowerCase();
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(c);
  if (rgb) {
    const to2 = (n: string) => Number(n).toString(16).padStart(2, '0');
    return `#${to2(rgb[1])}${to2(rgb[2])}${to2(rgb[3])}`;
  }
  if (/^#[0-9a-f]{3}$/.test(c)) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  if (/^#[0-9a-f]{6}$/.test(c)) return c;
  if (/^#[0-9a-f]{8}$/.test(c)) return `#${c.slice(1, 7)}`; // ARGB/RGBA: scarta l'alpha
  return undefined;
}

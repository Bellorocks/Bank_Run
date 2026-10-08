/**
 * Sprite pixel art disegnati a mano, un pixel alla volta, sulla palette
 * approvata dei 16 colori (spec §8). Ogni riga di `spriteFromRows` è larga
 * quanto tutte le altre — è quello che rende la griglia un rettangolo vero,
 * non un'approssimazione.
 */

import { PALETTE } from '../../styles/palette';
import { spriteFromRows, type PixelFrame } from './PixelCanvas';

const LEGEND = {
  o: PALETTE.inchiostro,
  L: PALETTE.lime,
  E: PALETTE.smeraldo,
  P: PALETTE.petrolio,
  R: PALETTE.rubino,
  M: PALETTE.prugna,
  A: PALETTE.ambra,
  C: PALETTE.corallo,
  B: PALETTE.bianco,
  N: PALETTE.nebbia,
  Z: PALETTE.azzurro,
  G: PALETTE.ghiaccio,
  S: PALETTE.ardesia,
  U: PALETTE.grafite,
  K: PALETTE.notte,
  O: PALETTE.oltremare,
} as const;

/** Albero gigante / grande quercia: maestosa, chioma frondosa multi-strato, tronco possente in toni legno caldo. */
export const TREE_GIANT_OAK: PixelFrame = spriteFromRows(
  [
    '.........oooooo.........',
    '......oooEEEEEEooo......',
    '....ooEELLLLLLLLEEoo....',
    '...oEELLLLLLLLLLLLEEo...',
    '..oELLLLLLLLLLLLLLLLEo..',
    '.oELLLLLLLLLLLLLLLLLLEo.',
    'oELLLEELLLLLLLEELLLLLLEo',
    'oELLLEELLLLLLLEELLLLLLEo',
    'oELLLEEEEEEEELEEEEEELLEo',
    'oELLLEEPPPPPPEEPPPPPELLE',
    'oEELEEPPPPPPPPPPPPPPPEEo',
    '.oEEEPPPPPPPPPPPPPPPPPEo',
    '..oEPPPPoRRRRRRRoPPPPEo.',
    '...ooEPPoRRCCCMRoPEEoo..',
    '.....ooPoRCCCCCCRoPoo...',
    '.......ooRCCCCMMRoo.....',
    '........oRRCCCCMRo......',
    '........oRRCCCMMRo......',
    '........oRCCCCCCRo......',
    '........oRRCCCCMRo......',
    '........oRRCCMMMRo......',
    '........oRCCCCCCRo......',
    '.......ooRRCCCCMRoo.....',
    '......oRRRRCCCCMMRRRo...',
    '.....oRRRMMRRRRMMMMRRo..',
    '....oRRMMMMRRRRMMMMMRRo.',
    '...ooMMMMMMRRRRMMMMMMMoo',
    '..oEEEEEEEEEEEEEEEEEEEEo',
    '.oEEEEEEEEEEEEEEEEEEEEEo',
    'oEEEEEEEEEEEEEEEEEEEEEEo',
    'oLLLLLLLLLLLLLLLLLLLLLLo',
    'oooooooooooooooooooooooo',
  ],
  LEGEND,
);

/** Albero alto / pino sempreverde slanciato a piani scalinati. */
export const TREE_TALL_PINE: PixelFrame = spriteFromRows(
  [
    '.......oo.......',
    '......oLLo......',
    '.....oELLLo.....',
    '.....oELLLo.....',
    '....oEELLLEo....',
    '....oEELLLEo....',
    '...oEEEPPPEEo...',
    '...oEEEPPPEEo...',
    '..oEEEEPPPEEEo..',
    '..oEEEEPPPEEEo..',
    '.oEEEPPPPPPEEEo.',
    '.oEEEPPPPPPEEEo.',
    'oEEEEEPPPPPPEEEo',
    'oEEEEEPPPPPPEEEo',
    'oEEEPPPPPPPPPEEo',
    '.oEPPPPPPPPPPPEo',
    '..oooEPPPPPPooo.',
    '.....oRRCCRo....',
    '.....oRRCCRo....',
    '.....oRRCCRo....',
    '.....oRRCCRo....',
    '.....oRRCCRo....',
    '.....oRRCCRo....',
    '....ooRRCCMRoo..',
    '...oRRRRCCMMRRo.',
    '..oRRRMMRRMMMRRo',
    '.oEEEEEEEEEEEEo.',
    'oEEEEEEEEEEEEEEo',
    'oLLLLLLLLLLLLLLo',
    'oooooooooooooooo',
  ],
  LEGEND,
);

/** Albero fiabesco standard: chioma tonda e soffice, tre toni di verde, tronco caldo. */
export const TREE_ROUND: PixelFrame = spriteFromRows(
  [
    '................',
    '................',
    '.......EE.......',
    '.....ELLLLE.....',
    '....ELLLLLLE....',
    '...ELLLLLLLLE...',
    '...ELLLLLLLLE...',
    '...ELLLLLLLLE...',
    '....EPPPPPPE....',
    '.....PPPPPP.....',
    '......PPPP......',
    '.......RR.......',
    '.......RR.......',
    '.......RM.......',
    '.......RR.......',
    '......RRRR......',
  ],
  LEGEND,
);

/** Albero piccolo, per profondità/varietà nel paesaggio. */
export const TREE_SMALL: PixelFrame = spriteFromRows(
  [
    '..........',
    '....EE....',
    '..ELLLLE..',
    '.ELLLLLLE.',
    '.ELLLLLLE.',
    '..EPPPPE..',
    '...PPPP...',
    '....RR....',
    '....RR....',
    '...RRRR...',
  ],
  LEGEND,
);

/** Cespuglio basso rigoglioso per il primo piano. */
export const BUSH: PixelFrame = spriteFromRows(
  [
    '................',
    '.....EEEE.......',
    '...ELLLLLLE.....',
    '..ELLLLLLLLE....',
    '..ELLLLLLLLEE...',
    '.ELLLLLLLLLLLE..',
    'ELLLLLLLLLLLLLE.',
    'EPPPPPPPPPPPPPE.',
    '.PPPPPPPPPPPP...',
    '................',
  ],
  LEGEND,
);

/** Grande nuvola a blocchi volumetrici con base ombreggiata. */
export const CLOUD_LARGE: PixelFrame = spriteFromRows(
  [
    '........BBBBBB..................',
    '.....BBBBBBBBBBBB...............',
    '....BBBBBBBBBBBBBB....BBBBBB....',
    '..BBBBBBBBBBBBBBBBBBBBBBBBBBBB..',
    '.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBB.',
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    '.NNNNGGGBBBBBBBBBBBBBBBGGGGNNNN.',
    '..NNNNNNGGGGGGGGGGGGGGGGNNNNNN..',
    '....NNNNNNNNNNNNNNNNNNNNNNNN....',
  ],
  LEGEND,
);

/** Nuvola soffice media, sagoma a blocchi. */
export const CLOUD: PixelFrame = spriteFromRows(
  [
    '....BBBB........',
    '..BBBBBBBB......',
    '.BBBBBBBBBBB....',
    'BBBBBBBBBBBBBB..',
    'BBBBBBBBBBBBBBBB',
    '.BBBBBBBBBBBBBB.',
    '..NNNNNNNNNNN...',
    '................',
  ],
  LEGEND,
);

/** Fiore a 4 petali per il prato, con stelo verde e centro ambra. */
export const FLOWER: PixelFrame = spriteFromRows(['.A.', 'AAA', '.A.', '.E.'], LEGEND);

/** Stella a croce pixel art per il cielo stellato e lo spazio cosmico. */
export const PIXEL_STAR_BIG: PixelFrame = spriteFromRows(
  [
    '..B..',
    '..B..',
    'BBGBB',
    '..B..',
    '..B..',
  ],
  LEGEND,
);

/** Piccola stella scintillante a diamante. */
export const PIXEL_STAR_SMALL: PixelFrame = spriteFromRows(
  [
    '.B.',
    'BAB',
    '.B.',
  ],
  LEGEND,
);

/** Cartello / indicatore in legno pixel art piantato nel terreno. */
export const WOOD_SIGNPOST: PixelFrame = spriteFromRows(
  [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAAo',
    'oACCCCCCCCCCCCAo',
    'oACCoRRoRRoCCCAo',
    'oACCCCCCCCCCCCAo',
    'oAAAAAAAAAAAAAAo',
    'oooooooooooooooo',
    '......oRRo......',
    '......oRRo......',
    '......oRRo......',
    '.....oEEEEo.....',
  ],
  LEGEND,
);

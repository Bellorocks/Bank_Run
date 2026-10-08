/**
 * Badge dei nodi-livello sulla mappa del mondo: bloccato, sbloccato,
 * completato, boss. Iconografia dello spec §9.3 (corona = completato,
 * teschio = boss) ma disegnata "8-bit cute", mai macabra.
 */

import { PALETTE } from '../../styles/palette';
import { spriteFromRows, type PixelFrame } from './PixelCanvas';

const LEGEND = {
  o: PALETTE.inchiostro,
  A: PALETTE.ambra,
  C: PALETTE.corallo,
  R: PALETTE.rubino,
  M: PALETTE.prugna,
  B: PALETTE.bianco,
  N: PALETTE.nebbia,
  S: PALETTE.ardesia,
  G: PALETTE.grafite,
  L: PALETTE.lime,
  E: PALETTE.smeraldo,
} as const;

/** Nodo non ancora sbloccato: cerchio grigio spento, lucchetto. */
export const NODE_LOCKED: PixelFrame = spriteFromRows(
  [
    '....oooooo.....',
    '..ooSSSSSSoo...',
    '.oSSSSSSSSSSo..',
    'oSSSSSSSSSSSSo.',
    'oSSSNNNNNNSSSo.',
    'oSSNNooooNNSSo.',
    'oSSNoGGGGoNSSo.',
    'oSSNoGGGGoNSSo.',
    'oSSNGGGGGGNSSo.',
    '.oSSNooooNSSo..',
    '.oSSSSSSSSSo...',
    '..ooSSSSSoo....',
    '....oooooo.....',
  ],
  LEGEND,
);

/** Nodo sbloccato, non ancora giocato: cerchio ambra pieno, punto interrogativo implicito lasciato vuoto. */
export const NODE_UNLOCKED: PixelFrame = spriteFromRows(
  [
    '....oooooo.....',
    '..ooAAAAAAoo...',
    '.oAAAAAAAAAAo..',
    'oAAAAAAAAAAAAo.',
    'oAAAACCCCAAAAo.',
    'oAAACCCCCCAAAo.',
    'oAAACCCCCCAAAo.',
    'oAAAACCCCAAAAo.',
    'oAAAAAAAAAAAAo.',
    '.oAAAAAAAAAAo..',
    '.oAAAAAAAAAo...',
    '..ooAAAAAoo....',
    '....oooooo.....',
  ],
  LEGEND,
);

/** Nodo completato: cerchio smeraldo, corona ambra sopra. */
export const NODE_COMPLETE: PixelFrame = spriteFromRows(
  [
    '..A.....A.A....',
    '.AAA...AAAAA...',
    '..A..A..A.A....',
    '....oooooo.....',
    '..ooEEEEEEoo...',
    '.oELLLLLLLLEo..',
    'oELLLLLLLLLLEo.',
    'oELLLBBBBLLLEo.',
    'oELLBBBBBBLLEo.',
    'oELLLBBBBLLLEo.',
    '.oELLLLLLLLEo..',
    '.oEEEEEEEEEo...',
    '..ooEEEEEoo....',
  ],
  LEGEND,
);

/** Nodo boss: cerchio rubino/prugna, teschio bianco stilizzato — buffo, non macabro. */
export const NODE_BOSS: PixelFrame = spriteFromRows(
  [
    '....oooooo.....',
    '..ooRRRRRRoo...',
    '.oRRRMMMMRRRo..',
    'oRRMBBBBBBMRRo.',
    'oRMBBoBBoBBMRo.',
    'oRMBBoBBoBBMRo.',
    'oRMBBBBBBBBMRo.',
    'oRMBoBBBBoBMRo.',
    'oRRMBB..BBMRRo.',
    '.oRRMMMMMMRRo..',
    '.oRRRRRRRRRo...',
    '..ooRRRRRoo....',
    '....oooooo.....',
  ],
  LEGEND,
);

/** Casetta accogliente per l'isola finale: cottage fiabesco, non fortezza. */
export const COTTAGE: PixelFrame = spriteFromRows(
  [
    '.......oo.......',
    '......oRRo......',
    '.....oRRRRo.....',
    '....oRRRRRRo....',
    '...oRRRRRRRRo...',
    '..oRRRRRRRRRRo..',
    '.oMMMMMMMMMMMMo.',
    'oAAAAAAAAAAAAAAo',
    'oAAoBBoAAAAoBBoA',
    'oAAoBBoAAAAoBBoA',
    'oAAAAAAoGGoAAAAo',
    'oAAAAAAoGGoAAAAo',
    'oooooooooooooooo',
  ],
  LEGEND,
);

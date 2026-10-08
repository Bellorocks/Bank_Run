/**
 * Sprite pixel art delle Isole Fluttuanti e del Boss Planet (spec §8 e §9.3).
 *
 * Ogni isola è disegnata a mano sulla palette dei 16 colori come una vera
 * massa di terra galleggiante nel cielo: altopiano erboso in cima,
 * architetture e simboli del tema, chiglia rocciosa stratificata con
 * radici pendenti e frammenti di terra sospesi sotto.
 * Il livello boss (La Deal Room) è un pianeta celeste nello spazio cosmico.
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
  S: PALETTE.ardesia,
  U: PALETTE.grafite,
  K: PALETTE.notte,
  O: PALETTE.oltremare,
  Z: PALETTE.azzurro,
  I: PALETTE.ghiaccio,
} as const;

/**
 * 1. Isola dei Fondamentali (M0-A .. M0-F):
 * Altopiano erboso accogliente, quercia da addestramento, leggio con pergamena/manuale,
 * chiglia di terra/roccia stratificata e radici pendenti nel vuoto.
 * 32x24 px
 */
export const ISLAND_FONDAMENTALI: PixelFrame = spriteFromRows(
  [
    '................................',
    '.......oooo.....................',
    '.....ooEEEEoo...................',
    '....oEELLLLLEo.....oo...........',
    '....oEELLLLLEo....oAAo..........',
    '....oEPPPPPEEo...oABBAo.........',
    '.....ooPPPoo.....oABBAo.........',
    '.......oRRo......oACCAo.........',
    '..oooo.oRRo.ooooooACCAoooooooo..',
    '.oLLLLooRRooLLLLLLLLLLLLLLLLLLo.',
    'oLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLo',
    'oEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEo',
    'oEPPPEEEEEEPPPEEEEEEPPPEEEEPPPEo',
    '.oPPUUPPPPPUUPPPPPPUUPPPPPUUPo..',
    '..oUUSSUUUUSSUUUUUUSSUUUUSSUo...',
    '...oSSSSSSSSSSSSSSSSSSSSSSo.....',
    '....oUUGGUUUUGGUUUUGGUUUo.......',
    '.....oSSSSSSSSSSSSSSSSo.........',
    '......oUUUUUGGUUUUUUUo...o......',
    '.......oSSSSSSSSSSSo....oPo.....',
    '........oUUUGGUUUo.......o......',
    '.........oSSSSSo................',
    '..........oUo...................',
    '................................',
  ],
  LEGEND,
);

/**
 * 2. Arcipelago dei Tre Prospetti (M1, M2, M3):
 * Isola galleggiante a due terrazze con i tre pilastri monumentali (CE, SP, RF),
 * cascata d'acqua limpida che sfuma nel cielo e pareti di roccia a blocchi.
 * 34x26 px
 */
export const ISLAND_PROSPETTI: PixelFrame = spriteFromRows(
  [
    '..................................',
    '.......oo......oo......oo.........',
    '......oBBo....oBBo....oBBo........',
    '......oSSo....oSSo....oSSo........',
    '......oSSo....oSSo....oSSo........',
    '......oSSo....oSSo....oSSo........',
    '......oSSo....oSSo....oSSo........',
    '..oooooSSooooooSSooooooSSoooo.....',
    '.oLLLLLLLLLLLLLLLLLLLLLLLLLLLo....',
    'oLLLLLLLLLLLLLLLLLLLLLLLLLLLLLo...',
    'oEEEEEEEEEEEEEEEEEEEEEEEEEEEEEo...',
    'oEPPPEEEEPPPEEEEEEEEPPPEEEEPPEo...',
    '.oPPUUPPPUUPPo...ooPPUUPPPUUPo....',
    '..oUUSSUUUZZo...oLLLUUSSUUUUo.....',
    '...oSSSSSSIIo..oEEEEESSSSSSo......',
    '....oUUUGGIUo..oEPPPEEUGGUo.......',
    '.....oSSSSIIo...oUUPPPSSSo........',
    '......oUUGGIo....oUUSSUUo.........',
    '.......oSSIIo.....oSSSSo..........',
    '........oUZZo......oUUo...........',
    '.........oIIo.......oo............',
    '..........oZo.....................',
    '...........oo.....................',
    '..................................',
    '..................................',
    '..................................',
  ],
  LEGEND,
);

/**
 * 3. Isola delle Valutazioni & DCF (M4 .. M7):
 * Picco montuoso galleggiante con obelisco analitico/telescopio, giacimenti di cristalli
 * d'ambra/oro scintillanti e pareti a strapiombo verso le nuvole.
 * 34x26 px
 */
export const ISLAND_VALUTAZIONI: PixelFrame = spriteFromRows(
  [
    '..................oo..............',
    '.................oIIo.............',
    '................oISSIIo...........',
    '...............oISSSSIo...........',
    '.......oo......oISSSSIo...........',
    '......oAAo.....oISSSSIo...........',
    '.....oABBAo....oISSSSIo...........',
    '....oAABBCAo...oISSSSIo...........',
    '...oACCCCCCAo.oISSSSSSIo.oooo.....',
    '..oLLLLLLLLLLLLLLLLLLLLLLLLLLo....',
    '.oLLLLLLLLLLLLLLLLLLLLLLLLLLLLo...',
    'oEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEo..',
    'oEPPPEEPPPEEEEEEEEPPPEEEEPPPEEEo..',
    '.oPPUUPUUPPPo...oPPUUPPPUUUPPo....',
    '..oUUSSUUUSSo..oUUSSUUUUSSUUo.....',
    '...oSSSSSSSSo.oSSSSSSSSSSSSo......',
    '....oUUUGGUUUoUUUGGUUUUGGUo.......',
    '.....oSSSSSSSSSSSSSSSSSSSo........',
    '......oUUUGGUUUUUUGGUUUo..........',
    '.......oSSSSSSSSSSSSSSo...........',
    '........oUUUGGUUUUUUo.............',
    '.........oSSSSSSSSSo..............',
    '..........oUUUGGUo................',
    '...........oSSSSo.................',
    '............oUo...................',
    '..................................',
  ],
  LEGEND,
);

/**
 * 4. Isola del Credito & LBO (M8 .. M11):
 * Isola-fortezza galleggiante in ardesia scura, merli difensivi, portone del caveau,
 * stendardi rubino/prugna e possente base di roccia squadrata.
 * 34x26 px
 */
export const ISLAND_CREDITO: PixelFrame = spriteFromRows(
  [
    '.....oo.....oo.....oo.............',
    '....oRRo...oRRo...oRRo............',
    '....oRRo...oRRo...oRRo............',
    '....oMMo...oMMo...oMMo............',
    '....oSSoooooSSoooooSSo............',
    '....oSSSSSSSSSSSSSSSSo............',
    '....oSSSSoUUUUSSSoSSSo............',
    '....oSSSSoUAAUSSSoSSSo............',
    '..oooSSSSoUAAUSSSoSSSooooo........',
    '.oLLLLLLSoUUUUSSSoLLLLLLLLo.......',
    'oLLLLLLLLSSSSSSSSLLLLLLLLLLo......',
    'oEEEEEEEEEEEEEEEEEEEEEEEEEEEo.....',
    'oEPPPEEEEPPPEEEEPPPEEEEEEPPEo.....',
    '.oPPUUPPPUUPPPUUPPPUUPPPUUPo......',
    '..oUUSSUUUUSSUUUSSUUUUSSUUo.......',
    '...oSSSSSSSSSSSSSSSSSSSSSo........',
    '....oUUUGGUUUUGGUUUUGGUUo.........',
    '.....oSSSSSSSSSSSSSSSSSo..........',
    '......oUUUGGUUUUUUGGUUo...........',
    '.......oSSSSSSSSSSSSSo............',
    '........oUUUGGUUUUUo..............',
    '.........oSSSSSSSSo...............',
    '..........oUUUGGUo................',
    '...........oSSSSo.................',
    '............oUo...................',
    '..................................',
  ],
  LEGEND,
);

/**
 * 5. Il Boss Level: La Deal Room sul Pianeta Cosmico (M12):
 * Pianeta celeste nello spazio profondo, sfera con continenti prugna/rubino/notte,
 * anello orbitale luminoso inclinato, bagliore atmosferico ciano/bianco e stelle.
 * 36x34 px
 */
export const PLANET_DEALROOM: PixelFrame = spriteFromRows(
  [
    '...............oooooo...............',
    '............oooKKKKKKooo............',
    '..........ooKKKMMMMMMKKKoo..........',
    '........ooKKMMMMRRRRMMMMKKoo........',
    '.......oKKMMRRRRCCCCRRRRMMKKo.......',
    '......oKMMRRRCCCCCCCCCCRRRMKMo......',
    '.....oMMRRCCCCCCCCCCCCCCRRMMMo......',
    '....oMMRCCCCCCAACCCCCCCCRRRMMMo.....',
    '...oMMRCCCCCAAAAAACCCCCCCRRRMMMo....',
    '..oKMRCCCCCAAAAAAAACCCCCCCRRRMKo....',
    '..oMMRCCCCAAAAAACCAACCCCCCRRRMMo....',
    '.oKMRCCCCAAAAAAcccAACCCCCCCRRRMKo...',
    '.oMMRCCCCAAAAACccCAACCCCCCCRRRMMo...',
    'oIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIo',
    'oBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBb',
    'oGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGg',
    'oKMRRCCCCAAAAACccCAACCCCCCCRRRMMKooo',
    '.oMMRRCCCAAAAAACCAACCCCCCCRRRMMo....',
    '.oKMMRRCCAAAAAAAAACCCCCCCRRRMMKo....',
    '..oMMMRRCCCAAAAAACCCCCCCRRRMMMo.....',
    '..oKMMMRRCCCCCCCCCCCCCCRRRMMMKo.....',
    '...oKKMMRRRCCCCCCCCCCRRRRMMKKo......',
    '....oKKKMMRRRRCCCCRRRRMMKKKKo.......',
    '.....oKKKKMMMMRRRRMMMMKKKKKo........',
    '......oKKKKKKMMMMMMKKKKKKKo.........',
    '.......ooKKKKKKKKKKKKKKKoo..........',
    '.........oooKKKKKKKKKooo............',
    '............ooooooooo...............',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
  ],
  {
    ...LEGEND,
    b: PALETTE.bianco,
    g: PALETTE.ghiaccio,
  },
);

/** Cursore a freccia/spilla pixel art per indicare l'isola attiva sulla mappa. */
export const SELECTION_CURSOR: PixelFrame = spriteFromRows(
  [
    '....ooo....',
    '..ooAAAoo..',
    '.oAAABBBAo.',
    '.oAAABBBAo.',
    'oAAAAAAAAAo',
    'oAAAAAAAAAo',
    '.oAAAAAAAo.',
    '..oAAAAAo..',
    '...oAAAo...',
    '....oAo....',
    '.....o.....',
  ],
  LEGEND,
);

/** Corona dorata pixel per isole/moduli completati. */
export const CROWN_GOLD: PixelFrame = spriteFromRows(
  [
    'o...o...o',
    'oAo.oAo.oAo',
    'oAAoAAoAAo',
    'oAAAAAAAAo',
    'oAAABBAAAo',
    'oooooooooo',
  ],
  LEGEND,
);

/** Cuscinetto di nuvole a blocchi per la base delle isole. */
export const CLOUD_CUSHION: PixelFrame = spriteFromRows(
  [
    '......BBBBBBBBBBBB......',
    '....BBBBBBBBBBBBBBBB....',
    '..BBBBBBBBBBBBBBBBBBBB..',
    'BBBBBBBBBBBBBBBBBBBBBBBB',
    'NNNNGGGBBBBBBBBBGGGGNNNN',
    '..NNNNNNGGGGGGGGNNNNNN..',
    '....NNNNNNNNNNNNNNNN....',
    '........................',
  ],
  LEGEND,
);

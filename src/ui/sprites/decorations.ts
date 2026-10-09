/**
 * Decorazioni pixel art dettagliate (stile 16-bit su griglia di pixel nativi)
 * ed Easter Egg per BANK RUN.
 *
 * Tutti gli sprite sono rigorosamente definiti sulla palette 16 colori (spec §8).
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
 * Segnaposto / Bandiera di Checkpoint per la Mappa del Mondo
 * 18x24 px: Palo in legno intagliato con bandiera dorata o rubino e gemma.
 */
export const MAP_PIN_BANNER: PixelFrame = spriteFromRows(
  [
    '.....oo...........',
    '....oAAo..........',
    '....oABo..........',
    '....oAAo..........',
    '....oRRooooooooo..',
    '....oRRAAAAAAAARo.',
    '....oRAABBBBBAARRo',
    '....oRAABBBBAARAAo',
    '....oRAABBBBBAARRo',
    '....oRRAAAAAAAARo.',
    '....oRRooooooooo..',
    '....oRRo..........',
    '....oRRo..........',
    '....oRRo..........',
    '....oRRo..........',
    '....oRRo..........',
    '....oRRo..........',
    '....oRRo..........',
    '...oCCCCo.........',
    '..oCCCCCCo........',
    '.oRRCCCCRRo.......',
    'ooooooooooo.......',
  ],
  LEGEND,
);

/**
 * Catena di sospensione per cartelli in legno appesi
 * 6x14 px: Maglie di ferro e anello di fissaggio.
 */
export const WOOD_CHAIN_HANGER: PixelFrame = spriteFromRows(
  [
    '..oo..',
    '.oSSo.',
    'oSBBo.',
    'oSNSo.',
    '.oSSo.',
    '..oo..',
    '.oSSo.',
    'oSBBo.',
    'oSNSo.',
    '.oSSo.',
    '..oo..',
    '.oUUo.',
    'oUAAUo',
    '.oooo.',
  ],
  LEGEND,
);

/**
 * Graffetta / Morsetto in ferro con vite per assi di legno
 * 6x10 px
 */
export const WOOD_IRON_CLAMP: PixelFrame = spriteFromRows(
  [
    'oooooo',
    'oSSSSo',
    'oSBBAo',
    'oSBBAo',
    'oSooAo',
    'oSooAo',
    'oSBBAo',
    'oSBBAo',
    'oSSSSo',
    'oooooo',
  ],
  LEGEND,
);

/**
 * Graffetta verticale a ponte per unire due assi di legno sovrapposte (come nella reference)
 * 6x14 px: Unisce l'asse superiore a quella inferiore.
 */
export const WOOD_STAPLE_LINK: PixelFrame = spriteFromRows(
  [
    '.oooo.',
    'oSSSSo',
    'oSBBAo',
    'oSooAo',
    'oSSSSo',
    '.oUUo.',
    '.oUUo.',
    '.oUUo.',
    'oSSSSo',
    'oSBBAo',
    'oSooAo',
    'oSSSSo',
    '.oooo.',
    '......',
  ],
  LEGEND,
);

/**
 * Estremità Sinistra Arrotondata di un'Asse di Legno (Reference Match)
 * 10x20 px: Bordo arrotondato, bisellatura dorata in alto, venature e rivetto in ferro.
 */
export const WOOD_PLANK_CAP_L: PixelFrame = spriteFromRows(
  [
    '...ooooooo',
    '..oAAAAAAA',
    '.oAAAAAAAA',
    'oAAAACCCCC',
    'oAAACCCCCR',
    'oAACoSSoCC',
    'oAACoSBBoC',
    'oAACoSNAoC',
    'oAACoSSoCC',
    'oAACCCCCCC',
    'oACCRRRRRR',
    'oACCCCCCCC',
    'oACCCCCCCC',
    'oACCRRRRRR',
    'oACCCCCCCC',
    'oACMMMMMMM',
    '.oAMMMMMMM',
    '..oRRRRRRR',
    '...ooooooo',
    '..........',
  ],
  LEGEND,
);

/**
 * Estremità Destra Arrotondata di un'Asse di Legno (Reference Match)
 * 10x20 px
 */
export const WOOD_PLANK_CAP_R: PixelFrame = spriteFromRows(
  [
    'ooooooo...',
    'AAAAAAAo..',
    'AAAAAAAAo.',
    'CCCCCAAAAo',
    'RCCCCCAAAC',
    'CCoSSoCAAA',
    'CoSBBoCAAA',
    'CoSNAoCAAA',
    'CCoSSoCAAA',
    'CCCCCCCCAA',
    'RRRRRRCCAA',
    'CCCCCCCCAA',
    'CCCCCCCCAA',
    'RRRRRRCCAA',
    'CCCCCCCCAA',
    'MMMMMMMMAo',
    'MMMMMMMMAo',
    'RRRRRRRRo.',
    'ooooooo...',
    '..........',
  ],
  LEGEND,
);

/**
 * Punta a Freccia Sinistra in Legno (Reference Match)
 * 14x20 px
 */
export const WOOD_ARROW_TIP_L: PixelFrame = spriteFromRows(
  [
    '...........ooo',
    '.........ooAAo',
    '.......ooAAAAo',
    '.....ooAAAAACo',
    '...ooAAAACCCCo',
    '.ooAAAACCCCCRo',
    'oAAAACCCCCCCCC',
    'oAACCCCCCCCCCC',
    'oACCCCCCCCCCCC',
    'oACCRRRRRRRRRR',
    'oACCCCCCCCCCCC',
    'oACCCCCCCCCCCC',
    'oACCRRRRRRRRRR',
    'oACCCCCCCCCCCC',
    '.ooMMMMMMMMMMo',
    '...ooMMMMMMMMo',
    '.....ooRRRRRRo',
    '.......ooRRRRo',
    '.........ooRRo',
    '...........ooo',
  ],
  LEGEND,
);

/**
 * Punta a Freccia Destra in Legno (Reference Match)
 * 14x20 px
 */
export const WOOD_ARROW_TIP_R: PixelFrame = spriteFromRows(
  [
    'ooo...........',
    'oAAoo.........',
    'oAAAAoo.......',
    'oCAAAAAoo.....',
    'oCCCCAAAAoo...',
    'oRCCCCCAAAAoo.',
    'CCCCCCCCCCAAAo',
    'CCCCCCCCCCCCAo',
    'CCCCCCCCCCCCAo',
    'RRRRRRRRRRCCAo',
    'CCCCCCCCCCCCAo',
    'CCCCCCCCCCCCAo',
    'RRRRRRRRRRCCAo',
    'CCCCCCCCCCCCAo',
    'oMMMMMMMMMMoo.',
    'oMMMMMMMMoo...',
    'oRRRRRRoo.....',
    'oRRRRoo.......',
    'oRRoo.........',
    'ooo...........',
  ],
  LEGEND,
);

/**
 * 0. Angolari a Tronco di Legno 16-Bit con Anelli Concentrici & Giunzioni a Incastro
 * 24x24 px: Sezione trasversale del tronco d'albero con corteccia, anelli di crescita,
 * chiodo centrale di ferro/oro e innesto dei tronchi orizzontale e verticale.
 */
export const WOOD_LOG_CORNER_TL: PixelFrame = spriteFromRows(
  [
    '......oooooooo..........',
    '....ooRRRRRRRRo.........',
    '..ooRRAAAAAAARRoo.......',
    '.oRRAACCCCCCAARACCCCCCo.',
    '.oRAACCRRRRCCAARACCCCCo.',
    'oRAACRRACCCRRCAARACCCCo.',
    'oRAACRAABBAACCAARACCCCo.',
    'oRAACRABAoAACCAARACCCCo.',
    'oRAACRAAooAACCAARACCCCo.',
    'oRAACRRACCCRRCAARACCCCo.',
    'oRAACCRRRRCCAARACCCCCCo.',
    '.oRRAACCCCCCAARAMMMMoo..',
    '..ooRRAAAAAAARRAMMMMo...',
    '....ooRRRRRRRRAMMMMMo...',
    '......ooMMMooAMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........ooooooooooooo...',
  ],
  LEGEND,
);

export const WOOD_LOG_CORNER_TR: PixelFrame = spriteFromRows(
  [
    '..........oooooooo......',
    '.........oRRRRRRRRoo....',
    '.......ooRRAAAAAAARRoo..',
    '.oCCCCCCARAACCCCCCAARRo.',
    '.oCCCCCAARAACCRRRRCCAARo.',
    '.oCCCCCAARAACRRACCCRCAARo',
    '.oCCCCCAARAACRAABBAACCAARo',
    '.oCCCCCAARAACRABAoAACCAARo',
    '.oCCCCCAARAACRAAooAACCAARo',
    '.oCCCCCAARAACRRACCCRRCAARo',
    '.oCCCCCCARAACCRRRRCCAARo.',
    '..ooMMMMAARAACCCCCCAARRo.',
    '...oMMMMAARRAAAAAAARRoo..',
    '...oMMMMMAMRRRRRRRRoo....',
    '...oMMMMMMAMooMMMoo......',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...ooooooooooooo.........',
  ],
  LEGEND,
);

export const WOOD_LOG_CORNER_BL: PixelFrame = spriteFromRows(
  [
    '........ooooooooooooo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '........oAACAMMMMMMMo...',
    '......ooMMMooAMMMMMMo...',
    '....ooRRRRRRRRAMMMMMo...',
    '..ooRRAAAAAAARRAMMMMo...',
    '.oRRAACCCCCCAARAMMMMoo..',
    'oRAACCRRRRCCAARACCCCCCo.',
    'oRAACRRACCCRRCAARACCCCo.',
    'oRAACRAAooAACCAARACCCCo.',
    'oRAACRABAoAACCAARACCCCo.',
    'oRAACRAABBAACCAARACCCCo.',
    'oRAACRRACCCRRCAARACCCCo.',
    '.oRAACCRRRRCCAARACCCCCo.',
    '.oRRAACCCCCCAARACCCCCCo.',
    '..ooRRAAAAAAARRoo.......',
    '....ooRRRRRRRRo.........',
    '......oooooooo..........',
  ],
  LEGEND,
);

export const WOOD_LOG_CORNER_BR: PixelFrame = spriteFromRows(
  [
    '...ooooooooooooo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMMACAo.........',
    '...oMMMMMMAMooMMMoo......',
    '...oMMMMMAMRRRRRRRRoo....',
    '...oMMMMAARRAAAAAAARRoo..',
    '..ooMMMMAARAACCCCCCAARRo.',
    '.oCCCCCCARAACCRRRRCCAARo.',
    '.oCCCCCAARAACRRACCCRCAARo',
    '.oCCCCCAARAACRAAooAACCAARo',
    '.oCCCCCAARAACRABAoAACCAARo',
    '.oCCCCCAARAACRAABBAACCAARo',
    '.oCCCCCAARAACRRACCCRRCAARo',
    '.oCCCCCAARAACCRRRRCCAARo.',
    '.oCCCCCCARAACCCCCCAARRo.',
    '.......ooRRAAAAAAARRoo..',
    '.........oRRRRRRRRoo....',
    '..........oooooooo......',
  ],
  LEGEND,
);

/**
 * 1. Angolare di Legno Pregiato con Staffa Dorata & Rivetti (Top-Left)
 * 16x16 px: Ricca bisellatura 16-bit, intaglio venato e borchia d'oro.
 */
export const WOOD_CORNER_TL: PixelFrame = spriteFromRows(
  [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAAo',
    'oABBAAAAAAAAAAAo',
    'oABAoooooooooooA',
    'oAAoACCCCCCCCMRo',
    'oAAoACCoAAoCCMRo',
    'oAAoACCAAAACCMRo',
    'oAAoACCoAAoCCMRo',
    'oAAoACCCCCCCCMRo',
    'oAAoACCCCCCCCMRo',
    'oAAoACCoRRoCCMRo',
    'oAAoACCoRRoCCMRo',
    'oAAoACCCCCCCCMRo',
    'oAAoAMMMMMMMMMRo',
    'oAAoRRRRRRRRRRRo',
    'oAAooooooooooooo',
  ],
  LEGEND,
);

/**
 * Angolare di Legno Pregiato (Top-Right)
 * 16x16 px
 */
export const WOOD_CORNER_TR: PixelFrame = spriteFromRows(
  [
    'oooooooooooooooo',
    'oAAAAAAAAAAAAAAo',
    'oAAAAAAAAAAABBAo',
    'AoooooooooooABAo',
    'oACCCCCCCCMRoAAo',
    'oACCoAAoCCMRoAAo',
    'oACCAAAACCMRoAAo',
    'oACCoAAoCCMRoAAo',
    'oACCCCCCCCMRoAAo',
    'oACCCCCCCCMRoAAo',
    'oACCoRRoCCMRoAAo',
    'oACCoRRoCCMRoAAo',
    'oACCCCCCCCMRoAAo',
    'oAMMMMMMMMMRoAAo',
    'oRRRRRRRRRRRoAAo',
    'oooooooooooooAAo',
  ],
  LEGEND,
);

/**
 * Angolare di Legno Pregiato (Bottom-Left)
 * 16x16 px
 */
export const WOOD_CORNER_BL: PixelFrame = spriteFromRows(
  [
    'oAAooooooooooooo',
    'oAAoACCCCCCCCCAA',
    'oAAoACCoAAoCCCAA',
    'oAAoACCAAAACCCAA',
    'oAAoACCoAAoCCCAA',
    'oAAoACCCCCCCCCAA',
    'oAAoACCCCCCCCMRo',
    'oAAoACCoRRoCCMRo',
    'oAAoACCoRRoCCMRo',
    'oAAoACCCCCCCCMRo',
    'oAAoAMMMMMMMMMRo',
    'oAAoRRRRRRRRRRRo',
    'oAAoooooooooooRo',
    'oABAoRRRRRRRRRRo',
    'oABBAAAAAAAAAAAo',
    'oooooooooooooooo',
  ],
  LEGEND,
);

/**
 * Angolare di Legno Pregiato (Bottom-Right)
 * 16x16 px
 */
export const WOOD_CORNER_BR: PixelFrame = spriteFromRows(
  [
    'oooooooooooooAAo',
    'AACCCCCCCCCoAAo',
    'AACCoAAoCCCoAAo',
    'AACCAAAACCCoAAo',
    'AACCoAAoCCCoAAo',
    'AACCCCCCCCCoAAo',
    'oACCCCCCCCMRoAAo',
    'oACCoRRoCCMRoAAo',
    'oACCoRRoCCMRoAAo',
    'oACCCCCCCCMRoAAo',
    'oAMMMMMMMMMRoAAo',
    'oRRRRRRRRRRRoAAo',
    'oRoooooooooooAAo',
    'oRRRRRRRRRRoABAo',
    'oAAAAAAAAAAABBAo',
    'oooooooooooooooo',
  ],
  LEGEND,
);

/**
 * 2. Baule del Tesoro con il Simbolo del Dollaro ($) — Easter Egg
 * 20x16 px: Baule in legno rinforzato in ferro e oro che trabocca di ricchezza da investment banker.
 */
export const TREASURE_CHEST: PixelFrame = spriteFromRows(
  [
    '......oooooooo......',
    '....ooAAAAAAAAoo....',
    '..ooAABBAAAABBAAoo..',
    '.oACCCCoRRoCCCCAMo.',
    '.oACCoAAAAAACCoAMo.',
    'oACCoAABBBBAACCoAMo',
    'oACCoAABBBAAACCoAMo',
    'oACCoAABBBBAACCoAMo',
    'oACCoAAABBAAACCoAMo',
    'oACCoAABBBBAACCoAMo',
    'oACCoAAAAAACCoAMo',
    'oACCCCCoRRoCCCCAMo',
    'oACCCCCCCCCCCCCAMo',
    'oAMMMMMMMMMMMMMAMo',
    '.oRRRRRRRRRRRRRRo..',
    '..oooooooooooooo....',
  ],
  LEGEND,
);

/**
 * 3. Il Gufo di Excel / Spreadsheet Owl — Easter Egg
 * Gufo accademico con occhiali pixel e pergamena, appollaiato sul grande albero.
 * 16x18 px
 */
export const SPREADSHEET_OWL: PixelFrame = spriteFromRows(
  [
    '...oo......oo...',
    '..oAAo....oAAo..',
    '..oAAAooooAAAo..',
    '.oAAAAABBAAAAAo.',
    '.oAABBoAABBoAAo.',
    '.oABIIoAABIIoAo.',
    '.oAIIBoAABIIoAo.',
    '.oABBooAABBoAAo.',
    '..oAAAAACAAAAo..',
    '...oAAAACAAAo...',
    '....oAACCCAAo...',
    '...oUUSSSSUUo...',
    '..oUUSSSSSSUUo..',
    '.oUUSSSBBSUUUo..',
    '.oUUSSBABSSUUo..',
    '..oUUSSBSSSUUo..',
    '...ooAAooAAoo...',
    '.....oooooo.....',
  ],
  LEGEND,
);

/**
 * 4. Monolite Antico delle Formule (=SUM) — Easter Egg
 * Pietra runica millenaria con formula incisa brillante.
 * 18x20 px
 */
export const EXCEL_MONOLITH: PixelFrame = spriteFromRows(
  [
    '......oooooo......',
    '....ooSSSSSSoo....',
    '...oSSNNNNNNSSo...',
    '..oSSNNNNNNNNSSo..',
    '..oSSNNooooNNSSo..',
    '.oSSNooIIIIooNSSo.',
    '.oSSNoIIIIIIoNSSo.',
    '.oSSNooIIIIooNSSo.',
    '.oSSNNooIIooNNSSo.',
    '.oSSNNNoIIoNNNSSo.',
    '.oSSNNooIIooNNSSo.',
    '.oSSNooIIIIooNSSo.',
    '.oSSNoIIIIIIoNSSo.',
    '.oSSNooIIIIooNSSo.',
    'oSSNNNNooooNNNNSSo',
    'oSSNNNNNNNNNNNNSSo',
    'oSSNNNEEELENNNNSSo',
    'oSSNNLEELLELNNNSSo',
    'oSSSSLEELLELSSSSSo',
    'oooooooooooooooooo',
  ],
  LEGEND,
);

/**
 * 5. Dirigibile Mercantile / Steampunk Airship per la Mappa — Easter Egg
 * Vola tra le isole lungo i sentieri dorati.
 * 24x14 px
 */
export const AIRSHIP_ZEPPELIN: PixelFrame = spriteFromRows(
  [
    '........oooooooo........',
    '.....oooAAAAAAAAooo.....',
    '...ooAACCCCCCCCCCAAoo...',
    '..oAACCCCCCCCCCCCCCAAo..',
    '.oAACCoRRoRRoRRoCCCCAAo.',
    '.oAACCoRRoRRoRRoCCCCAAo.',
    'oAACCCCCCCCCCCCCCCCCCAAo',
    '.oAACCoRRoRRoRRoCCCCAAo.',
    '..oAACCCCCCCCCCCCCCAAo..',
    '...ooAACCCCCCCCCCAAoo...',
    '.....ooPSSSSSSPoo.......',
    '......oSSSSSSSSo..oo....',
    '......oSoIIoIIoSo.oRo...',
    '.......oooooooo...oo....',
  ],
  LEGEND,
);

/**
 * 6. Sonda Spaziale / Satellite del Boss Planet — Easter Egg
 * Orbita intorno alla Deal Room nello spazio profondo.
 * 18x12 px
 */
export const SPACE_PROBE: PixelFrame = spriteFromRows(
  [
    '..oooo......oooo..',
    '.oIIIIo.oo.oIIIIo.',
    '.oIZZZo.SS.oIZZZo.',
    'oIIZZZo.SS.oIIZZZo',
    '.oIZZZo.SS.oIZZZo.',
    '.oIIIIo.SS.oIIIIo.',
    '..oooo.oUUSo.oooo..',
    '......oUABAUo.....',
    '......oUABAUo.....',
    '.......oUUSo......',
    '........oIo.......',
    '.........o........',
  ],
  LEGEND,
);

/**
 * 7. Mongolfiera a Strisce Retro per il cielo della Mappa — Easter Egg
 * 16x20 px
 */
export const HOT_AIR_BALLOON: PixelFrame = spriteFromRows(
  [
    '.....oooooo.....',
    '...ooRRRRRRoo...',
    '..oRRBBBBRRRRo..',
    '.oRRBAAAABARRRo.',
    '.oRBAAIIAABARRo.',
    'oRRBAIIIIABARRRo',
    'oRRBAIIIIABARRRo',
    'oRRBAAAABARRRo',
    '.oRRBBBBRRRRo.',
    '.oRRRRRRRRRRo.',
    '..ooRRRRRRoo..',
    '...ooAAAAoo...',
    '....oACCAo....',
    '.....oRRo.....',
    '.....oRRo.....',
    '....oSSSSo....',
    '...oSAAAASo...',
    '...oSAAAASo...',
    '...oSSSSSSo...',
    '....oooooo....',
  ],
  LEGEND,
);

/**
 * 8. Lanterna da Campo in Ferro & Oro su Tronco
 * 10x16 px
 */
export const CAMPFIRE_LANTERN: PixelFrame = spriteFromRows(
  [
    '...oooo...',
    '..oSSSSo..',
    '.oSAAAASo.',
    '.oSAIIASo.',
    '.oSIIIIASo',
    '.oSAIIASo.',
    '.oSAAAASo.',
    '..oSSSSo..',
    '...oRRo...',
    '...oRRo...',
    '...oRRo...',
    '...oRRo...',
    '..oCCCCo..',
    '.oCCCCCCo.',
    'oRRCCCCRRo',
    'oooooooooo',
  ],
  LEGEND,
);

/**
 * 9. Funghetti Rossi con Puntini Bianchi del Bosco
 * 14x10 px
 */
export const FOREST_MUSHROOMS: PixelFrame = spriteFromRows(
  [
    '....ooooo.....',
    '..ooRRRRRoo...',
    '.oRRRBRRRRRo..',
    'oRRBRRRRBRRRo.',
    'oRRRRRBRRRRRo.',
    'oBBBBBBBBBBBo.',
    '..ooBBBBBoo...',
    '...oBBBBBo....',
    '...oBBBBBo....',
    '...ooooooo....',
  ],
  LEGEND,
);

/**
 * 10. Farfalla dorata pixel
 * 7x5 px
 */
export const BUTTERFLY: PixelFrame = spriteFromRows(
  [
    'oAo.oAo',
    'AAAoAAA',
    'oAAAAAo',
    '.oAAAo.',
    '..oAo..',
  ],
  LEGEND,
);

/**
 * 11. Foglia cadente dorata
 * 5x5 px
 */
export const FALLING_LEAF: PixelFrame = spriteFromRows(
  [
    '..A..',
    '.AAA.',
    'AAAAA',
    '.AAA.',
    '...R.',
  ],
  LEGEND,
);

/**
 * 12. Costellazione SIGMA (Σ) per il cielo notturno
 * 11x11 px
 */
export const CONSTELLATION_SIGMA: PixelFrame = spriteFromRows(
  [
    'B.B.B.B.B.B',
    '..B........',
    '...B.......',
    '....B......',
    '.....B.....',
    '....B......',
    '...B.......',
    '..B........',
    '.B.........',
    'B.B.B.B.B.B',
    '...........',
  ],
  LEGEND,
);

/**
 * Banco di prova per verificare gli sprite a occhio nel browser vero.
 */

import { PALETTE } from '../../styles/palette';
import { PixelSprite } from './PixelCanvas';
import {
  TREE_GIANT_OAK,
  TREE_TALL_PINE,
  TREE_ROUND,
  TREE_SMALL,
  BUSH,
  CLOUD_LARGE,
  CLOUD,
  FLOWER,
  PIXEL_STAR_BIG,
  PIXEL_STAR_SMALL,
  WOOD_SIGNPOST,
} from './tiles';
import {
  ISLAND_FONDAMENTALI,
  ISLAND_PROSPETTI,
  ISLAND_VALUTAZIONI,
  ISLAND_CREDITO,
  PLANET_DEALROOM,
  SELECTION_CURSOR,
  CROWN_GOLD,
  CLOUD_CUSHION,
} from './islands';
import { NODE_LOCKED, NODE_UNLOCKED, NODE_COMPLETE, NODE_BOSS, COTTAGE } from './nodes';
import {
  WOOD_CORNER_TL,
  TREASURE_CHEST,
  SPREADSHEET_OWL,
  EXCEL_MONOLITH,
  AIRSHIP_ZEPPELIN,
  SPACE_PROBE,
  HOT_AIR_BALLOON,
  CAMPFIRE_LANTERN,
  FOREST_MUSHROOMS,
  BUTTERFLY,
} from './decorations';

export function SpriteDebug() {
  return (
    <div
      style={{
        background: PALETTE.notte,
        minHeight: '100vh',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 30,
        overflowY: 'auto',
      }}
    >
      <h1 style={{ color: PALETTE.ambra, fontFamily: 'var(--font-titolo)', fontSize: 14, margin: 0 }}>
        GALLERIA SPRITE DEAL DESK (PALETTE SPEC §8)
      </h1>

      <div>
        <h2 style={{ color: PALETTE.ghiaccio, fontFamily: 'var(--font-titolo)', fontSize: 11 }}>
          1. ISOLE FLUTTUANTI &amp; BOSS PLANET (×4)
        </h2>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={ISLAND_FONDAMENTALI} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>FONDAMENTALI</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={ISLAND_PROSPETTI} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>3 PROSPETTI</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={ISLAND_VALUTAZIONI} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>VALUTAZIONI</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={ISLAND_CREDITO} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>CREDITO &amp; LBO</p>
          </div>
          <div style={{ background: PALETTE.inchiostro, padding: 10, border: `2px solid ${PALETTE.prugna}` }}>
            <PixelSprite frame={PLANET_DEALROOM} scale={4} />
            <p style={{ color: PALETTE.ambra, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>BOSS PLANET</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={SELECTION_CURSOR} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>CURSOR</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={CROWN_GOLD} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>CROWN</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={CLOUD_CUSHION} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>CLOUD BASE</p>
          </div>
        </div>
      </div>

      <div>
        <h2 style={{ color: PALETTE.ghiaccio, fontFamily: 'var(--font-titolo)', fontSize: 11 }}>
          2. VEGETAZIONE &amp; SCENARIO (×4)
        </h2>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={TREE_GIANT_OAK} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>GIANT OAK</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={TREE_TALL_PINE} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>TALL PINE</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={TREE_ROUND} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>TREE ROUND</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={TREE_SMALL} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>TREE SMALL</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={BUSH} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>BUSH</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={CLOUD_LARGE} scale={3} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>CLOUD LARGE</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={CLOUD} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>CLOUD</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={WOOD_SIGNPOST} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>SIGNPOST</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={FLOWER} scale={6} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>FLOWER</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={PIXEL_STAR_BIG} scale={6} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>STAR BIG</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={PIXEL_STAR_SMALL} scale={6} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>STAR SMALL</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={NODE_LOCKED} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>NODE LOCKED</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={NODE_UNLOCKED} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>NODE UNLOCKED</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={NODE_COMPLETE} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>NODE COMPLETE</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={NODE_BOSS} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>NODE BOSS</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={COTTAGE} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>COTTAGE</p>
          </div>
        </div>
      </div>

      <div>
        <h2 style={{ color: PALETTE.ghiaccio, fontFamily: 'var(--font-titolo)', fontSize: 11 }}>
          3. CORNICI 16-BIT &amp; EASTER EGGS (×4)
        </h2>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10 }}>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={TREASURE_CHEST} scale={4} />
            <p style={{ color: PALETTE.ambra, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>TREASURE CHEST ($)</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={SPREADSHEET_OWL} scale={4} />
            <p style={{ color: PALETTE.ambra, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>SPREADSHEET OWL</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={EXCEL_MONOLITH} scale={4} />
            <p style={{ color: PALETTE.ambra, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>RUNESTONE (=SUM)</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={AIRSHIP_ZEPPELIN} scale={4} />
            <p style={{ color: PALETTE.ambra, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>TRADING AIRSHIP</p>
          </div>
          <div style={{ background: PALETTE.inchiostro, padding: 10, border: `2px solid ${PALETTE.prugna}` }}>
            <PixelSprite frame={SPACE_PROBE} scale={4} />
            <p style={{ color: PALETTE.ghiaccio, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>SPACE PROBE</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={HOT_AIR_BALLOON} scale={4} />
            <p style={{ color: PALETTE.ambra, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>HOT AIR BALLOON</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={CAMPFIRE_LANTERN} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>LANTERN</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={FOREST_MUSHROOMS} scale={4} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>MUSHROOMS</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={BUTTERFLY} scale={6} />
            <p style={{ color: PALETTE.bianco, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>BUTTERFLY</p>
          </div>
          <div style={{ background: PALETTE.grafite, padding: 10, border: `2px solid ${PALETTE.inchiostro}` }}>
            <PixelSprite frame={WOOD_CORNER_TL} scale={4} />
            <p style={{ color: PALETTE.ambra, fontSize: 10, fontFamily: 'monospace', margin: '6px 0 0' }}>16-BIT CORNER TL</p>
          </div>
        </div>
      </div>
    </div>
  );
}

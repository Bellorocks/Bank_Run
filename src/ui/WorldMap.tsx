/**
 * Mappa del mondo — selezione modulo con vere Isole Fluttuanti nel cielo,
 * terreno sottostante visibile in lontananza e Boss Planet nello spazio cosmico.
 * Palette 16 colori fissa (spec §8), bande piatte e bordi duri.
 */

import { useEffect, useMemo, useState } from 'react';
import { getTemplate, isUnlocked, TEMPLATES } from '../content/registry';
import { SKILLS_BY_ID } from '../content/skills';
import type { LevelTemplate, ModuleId } from '../content/types';
import { isFreePlay, loadProgress, subscribeProgress, type ProgressSnapshot } from '../persistence/progress';
import { rankForXp } from '../persistence/progression';
import { PALETTE } from '../styles/palette';
import { PixelSprite } from './sprites/PixelCanvas';
import {
  WOOD_LOG_CORNER_TL,
  WOOD_LOG_CORNER_TR,
  WOOD_LOG_CORNER_BL,
  WOOD_LOG_CORNER_BR,
  MAP_PIN_BANNER,
  WOOD_CHAIN_HANGER,
  WOOD_IRON_CLAMP,
} from './sprites/decorations';
import {
  SELECTION_CURSOR,
} from './sprites/islands';

import { tr } from '../i18n/ui';
export interface WorldMapProps {
  readonly onSelectLevel: (templateId: string) => void;
  readonly onBackToTitle?: () => void;
}

interface IslandDef {
  readonly id: string;
  readonly name: string;
  readonly labelShort: string;
  readonly subtitle: string;
  readonly moduleIds: ModuleId[];
  readonly summary: string;
  readonly x: number;
  readonly y: number;
  readonly boss?: boolean;
}

const ISLANDS: IslandDef[] = [
  {
    id: 'isola-fondamentali',
    name: tr('WorldMap.1'),
    labelShort: tr('WorldMap.2'),
    subtitle: tr('WorldMap.3'),
    moduleIds: ['M0-A', 'M0-B', 'M0-C', 'M0-D', 'M0-E', 'M0-F'],
    summary:
      tr('WorldMap.4'),
    x: 52,
    y: 84, // Giù nel lago del continente
  },
  {
    id: 'isola-prospetti',
    name: tr('WorldMap.5'),
    labelShort: tr('WorldMap.6'),
    subtitle: tr('WorldMap.7'),
    moduleIds: ['M1', 'M2', 'M3'],
    summary:
      tr('WorldMap.8'),
    x: 14,
    y: 50, // Verso le colonne a sinistra
  },
  {
    id: 'isola-valutazioni',
    name: tr('WorldMap.9'),
    labelShort: tr('WorldMap.10'),
    subtitle: tr('WorldMap.11'),
    moduleIds: ['M4', 'M5', 'M6', 'M7'],
    summary:
      tr('WorldMap.12'),
    x: 46,
    y: 54, // Al centro prima delle scale
  },
  {
    id: 'isola-credito',
    name: tr('WorldMap.13'),
    labelShort: tr('WorldMap.14'),
    subtitle: tr('WorldMap.15'),
    moduleIds: ['M8', 'M9', 'M10', 'M11'],
    summary:
      tr('WorldMap.16'),
    x: 32,
    y: 22, // Nell'isola più alta col castello
  },
  {
    id: 'isola-finale',
    name: tr('WorldMap.17'),
    labelShort: tr('WorldMap.18'),
    subtitle: tr('WorldMap.19'),
    moduleIds: ['M12'],
    summary:
      tr('WorldMap.20'),
    x: 84,
    y: 20, // Nello squarcio cosmico
    boss: true,
  },
];

export function WorldMap({ onSelectLevel, onBackToTitle }: WorldMapProps) {
  const [selectedId, setSelectedId] = useState<string>(ISLANDS[0].id);
  const [selectedModule, setSelectedModule] = useState<ModuleId | null>(null);

  const [progress, setProgress] = useState<ProgressSnapshot | null>(null);
  const [freePlay] = useState(isFreePlay);

  useEffect(() => {
    let vivo = true;
    void loadProgress().then((p) => vivo && setProgress(p));
    const stop = subscribeProgress((p) => vivo && setProgress(p));
    return () => {
      vivo = false;
      stop();
    };
  }, []);

  const completed = useMemo(() => new Set(Object.keys(progress?.levels ?? {})), [progress]);
  const playable = (t: LevelTemplate) => freePlay || isUnlocked(t.id, completed);
  const xp = progress?.xp ?? 0;

  const island = ISLANDS.find((r) => r.id === selectedId) ?? ISLANDS[0];
  const islandTemplates = TEMPLATES.filter((t) => island.moduleIds.includes(t.module));
  const activeModule = selectedModule ?? island.moduleIds[0];
  const moduleTemplates = islandTemplates.filter((t) => t.module === activeModule);

  return (
    <div style={pageStyle}>
      {/* Intestazione in stile legno con staffe */}
      <header style={headerStyle}>
        <div style={badgeStyle}>DD</div>
        <span style={{ fontFamily: 'var(--font-titolo)', fontSize: 19, color: PALETTE.ambra, textShadow: `2px 2px 0 ${PALETTE.prugna}` }}>
          {tr('WorldMap.21')}
        </span>
        <span style={{ flex: 1 }} />
        <span style={headerChipStyle(PALETTE.ambra)} title={tr('WorldMap.22')}>
          {rankForXp(xp).toUpperCase()} · {xp} XP
        </span>
        <span style={headerChipStyle(PALETTE.lime)}>
          ✓ {completed.size}/{TEMPLATES.length}{' '}{tr('WorldMap.23')}{freePlay ? tr('WorldMap.24') : ''}
        </span>
        {onBackToTitle && (
          <button type="button" onClick={onBackToTitle} style={woodHeaderButtonStyle}>
            {tr('WorldMap.25')}
          </button>
        )}
      </header>

      <div style={bodyStyle}>
        {/* Riquadro della Mappa Aerea con Isole nel Paesaggio */}
        <div style={mapFrameStyle}>
          {/* Sfondo Pixel Art HD Pulito (senza scritte) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/art/map_bg.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              imageRendering: 'pixelated',
              zIndex: 0,
            }}
          />

          {/* Angolari decorativi 16-bit a tronco di legno intagliato */}
          <div style={{ position: 'absolute', top: -10, left: -10, zIndex: 30, pointerEvents: 'none' }}>
            <PixelSprite frame={WOOD_LOG_CORNER_TL} scale={1.8} />
          </div>
          <div style={{ position: 'absolute', top: -10, right: -10, zIndex: 30, pointerEvents: 'none' }}>
            <PixelSprite frame={WOOD_LOG_CORNER_TR} scale={1.8} />
          </div>
          <div style={{ position: 'absolute', bottom: -10, left: -10, zIndex: 30, pointerEvents: 'none' }}>
            <PixelSprite frame={WOOD_LOG_CORNER_BL} scale={1.8} />
          </div>
          <div style={{ position: 'absolute', bottom: -10, right: -10, zIndex: 30, pointerEvents: 'none' }}>
            <PixelSprite frame={WOOD_LOG_CORNER_BR} scale={1.8} />
          </div>

          {/* Linee di rotta / sentieri pixel a quadratini dorati */}
          {pathDots(ISLANDS).map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: 6,
                height: 6,
                background: PALETTE.ambra,
                border: `1px solid ${PALETTE.inchiostro}`,
                transform: 'translate(-50%, -50%)',
                zIndex: 4,
              }}
            />
          ))}

          {/* Segnaposto e Cartelli in Legno sulle posizioni geografiche reali */}
          {ISLANDS.map((r) => {
            const isSelected = r.id === island.id;
            const islandList = TEMPLATES.filter((t) => r.moduleIds.includes(t.module));
            const count = islandList.length;
            const done = islandList.filter((t) => completed.has(t.id)).length;
            return (
              <div
                key={r.id}
                style={{
                  position: 'absolute',
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isSelected ? 15 : 6,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {/* Cursore animato sopra il punto attivo */}
                {isSelected && (
                  <div style={{ marginBottom: -6, zIndex: 16 }}>
                    <PixelSprite frame={SELECTION_CURSOR} scale={2.4} />
                  </div>
                )}

                {/* Palo con bandiera di checkpoint */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(r.id);
                    setSelectedModule(r.moduleIds[0]);
                  }}
                  title={tr('WorldMap.26', { p0: r.name, done, count })}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1.0)',
                    transition: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <PixelSprite frame={MAP_PIN_BANNER} scale={1.8} />

                  {/* Cartello in legno intagliato sotto la bandiera */}
                  <div style={woodenSignTagStyle(isSelected, r.boss)}>
                    {r.labelShort} ({done}/{count})
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Pannello Dettaglio Isola e Livelli — Stile Cartelli in Legno Appesi */}
        <div style={panelOuterStyle}>
          {/* Angolari decorativi 16-bit a tronco per il pannello */}
          <div style={{ position: 'absolute', top: -10, left: -10, zIndex: 30, pointerEvents: 'none' }}>
            <PixelSprite frame={WOOD_LOG_CORNER_TL} scale={1.6} />
          </div>
          <div style={{ position: 'absolute', top: -10, right: -10, zIndex: 30, pointerEvents: 'none' }}>
            <PixelSprite frame={WOOD_LOG_CORNER_TR} scale={1.6} />
          </div>
          <div style={{ position: 'absolute', bottom: -10, left: -10, zIndex: 30, pointerEvents: 'none' }}>
            <PixelSprite frame={WOOD_LOG_CORNER_BL} scale={1.6} />
          </div>
          <div style={{ position: 'absolute', bottom: -10, right: -10, zIndex: 30, pointerEvents: 'none' }}>
            <PixelSprite frame={WOOD_LOG_CORNER_BR} scale={1.6} />
          </div>

          {/* Intestazione cartello appeso con catene */}
          <div style={hangingSignHeaderStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginBottom: -4 }}>
              <PixelSprite frame={WOOD_CHAIN_HANGER} scale={1.4} />
              <PixelSprite frame={WOOD_CHAIN_HANGER} scale={1.4} />
            </div>
            <div style={hangingSignBoardStyle}>
              <h2 style={panelTitleStyle}>{island.name}</h2>
              <p style={panelSubtitleStyle}>{island.subtitle}</p>
            </div>
          </div>

          <p style={panelSummaryStyle}>{island.summary}</p>

          {/* Selezione modulo dell'isola: Cartelli in legno concatenati */}
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-titolo)', fontSize: 14, color: PALETTE.ardesia }}>
              {tr('WorldMap.27')}
            </span>
          </div>

          <div style={moduleTabsStyle}>
            {island.moduleIds.map((mId) => {
              const isCurrent = mId === activeModule;
              const modList = islandTemplates.filter((t) => t.module === mId);
              const count = modList.length;
              const done = modList.filter((t) => completed.has(t.id)).length;
              return (
                <button
                  key={mId}
                  type="button"
                  onClick={() => setSelectedModule(mId)}
                  style={moduleWoodenPlankStyle(isCurrent)}
                >
                  <PixelSprite frame={WOOD_IRON_CLAMP} scale={1.0} />
                  <span>
                    {mId} ({done}/{count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Elenco dei livelli: Cartelli in legno intagliati ad asse singola/doppia */}
          <div style={levelListStyle}>
            {moduleTemplates.map((t, idx) => {
              const record = progress?.levels[t.id];
              const aperto = playable(t);
              const mancanti = t.prerequisites.filter((p) => !completed.has(p));
              return (
                <div key={t.id} style={{ ...levelPlankCardStyle, opacity: aperto ? 1 : 0.6 }}>
                  <span style={levelIndexSignStyle(record !== undefined)}>{record ? '✓' : idx + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={levelTitleStyle} title={t.title}>
                      {t.title}
                    </div>
                    <div style={levelMetaStyle}>
                      {tr('WorldMap.28')}{' '}{t.rank} · ~{Math.round(t.estimatedSeconds / 60)}{' '}{tr('WorldMap.29')}
                      {record
                        ? tr('WorldMap.30', { p0: record.bestXp, p1: record.bestTimeMs != null ? ` in ${formatTime(record.bestTimeMs)}` : '' })
                        : ` · ${t.skills.slice(0, 2).map((k) => SKILLS_BY_ID.get(k)?.label ?? k).join(', ')}`}
                    </div>
                    {!aperto && (
                      <div style={levelLockStyle}>
                        {tr('WorldMap.31')}{' '}{mancanti.map((p) => getTemplate(p)?.title ?? p).join(' · ')}
                      </div>
                    )}
                  </div>
                  {aperto ? (
                    <button type="button" onClick={() => onSelectLevel(t.id)} style={playWoodArrowButtonStyle}>
                      {record ? tr('WorldMap.32') : tr('WorldMap.33')}
                    </button>
                  ) : (
                    <span style={lockedBadgeStyle} title={tr('WorldMap.34')}>
                      {tr('WorldMap.35')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const sec = Math.round(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function headerChipStyle(color: string): React.CSSProperties {
  return {
    fontFamily: 'var(--font-titolo)',
    fontSize: 15,
    color,
    background: PALETTE.inchiostro,
    padding: '4px 10px',
    border: `1px solid ${PALETTE.ardesia}`,
  };
}

/** Punti del sentiero come quadratini pixel pieni */
function pathDots(islands: readonly IslandDef[]): { x: number; y: number }[] {
  const dots: { x: number; y: number }[] = [];
  const spacing = 3.6;
  for (let i = 0; i < islands.length - 1; i++) {
    const a = islands[i];
    const b = islands[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.round(dist / spacing));
    for (let s = 1; s < steps; s++) {
      dots.push({ x: a.x + (dx * s) / steps, y: a.y + (dy * s) / steps });
    }
  }
  return dots;
}

/** Cartello in legno intagliato per i punti sulla mappa (stile reference) */
function woodenSignTagStyle(isSelected: boolean, isBoss?: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-titolo)',
    fontSize: 14,
    color: isSelected ? PALETTE.inchiostro : PALETTE.bianco,
    background: isSelected
      ? PALETTE.ambra
      : isBoss
      ? PALETTE.rubino
      : PALETTE.corallo,
    border: `3px solid ${PALETTE.inchiostro}`,
    borderTop: `3px solid ${isSelected ? PALETTE.bianco : PALETTE.ambra}`,
    borderBottom: `3px solid ${isSelected ? PALETTE.corallo : PALETTE.rubino}`,
    boxShadow: `3px 3px 0 ${PALETTE.inchiostro}`,
    padding: '4px 8px',
    marginTop: 2,
    whiteSpace: 'nowrap',
  };
}

/** Pulsanti dei moduli a tavolette di legno con morsetto in ferro */
function moduleWoodenPlankStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-titolo)',
    fontSize: 14,
    color: active ? PALETTE.inchiostro : PALETTE.bianco,
    background: active ? PALETTE.ambra : PALETTE.corallo,
    border: `2px solid ${PALETTE.inchiostro}`,
    borderTop: `2px solid ${active ? PALETTE.bianco : PALETTE.ambra}`,
    borderBottom: `2px solid ${active ? PALETTE.corallo : PALETTE.rubino}`,
    boxShadow: `3px 3px 0 ${PALETTE.inchiostro}`,
    padding: '6px 10px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

const pageStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: PALETTE.inchiostro,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 16px',
  background: PALETTE.grafite,
  borderBottom: `4px solid ${PALETTE.inchiostro}`,
  outline: `2px solid ${PALETTE.corallo}`,
  boxShadow: `0 3px 0 ${PALETTE.inchiostro}`,
  zIndex: 20,
};

const badgeStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-titolo)',
  fontSize: 17,
  color: PALETTE.inchiostro,
  background: PALETTE.ambra,
  border: `2px solid ${PALETTE.inchiostro}`,
  borderTop: `2px solid ${PALETTE.bianco}`,
  borderBottom: `2px solid ${PALETTE.corallo}`,
};

const woodHeaderButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 15,
  color: PALETTE.bianco,
  background: PALETTE.corallo,
  border: `2px solid ${PALETTE.inchiostro}`,
  borderTop: `2px solid ${PALETTE.ambra}`,
  borderBottom: `2px solid ${PALETTE.rubino}`,
  padding: '6px 14px',
  cursor: 'pointer',
  boxShadow: `2px 2px 0 ${PALETTE.inchiostro}`,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  gap: 14,
  minHeight: 0,
  padding: 14,
};

const mapFrameStyle: React.CSSProperties = {
  position: 'relative',
  flex: '1 1 54%',
  border: `4px solid ${PALETTE.inchiostro}`,
  outline: `3px solid ${PALETTE.corallo}`,
  boxShadow: `6px 6px 0 ${PALETTE.inchiostro}`,
  overflow: 'hidden',
};

const panelOuterStyle: React.CSSProperties = {
  position: 'relative',
  flex: '1 1 46%',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  background: PALETTE.bianco,
  border: `4px solid ${PALETTE.inchiostro}`,
  outline: `3px solid ${PALETTE.corallo}`,
  boxShadow: `6px 6px 0 ${PALETTE.inchiostro}`,
  padding: 16,
  overflowY: 'auto',
};

const hangingSignHeaderStyle: React.CSSProperties = {
  marginBottom: 10,
};

const hangingSignBoardStyle: React.CSSProperties = {
  background: PALETTE.corallo,
  border: `3px solid ${PALETTE.inchiostro}`,
  borderTop: `3px solid ${PALETTE.ambra}`,
  borderBottom: `3px solid ${PALETTE.rubino}`,
  boxShadow: `4px 4px 0 ${PALETTE.inchiostro}`,
  padding: '12px 14px',
};

const panelTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 19,
  color: PALETTE.bianco,
  margin: 0,
  letterSpacing: '0.04em',
  textShadow: `2px 2px 0 ${PALETTE.inchiostro}`,
};

const panelSubtitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-testo)',
  fontSize: 17,
  color: PALETTE.ambra,
  margin: '4px 0 0',
};

const panelSummaryStyle: React.CSSProperties = {
  fontFamily: 'var(--font-testo)',
  fontSize: 16,
  color: PALETTE.inchiostro,
  lineHeight: 1.4,
  margin: '0 0 10px',
  background: PALETTE.nebbia + '33',
  padding: '10px 12px',
  border: `2px solid ${PALETTE.ardesia}`,
};

const moduleTabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  marginBottom: 12,
};

const levelListStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

/** Cartello in legno ad asse per ciascun livello */
const levelPlankCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  background: PALETTE.bianco,
  border: `3px solid ${PALETTE.inchiostro}`,
  borderTop: `3px solid ${PALETTE.ambra}`,
  borderBottom: `3px solid ${PALETTE.corallo}`,
  boxShadow: `3px 3px 0 ${PALETTE.ardesia}`,
};

function levelIndexSignStyle(done: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-titolo)',
    fontSize: 15,
    color: done ? PALETTE.bianco : PALETTE.inchiostro,
    background: done ? PALETTE.smeraldo : PALETTE.ambra,
    border: `2px solid ${PALETTE.inchiostro}`,
    width: 26,
    height: 26,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}

const levelLockStyle: React.CSSProperties = {
  fontFamily: 'var(--font-testo)',
  fontSize: 13,
  color: PALETTE.rubino,
  marginTop: 2,
};

const lockedBadgeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 13,
  color: PALETTE.ardesia,
  border: `2px dashed ${PALETTE.ardesia}`,
  padding: '5px 8px',
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

const levelTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 15,
  color: PALETTE.grafite,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const levelMetaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-testo)',
  fontSize: 14,
  color: PALETTE.ardesia,
  marginTop: 2,
};

const playWoodArrowButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 14,
  color: PALETTE.bianco,
  background: PALETTE.smeraldo,
  border: `2px solid ${PALETTE.inchiostro}`,
  borderTop: `2px solid ${PALETTE.lime}`,
  borderBottom: `2px solid ${PALETTE.petrolio}`,
  boxShadow: `2px 2px 0 ${PALETTE.inchiostro}`,
  padding: '6px 10px',
  cursor: 'pointer',
  flexShrink: 0,
};



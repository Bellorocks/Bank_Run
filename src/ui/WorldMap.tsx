/**
 * Mappa del mondo: le isole fluttuanti a sinistra, viste di notte, con un faro
 * per isola; a destra il pannello dell'isola scelta con moduli e livelli.
 */

import { useEffect, useMemo, useState } from 'react';
import { getTemplate, isUnlocked, TEMPLATES } from '../content/registry';
import { SKILLS_BY_ID } from '../content/skills';
import type { LevelTemplate, ModuleId } from '../content/types';
import { isFreePlay, loadProgress, subscribeProgress, type ProgressSnapshot } from '../persistence/progress';
import { rankForXp } from '../persistence/progression';
import { T } from '../styles/palette';
import { Scena, type TemaIsola } from './Scena';
import { Badge } from './primitives';

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
  /** Cosa c'e' sopra l'isola disegnata dalla scena. */
  readonly tema: TemaIsola;
  /** Larghezza dell'isola, in percentuale della mappa. */
  readonly larga?: number;
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
    x: 20,
    y: 70,
    tema: 'prato',
  },
  {
    id: 'isola-prospetti',
    name: tr('WorldMap.5'),
    labelShort: tr('WorldMap.6'),
    subtitle: tr('WorldMap.7'),
    moduleIds: ['M1', 'M2', 'M3'],
    summary:
      tr('WorldMap.8'),
    x: 41,
    y: 43,
    tema: 'colonne',
  },
  {
    id: 'isola-valutazioni',
    name: tr('WorldMap.9'),
    labelShort: tr('WorldMap.10'),
    subtitle: tr('WorldMap.11'),
    moduleIds: ['M4', 'M5', 'M6', 'M7'],
    summary:
      tr('WorldMap.12'),
    x: 66,
    y: 72,
    tema: 'autunno',
  },
  {
    id: 'isola-credito',
    name: tr('WorldMap.13'),
    labelShort: tr('WorldMap.14'),
    subtitle: tr('WorldMap.15'),
    moduleIds: ['M8', 'M9', 'M10', 'M11'],
    summary:
      tr('WorldMap.16'),
    x: 70,
    y: 40,
    tema: 'castello',
  },
  {
    id: 'isola-finale',
    name: tr('WorldMap.17'),
    labelShort: tr('WorldMap.18'),
    subtitle: tr('WorldMap.19'),
    moduleIds: ['M12'],
    summary:
      tr('WorldMap.20'),
    x: 89,
    y: 17,
    tema: 'tempesta',
    larga: 20,
    boss: true,
  },
];

/** Le isole come le vuole la scena: fuori dal componente, cosi' non si ridisegna a ogni render. */
const SCENA_ISOLE = ISLANDS.map((r) => ({ x: r.x, y: r.y, tema: r.tema, larga: r.larga }));

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

  const islandIndex = ISLANDS.indexOf(island);
  const islandDone = islandTemplates.filter((t) => completed.has(t.id)).length;
  // Il prossimo livello da giocare nel modulo: e' l'unico con il pulsante rosa.
  const prossimo = moduleTemplates.find((t) => !completed.has(t.id) && playable(t))?.id;

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <span className="br-logo" style={{ fontSize: 30, animation: 'none' }}>
          {tr('App.1')}
        </span>
        <span className="br-label" style={{ marginLeft: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tr('WorldMap.21')}
        </span>
        <span style={{ flex: 1 }} />
        <Badge colore={T.oro} title={tr('WorldMap.22')}>
          {rankForXp(xp)} · {xp} XP
        </Badge>
        <Badge colore={T.menta}>
          ✓ {completed.size}/{TEMPLATES.length} {tr('WorldMap.23')}
          {freePlay ? tr('WorldMap.24') : ''}
        </Badge>
        {onBackToTitle && (
          <button type="button" onClick={onBackToTitle} className="br-btn br-btn--piccolo">
            {tr('WorldMap.25')}
          </button>
        )}
      </header>

      <div className="br-entra" style={bodyStyle}>
        <div style={mapFrameStyle}>
          <Scena tipo="isole" isole={SCENA_ISOLE} />

          {pathDots(ISLANDS).map((p, i) => (
            <div key={i} style={{ ...dotStyle, left: `${p.x}%`, top: `${p.y}%` }} />
          ))}

          {ISLANDS.map((r) => {
            const isSelected = r.id === island.id;
            const islandList = TEMPLATES.filter((t) => r.moduleIds.includes(t.module));
            const count = islandList.length;
            const done = islandList.filter((t) => completed.has(t.id)).length;
            const colore = r.boss ? T.corallo : done === count && count > 0 ? T.menta : T.accento;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedId(r.id);
                  setSelectedModule(r.moduleIds[0]);
                }}
                title={tr('WorldMap.26', { p0: r.name, done, count })}
                style={{
                  ...pinStyle,
                  ...pinLato(r.x),
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  zIndex: isSelected ? 15 : 6,
                  ['--faro' as string]: colore,
                }}
              >
                <span className={isSelected ? 'br-faro is-scelto' : 'br-faro'} />
                <span style={tagStyle(isSelected, colore)}>
                  <span>{r.labelShort}</span>
                  <span style={{ opacity: 0.75 }}>
                    {done}/{count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="br-pannello" style={panelStyle}>
          <div style={panelTopStyle}>
            <div className="br-label" style={{ color: island.boss ? T.corallo : T.accento }}>
              {String(islandIndex + 1).padStart(2, '0')} / {String(ISLANDS.length).padStart(2, '0')}
            </div>
            <h2 style={panelTitleStyle}>{island.name}</h2>
            <p style={panelSubtitleStyle}>{island.subtitle}</p>
            <p style={panelSummaryStyle}>{island.summary}</p>

            <div style={barraStyle} role="progressbar" aria-valuemin={0} aria-valuemax={islandTemplates.length} aria-valuenow={islandDone}>
              <div
                style={{
                  width: `${islandTemplates.length > 0 ? (islandDone / islandTemplates.length) * 100 : 0}%`,
                  height: '100%',
                  background: T.menta,
                  boxShadow: `0 0 8px ${T.menta}`,
                }}
              />
            </div>
          </div>

          <div style={moduleBarStyle}>
            <span className="br-label" style={{ width: '100%' }}>
              {tr('WorldMap.27')}
            </span>
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
                  className={isCurrent ? 'br-linguetta is-scelta' : 'br-linguetta'}
                >
                  {mId}{' '}
                  <span style={{ opacity: 0.7 }}>
                    {done}/{count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={levelListStyle}>
            {moduleTemplates.map((t, idx) => {
              const record = progress?.levels[t.id];
              const aperto = playable(t);
              const mancanti = t.prerequisites.filter((p) => !completed.has(p));
              return (
                <div
                  key={t.id}
                  className={aperto ? 'br-riga br-riga--viva' : 'br-riga'}
                  style={{ ...levelRowStyle, opacity: aperto ? 1 : 0.55 }}
                >
                  <span style={levelIndexStyle(record !== undefined, t.id === prossimo)}>
                    {record ? '✓' : String(idx + 1).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={levelTitleStyle} title={t.title}>
                      {t.title}
                    </div>
                    <div style={levelMetaStyle}>
                      {tr('WorldMap.28')} {t.rank} · ~{Math.round(t.estimatedSeconds / 60)} {tr('WorldMap.29')}
                      {record
                        ? tr('WorldMap.30', { p0: record.bestXp, p1: record.bestTimeMs != null ? ` in ${formatTime(record.bestTimeMs)}` : '' })
                        : ` · ${t.skills.slice(0, 2).map((k) => SKILLS_BY_ID.get(k)?.label ?? k).join(', ')}`}
                    </div>
                    {!aperto && (
                      <div style={levelLockStyle}>
                        {tr('WorldMap.31')} {mancanti.map((p) => getTemplate(p)?.title ?? p).join(' · ')}
                      </div>
                    )}
                  </div>
                  {aperto ? (
                    <button
                      type="button"
                      onClick={() => onSelectLevel(t.id)}
                      className={t.id === prossimo ? 'br-btn br-btn--primario br-btn--piccolo' : 'br-btn br-btn--piccolo'}
                      style={{ flexShrink: 0 }}
                    >
                      {record ? tr('WorldMap.32') : tr('WorldMap.33')}
                    </button>
                  ) : (
                    <span style={lockedStyle} title={tr('WorldMap.34')}>
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

/** Punti della rotta fra un'isola e la successiva. */
function pathDots(islands: readonly IslandDef[]): { x: number; y: number }[] {
  const dots: { x: number; y: number }[] = [];
  const spacing = 3.2;
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

/**
 * Vicino ai bordi della mappa l'etichetta si allinea al faro invece di
 * centrarsi sotto: altrimenti finirebbe tagliata dalla cornice.
 */
function pinLato(x: number): React.CSSProperties {
  if (x < 25) return { alignItems: 'flex-start', transform: 'translate(-9px, -9px)' };
  if (x > 75) return { alignItems: 'flex-end', transform: 'translate(calc(-100% + 9px), -9px)' };
  return {};
}

function tagStyle(isSelected: boolean, colore: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    gap: 8,
    marginTop: 12,
    padding: '5px 9px',
    fontFamily: 'var(--font-titolo)',
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    color: isSelected ? T.abisso : T.testo,
    background: isSelected ? colore : T.fondo,
    border: `2px solid ${colore}`,
    boxShadow: `0 3px 0 ${T.abisso}`,
  };
}

const pageStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: T.abisso,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 16px',
  minHeight: 52,
  background: T.fondo,
  borderBottom: `2px solid ${T.linea}`,
  zIndex: 20,
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
  minWidth: 0,
  border: `2px solid ${T.linea}`,
  boxShadow: `0 0 0 2px ${T.abisso}`,
  overflow: 'hidden',
  background: '#41a6f6',
};

const dotStyle: React.CSSProperties = {
  position: 'absolute',
  width: 5,
  height: 5,
  background: T.testo,
  boxShadow: `0 0 0 2px ${T.fondo}`,
  transform: 'translate(-50%, -50%)',
  zIndex: 4,
};

const pinStyle: React.CSSProperties = {
  position: 'absolute',
  transform: 'translate(-50%, -9px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: 0,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
};

const panelStyle: React.CSSProperties = {
  flex: '1 1 46%',
  minWidth: 0,
  overflowY: 'auto',
};

const panelTopStyle: React.CSSProperties = {
  padding: '16px 18px 14px',
  borderBottom: `2px solid ${T.linea}`,
  background: `linear-gradient(180deg, ${T.rialzo}, ${T.pannello})`,
  flex: '0 0 auto',
};

const panelTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-logo)',
  fontSize: 44,
  lineHeight: 0.95,
  letterSpacing: '0.03em',
  textTransform: 'none',
  color: T.testo,
  margin: '6px 0 0',
};

const panelSubtitleStyle: React.CSSProperties = {
  fontSize: 16,
  color: T.accento,
  margin: '6px 0 0',
};

const panelSummaryStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.4,
  color: T.tenue,
  margin: '8px 0 12px',
};

const barraStyle: React.CSSProperties = {
  height: 8,
  padding: 1,
  background: T.abisso,
  border: `2px solid ${T.linea}`,
  boxSizing: 'content-box',
};

const moduleBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  padding: '12px 18px 15px',
  borderBottom: `2px solid ${T.linea}`,
  flex: '0 0 auto',
};

const levelListStyle: React.CSSProperties = {
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '14px 18px 18px',
};

const levelRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '9px 12px',
};

function levelIndexStyle(done: boolean, prossimo: boolean): React.CSSProperties {
  const colore = done ? T.menta : prossimo ? T.accento : T.spento;
  return {
    fontFamily: 'var(--font-titolo)',
    fontSize: 12,
    color: done ? T.abisso : colore,
    background: done ? T.menta : 'transparent',
    border: `2px solid ${colore}`,
    width: 30,
    height: 30,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}

const levelTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-logo)',
  fontSize: 21,
  lineHeight: 1.1,
  letterSpacing: '0.03em',
  color: T.testo,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const levelMetaStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.3,
  color: T.tenue,
  marginTop: 1,
};

const levelLockStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.3,
  color: T.oro,
  marginTop: 2,
};

const lockedStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 12,
  letterSpacing: '0.06em',
  color: T.spento,
  border: `2px dashed ${T.linea}`,
  padding: '5px 8px',
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

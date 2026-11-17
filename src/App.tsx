/**
 * Shell dell'applicazione BANK RUN.
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { track } from './analytics/analytics';
import { ConsentBanner } from './ui/ConsentBanner';
import { TouchNotice } from './ui/TouchNotice';
import { WorldMap } from './ui/WorldMap';
import { TitleScreen } from './ui/TitleScreen';
import { T } from './styles/palette';
import { SpriteDebug } from './ui/sprites/SpriteDebug';

import { tr } from './i18n/ui';
// Il livello porta con se' il motore di calcolo (HyperFormula), il pezzo piu'
// pesante del bundle: si scarica quando si entra nel primo livello, non prima.
const PlayScreen = lazy(() => import('./game/PlayScreen').then((m) => ({ default: m.PlayScreen })));

type ScreenMode = 'title' | 'map';

interface Scelta {
  readonly id: string;
  readonly seed: number;
  readonly run: number;
}

function screenDaUrl(): ScreenMode {
  if (typeof window === 'undefined') return 'title';
  const q = new URLSearchParams(window.location.search);
  if (q.get('screen') === 'map') return 'map';
  return 'title';
}

function sceltaDaUrl(): Scelta | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const id = q.get('level');
  if (!id) return null;
  const seed = Number(q.get('seed') ?? '1');
  return { id, seed: Number.isFinite(seed) ? seed : 1, run: 0 };
}

function nuovoSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

export default function App() {
  const [screen, setScreen] = useState<ScreenMode>(screenDaUrl);
  const [scelta, setScelta] = useState<Scelta | null>(sceltaDaUrl);
  const schermata = scelta ? 'level' : screen;
  useEffect(() => {
    track('screen_view', { screen: schermata });
  }, [schermata]);

  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('spritedebug')) {
    return <SpriteDebug />;
  }

  if (scelta) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.abisso }}>
        <div style={barraStyle}>
          <span className="br-logo" style={{ fontSize: 26, animation: 'none' }}>
            {tr('App.1')}
          </span>
          <span className="br-label" style={{ color: T.spento, fontFamily: 'var(--font-griglia)', letterSpacing: '0.04em' }}>
            {scelta.id} · #{scelta.seed}
          </span>

          <span style={{ flex: 1 }} />

          <button type="button" onClick={() => setScelta(null)} className="br-btn br-btn--piccolo">
            {tr('App.2')}
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <Suspense fallback={<div style={caricamentoStyle}>{tr('App.3')}</div>}>
          <PlayScreen
            key={`${scelta.id}:${scelta.seed}:${scelta.run}`}
            templateId={scelta.id}
            seed={scelta.seed}
            onRiprovaStessoSeed={() => setScelta({ ...scelta, run: scelta.run + 1 })}
            onNuovoSeed={() => setScelta({ id: scelta.id, seed: nuovoSeed(), run: 0 })}
            onEsci={() => setScelta(null)}
          />
          </Suspense>
        </div>
      </div>
    );
  }

  if (screen === 'title') {
    return (
      <>
        <TitleScreen onStartGame={() => setScreen('map')} />
        <TouchNotice />
        <ConsentBanner />
      </>
    );
  }

  return (
    <>
      <WorldMap
        onSelectLevel={(templateId) => setScelta({ id: templateId, seed: nuovoSeed(), run: 0 })}
        onBackToTitle={() => setScreen('title')}
      />
      <ConsentBanner />
    </>
  );
}

const barraStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '6px 14px',
  minHeight: 44,
  background: T.fondo,
  borderBottom: `2px solid ${T.linea}`,
  zIndex: 20,
};

const caricamentoStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-titolo)',
  fontSize: 13,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: T.accento,
  background: T.abisso,
};

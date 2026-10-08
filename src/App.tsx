/**
 * Shell dell'applicazione DEAL DESK.
 */

import { useState } from 'react';
import { PlayScreen } from './game/PlayScreen';
import { WorldMap } from './ui/WorldMap';
import { TitleScreen } from './ui/TitleScreen';
import { PALETTE } from './styles/palette';
import { SpriteDebug } from './ui/sprites/SpriteDebug';

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

  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('spritedebug')) {
    return <SpriteDebug />;
  }

  if (scelta) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: PALETTE.bianco }}>
        <div style={barraStyle}>
          <span className="dd-titolo" style={{ fontSize: 19, color: PALETTE.bianco, textShadow: `2px 2px 0 ${PALETTE.inchiostro}` }}>
            DEAL DESK
          </span>

          <span style={{ flex: 1 }} />

          <button
            type="button"
            onClick={() => setScelta(null)}
            style={{
              fontFamily: 'var(--font-titolo)',
              fontSize: 15,
              color: PALETTE.bianco,
              background: PALETTE.inchiostro,
              border: `2px solid ${PALETTE.ardesia}`,
              padding: '6px 14px',
              cursor: 'pointer',
              boxShadow: `2px 2px 0 ${PALETTE.rubino}`,
            }}
          >
            ◀ TORNA ALLA MAPPA
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <PlayScreen
            key={`${scelta.id}:${scelta.seed}:${scelta.run}`}
            templateId={scelta.id}
            seed={scelta.seed}
            onRiprovaStessoSeed={() => setScelta({ ...scelta, run: scelta.run + 1 })}
            onNuovoSeed={() => setScelta({ id: scelta.id, seed: nuovoSeed(), run: 0 })}
            onEsci={() => setScelta(null)}
          />
        </div>
      </div>
    );
  }

  if (screen === 'title') {
    return <TitleScreen onStartGame={() => setScreen('map')} />;
  }

  return (
    <WorldMap
      onSelectLevel={(templateId) => setScelta({ id: templateId, seed: nuovoSeed(), run: 0 })}
      onBackToTitle={() => setScreen('title')}
    />
  );
}

const barraStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 14px',
  background: PALETTE.corallo,
  borderBottom: `3px solid ${PALETTE.inchiostro}`,
  borderTop: `2px solid ${PALETTE.ambra}`,
  boxShadow: `0 2px 0 ${PALETTE.rubino}`,
  zIndex: 20,
};

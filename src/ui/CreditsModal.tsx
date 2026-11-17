/**
 * Crediti: chi ha fatto il gioco, musica, font e librerie open source con la
 * loro licenza. Si naviga da tastiera come le altre finestre: il link al profilo
 * riceve il focus all'apertura (Invio lo apre), Tab passa al pulsante di chiusura,
 * Esc chiude.
 */

import { useEffect, useRef } from 'react';
import { track } from '../analytics/analytics';
import { tr } from '../i18n/ui';
import { T } from '../styles/palette';
import { Finestra } from './primitives';

export const LINKEDIN_URL = 'https://www.linkedin.com/in/lorenzobellorini1404';
export const SORGENTE_URL = 'https://github.com/Bellorocks/Bank_Run';

/** Libreria, uso nel gioco, licenza. I nomi propri non si traducono. */
const LIBRERIE: readonly (readonly [string, string, string])[] = [
  ['HyperFormula', 'Credits.usoCalcolo', 'GPL-3.0'],
  ['SheetJS (xlsx)', 'Credits.usoExcel', 'Apache-2.0'],
  ['React', 'Credits.usoInterfaccia', 'MIT'],
  ['TanStack Virtual', 'Credits.usoGriglia', 'MIT'],
];

export function CreditsModal({ onClose }: { readonly onClose: () => void }) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    linkRef.current?.focus();
  }, []);

  return (
    <Finestra
      titolo={tr('Credits.titolo')}
      onClose={onClose}
      larghezza={560}
      zIndex={110}
      chiudiLabel={tr('SkillGrimoireModal.12')}
      bodyStyle={{ fontSize: 16, lineHeight: 1.45, color: T.tenue }}
    >
      <div style={{ textAlign: 'center', margin: '4px 0 20px' }}>
        <div style={autoreStyle}>{tr('Credits.autore')}</div>
        <a
          ref={linkRef}
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('linkedin_click', { location: 'credits' })}
          className="br-btn br-btn--accento"
          style={{ marginTop: 14 }}
        >
          {tr('Credits.linkedin')} ↗
        </a>
      </div>

      <h3 className="br-label" style={sezione}>
        {tr('Credits.musica')}
      </h3>
      <p style={riga}>{tr('Credits.musicaTesto')}</p>

      <h3 className="br-label" style={sezione}>
        {tr('Credits.font')}
      </h3>
      <p style={riga}>Jersey 25, Silkscreen, DotGothic16, JetBrains Mono, Tiny5 — SIL Open Font License 1.1</p>

      <h3 className="br-label" style={sezione}>
        {tr('Credits.librerie')}
      </h3>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {LIBRERIE.map(([nome, uso, licenza]) => (
          <li key={nome} style={riga}>
            <strong style={{ color: T.testo }}>{nome}</strong> — {tr(uso)} ({licenza})
          </li>
        ))}
      </ul>

      <h3 className="br-label" style={sezione}>
        {tr('Credits.codice')}
      </h3>
      <p style={riga}>
        {tr('Credits.codiceTesto')}{' '}
        <a href={SORGENTE_URL} target="_blank" rel="noopener noreferrer" onClick={() => track('source_click')}>
          github.com/Bellorocks/Bank_Run ↗
        </a>
      </p>
    </Finestra>
  );
}

const autoreStyle: React.CSSProperties = {
  fontFamily: 'var(--font-logo)',
  fontSize: 34,
  lineHeight: 1,
  letterSpacing: '0.04em',
  color: T.testo,
};

const sezione: React.CSSProperties = {
  margin: '16px 0 4px',
  color: T.corallo,
};

const riga: React.CSSProperties = { margin: '0 0 4px' };

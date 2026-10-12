/**
 * Crediti: chi ha fatto il gioco, musica, font e librerie open source con la
 * loro licenza. Si naviga da tastiera come le altre finestre: il link al profilo
 * riceve il focus all'apertura (Invio lo apre), Tab passa al pulsante di chiusura,
 * Esc chiude.
 */

import { useEffect, useRef } from 'react';
import { track } from '../analytics/analytics';
import { tr } from '../i18n/ui';
import { PALETTE } from '../styles/palette';

export const LINKEDIN_URL = 'https://www.linkedin.com/in/lorenzobellorini1404';

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
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div style={overlay} onClick={onClose}>
      <div role="dialog" aria-label={tr('Credits.titolo')} style={finestra} onClick={(e) => e.stopPropagation()}>
        <div style={testata}>
          <h2 style={titolo}>{tr('Credits.titolo')}</h2>
          <button type="button" onClick={onClose} style={chiudi} aria-label={tr('SkillGrimoireModal.12')}>
            ✕
          </button>
        </div>

        <div style={corpo}>
          <div style={{ textAlign: 'center', margin: '4px 0 18px' }}>
            <div style={{ fontFamily: 'var(--font-titolo)', fontSize: 22, color: PALETTE.inchiostro }}>{tr('Credits.autore')}</div>
            <a
              ref={linkRef}
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('linkedin_click', { location: 'credits' })}
              style={linkedin}
            >
              {tr('Credits.linkedin')} ↗
            </a>
          </div>

          <h3 style={sezione}>{tr('Credits.musica')}</h3>
          <p style={riga}>{tr('Credits.musicaTesto')}</p>

          <h3 style={sezione}>{tr('Credits.font')}</h3>
          <p style={riga}>DotGothic16, Jersey 25, JetBrains Mono, Tiny5 — SIL Open Font License 1.1</p>

          <h3 style={sezione}>{tr('Credits.librerie')}</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {LIBRERIE.map(([nome, uso, licenza]) => (
              <li key={nome} style={riga}>
                <strong>{nome}</strong> — {tr(uso)} ({licenza})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(26, 28, 44, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 110,
  padding: 16,
};

const finestra: React.CSSProperties = {
  width: 560,
  maxWidth: '100%',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  background: PALETTE.bianco,
  border: `4px solid ${PALETTE.inchiostro}`,
  outline: `3px solid ${PALETTE.corallo}`,
  boxShadow: `8px 8px 0 ${PALETTE.inchiostro}`,
};

const testata: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: PALETTE.grafite,
  borderBottom: `2px solid ${PALETTE.inchiostro}`,
  padding: '10px 14px',
};

const titolo: React.CSSProperties = {
  margin: 0,
  fontSize: 19,
  color: PALETTE.ambra,
  fontFamily: 'var(--font-titolo)',
  letterSpacing: '0.06em',
};

const chiudi: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 15,
  color: PALETTE.bianco,
  background: PALETTE.rubino,
  border: `2px solid ${PALETTE.inchiostro}`,
  padding: '4px 10px',
  cursor: 'pointer',
};

const corpo: React.CSSProperties = {
  overflowY: 'auto',
  padding: '16px 20px 20px',
  fontFamily: 'var(--font-testo)',
  fontSize: 14,
  lineHeight: 1.5,
  color: PALETTE.inchiostro,
};

const linkedin: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 10,
  padding: '6px 14px',
  fontFamily: 'var(--font-titolo)',
  fontSize: 15,
  color: PALETTE.bianco,
  background: PALETTE.petrolio,
  border: `2px solid ${PALETTE.inchiostro}`,
  boxShadow: `2px 2px 0 ${PALETTE.inchiostro}`,
  textDecoration: 'none',
};

const sezione: React.CSSProperties = {
  margin: '14px 0 4px',
  fontFamily: 'var(--font-titolo)',
  fontSize: 14,
  color: PALETTE.rubino,
  letterSpacing: '0.04em',
};

const riga: React.CSSProperties = { margin: '0 0 4px' };

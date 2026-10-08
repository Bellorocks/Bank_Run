/**
 * Informativa privacy (art. 13 GDPR), in italiano e in inglese.
 *
 * Titolare e contatto vengono dalla configurazione della build
 * (VITE_PRIVACY_OWNER, VITE_PRIVACY_CONTACT in .env.production): una sola
 * persona li compila, il testo resta nei file di lingua.
 */

import { useEffect } from 'react';
import { idAnonimoAttuale } from '../analytics/analytics';
import { tr } from '../i18n/ui';
import { PALETTE } from '../styles/palette';
import { MarkdownBlocks } from './Brief';

const TITOLARE = (import.meta.env.VITE_PRIVACY_OWNER as string | undefined) || '[titolare da completare]';
const CONTATTO = (import.meta.env.VITE_PRIVACY_CONTACT as string | undefined) || '[contatto da completare]';

export function PrivacyModal({ onClose }: { readonly onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const id = idAnonimoAttuale();
  const testo = tr('Privacy.testo', { titolare: TITOLARE, contatto: CONTATTO, data: tr('Privacy.data') });

  return (
    <div style={overlay} onClick={onClose}>
      <div role="dialog" aria-label={tr('Privacy.titolo')} style={finestra} onClick={(e) => e.stopPropagation()}>
        <div style={testata}>
          <h2 style={titolo}>{tr('Privacy.titolo')}</h2>
          <button type="button" onClick={onClose} style={chiudi} aria-label={tr('SkillGrimoireModal.12')}>
            ✕
          </button>
        </div>
        <div style={corpo}>
          <MarkdownBlocks src={testo} />
          {id && (
            <p style={{ margin: '12px 0 0', padding: 8, background: PALETTE.nebbia + '55', fontSize: 13 }}>
              {tr('Privacy.tuoId')} <code style={{ fontFamily: 'var(--font-griglia)' }}>{id}</code>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pulsante-link "Privacy" da mettere nei menu. */
export function PrivacyLink({ onOpen, colore = PALETTE.bianco }: { readonly onOpen: () => void; readonly colore?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: colore, textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit' }}
    >
      {tr('Privacy.link')}
    </button>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(26, 28, 44, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 120,
  padding: 16,
};

const finestra: React.CSSProperties = {
  width: 720,
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
  padding: '16px 20px',
  fontFamily: 'var(--font-testo)',
  fontSize: 15,
  lineHeight: 1.55,
  color: PALETTE.inchiostro,
};

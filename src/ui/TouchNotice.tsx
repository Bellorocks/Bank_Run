/**
 * Avviso per chi apre il gioco da telefono o tablet: si gioca solo da tastiera.
 * Non blocca nulla (un tablet con tastiera esterna funziona), si chiude e non torna.
 */

import { useState } from 'react';
import { tr } from '../i18n/ui';
import { PALETTE } from '../styles/palette';

const CHIAVE = 'dd_touch_notice_seen';

function senzaPuntatoreFine(): boolean {
  try {
    return window.matchMedia('(any-pointer: fine)').matches === false;
  } catch {
    return false;
  }
}

export function TouchNotice() {
  const [visibile, setVisibile] = useState(() => {
    try {
      return senzaPuntatoreFine() && localStorage.getItem(CHIAVE) === null;
    } catch {
      return senzaPuntatoreFine();
    }
  });
  if (!visibile) return null;
  const chiudi = () => {
    try {
      localStorage.setItem(CHIAVE, '1');
    } catch {
      // nessun archivio: l'avviso tornera' alla prossima visita, pazienza
    }
    setVisibile(false);
  };
  return (
    <div role="alert" style={stile}>
      <div style={{ fontFamily: 'var(--font-titolo)', fontSize: 17, color: PALETTE.ambra }}>{tr('Touch.titolo')}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, margin: '6px 0 10px' }}>{tr('Touch.testo')}</div>
      <button type="button" onClick={chiudi} style={bottone}>
        {tr('Touch.ok')}
      </button>
    </div>
  );
}

const stile: React.CSSProperties = {
  position: 'fixed',
  left: 16,
  right: 16,
  top: 16,
  maxWidth: 520,
  margin: '0 auto',
  zIndex: 60,
  padding: '14px 16px',
  background: PALETTE.inchiostro,
  color: PALETTE.bianco,
  border: `3px solid ${PALETTE.ambra}`,
  boxShadow: `4px 4px 0 ${PALETTE.rubino}`,
  fontFamily: 'var(--font-testo)',
};

const bottone: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 15,
  padding: '6px 14px',
  cursor: 'pointer',
  color: PALETTE.inchiostro,
  background: PALETTE.ambra,
  border: `2px solid ${PALETTE.ambra}`,
};

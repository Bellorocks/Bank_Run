/**
 * Richiesta di consenso alle statistiche anonime, una volta sola.
 *
 * Compare solo se la build ha una destinazione per le statistiche e il
 * giocatore non ha ancora risposto; la scelta si cambia dalle Impostazioni.
 * Sta sul titolo e sulla mappa, mai dentro un livello: li' la tastiera serve al gioco.
 */

import { useEffect, useState } from 'react';
import { consenso, impostaConsenso, statisticheDisponibili, suConsenso } from '../analytics/analytics';
import { tr } from '../i18n/ui';
import { PALETTE } from '../styles/palette';
import { PrivacyLink, PrivacyModal } from './PrivacyModal';

export function ConsentBanner() {
  const [stato, setStato] = useState(consenso());
  const [privacy, setPrivacy] = useState(false);
  useEffect(() => suConsenso(() => setStato(consenso())), []);

  if (!statisticheDisponibili() || stato !== null) return null;

  return (
    <div role="dialog" aria-label={tr('Consenso.titolo')} style={bannerStyle}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontFamily: 'var(--font-titolo)', fontSize: 16, color: PALETTE.ambra }}>{tr('Consenso.titolo')}</div>
        <div style={{ fontSize: 13, lineHeight: 1.45, marginTop: 4 }}>
          {tr('Consenso.testo')} <PrivacyLink onOpen={() => setPrivacy(true)} colore={PALETTE.ambra} />
        </div>
        {privacy && <PrivacyModal onClose={() => setPrivacy(false)} />}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => impostaConsenso(true)} style={bottone(true)}>
          {tr('Consenso.si')}
        </button>
        <button type="button" onClick={() => impostaConsenso(false)} style={bottone(false)}>
          {tr('Consenso.no')}
        </button>
      </div>
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  position: 'fixed',
  left: 16,
  right: 16,
  bottom: 16,
  maxWidth: 720,
  margin: '0 auto',
  zIndex: 50,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  background: PALETTE.inchiostro,
  color: PALETTE.bianco,
  border: `3px solid ${PALETTE.ambra}`,
  boxShadow: `4px 4px 0 ${PALETTE.rubino}`,
  fontFamily: 'var(--font-testo)',
};

function bottone(primario: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-titolo)',
    fontSize: 15,
    padding: '6px 14px',
    cursor: 'pointer',
    color: primario ? PALETTE.inchiostro : PALETTE.bianco,
    background: primario ? PALETTE.ambra : 'transparent',
    border: `2px solid ${PALETTE.ambra}`,
  };
}

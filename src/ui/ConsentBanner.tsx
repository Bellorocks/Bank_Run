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
import { T } from '../styles/palette';
import { PrivacyLink, PrivacyModal } from './PrivacyModal';

export function ConsentBanner() {
  const [stato, setStato] = useState(consenso());
  const [privacy, setPrivacy] = useState(false);
  useEffect(() => suConsenso(() => setStato(consenso())), []);

  if (!statisticheDisponibili() || stato !== null) return null;

  return (
    <div role="dialog" aria-label={tr('Consenso.titolo')} className="br-pannello br-pannello--acceso br-finestra" style={bannerStyle}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div className="br-label" style={{ color: T.accento }}>{tr('Consenso.titolo')}</div>
        <div style={{ fontSize: 14, lineHeight: 1.4, marginTop: 4, color: T.tenue }}>
          {tr('Consenso.testo')} <PrivacyLink onOpen={() => setPrivacy(true)} colore={T.accento} />
        </div>
        {privacy && <PrivacyModal onClose={() => setPrivacy(false)} />}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => impostaConsenso(true)} className="br-btn br-btn--accento">
          {tr('Consenso.si')}
        </button>
        <button type="button" onClick={() => impostaConsenso(false)} className="br-btn">
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
  bottom: 44,
  maxWidth: 720,
  margin: '0 auto',
  zIndex: 50,
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
};

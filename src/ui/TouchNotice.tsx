/**
 * Avviso per chi apre il gioco da telefono o tablet: si gioca solo da tastiera.
 * Non blocca nulla (un tablet con tastiera esterna funziona), si chiude e non torna.
 */

import { useState } from 'react';
import { track } from '../analytics/analytics';
import { tr } from '../i18n/ui';
import { T } from '../styles/palette';

const CHIAVE = 'dd_touch_notice_seen';

/**
 * Il puntatore principale e' il dito. Non basta "nessun puntatore preciso": i
 * telefoni con pennino (Galaxy S Ultra, Note) dichiarano anche un puntatore fine
 * e l'avviso non compariva.
 */
function puntatoreDito(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

export function TouchNotice() {
  const [visibile, setVisibile] = useState(() => {
    try {
      return puntatoreDito() && localStorage.getItem(CHIAVE) === null;
    } catch {
      return puntatoreDito();
    }
  });
  const [copiato, setCopiato] = useState(false);
  if (!visibile) return null;
  // Chi arriva dal telefono (tipico da LinkedIn) puo' mandarsi il link per aprirlo dal computer.
  const condividi = async () => {
    track('mobile_share');
    const url = window.location.origin + '/';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bank Run', url });
        return;
      }
    } catch {
      return; // condivisione annullata
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiato(true);
    } catch {
      // niente appunti: resta l'indirizzo nella barra del browser
    }
  };
  const chiudi = () => {
    try {
      localStorage.setItem(CHIAVE, '1');
    } catch {
      // nessun archivio: l'avviso tornera' alla prossima visita, pazienza
    }
    setVisibile(false);
  };
  return (
    <div role="alert" className="br-pannello br-pannello--acceso br-finestra" style={stile}>
      <div className="br-label" style={{ color: T.oro }}>{tr('Touch.titolo')}</div>
      <div style={{ fontSize: 16, lineHeight: 1.4, margin: '6px 0 12px', color: T.tenue }}>{tr('Touch.testo')}</div>
      {copiato && <div style={{ fontSize: 14, color: T.menta, marginBottom: 8 }}>{tr('Touch.copiato')}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => void condividi()} className="br-btn br-btn--primario">
          {tr('Touch.condividi')}
        </button>
        <button type="button" onClick={chiudi} className="br-btn">
          {tr('Touch.ok')}
        </button>
      </div>
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
};

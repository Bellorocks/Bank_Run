/**
 * Barra di stato della partita: tempo, keystroke, mouse, modalita'.
 *
 * Il contatore del mouse e' rosso e ben visibile quando la modalita' mouse-free
 * e' attiva (spec §3.3): non e' decorazione, e' il feedback che produce il salto
 * di velocita'. Se fosse discreto non funzionerebbe.
 */

import type { CSSProperties } from 'react';
import { Pulsante, Badge, formatDurata, formatIntero } from './primitives';
import { UI, PALETTE } from '../styles/palette';

import { tr } from '../i18n/ui';
export interface HudProps {
  readonly durataMs: number;
  readonly parSecondi: number;
  readonly keystrokes: number;
  readonly parKeystrokes: number;
  readonly mouseBloccati: number;
  readonly mouseFree: boolean;
  /** Speed Run: il mouse e' disabilitato per tutto il livello, il pulsante non serve a niente. */
  readonly mouseFreeLocked?: boolean;
  readonly statusMessage?: string;
  readonly altPath?: string;
  readonly onVerifica: () => void;
  readonly onMouseFree: () => void;
  readonly onCheatSheet: () => void;
}

export function Hud(props: HudProps) {
  const {
    durataMs,
    parSecondi,
    keystrokes,
    parKeystrokes,
    mouseBloccati,
    mouseFree,
    mouseFreeLocked = false,
    statusMessage,
    altPath,
    onVerifica,
    onMouseFree,
    onCheatSheet,
  } = props;

  const sopraPar = durataMs > parSecondi * 1000;

  return (
    <div style={barraStyle}>
      <Voce etichetta="Tempo">
        <span style={{ color: sopraPar ? UI.attenzione : UI.successo }}>{formatDurata(durataMs)}</span>
        <span style={{ color: UI.testoTenue }}> / {formatDurata(parSecondi * 1000)}</span>
      </Voce>

      <Voce etichetta="Tasti">
        <span>{formatIntero(keystrokes)}</span>
        <span style={{ color: UI.testoTenue }}> / {formatIntero(parKeystrokes)}</span>
      </Voce>

      {/* Il contatore compare solo quando c'e' qualcosa da dire: un "MOUSE: 0"
          permanente diventa invisibile dopo due sere. */}
      {mouseFree && mouseBloccati > 0 && (
        <Badge colore={UI.errore} pieno title={tr('Hud.1')}>
          {tr('Hud.2')}{' '}{mouseBloccati}
        </Badge>
      )}

      {altPath !== undefined && altPath !== '' && (
        <Badge colore={UI.accento} pieno title={tr('Hud.3')}>
          {altPath}
        </Badge>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {statusMessage !== undefined && statusMessage !== '' && (
          <span style={statusStyle} title={statusMessage}>
            {statusMessage}
          </span>
        )}
      </div>

      <Pulsante variante="fantasma" onClick={onCheatSheet} title={tr('Hud.4')}>
        ?
      </Pulsante>
      <Pulsante
        variante={mouseFree ? 'pericolo' : 'secondario'}
        onClick={onMouseFree}
        disabled={mouseFreeLocked}
        title={mouseFreeLocked ? tr('Hud.7') : tr('Hud.8')}
      >
        {mouseFreeLocked ? tr('Hud.9') : mouseFree ? tr('Hud.10') : tr('Hud.11')}
      </Pulsante>
      <Pulsante variante="primario" onClick={onVerifica}>
        {tr('Hud.12')}
      </Pulsante>
    </div>
  );
}

function Voce({ etichetta, children }: { etichetta: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontFamily: 'var(--font-titolo)', fontSize: 13, color: UI.testoTenue }}>
        {etichetta}
      </span>
      <span style={{ fontFamily: 'var(--font-griglia)', fontSize: 13 }}>{children}</span>
    </div>
  );
}

const barraStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '6px 14px',
  background: PALETTE.bianco,
  borderTop: `3px solid ${PALETTE.inchiostro}`,
  minHeight: 44,
  color: PALETTE.inchiostro,
  boxShadow: `0 -2px 0 ${PALETTE.nebbia}`,
};

const statusStyle: CSSProperties = {
  fontFamily: 'var(--font-testo)',
  fontSize: 16,
  color: PALETTE.smeraldo,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'block',
  fontWeight: 'bold',
};

export default Hud;

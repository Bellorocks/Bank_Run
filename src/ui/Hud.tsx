/**
 * Barra di stato della partita: tempo, keystroke, mouse, modalita'.
 *
 * Il contatore del mouse e' rosso e ben visibile quando la modalita' mouse-free
 * e' attiva (spec §3.3): non e' decorazione, e' il feedback che produce il salto
 * di velocita'. Se fosse discreto non funzionerebbe.
 */

import type { CSSProperties } from 'react';
import { Pulsante, Badge, formatDurata, formatIntero } from './primitives';
import { T } from '../styles/palette';

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
      <Voce etichetta={tr('Hud.tempo')}>
        <span style={{ color: sopraPar ? T.oro : T.menta }}>{formatDurata(durataMs)}</span>
        <span style={parStyle}> / {formatDurata(parSecondi * 1000)}</span>
      </Voce>

      <Voce etichetta={tr('Hud.tasti')}>
        <span style={{ color: keystrokes > parKeystrokes ? T.oro : T.testo }}>{formatIntero(keystrokes)}</span>
        <span style={parStyle}> / {formatIntero(parKeystrokes)}</span>
      </Voce>

      {/* Il contatore compare solo quando c'e' qualcosa da dire: un "MOUSE: 0"
          permanente diventa invisibile dopo due sere. */}
      {mouseFree && mouseBloccati > 0 && (
        <Badge colore={T.rosso} pieno title={tr('Hud.1')}>
          {tr('Hud.2')}{' '}{mouseBloccati}
        </Badge>
      )}

      {altPath !== undefined && altPath !== '' && (
        <Badge colore={T.accento} pieno title={tr('Hud.3')}>
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
      <Pulsante variante="primario" onClick={onVerifica} scorciatoia="F12">
        {tr('Hud.12')}
      </Pulsante>
    </div>
  );
}

function Voce({ etichetta, children }: { etichetta: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span className="br-label">{etichetta}</span>
      <span style={{ fontFamily: 'var(--font-logo)', fontSize: 26, lineHeight: 1, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </div>
  );
}

const parStyle: CSSProperties = {
  color: T.spento,
  fontSize: 18,
};

const barraStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 18,
  padding: '8px 14px 10px',
  minHeight: 54,
  color: T.testo,
  background: T.fondo,
  borderTop: `2px solid ${T.linea}`,
};

const statusStyle: CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-testo)',
  fontSize: 16,
  color: T.menta,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export default Hud;

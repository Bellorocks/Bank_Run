/**
 * Modal delle Impostazioni di Gioco (Audio & Preferenze).
 */

import { useState } from 'react';
import { sound } from '../audio/chiptune';
import { PALETTE } from '../styles/palette';

export interface SettingsModalProps {
  readonly onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [muted, setMuted] = useState(sound.isMuted());
  const [musicVol, setMusicVol] = useState(Math.round(sound.getMusicVolume() * 100));
  const [sfxVol, setSfxVol] = useState(Math.round(sound.getSfxVolume() * 100));

  const handleToggleMute = () => {
    const isNowMuted = sound.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) sound.playConfirm();
  };

  const handleMusicChange = (val: number) => {
    setMusicVol(val);
    sound.setMusicVolume(val / 100);
  };

  const handleSfxChange = (val: number) => {
    setSfxVol(val);
    sound.setSfxVolume(val / 100);
    sound.playSelect();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerRowStyle}>
          <h2 style={titleStyle}>IMPOSTAZIONI</h2>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
          <div style={settingRowStyle}>
            <div>
              <div style={labelStyle}>Audio generale (musica &amp; SFX)</div>
              <div style={subLabelStyle}>{muted ? 'Disattivato' : 'Attivo'}</div>
            </div>
            <button type="button" onClick={handleToggleMute} style={pillButtonStyle(!muted)}>
              {muted ? 'OFF' : 'ON'}
            </button>
          </div>

          <div style={settingRowStyle}>
            <div>
              <div style={labelStyle}>Volume musica</div>
              <div style={subLabelStyle}>{musicVol}%</div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={musicVol}
              disabled={muted}
              onChange={(e) => handleMusicChange(Number(e.target.value))}
              style={{ accentColor: PALETTE.ambra, cursor: 'pointer' }}
            />
          </div>

          <div style={settingRowStyle}>
            <div>
              <div style={labelStyle}>Volume effetti sonori</div>
              <div style={subLabelStyle}>{sfxVol}%</div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sfxVol}
              disabled={muted}
              onChange={(e) => handleSfxChange(Number(e.target.value))}
              style={{ accentColor: PALETTE.smeraldo, cursor: 'pointer' }}
            />
          </div>

          <div style={hintBoxStyle}>
            <div style={hintTitleStyle}>Comandi rapidi da tastiera</div>
            <div style={hintBodyStyle}>
              <strong>F1</strong> apri/chiudi il mandato · <strong>F2</strong> modifica la cella selezionata ·{' '}
              <strong>Invio</strong> conferma la formula · <strong>?</strong> guida scorciatoie
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={saveButtonStyle}>
              SALVA E CHIUDI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(26, 28, 44, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  width: 500,
  maxWidth: '95%',
  padding: 20,
  background: PALETTE.bianco,
  border: `4px solid ${PALETTE.inchiostro}`,
  outline: `3px solid ${PALETTE.corallo}`,
  boxShadow: `8px 8px 0 ${PALETTE.inchiostro}`,
  display: 'flex',
  flexDirection: 'column',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: PALETTE.grafite,
  border: `2px solid ${PALETTE.inchiostro}`,
  padding: '10px 14px',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 19,
  color: PALETTE.ambra,
  fontFamily: 'var(--font-titolo)',
  letterSpacing: '0.06em',
};

const closeButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 15,
  color: PALETTE.bianco,
  background: PALETTE.rubino,
  border: `2px solid ${PALETTE.inchiostro}`,
  borderTop: `2px solid ${PALETTE.corallo}`,
  borderBottom: `2px solid ${PALETTE.prugna}`,
  padding: '4px 10px',
  cursor: 'pointer',
};

function pillButtonStyle(on: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-titolo)',
    fontSize: 15,
    color: on ? PALETTE.inchiostro : PALETTE.bianco,
    background: on ? PALETTE.lime : PALETTE.corallo,
    border: `2px solid ${PALETTE.inchiostro}`,
    borderTop: `2px solid ${on ? PALETTE.bianco : PALETTE.ambra}`,
    borderBottom: `2px solid ${on ? PALETTE.smeraldo : PALETTE.rubino}`,
    boxShadow: `2px 2px 0 ${PALETTE.inchiostro}`,
    padding: '6px 14px',
    minWidth: 64,
    cursor: 'pointer',
  };
}

const saveButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 16,
  color: PALETTE.bianco,
  background: PALETTE.smeraldo,
  border: `3px solid ${PALETTE.inchiostro}`,
  borderTop: `2px solid ${PALETTE.lime}`,
  borderBottom: `3px solid ${PALETTE.petrolio}`,
  boxShadow: `4px 4px 0 ${PALETTE.inchiostro}`,
  padding: '10px 28px',
  cursor: 'pointer',
};

const settingRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '8px 10px',
  background: PALETTE.bianco,
  border: `1px solid ${PALETTE.nebbia}`,
};

const labelStyle: React.CSSProperties = {
  fontSize: 15,
  color: PALETTE.grafite,
  fontFamily: 'var(--font-titolo)',
};

const subLabelStyle: React.CSSProperties = {
  fontSize: 15,
  color: PALETTE.petrolio,
  fontFamily: 'var(--font-testo)',
};

const hintBoxStyle: React.CSSProperties = {
  background: PALETTE.nebbia + '33',
  padding: 12,
  border: `2px solid ${PALETTE.ardesia}`,
};

const hintTitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: PALETTE.grafite,
  fontFamily: 'var(--font-titolo)',
};

const hintBodyStyle: React.CSSProperties = {
  fontSize: 15,
  color: PALETTE.inchiostro,
  marginTop: 6,
  lineHeight: 1.5,
  fontFamily: 'var(--font-testo)',
};

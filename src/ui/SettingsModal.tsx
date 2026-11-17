/**
 * Modal delle Impostazioni di Gioco (Audio & Preferenze).
 */

import { useState } from 'react';
import { sound } from '../audio/chiptune';
import { T } from '../styles/palette';
import { isFreePlay, setFreePlay } from '../persistence/progress';

import { tr } from '../i18n/ui';
import { LanguageSwitch } from './LanguageSwitch';
import { PrivacyLink, PrivacyModal } from './PrivacyModal';
import { Finestra, Pulsante } from './primitives';
import { consenso, impostaConsenso, statisticheDisponibili, track } from '../analytics/analytics';
export interface SettingsModalProps {
  readonly onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [muted, setMuted] = useState(sound.isMuted());
  const [musicVol, setMusicVol] = useState(Math.round(sound.getMusicVolume() * 100));
  const [sfxVol, setSfxVol] = useState(Math.round(sound.getSfxVolume() * 100));
  const [freePlay, setFreePlayState] = useState(isFreePlay());

  const [statistiche, setStatistiche] = useState(consenso() === 'si');
  const [privacy, setPrivacy] = useState(false);
  const handleToggleStatistiche = () => {
    const on = !statistiche;
    impostaConsenso(on);
    setStatistiche(on);
    sound.playSelect();
  };

  const handleToggleFreePlay = () => {
    const on = !freePlay;
    setFreePlay(on);
    track('free_play_toggle', { on });
    setFreePlayState(on);
    sound.playSelect();
  };

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

  const riga = (etichetta: string, nota: React.ReactNode, controllo: React.ReactNode) => (
    <div className="br-riga" style={rigaStyle}>
      <div style={{ minWidth: 0 }}>
        <div className="br-label" style={{ color: T.testo }}>
          {etichetta}
        </div>
        <div style={notaStyle}>{nota}</div>
      </div>
      {controllo}
    </div>
  );

  const interruttore = (acceso: boolean, onClick: () => void, spento: string = 'OFF') => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={acceso}
      className={acceso ? 'br-linguetta is-scelta' : 'br-linguetta'}
      style={{ minWidth: 64, flexShrink: 0 }}
    >
      {acceso ? 'ON' : spento}
    </button>
  );

  return (
    <>
      {privacy && <PrivacyModal onClose={() => setPrivacy(false)} />}
      <Finestra
        titolo={tr('SettingsModal.1')}
        onClose={onClose}
        larghezza={520}
        chiudiLabel={tr('SkillGrimoireModal.12')}
        piede={
          <Pulsante variante="accento" onClick={onClose}>
            {tr('SettingsModal.21')}
          </Pulsante>
        }
        bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {riga(tr('SettingsModal.lingua'), tr('SettingsModal.linguaNota'), <LanguageSwitch />)}

        {riga(
          tr('SettingsModal.2'),
          muted ? tr('SettingsModal.3') : tr('SettingsModal.4'),
          interruttore(!muted, handleToggleMute, tr('SettingsModal.5')),
        )}

        {riga(
          tr('SettingsModal.6'),
          `${musicVol}%`,
          <input
            type="range"
            min={0}
            max={100}
            value={musicVol}
            disabled={muted}
            onChange={(e) => handleMusicChange(Number(e.target.value))}
          />,
        )}

        {riga(
          tr('SettingsModal.7'),
          `${sfxVol}%`,
          <input
            type="range"
            min={0}
            max={100}
            value={sfxVol}
            disabled={muted}
            onChange={(e) => handleSfxChange(Number(e.target.value))}
          />,
        )}

        {riga(
          tr('SettingsModal.8'),
          freePlay ? tr('SettingsModal.9') : tr('SettingsModal.10'),
          interruttore(freePlay, handleToggleFreePlay, tr('SettingsModal.11')),
        )}

        {statisticheDisponibili() &&
          riga(
            tr('Consenso.impostazione'),
            <>
              {tr('Consenso.impostazioneNota')} · <PrivacyLink onOpen={() => setPrivacy(true)} colore="inherit" />
            </>,
            interruttore(statistiche, handleToggleStatistiche),
          )}

        <div style={promemoriaStyle}>
          <div className="br-label" style={{ color: T.oro }}>
            {tr('SettingsModal.12')}
          </div>
          <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.8, color: T.tenue }}>
            <Tasto>F1</Tasto> {tr('SettingsModal.13')} <Tasto>{tr('SettingsModal.14')}</Tasto> {tr('SettingsModal.15')}{' '}
            <Tasto>F12</Tasto> {tr('SettingsModal.16')} <Tasto>F2</Tasto> {tr('SettingsModal.17')}{' '}
            <Tasto>{tr('SettingsModal.18')}</Tasto> {tr('SettingsModal.19')} <Tasto>?</Tasto> {tr('SettingsModal.20')}
          </div>
        </div>
      </Finestra>
    </>
  );
}

function Tasto({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="br-kbd" style={{ color: T.accento }}>
      {children}
    </span>
  );
}

const rigaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
  padding: '10px 12px',
};

const notaStyle: React.CSSProperties = {
  marginTop: 2,
  fontSize: 14,
  lineHeight: 1.35,
  color: T.tenue,
};

const promemoriaStyle: React.CSSProperties = {
  marginTop: 6,
  padding: 12,
  background: T.abisso,
  border: `2px dashed ${T.linea}`,
};

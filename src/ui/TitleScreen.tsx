/**
 * Schermata del titolo — Direzione artistica rinnovata sulla palette dei 16 colori (spec §8).
 * Sfondo a bande piatte con cielo compatto, imponente foresta di grandi querce e pini,
 * cornice e pulsanti del menu in legno intagliato pixel art.
 */

import { useState } from 'react';
import { sound } from '../audio/chiptune';
import { PALETTE } from '../styles/palette';
import { SettingsModal } from './SettingsModal';
import { SkillGrimoireModal } from './SkillGrimoireModal';
import { PixelSprite } from './sprites/PixelCanvas';
import {
  WOOD_CHAIN_HANGER,
  WOOD_STAPLE_LINK,
  WOOD_PLANK_CAP_L,
  WOOD_PLANK_CAP_R,
} from './sprites/decorations';

import { PrivacyLink, PrivacyModal } from './PrivacyModal';
import { tr } from '../i18n/ui';
import { LanguageSwitch } from './LanguageSwitch';
export interface TitleScreenProps {
  readonly onStartGame: () => void;
}

type MenuSelection = 'start' | 'grimoire' | 'settings';

export function TitleScreen({ onStartGame }: TitleScreenProps) {
  const [hoveredOption, setHoveredOption] = useState<MenuSelection>('start');
  const [showSettings, setShowSettings] = useState(false);
  // `/?privacy` apre direttamente l'informativa: e' l'indirizzo da linkare fuori dal gioco.
  const [showPrivacy, setShowPrivacy] = useState(() => new URLSearchParams(window.location.search).has('privacy'));
  const [showGrimoire, setShowGrimoire] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  const handleStart = () => {
    if (!audioStarted && !sound.isMuted()) {
      sound.startBgm();
      setAudioStarted(true);
    }
    sound.playConfirm();
    onStartGame();
  };

  const handleToggleAudio = () => {
    const muted = sound.toggleMute();
    if (!muted) {
      sound.playSelect();
      setAudioStarted(true);
    }
  };

  const menuPlank = (
    id: MenuSelection,
    label: string,
    onClick: () => void,
    trailing?: string,
  ) => {
    const isHovered = hoveredOption === id;
    return (
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={() => {
            setHoveredOption(id);
            sound.playSelect();
          }}
          style={plankButtonStyle(isHovered)}
        >
          {/* Estremità Sinistra a Bordo Arrotondato */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <PixelSprite frame={WOOD_PLANK_CAP_L} scale={2} />
          </div>

          {/* Corpo Centrale della Tavola di Legno */}
          <div style={plankBodyStyle(isHovered)}>
            <span style={{ width: 16, display: 'inline-flex', color: isHovered ? PALETTE.smeraldo : PALETTE.ambra }}>
              {isHovered ? '▶' : ' '}
            </span>
            <span style={{ flex: 1, textAlign: 'left', letterSpacing: '0.06em' }}>{label}</span>
            {trailing && (
              <span style={trailingBadgeStyle(isHovered)}>
                {trailing}
              </span>
            )}
          </div>

          {/* Estremità Destra a Bordo Arrotondato */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <PixelSprite frame={WOOD_PLANK_CAP_R} scale={2} />
          </div>
        </button>
      </div>
    );
  };

  return (
    <div style={pageStyle}>
      {/* Sfondo del Titolo in Pixel Art HD */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/art/title_bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
          zIndex: 0,
        }}
      />

      {/* STRUTTURA A CARTELLO IN LEGNO SOSPESO (REFERENCE MATCH) */}
      <div style={hangingSignContainerStyle}>
        {/* Catene di sospensione dall'alto */}
        <div style={chainsWrapperStyle}>
          <PixelSprite frame={WOOD_CHAIN_HANGER} scale={2} />
          <PixelSprite frame={WOOD_CHAIN_HANGER} scale={2} />
        </div>

        {/* 1. TAVOLA SUPERIORE: Intestazione Titolo & Logo */}
        <div style={headerPlankStyle}>
          <div style={badgeStyle}>BR</div>
          <h1 style={logoStyle}>{tr('TitleScreen.1')}</h1>
          <div style={taglineStyle}>{tr('TitleScreen.2')}</div>
          <div style={statLineStyle}>{tr('TitleScreen.3')}</div>
        </div>

        {/* Graffette di ferro di raccordo tra Tavola 1 e Tavola 2 */}
        <div style={stapleRowStyle}>
          <PixelSprite frame={WOOD_STAPLE_LINK} scale={1.8} />
          <PixelSprite frame={WOOD_STAPLE_LINK} scale={1.8} />
        </div>

        {/* 2. TAVOLA 1: AVVIA CAMPAGNA */}
        {menuPlank('start', tr('TitleScreen.4'), handleStart, tr('TitleScreen.invio'))}

        {/* Graffette di ferro di raccordo tra Tavola 2 e Tavola 3 */}
        <div style={stapleRowStyle}>
          <PixelSprite frame={WOOD_STAPLE_LINK} scale={1.8} />
          <PixelSprite frame={WOOD_STAPLE_LINK} scale={1.8} />
        </div>

        {/* 3. TAVOLA 2: ALBERO DELLE SKILL */}
        {menuPlank('grimoire', tr('TitleScreen.5'), () => {
          sound.playSelect();
          setShowGrimoire(true);
        })}

        {/* Graffette di ferro di raccordo tra Tavola 3 e Tavola 4 */}
        <div style={stapleRowStyle}>
          <PixelSprite frame={WOOD_STAPLE_LINK} scale={1.8} />
          <PixelSprite frame={WOOD_STAPLE_LINK} scale={1.8} />
        </div>

        {/* 4. TAVOLA 3: IMPOSTAZIONI & AUDIO */}
        {menuPlank('settings', tr('TitleScreen.6'), () => {
          sound.playSelect();
          setShowSettings(true);
        })}

        {/* Graffette di ferro di raccordo tra Tavola 4 e Tavola 5 */}
        <div style={stapleRowStyle}>
          <PixelSprite frame={WOOD_STAPLE_LINK} scale={1.8} />
          <PixelSprite frame={WOOD_STAPLE_LINK} scale={1.8} />
        </div>

        {/* 5. TAVOLA INFERIORE: FOOTER & TOGGLE AUDIO LITTLEROOT TOWN */}
        <div style={footerPlankStyle}>
          <span style={footerTextStyle}>
            {tr('TitleScreen.7')} · <PrivacyLink onOpen={() => setShowPrivacy(true)} colore="inherit" />
          </span>
          <LanguageSwitch compatto />
          <button type="button" onClick={handleToggleAudio} style={woodSmallButtonStyle}>
            {sound.isMuted() ? tr('TitleScreen.8') : tr('TitleScreen.9')}
          </button>
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showGrimoire && <SkillGrimoireModal onClose={() => setShowGrimoire(false)} />}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  height: '100%',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  background: PALETTE.notte,
};

const hangingSignContainerStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 10,
  width: 460,
  maxWidth: '94%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginTop: -15,
};

const chainsWrapperStyle: React.CSSProperties = {
  width: '60%',
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: -4,
  zIndex: 2,
};

const stapleRowStyle: React.CSSProperties = {
  width: '70%',
  display: 'flex',
  justifyContent: 'space-between',
  margin: '-4px 0',
  zIndex: 5,
  pointerEvents: 'none',
};

const headerPlankStyle: React.CSSProperties = {
  width: '100%',
  background: PALETTE.corallo,
  border: `4px solid ${PALETTE.inchiostro}`,
  borderTop: `4px solid ${PALETTE.ambra}`,
  borderBottom: `4px solid ${PALETTE.rubino}`,
  boxShadow: `5px 5px 0 ${PALETTE.inchiostro}`,
  padding: '14px 18px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  zIndex: 3,
};

const plankButtonStyle = (active: boolean): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'stretch',
  cursor: 'pointer',
  transform: active ? 'scale(1.02)' : 'none',
  transition: 'none',
  width: '100%',
  zIndex: 3,
});

const plankBodyStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  background: active ? PALETTE.ambra : PALETTE.corallo,
  borderTop: `4px solid ${active ? PALETTE.bianco : PALETTE.ambra}`,
  borderBottom: `4px solid ${active ? PALETTE.corallo : PALETTE.rubino}`,
  boxShadow: `0 4px 0 ${PALETTE.inchiostro}`,
  display: 'flex',
  alignItems: 'center',
  padding: '0 14px',
  fontFamily: 'var(--font-titolo)',
  fontSize: 17,
  color: active ? PALETTE.inchiostro : PALETTE.bianco,
  height: 40,
  minWidth: 0,
});

const trailingBadgeStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 14,
  fontFamily: 'var(--font-titolo)',
  color: active ? PALETTE.inchiostro : PALETTE.bianco,
  background: active ? PALETTE.corallo : PALETTE.inchiostro,
  padding: '3px 8px',
  border: `1px solid ${active ? PALETTE.inchiostro : PALETTE.ardesia}`,
  marginLeft: 10,
});

const footerPlankStyle: React.CSSProperties = {
  width: '100%',
  background: PALETTE.corallo,
  border: `3px solid ${PALETTE.inchiostro}`,
  borderTop: `3px solid ${PALETTE.ambra}`,
  borderBottom: `3px solid ${PALETTE.rubino}`,
  boxShadow: `4px 4px 0 ${PALETTE.inchiostro}`,
  padding: '8px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  zIndex: 3,
};

const badgeStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-titolo)',
  fontSize: 19,
  color: PALETTE.inchiostro,
  background: PALETTE.ambra,
  border: `3px solid ${PALETTE.inchiostro}`,
  borderTop: `3px solid ${PALETTE.bianco}`,
  borderBottom: `3px solid ${PALETTE.corallo}`,
  boxShadow: `2px 2px 0 ${PALETTE.rubino}`,
  marginBottom: 8,
};

const logoStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 30,
  color: PALETTE.ambra,
  margin: 0,
  letterSpacing: '0.08em',
  textShadow: `3px 3px 0 ${PALETTE.prugna}`,
};

const taglineStyle: React.CSSProperties = {
  fontFamily: 'var(--font-testo)',
  fontSize: 16,
  color: PALETTE.ghiaccio,
  letterSpacing: '0.12em',
  marginTop: 4,
  whiteSpace: 'nowrap',
};

const statLineStyle: React.CSSProperties = {
  fontFamily: 'var(--font-testo)',
  fontSize: 16,
  color: PALETTE.lime,
  marginTop: 2,
  whiteSpace: 'nowrap',
};

const footerTextStyle: React.CSSProperties = {
  fontFamily: 'var(--font-testo)',
  fontSize: 14,
  color: PALETTE.inchiostro,
};

const woodSmallButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 14,
  color: PALETTE.bianco,
  background: PALETTE.inchiostro,
  border: `2px solid ${PALETTE.ardesia}`,
  padding: '4px 10px',
  cursor: 'pointer',
};


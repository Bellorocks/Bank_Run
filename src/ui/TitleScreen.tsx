/**
 * Schermata del titolo.
 *
 * Lo sfondo e' la valle disegnata e animata da `Scena`; sopra, il logo in
 * rilievo, il menu a tasselli d'inchiostro e, in fondo, il nastro delle
 * quotazioni.
 */

import { useEffect, useRef, useState } from 'react';
import { track } from '../analytics/analytics';
import { sound } from '../audio/chiptune';
import { T } from '../styles/palette';
import { SettingsModal } from './SettingsModal';
import { SkillGrimoireModal } from './SkillGrimoireModal';
import { Scena } from './Scena';

import { PrivacyLink, PrivacyModal } from './PrivacyModal';
import { tr } from '../i18n/ui';
import { LanguageSwitch } from './LanguageSwitch';
import { CreditsModal, LINKEDIN_URL } from './CreditsModal';

export interface TitleScreenProps {
  readonly onStartGame: () => void;
}

type MenuSelection = 'start' | 'grimoire' | 'settings' | 'credits';

const MENU: readonly MenuSelection[] = ['start', 'grimoire', 'settings', 'credits'];

/** Il nastro in fondo: sigle del mestiere con una variazione inventata. Solo colore. */
const QUOTAZIONI: readonly (readonly [string, string, boolean])[] = [
  ['EBITDA', '+12.4%', true],
  ['WACC', '8.10%', false],
  ['NWC', '-3.2%', false],
  ['EV/EBITDA', '9.5x', true],
  ['FCF', '+6.8%', true],
  ['NET DEBT', '-1.4x', true],
  ['IRR', '21.3%', true],
  ['CAPEX', '+4.1%', false],
  ['DSO', '-6d', true],
  ['EPS', '+0.18', true],
  ['MOIC', '2.6x', true],
  ['LEVERAGE', '4.5x', false],
  ['TV', '+2.0%', true],
  ['BETA', '1.12', false],
];

export function TitleScreen({ onStartGame }: TitleScreenProps) {
  const [hoveredOption, setHoveredOption] = useState<MenuSelection>('start');
  const [showSettings, setShowSettings] = useState(false);
  // `/?privacy` apre direttamente l'informativa: e' l'indirizzo da linkare fuori dal gioco.
  const [showPrivacy, setShowPrivacy] = useState(() => new URLSearchParams(window.location.search).has('privacy'));
  const [showGrimoire, setShowGrimoire] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [, ridisegna] = useState(0);
  const vociRef = useRef<Partial<Record<MenuSelection, HTMLButtonElement | null>>>({});
  const finestraAperta = showSettings || showPrivacy || showGrimoire || showCredits;

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
    ridisegna((n) => n + 1);
  };

  const apri = (mostra: (v: boolean) => void) => () => {
    sound.playSelect();
    mostra(true);
  };

  const azioni: Record<MenuSelection, () => void> = {
    start: handleStart,
    grimoire: apri(setShowGrimoire),
    settings: apri(setShowSettings),
    credits: apri(setShowCredits),
  };

  // Menu da tastiera: le frecce spostano la voce evidenziata (e il focus),
  // Invio la apre. Con una finestra aperta i tasti sono suoi.
  useEffect(() => {
    if (finestraAperta) return;
    const onKey = (e: KeyboardEvent) => {
      const attivo = document.activeElement;
      const libero = !attivo || attivo === document.body;
      if (e.key === 'Enter') {
        // Su un pulsante o un link Invio lo gestisce già il browser.
        if (!libero) return;
        e.preventDefault();
        azioni[hoveredOption]();
        return;
      }
      const avanti = e.key === 'ArrowDown' || e.key === 'ArrowRight';
      const indietro = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
      if (!avanti && !indietro) return;
      if (!libero && !MENU.some((id) => vociRef.current[id] === attivo)) return;
      e.preventDefault();
      const passo = avanti ? 1 : MENU.length - 1;
      const prossima = MENU[(MENU.indexOf(hoveredOption) + passo) % MENU.length];
      setHoveredOption(prossima);
      sound.playSelect();
      vociRef.current[prossima]?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const voce = (id: MenuSelection, etichetta: string, principale = false) => {
    const scelta = hoveredOption === id;
    const classi = ['br-btn'];
    if (principale) classi.push('br-btn--primario', 'br-btn--grande');
    if (scelta) classi.push('is-acceso');
    return (
      <button
        type="button"
        ref={(el) => {
          vociRef.current[id] = el;
        }}
        className={classi.join(' ')}
        onClick={azioni[id]}
        onFocus={() => setHoveredOption(id)}
        onMouseEnter={() => {
          if (hoveredOption !== id) sound.playSelect();
          setHoveredOption(id);
        }}
        style={principale ? { width: '100%' } : { flex: '1 1 auto', padding: '12px 10px', letterSpacing: '0.06em' }}
      >
        {principale && <span className={scelta ? 'br-lampeggia' : undefined}>▶</span>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{etichetta}</span>
        {principale && <span className="br-kbd">{tr('TitleScreen.invio')}</span>}
      </button>
    );
  };

  const nastro = QUOTAZIONI.map(([sigla, valore, su], i) => (
    <span key={i}>
      {sigla}{' '}
      <span style={{ color: su ? T.menta : T.corallo }}>
        {su ? '▲' : '▼'} {valore}
      </span>
    </span>
  ));

  return (
    <div style={paginaStyle}>
      <Scena tipo="valle" />

      <div style={angoloStyle}>
        <LanguageSwitch compatto />
        <button type="button" className="br-btn br-btn--piccolo" onClick={handleToggleAudio}>
          {sound.isMuted() ? tr('TitleScreen.8') : tr('TitleScreen.9')}
        </button>
      </div>

      <main className="br-entra" style={colonnaStyle}>
        <h1 className="br-logo br-galleggia" style={{ fontSize: 'clamp(72px, min(14vw, 21vh), 176px)' }}>
          {tr('TitleScreen.1')}
        </h1>
        <div className="br-tassello" style={insegnaStyle}>
          <div style={mottoStyle}>{tr('TitleScreen.2')}</div>
          <div style={numeriStyle}>{tr('TitleScreen.3')}</div>
        </div>

        <nav style={menuStyle}>
          {voce('start', tr('TitleScreen.4'), true)}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}>
            {voce('grimoire', tr('TitleScreen.5'))}
            {voce('settings', tr('TitleScreen.6'))}
            {voce('credits', tr('TitleScreen.crediti'))}
          </div>
        </nav>

        <div className="br-tassello" style={piedeStyle}>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('linkedin_click', { location: 'home' })}
            style={{ color: T.accento, textUnderlineOffset: 3 }}
          >
            {tr('TitleScreen.autore')}
          </a>
          <span>·</span>
          <span>{tr('TitleScreen.7')}</span>
          <span>·</span>
          <PrivacyLink onOpen={() => setShowPrivacy(true)} colore="inherit" />
        </div>
      </main>

      <div className="br-nastro" style={nastroStyle} aria-hidden>
        <div className="br-nastro__corsa">
          {nastro}
          {nastro}
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showGrimoire && <SkillGrimoireModal onClose={() => setShowGrimoire(false)} />}
      {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
    </div>
  );
}

const paginaStyle: React.CSSProperties = {
  height: '100%',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  background: '#41a6f6',
};

const angoloStyle: React.CSSProperties = {
  position: 'absolute',
  top: 14,
  right: 14,
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const colonnaStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 10,
  width: 620,
  maxWidth: '100%',
  padding: '0 16px 44px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const insegnaStyle: React.CSSProperties = {
  marginTop: 34,
  padding: '10px 18px 9px',
};

const mottoStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 'clamp(12px, 2.4vw, 16px)',
  letterSpacing: '0.3em',
  color: T.accento,
};

const numeriStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 16,
  letterSpacing: '0.06em',
  color: T.testo,
};

const menuStyle: React.CSSProperties = {
  marginTop: 22,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const piedeStyle: React.CSSProperties = {
  marginTop: 22,
  padding: '5px 12px',
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 8,
  fontSize: 14,
  color: T.tenue,
};

const nastroStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 6,
};

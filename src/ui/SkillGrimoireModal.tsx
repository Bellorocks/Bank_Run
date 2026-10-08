/**
 * Elenco delle skill del curriculum, per area.
 */

import { useState } from 'react';
import { SKILLS, skillsOfArea, type SkillArea } from '../content/skills';
import { PALETTE } from '../styles/palette';

export interface SkillGrimoireModalProps {
  readonly onClose: () => void;
}

const AREAS: { id: SkillArea; name: string }[] = [
  { id: 'meccanica', name: 'Navigazione & tasti' },
  { id: 'formule', name: 'Logica & formule' },
  { id: 'igiene', name: 'Igiene & audit' },
  { id: 'contabilita', name: 'Contabilità & 3 prospetti' },
  { id: 'valutazione', name: 'Valutazione & DCF' },
  { id: 'transazione', name: 'Transazione & NWC' },
  { id: 'strutturazione', name: 'LBO, credito & M&A' },
];

export function SkillGrimoireModal({ onClose }: SkillGrimoireModalProps) {
  const [activeArea, setActiveArea] = useState<SkillArea>('meccanica');

  const skillsInArea = skillsOfArea(activeArea);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerRowStyle}>
          <div>
            <h2 style={titleStyle}>ALBERO DELLE SKILL ({SKILLS.length})</h2>
            <div style={subtitleStyle}>Ogni skill è un nodo: si sblocca giocando i livelli che la allenano.</div>
          </div>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, margin: '12px 0', flexWrap: 'wrap' }}>
          {AREAS.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => setActiveArea(area.id)}
              style={tabButtonStyle(activeArea === area.id)}
            >
              {area.name}
            </button>
          ))}
        </div>

        <div style={skillListContainerStyle}>
          {skillsInArea.map((skill) => (
            <div key={skill.id} style={skillCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={skillLabelStyle}>{skill.label}</span>
                <span style={modBadgeStyle}>MODULO {skill.module}</span>
              </div>
              <p style={skillDescStyle}>{skill.description}</p>
              {skill.requires.length > 0 && (
                <div style={skillPrereqStyle}>Prerequisiti: {skill.requires.join(', ')}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button type="button" onClick={onClose} style={closeBottomButtonStyle}>
            CHIUDI
          </button>
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
  width: 720,
  maxWidth: '95%',
  maxHeight: '90vh',
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
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  background: PALETTE.grafite,
  border: `2px solid ${PALETTE.inchiostro}`,
  padding: '12px 16px',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 19,
  color: PALETTE.ambra,
  fontFamily: 'var(--font-titolo)',
  letterSpacing: '0.06em',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: PALETTE.ghiaccio,
  fontFamily: 'var(--font-testo)',
  marginTop: 4,
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
  flexShrink: 0,
};

const closeBottomButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 15,
  color: PALETTE.bianco,
  background: PALETTE.smeraldo,
  border: `2px solid ${PALETTE.inchiostro}`,
  borderTop: `2px solid ${PALETTE.lime}`,
  borderBottom: `2px solid ${PALETTE.petrolio}`,
  boxShadow: `3px 3px 0 ${PALETTE.inchiostro}`,
  padding: '8px 24px',
  cursor: 'pointer',
};

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-titolo)',
    fontSize: 14,
    color: active ? PALETTE.inchiostro : PALETTE.bianco,
    background: active ? PALETTE.lime : PALETTE.corallo,
    border: `2px solid ${PALETTE.inchiostro}`,
    borderTop: `2px solid ${active ? PALETTE.bianco : PALETTE.ambra}`,
    borderBottom: `2px solid ${active ? PALETTE.smeraldo : PALETTE.rubino}`,
    boxShadow: `2px 2px 0 ${PALETTE.inchiostro}`,
    padding: '7px 10px',
    cursor: 'pointer',
  };
}

const skillListContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  paddingRight: 4,
  marginTop: 10,
};

const skillCardStyle: React.CSSProperties = {
  background: PALETTE.bianco,
  border: `2px solid ${PALETTE.inchiostro}`,
  boxShadow: `2px 2px 0 ${PALETTE.nebbia}`,
  padding: '10px 14px',
};

const skillLabelStyle: React.CSSProperties = {
  fontSize: 16,
  color: PALETTE.grafite,
  fontFamily: 'var(--font-titolo)',
};

const skillDescStyle: React.CSSProperties = {
  margin: '6px 0',
  fontSize: 15,
  color: PALETTE.inchiostro,
  lineHeight: 1.4,
  fontFamily: 'var(--font-testo)',
};

const skillPrereqStyle: React.CSSProperties = {
  fontSize: 14,
  color: PALETTE.ardesia,
  fontFamily: 'var(--font-testo)',
};

const modBadgeStyle: React.CSSProperties = {
  background: PALETTE.grafite,
  color: PALETTE.ambra,
  border: `1px solid ${PALETTE.inchiostro}`,
  fontSize: 14,
  padding: '3px 8px',
  fontFamily: 'var(--font-titolo)',
  flexShrink: 0,
};

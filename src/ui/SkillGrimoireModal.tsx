/**
 * Elenco delle skill del curriculum, per area.
 */

import { useState } from 'react';
import { SKILLS, skillsOfArea, type SkillArea } from '../content/skills';
import { T } from '../styles/palette';
import { Badge, Finestra } from './primitives';

import { tr } from '../i18n/ui';
export interface SkillGrimoireModalProps {
  readonly onClose: () => void;
}

const AREAS: { id: SkillArea; name: string }[] = [
  { id: 'meccanica', name: tr('SkillGrimoireModal.1') },
  { id: 'formule', name: tr('SkillGrimoireModal.2') },
  { id: 'igiene', name: tr('SkillGrimoireModal.3') },
  { id: 'contabilita', name: tr('SkillGrimoireModal.4') },
  { id: 'valutazione', name: tr('SkillGrimoireModal.5') },
  { id: 'transazione', name: tr('SkillGrimoireModal.6') },
  { id: 'strutturazione', name: tr('SkillGrimoireModal.7') },
];

export function SkillGrimoireModal({ onClose }: SkillGrimoireModalProps) {
  const [activeArea, setActiveArea] = useState<SkillArea>('meccanica');

  const skillsInArea = skillsOfArea(activeArea);

  return (
    <Finestra
      titolo={`${tr('SkillGrimoireModal.8')}${SKILLS.length})`}
      sottotitolo={tr('SkillGrimoireModal.9')}
      onClose={onClose}
      larghezza={760}
      chiudiLabel={tr('SkillGrimoireModal.12')}
      bodyStyle={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
    >
      <div style={linguetteStyle}>
        {AREAS.map((area) => (
          <button
            key={area.id}
            type="button"
            onClick={() => setActiveArea(area.id)}
            className={activeArea === area.id ? 'br-linguetta is-scelta' : 'br-linguetta'}
          >
            {area.name}
          </button>
        ))}
      </div>

      <div style={elencoStyle}>
        {skillsInArea.map((skill) => (
          <div key={skill.id} className="br-riga" style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-logo)', fontSize: 21, lineHeight: 1.1, letterSpacing: '0.03em', color: T.testo }}>{skill.label}</span>
              <Badge colore={T.oro} style={{ flexShrink: 0 }}>
                {tr('SkillGrimoireModal.10')} {skill.module}
              </Badge>
            </div>
            <p style={{ margin: '4px 0', fontSize: 16, lineHeight: 1.4, color: T.tenue }}>{skill.description}</p>
            {skill.requires.length > 0 && (
              <div style={{ fontSize: 12, color: T.spento, fontFamily: 'var(--font-griglia)' }}>
                {tr('SkillGrimoireModal.11')} {skill.requires.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </Finestra>
  );
}

const linguetteStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  padding: '14px 18px 16px',
  borderBottom: `2px solid ${T.linea}`,
  flex: '0 0 auto',
};

const elencoStyle: React.CSSProperties = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 18,
};

/**
 * Informativa privacy (art. 13 GDPR), in italiano e in inglese.
 *
 * Titolare e contatto vengono dalla configurazione della build
 * (VITE_PRIVACY_OWNER, VITE_PRIVACY_CONTACT in .env): una sola
 * persona li compila, il testo resta nei file di lingua.
 */

import { idAnonimoAttuale } from '../analytics/analytics';
import { tr } from '../i18n/ui';
import { T } from '../styles/palette';
import { MarkdownBlocks } from './Brief';
import { Finestra } from './primitives';

const TITOLARE = (import.meta.env.VITE_PRIVACY_OWNER as string | undefined) || '[titolare da completare]';
const CONTATTO = (import.meta.env.VITE_PRIVACY_CONTACT as string | undefined) || '[contatto da completare]';

export function PrivacyModal({ onClose }: { readonly onClose: () => void }) {
  const id = idAnonimoAttuale();
  const testo = tr('Privacy.testo', { titolare: TITOLARE, contatto: CONTATTO, data: tr('Privacy.data') });

  return (
    <Finestra
      titolo={tr('Privacy.titolo')}
      onClose={onClose}
      larghezza={720}
      zIndex={120}
      chiudiLabel={tr('SkillGrimoireModal.12')}
      bodyStyle={{ fontSize: 16, lineHeight: 1.5, color: T.tenue }}
    >
      <div className="dd-selezionabile">
        <MarkdownBlocks src={testo} />
        {id && (
          <p style={idStyle}>
            {tr('Privacy.tuoId')} <code style={{ fontFamily: 'var(--font-griglia)', color: T.accento }}>{id}</code>
          </p>
        )}
      </div>
    </Finestra>
  );
}

/** Pulsante-link "Privacy" da mettere nei menu. */
export function PrivacyLink({ onOpen, colore = T.testo }: { readonly onOpen: () => void; readonly colore?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: colore, textDecoration: 'underline', textUnderlineOffset: 3, fontFamily: 'inherit', fontSize: 'inherit' }}
    >
      {tr('Privacy.link')}
    </button>
  );
}

const idStyle: React.CSSProperties = {
  margin: '12px 0 0',
  padding: 10,
  background: T.abisso,
  border: `2px dashed ${T.linea}`,
  fontSize: 13,
};

/**
 * Selettore della lingua: EN / IT.
 *
 * Cambiare lingua salva la scelta e ricarica l'app. Le tabelle di testo
 * calcolate al caricamento (scorciatoie, messaggi del grader, skill, livelli)
 * ripartono cosi' tutte nella lingua giusta, senza stati a meta'. Il selettore
 * sta solo dove ricaricare non costa nulla: titolo e impostazioni.
 */

import { LANGUAGES, setLanguage, type Language } from '../i18n/language';
import { tr, useLanguage } from '../i18n/ui';
import { PALETTE } from '../styles/palette';

const NOME: Record<Language, string> = { en: 'EN', it: 'IT' };
const NOME_ESTESO: Record<Language, string> = { en: 'English', it: 'Italiano' };

export function LanguageSwitch({ compatto = false }: { readonly compatto?: boolean }) {
  const corrente = useLanguage();

  const scegli = (lang: Language) => {
    if (lang === corrente) return;
    setLanguage(lang);
    window.location.reload();
  };

  return (
    <div role="group" aria-label={tr('LanguageSwitch.label')} style={{ display: 'inline-flex', gap: 4 }}>
      {LANGUAGES.map((lang) => {
        const attivo = lang === corrente;
        return (
          <button
            key={lang}
            type="button"
            lang={lang}
            aria-pressed={attivo}
            title={NOME_ESTESO[lang]}
            onClick={() => scegli(lang)}
            style={{
              fontFamily: 'var(--font-titolo)',
              fontSize: compatto ? 13 : 15,
              color: attivo ? PALETTE.inchiostro : PALETTE.bianco,
              background: attivo ? PALETTE.ambra : PALETTE.grafite,
              border: `2px solid ${PALETTE.inchiostro}`,
              padding: compatto ? '2px 8px' : '4px 12px',
              cursor: attivo ? 'default' : 'pointer',
            }}
          >
            {NOME[lang]}
          </button>
        );
      })}
    </div>
  );
}

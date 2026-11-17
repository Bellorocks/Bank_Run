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
import { track } from '../analytics/analytics';

const NOME: Record<Language, string> = { en: 'EN', it: 'IT' };
const NOME_ESTESO: Record<Language, string> = { en: 'English', it: 'Italiano' };

export function LanguageSwitch({ compatto = false }: { readonly compatto?: boolean }) {
  const corrente = useLanguage();

  const scegli = (lang: Language) => {
    if (lang === corrente) return;
    track('language_change', { from: corrente, to: lang });
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
            className={attivo ? 'br-linguetta is-scelta' : 'br-linguetta'}
            style={{
              padding: compatto ? '5px 9px' : '8px 14px',
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

/**
 * I test sono scritti contro i testi italiani: si fissa la lingua prima che i
 * moduli con tabelle di testo (scorciatoie, messaggi, skill) vengano caricati.
 * I test della versione inglese la impostano esplicitamente.
 */
import { setLanguage } from './i18n/language';

setLanguage('it');

import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { tr } from './i18n/ui';
import { loadContent } from './i18n/content';
import { getLanguage } from './i18n/language';
import { avviaStatistiche } from './analytics/analytics';

const root = document.getElementById('root');
if (!root) throw new Error('#root mancante in index.html');

/*
 * Il menu contestuale del webview non deve mai comparire: nei livelli SPEEDRUN
 * il mouse e' disabilitato hard, e un menu di sistema che si apre romperebbe
 * sia l'immersione sia il conteggio degli input.
 */
window.addEventListener('contextmenu', (e) => e.preventDefault());

document.title = tr('app.documentTitle');
avviaStatistiche();

// I testi dei livelli arrivano prima dell'app: i template li leggono mentre generano.
void Promise.all([loadContent(getLanguage()), import('./App')]).then(([, { default: App }]) => {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

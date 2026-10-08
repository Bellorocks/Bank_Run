import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root mancante in index.html');

/*
 * Il menu contestuale del webview non deve mai comparire: nei livelli SPEEDRUN
 * il mouse e' disabilitato hard, e un menu di sistema che si apre romperebbe
 * sia l'immersione sia il conteggio degli input.
 */
window.addEventListener('contextmenu', (e) => e.preventDefault());

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/**
 * Cattura della tastiera a livello di finestra (spec §3.2).
 *
 * Perche' sulla finestra e non sulla griglia: molte scorciatoie di Excel sono
 * anche scorciatoie del browser o del sistema — Ctrl+D aggiunge un segnalibro,
 * Ctrl+P stampa, Alt apre la barra dei menu, F5 ricarica. Se non le si
 * intercetta prima, il gioco allena una muscle memory che poi non funziona, che
 * e' peggio di non allenarla affatto.
 *
 * `capture: true` serve proprio a questo: arrivare prima di chiunque altro.
 */

import { useEffect } from 'react';
import type { GridSession } from '../game/session';

/** Campi in cui l'utente sta scrivendo davvero: li' i tasti sono suoi. */
function isTypingElsewhere(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export interface KeyboardOptions {
  /** Disattiva la cattura, es. mentre e' aperto un dialogo modale. */
  readonly enabled?: boolean;
  /** Chiamata quando un tasto NON viene consumato: utile per diagnosticare buchi nella keymap. */
  readonly onUnhandled?: (ev: KeyboardEvent) => void;
}

export function useWindowKeyboard(session: GridSession, opts: KeyboardOptions = {}): void {
  const { enabled = true, onUnhandled } = opts;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (ev: KeyboardEvent): void => {
      if (isTypingElsewhere(ev.target)) return;

      const consumato = session.handleKey({
        key: ev.key,
        code: ev.code,
        ctrlKey: ev.ctrlKey,
        shiftKey: ev.shiftKey,
        altKey: ev.altKey,
        metaKey: ev.metaKey,
        repeat: ev.repeat,
      });

      if (consumato) {
        ev.preventDefault();
        ev.stopPropagation();
      } else {
        onUnhandled?.(ev);
      }
    };

    /*
     * Il solo `keydown` non basta per Alt: premuto e rilasciato da solo, su
     * Windows il tasto Alt attiva la barra dei menu del webview al KEYUP. Va
     * neutralizzato li', altrimenti la prima sequenza Alt del giocatore apre un
     * menu di sistema invece del ramo Home.
     */
    const onKeyUp = (ev: KeyboardEvent): void => {
      if (ev.key === 'Alt' && !isTypingElsewhere(ev.target)) ev.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
    };
  }, [session, enabled, onUnhandled]);
}

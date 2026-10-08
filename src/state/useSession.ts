/**
 * Aggancio fra `GridSession` e React.
 *
 * La sessione e' una classe normale con un proprio meccanismo di notifica: il
 * ponte e' `useSyncExternalStore`, non uno stato React duplicato. Duplicarlo
 * significherebbe due verita' sulla cella attiva, ed e' esattamente il bug che
 * rende una griglia "quasi giusta" — cursore da una parte, rettangolo blu
 * dall'altra.
 */

import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { GridSession, SessionSnapshot } from '../game/session';

/**
 * `snapshot()` costruisce un oggetto nuovo a ogni chiamata, mentre
 * `useSyncExternalStore` pretende che il getter restituisca lo stesso
 * riferimento finche' nulla cambia. Lo snapshot viene quindi memorizzato qui e
 * rinfrescato solo quando la sessione notifica: e' il minimo necessario, e non
 * richiede di modificare la sessione per compiacere React.
 */
export function useSessionSnapshot(session: GridSession): SessionSnapshot {
  const cache = useRef<SessionSnapshot | null>(null);
  if (cache.current === null) cache.current = session.snapshot();

  const subscribe = useCallback(
    (onChange: () => void) =>
      session.subscribe((s) => {
        cache.current = s;
        onChange();
      }),
    [session],
  );

  const getSnapshot = useCallback(() => {
    if (cache.current === null) cache.current = session.snapshot();
    return cache.current;
  }, [session]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Barra della formula, con evidenziazione a colori dei riferimenti (spec §3.1).
 *
 * Non e' un `<input>`. Il testo in modifica vive dentro `GridSession`, e la
 * barra lo disegna: due editor sullo stesso testo sono due verita', e la prima
 * volta che divergono l'utente perde quello che ha scritto. Il cursore e' quindi
 * simulato a partire da `EditState`, che e' anche cio' che rende testabile
 * l'editing senza DOM.
 *
 * Il Name box invece e' un input vero: e' l'unico punto in cui si digita
 * qualcosa che non e' contenuto di cella (F5 / Ctrl+G / vai a).
 */

import { useEffect, useRef, useState } from 'react';
import { coordToA1, rangeToA1 } from '../engine/address';
import { collectRefsFromText, assignRefColors } from '../engine/formula/refs';
import { PALETTE, UI } from '../styles/palette';
import type { GridSession, SessionSnapshot } from '../game/session';

import { tr } from '../i18n/ui';
/** Tavolozza dei riferimenti: colori distinguibili anche accostati, presi dalla palette di §8. */
const REF_COLORS = [
  PALETTE.oltremare,
  PALETTE.rubino,
  PALETTE.smeraldo,
  PALETTE.corallo,
  PALETTE.prugna,
  PALETTE.petrolio,
  PALETTE.ambra,
] as const;

export interface FormulaBarProps {
  readonly session: GridSession;
  readonly snap: SessionSnapshot;
}

export function FormulaBar({ session, snap }: FormulaBarProps): JSX.Element {
  const inEditing = snap.edit.mode !== 'ready';
  const testo = inEditing ? snap.edit.text : session.formulaBarText();

  return (
    <div style={barraStyle}>
      <NameBox session={session} snap={snap} />
      <div style={fxStyle} title={tr('FormulaBar.1')}>fx</div>
      <div style={campoStyle} className="dd-selezionabile">
        <TestoColorato
          testo={testo}
          caret={inEditing ? snap.edit.selectionStart : null}
          caretFine={inEditing ? snap.edit.selectionEnd : null}
        />
      </div>
    </div>
  );
}

/**
 * Colora i riferimenti e disegna il cursore. Il testo viene spezzato nei segmenti
 * fra un riferimento e l'altro: `collectRefsFromText` restituisce le posizioni
 * esatte nel sorgente, quindi non serve ricostruire nulla a mano.
 */
function TestoColorato({
  testo,
  caret,
  caretFine,
}: {
  testo: string;
  caret: number | null;
  caretFine: number | null;
}): JSX.Element {
  const pezzi: JSX.Element[] = [];

  // I riferimenti si evidenziano solo dentro una formula: in un testo normale
  // "A1" e' una sigla qualsiasi e colorarla sarebbe rumore.
  const refs = testo.startsWith('=')
    ? assignRefColors(collectRefsFromText(testo), REF_COLORS.length)
    : [];

  let cursore = 0;
  const push = (da: number, a: number, colore?: string): void => {
    if (a <= da) return;
    pezzi.push(
      <span key={`${da}-${a}`} style={colore ? { color: colore } : undefined}>
        {testo.slice(da, a)}
      </span>,
    );
  };

  for (const r of refs) {
    if (r.start < cursore) continue; // riferimenti annidati: il primo vince
    push(cursore, r.start);
    push(r.start, r.end, REF_COLORS[r.colorIndex]);
    cursore = r.end;
  }
  push(cursore, testo.length);

  return (
    <span style={{ position: 'relative', whiteSpace: 'pre' }}>
      {pezzi}
      {caret !== null && (
        <span
          className="dd-caret"
          style={{
            position: 'absolute',
            left: `${caret}ch`,
            top: 0,
            bottom: 0,
            width: caretFine !== null && caretFine > caret ? `${caretFine - caret}ch` : '1px',
            background: caretFine !== null && caretFine > caret ? 'rgba(65,166,246,0.35)' : UI.accento,
          }}
        />
      )}
    </span>
  );
}

/** Name box: mostra l'indirizzo corrente e accetta un riferimento a cui saltare. */
function NameBox({ session, snap }: FormulaBarProps): JSX.Element {
  const [bozza, setBozza] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const area = snap.selection.areas[snap.selection.activeArea]?.range;
  const etichetta =
    area && (area.top !== area.bottom || area.left !== area.right)
      ? rangeToA1(area)
      : coordToA1(snap.selection.active);

  useEffect(() => {
    if (bozza === null) input.current?.blur();
  }, [bozza]);

  return (
    <input
      ref={input}
      value={bozza ?? etichetta}
      onChange={(e) => setBozza(e.target.value)}
      onFocus={() => setBozza(etichetta)}
      onKeyDown={(e) => {
        // L'input e' un'isola: i suoi tasti non devono raggiungere la griglia.
        e.stopPropagation();
        if (e.key === 'Enter') {
          const ok = session.goToReference((bozza ?? '').trim());
          setBozza(null);
          if (!ok) input.current?.select();
        } else if (e.key === 'Escape') {
          setBozza(null);
        }
      }}
      onBlur={() => setBozza(null)}
      spellCheck={false}
      style={nameBoxStyle}
      title={tr('FormulaBar.2')}
    />
  );
}

const barraStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  height: 28,
  background: PALETTE.bianco,
  borderBottom: `2px solid ${PALETTE.nebbia}`,
  fontFamily: 'var(--font-griglia)',
  fontSize: 13,
};

const nameBoxStyle: React.CSSProperties = {
  width: 120,
  background: PALETTE.nebbia + '33',
  color: PALETTE.inchiostro,
  border: 'none',
  borderRight: `2px solid ${PALETTE.nebbia}`,
  padding: '0 8px',
  fontFamily: 'var(--font-griglia)',
  fontSize: 13,
  fontWeight: 'bold',
  outline: 'none',
};

const fxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '0 10px',
  color: PALETTE.smeraldo,
  fontWeight: 'bold',
  fontStyle: 'italic',
  borderRight: `2px solid ${PALETTE.nebbia}`,
};

const campoStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  padding: '0 10px',
  color: PALETTE.inchiostro,
  background: PALETTE.bianco,
  overflow: 'hidden',
};

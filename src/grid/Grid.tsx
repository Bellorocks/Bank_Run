/**
 * La griglia.
 *
 * Disegna e basta: ogni comportamento vive in `GridSession`. Se un giorno la
 * logica comincia a filtrare qui dentro smette di essere testabile senza DOM,
 * ed e' proprio quel test che tiene in piedi la fedelta' a Excel.
 *
 * Struttura a quattro regioni, come Excel con i riquadri bloccati:
 *
 *      ┌──────────┬──────────────────────┐
 *      │  angolo  │  intestazioni + righe│   ← non scorre in verticale
 *      │  fisso   │  bloccate            │
 *      ├──────────┼──────────────────────┤
 *      │ colonne  │                      │
 *      │ bloccate │   area scorrevole    │
 *      │          │                      │
 *      └──────────┴──────────────────────┘
 *        ↑ non scorre in orizzontale
 *
 * Solo l'area in basso a destra ha lo scroll nativo; le bande si riposizionano
 * seguendo `scrollLeft`/`scrollTop`. E' l'unico modo per avere barre di
 * scorrimento vere e riquadri bloccati che non tremano.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { colToLetters, LAST_COL, LAST_ROW, rangeContains, type CellCoord } from '../engine/address';
import {
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  HEADER_COL_WIDTH,
  HEADER_ROW_HEIGHT,
} from '../engine/types';
import { PALETTE, UI } from '../styles/palette';
import type { GridSession, SessionSnapshot } from '../game/session';
import { Axis, indicesInViewport } from './geometry';
import { DEFAULT_CHAR_PX as CHAR_PX, displayCell } from './cellDisplay';

import { tr } from '../i18n/ui';
/**
 * Quante righe e colonne oltre l'area utilizzata restano raggiungibili con lo
 * scroll. Il foglio ne ha 1.048.576, ma materializzare una barra di scorrimento
 * lunga ventidue chilometri e' inutile: anche Excel dimensiona lo scroll
 * sull'area usata. La navigazione da tastiera resta comunque libera di
 * arrivare all'ultima riga — e quando ci arriva, questa finestra la segue.
 */
const MARGINE_RIGHE = 60;
const MARGINE_COLONNE = 12;

export interface GridProps {
  readonly session: GridSession;
  readonly snap: SessionSnapshot;
}

export function Grid({ session, snap }: GridProps): JSX.Element {
  const scroller = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ left: 0, top: 0 });
  const [viewport, setViewport] = useState({ width: 800, height: 600 });

  const wb = session.workbook;
  const sheet = snap.sheet;
  const layout = wb.layout(sheet);

  // Gli assi si ricostruiscono quando cambia il foglio o una qualunque scrittura
  // (la revisione avanza a ogni comando): sono immutabili per scelta, cosi' il
  // resto del componente puo' fidarsi dell'identita'.
  const colAxis = useMemo(
    () =>
      new Axis({
        sizes: layout.colWidths,
        hidden: layout.hiddenCols,
        defaultSize: DEFAULT_COL_WIDTH,
        count: LAST_COL,
      }),
    [layout, snap.revision],
  );
  const rowAxis = useMemo(
    () =>
      new Axis({
        sizes: layout.rowHeights,
        hidden: layout.hiddenRows,
        defaultSize: DEFAULT_ROW_HEIGHT,
        count: LAST_ROW,
      }),
    [layout, snap.revision],
  );

  const frozenRows = layout.frozenRows;
  const frozenCols = layout.frozenCols;
  const bandaW = colAxis.offset(frozenCols);
  const bandaH = rowAxis.offset(frozenRows);
  const originX = HEADER_COL_WIDTH + bandaW;
  const originY = HEADER_ROW_HEIGHT + bandaH;

  const usato = wb.usedRange(sheet);
  const righeDaRendere = Math.min(
    LAST_ROW + 1,
    Math.max((usato?.bottom ?? 0) + 1, snap.selection.active.row + 1) + MARGINE_RIGHE,
  );
  const colonneDaRendere = Math.min(
    LAST_COL + 1,
    Math.max((usato?.right ?? 0) + 1, snap.selection.active.col + 1) + MARGINE_COLONNE,
  );

  const rowVirt = useVirtualizer({
    count: Math.max(0, righeDaRendere - frozenRows),
    getScrollElement: () => scroller.current,
    estimateSize: (i) => rowAxis.size(frozenRows + i),
    overscan: 6,
  });
  const colVirt = useVirtualizer({
    horizontal: true,
    count: Math.max(0, colonneDaRendere - frozenCols),
    getScrollElement: () => scroller.current,
    estimateSize: (i) => colAxis.size(frozenCols + i),
    overscan: 4,
  });

  // Le dimensioni stimate dipendono dagli assi: quando cambiano (una colonna
  // allargata, una riga nascosta) il virtualizzatore va rimisurato, o continua
  // a posizionare le celle con le misure vecchie.
  useEffect(() => {
    rowVirt.measure();
    colVirt.measure();
  }, [rowAxis, colAxis, rowVirt, colVirt]);

  // La sessione deve sapere quante righe stanno in una schermata: PagSu e
  // PagGiu si muovono di una finestra, non di un numero fisso di righe.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const misura = (): void => {
      const rect = el.getBoundingClientRect();
      setViewport({ width: rect.width, height: rect.height });
      session.setViewport(
        indicesInViewport(rowAxis, snap.selection.active.row, rect.height),
        indicesInViewport(colAxis, snap.selection.active.col, rect.width),
      );
    };
    misura();
    const ro = new ResizeObserver(misura);
    ro.observe(el);
    return () => ro.disconnect();
  }, [session, rowAxis, colAxis, snap.selection.active.row, snap.selection.active.col]);

  // Portare in vista la cella attiva. Va fatto dopo il render, altrimenti si
  // scorre usando misure che non esistono ancora.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const { row, col } = snap.selection.active;
    if (row < frozenRows && col < frozenCols) return; // gia' dentro l'angolo fisso

    const yTarget =
      row >= frozenRows
        ? rowAxis.scrollToShow(row, el.scrollTop + bandaH, viewport.height + bandaH, 0) - bandaH
        : el.scrollTop;
    const xTarget =
      col >= frozenCols
        ? colAxis.scrollToShow(col, el.scrollLeft + bandaW, viewport.width + bandaW, 0) - bandaW
        : el.scrollLeft;

    if (Math.abs(yTarget - el.scrollTop) > 0.5) el.scrollTop = Math.max(0, yTarget);
    if (Math.abs(xTarget - el.scrollLeft) > 0.5) el.scrollLeft = Math.max(0, xTarget);
  }, [snap.selection.active, snap.revision, rowAxis, colAxis, bandaH, bandaW, frozenRows, frozenCols, viewport]);

  const onScroll = useCallback((): void => {
    const el = scroller.current;
    if (!el) return;
    setScroll({ left: el.scrollLeft, top: el.scrollTop });
  }, []);

  /** Da coordinate del puntatore a coordinate di cella. */
  const cellaDaPuntatore = useCallback(
    (clientX: number, clientY: number): CellCoord | null => {
      const el = scroller.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      // Dentro le bande bloccate non si scorre: li' il pixel e' assoluto.
      const col = x < bandaW ? colAxis.indexAt(x) : colAxis.indexAt(x + el.scrollLeft);
      const row = y < bandaH ? rowAxis.indexAt(y) : rowAxis.indexAt(y + el.scrollTop);
      return { row, col };
    },
    [colAxis, rowAxis, bandaW, bandaH],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent): void => {
      const c = cellaDaPuntatore(e.clientX, e.clientY);
      if (!c) return;
      session.clickCell(c, { extend: e.shiftKey, addArea: e.ctrlKey });
    },
    [session, cellaDaPuntatore],
  );

  // ---------------------------------------------------------------------------

  const righeVisibili = rowVirt.getVirtualItems();
  const colonneVisibili = colVirt.getVirtualItems();

  const cella = (row: number, col: number, x: number, y: number, w: number, h: number): JSX.Element | null => {
    if (w === 0 || h === 0) return null;
    const coord = { row, col };
    const selezionata = snap.selection.areas.some((a) => rangeContains(a.range, coord));
    const attiva = snap.selection.active.row === row && snap.selection.active.col === col;
    const bloccata = wb.isLocked(sheet, coord);

    const inEditing = snap.edit.mode !== 'ready' && snap.edit.cell?.row === row && snap.edit.cell?.col === col;

    const d = inEditing
      ? { text: snap.edit.text, align: 'left' as const, color: undefined, isError: false }
      : displayCell({
          value: wb.getValue(sheet, coord),
          formula: wb.getFormula(sheet, coord),
          style: wb.getStyle(sheet, coord),
          showFormulas: snap.showFormulas,
          widthPx: w,
        });

    const style = wb.getStyle(sheet, coord);

    // Come in Excel, un testo allineato a sinistra troppo lungo deborda sulle celle
    // vuote alla sua destra e si ferma alla prima piena. Senza questo, le etichette
    // di una colonna stretta si leggono a meta' ("Interessi passi").
    let larghezzaTesto = w;
    if (!inEditing && !d.isError && d.align === 'left' && typeof wb.getValue(sheet, coord) === 'string' && d.text.length * CHAR_PX > w - 8) {
      for (let k = col + 1; k <= col + 15; k++) {
        if (!wb.isEmpty(sheet, { row, col: k }) || (snap.edit.mode !== 'ready' && snap.edit.cell?.row === row && snap.edit.cell?.col === k)) break;
        larghezzaTesto += colAxis.size(k);
      }
    }
    const deborda = larghezzaTesto > w;

    return (
      <div
        key={`${row}:${col}`}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          padding: '0 4px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            d.align === 'right' ? 'flex-end' : d.align === 'center' ? 'center' : 'flex-start',
          background: bloccata
            ? PALETTE.nebbia + '44'
            : selezionata && !attiva
              ? PALETTE.ghiaccio + '88'
              : PALETTE.bianco,
          color: d.color ?? PALETTE.inchiostro,
          fontWeight: style.bold ? 700 : 400,
          fontStyle: style.italic ? 'italic' : 'normal',
          textDecoration: style.underline ? 'underline' : 'none',
          borderRight: `1px solid ${PALETTE.nebbia}88`,
          borderBottom: `1px solid ${PALETTE.nebbia}88`,
          outline: attiva ? `2px solid ${PALETTE.smeraldo}` : undefined,
          outlineOffset: -2,
          overflow: deborda ? 'visible' : 'hidden',
          whiteSpace: 'pre',
          zIndex: attiva ? 3 : deborda ? 1 : undefined,
        }}
      >
        {deborda ? (
          <span style={{ display: 'block', width: larghezzaTesto - 8, flex: 'none', overflow: 'hidden' }}>{d.text}</span>
        ) : (
          d.text
        )}
        {inEditing && <span style={caretStyle} />}
      </div>
    );
  };

  const intestazioneCol = (col: number, x: number, w: number): JSX.Element | null => {
    if (w === 0) return null;
    const evidenziata = snap.selection.areas.some((a) => col >= a.range.left && col <= a.range.right);
    return (
      <div
        key={`c${col}`}
        onMouseDown={(e) => {
          e.stopPropagation();
          session.clickCell({ row: snap.selection.active.row, col });
          session.execute('structure.selectColumn');
        }}
        style={{
          ...headerStyle,
          left: x,
          top: 0,
          width: w,
          height: HEADER_ROW_HEIGHT,
          background: evidenziata ? PALETTE.ambra : PALETTE.nebbia + '55',
          fontWeight: evidenziata ? 700 : 500,
        }}
      >
        {colToLetters(col)}
      </div>
    );
  };

  const intestazioneRiga = (row: number, y: number, h: number): JSX.Element | null => {
    if (h === 0) return null;
    const evidenziata = snap.selection.areas.some((a) => row >= a.range.top && row <= a.range.bottom);
    return (
      <div
        key={`r${row}`}
        onMouseDown={(e) => {
          e.stopPropagation();
          session.clickCell({ row, col: snap.selection.active.col });
          session.execute('structure.selectRow');
        }}
        style={{
          ...headerStyle,
          left: 0,
          top: y,
          width: HEADER_COL_WIDTH,
          height: h,
          background: evidenziata ? PALETTE.ambra : PALETTE.nebbia + '55',
          fontWeight: evidenziata ? 700 : 500,
        }}
      >
        {row + 1}
      </div>
    );
  };

  const angoloFisso = (): JSX.Element => (
    <div
      key="corner"
      onMouseDown={(e) => {
        e.stopPropagation();
        session.execute('edit.selectAll');
      }}
      style={{
        ...headerStyle,
        left: 0,
        top: 0,
        width: HEADER_COL_WIDTH,
        height: HEADER_ROW_HEIGHT,
        zIndex: 5,
        cursor: 'pointer',
        background: PALETTE.ambra + '88',
      }}
      title={tr('Grid.1')}
    />
  );

  const colonneFisse = Array.from({ length: frozenCols }, (_, c) => c);
  const righeFisse = Array.from({ length: frozenRows }, (_, r) => r);

  return (
    <div className="dd-grid" style={contenitoreStyle} onMouseDown={onMouseDown}>
      {angoloFisso()}
      {/* angolo: intestazioni + eventuali righe/colonne bloccate, sempre fermo */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: originX, height: originY, zIndex: 4, background: PALETTE.bianco, borderRight: `1px solid ${PALETTE.nebbia}`, borderBottom: `1px solid ${PALETTE.nebbia}` }}>
        {colonneFisse.map((c) => intestazioneCol(c, HEADER_COL_WIDTH + colAxis.offset(c), colAxis.size(c)))}
        {righeFisse.map((r) => intestazioneRiga(r, HEADER_ROW_HEIGHT + rowAxis.offset(r), rowAxis.size(r)))}
        {righeFisse.map((r) =>
          colonneFisse.map((c) =>
            cella(r, c, HEADER_COL_WIDTH + colAxis.offset(c), HEADER_ROW_HEIGHT + rowAxis.offset(r), colAxis.size(c), rowAxis.size(r)),
          ),
        )}
      </div>

      {/* banda superiore: intestazioni di colonna e righe bloccate, scorre solo in orizzontale */}
      <div style={{ position: 'absolute', left: originX, top: 0, right: 0, height: originY, overflow: 'hidden', zIndex: 3, background: PALETTE.bianco, borderBottom: `1px solid ${PALETTE.nebbia}` }}>
        <div style={{ position: 'absolute', left: -scroll.left, top: 0, height: '100%' }}>
          {colonneVisibili.map((cv) => intestazioneCol(frozenCols + cv.index, cv.start, cv.size))}
          {righeFisse.map((r) =>
            colonneVisibili.map((cv) =>
              cella(r, frozenCols + cv.index, cv.start, HEADER_ROW_HEIGHT + rowAxis.offset(r), cv.size, rowAxis.size(r)),
            ),
          )}
        </div>
      </div>

      {/* banda sinistra: intestazioni di riga e colonne bloccate, scorre solo in verticale */}
      <div style={{ position: 'absolute', left: 0, top: originY, width: originX, bottom: 0, overflow: 'hidden', zIndex: 3, background: PALETTE.bianco, borderRight: `1px solid ${PALETTE.nebbia}` }}>
        <div style={{ position: 'absolute', left: 0, top: -scroll.top, width: '100%' }}>
          {righeVisibili.map((rv) => intestazioneRiga(frozenRows + rv.index, rv.start, rv.size))}
          {righeVisibili.map((rv) =>
            colonneFisse.map((c) =>
              cella(frozenRows + rv.index, c, HEADER_COL_WIDTH + colAxis.offset(c), rv.start, colAxis.size(c), rv.size),
            ),
          )}
        </div>
      </div>

      {/* area scorrevole */}
      <div
        ref={scroller}
        onScroll={onScroll}
        style={{ position: 'absolute', left: originX, top: originY, right: 0, bottom: 0, overflow: 'auto', background: PALETTE.bianco }}
      >
        <div style={{ width: colVirt.getTotalSize(), height: rowVirt.getTotalSize(), position: 'relative' }}>
          {righeVisibili.map((rv) =>
            colonneVisibili.map((cv) =>
              cella(frozenRows + rv.index, frozenCols + cv.index, cv.start, rv.start, cv.size, rv.size),
            ),
          )}
        </div>
      </div>
    </div>
  );
}

const contenitoreStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: PALETTE.bianco,
  fontFamily: 'var(--font-griglia)',
  fontSize: 13,
  userSelect: 'none',
};

const headerStyle: React.CSSProperties = {
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: PALETTE.inchiostro,
  background: PALETTE.nebbia + '55',
  borderRight: `1px solid ${PALETTE.nebbia}`,
  borderBottom: `1px solid ${PALETTE.nebbia}`,
  boxSizing: 'border-box',
  fontSize: 11,
  cursor: 'default',
};

const caretStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 1,
  height: '1.1em',
  marginLeft: 1,
  background: UI.accento,
  animation: 'dd-blink 1s steps(2, start) infinite',
};

/**
 * Overlay delle scorciatoie, richiamabile con "?" (spec §3.2, §9 punto 6).
 *
 * Consultarlo e' legittimo — e' li' apposta — ma non e' gratis: tenerlo aperto
 * costa XP (spec §3.2, §6: malus del 5%). Il promemoria in fondo non e' un
 * dettaglio, e' la meccanica che spinge a smettere di consultarlo.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { CHEAT_SHEET, searchCheatSheet, type CheatSheetRow } from '../keymap/cheatSheet';
import { T, UI } from '../styles/palette';
import { Badge } from './primitives';

import { tr } from '../i18n/ui';
export interface CheatSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function CheatSheet({ open, onClose }: CheatSheetProps) {
  const [query, setQuery] = useState('');

  // Si azzera la ricerca ogni volta che si riapre: altrimenti l'utente ritrova
  // il filtro dell'ultima apertura e crede che manchino righe.
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const risultati = useMemo(() => (query.trim() === '' ? null : searchCheatSheet(query)), [query]);

  if (!open) return null;

  return (
    <div
      className="br-velo"
      style={{ zIndex: 100 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="br-pannello br-pannello--acceso br-finestra" style={pannelloStyle}>
        <header className="br-pannello__testa" style={{ padding: '10px 12px' }}>
          <span className="br-pannello__titolo" style={{ fontSize: 14 }}>
            {tr('CheatSheet.1')}
          </span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') onClose();
            }}
            placeholder={tr('CheatSheet.2')}
            spellCheck={false}
            style={ricercaStyle}
          />
          <button type="button" onClick={onClose} className="br-btn br-btn--fantasma br-btn--piccolo" title={tr('CheatSheet.3')}>
            ✕ <span className="br-kbd">ESC</span>
          </button>
        </header>

        <div style={corpoStyle}>
          {risultati ? (
            <Sezione titolo={tr('CheatSheet.4', { query })} rows={risultati} />
          ) : (
            CHEAT_SHEET.map((s) => <Sezione key={s.category} titolo={s.title} rows={s.rows} />)
          )}
          {risultati && risultati.length === 0 && (
            <p style={{ color: UI.testoTenue, fontFamily: 'var(--font-testo)', fontSize: 16 }}>
              {tr('CheatSheet.5')}
            </p>
          )}
        </div>

        <footer style={piedeStyle}>
          <Badge colore={UI.attenzione} pieno>
            −5% XP
          </Badge>
          <span style={{ color: UI.testoTenue, fontFamily: 'var(--font-testo)', fontSize: 15 }}>
            {tr('CheatSheet.6')}
          </span>
        </footer>
      </div>
    </div>
  );
}

function Sezione({ titolo, rows }: { titolo: string; rows: readonly CheatSheetRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section style={{ marginBottom: 18 }}>
      <h3 style={titoloSezioneStyle}>{titolo}</h3>
      <table style={tabellaStyle}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.command}-${i}`}>
              <td style={{ ...cellaStyle, width: 200, color: T.accento, fontFamily: 'var(--font-griglia)', fontSize: 13 }}>
                {r.keys}
              </td>
              <td style={cellaStyle}>
                {r.description}
                {r.context && <span style={{ color: UI.testoTenue }}> ({r.context})</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const pannelloStyle: CSSProperties = {
  width: 'min(860px, 92vw)',
  height: 'min(660px, 88vh)',
};

const ricercaStyle: CSSProperties = {
  flex: 1,
  background: T.abisso,
  border: `2px solid ${T.linea}`,
  color: T.testo,
  padding: '6px 10px',
  fontFamily: 'var(--font-griglia)',
  fontSize: 13,
  outline: 'none',
};

const corpoStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 16,
};

const piedeStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  borderTop: `2px solid ${T.linea}`,
  background: T.rialzo,
};

const titoloSezioneStyle: CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  fontSize: 12,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: T.corallo,
  margin: '0 0 8px',
  paddingBottom: 6,
  borderBottom: `1px solid ${T.linea}`,
};

const tabellaStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const cellaStyle: CSSProperties = {
  padding: '3px 8px 3px 0',
  fontFamily: 'var(--font-testo)',
  fontSize: 16,
  color: UI.testo,
  verticalAlign: 'top',
};

export default CheatSheet;

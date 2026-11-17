/**
 * I mattoni dell'interfaccia.
 *
 * Regola d'arte: **chrome scuro e netto, contenuto leggibile**. Qui vive il
 * chrome — bordi sottili, nessun raggio, ombre dure. L'aspetto sta nelle classi
 * `br-*` di `global.css` (hover, pressione e animazioni non si fanno con gli
 * stili inline); i componenti scelgono solo la variante.
 *
 * Sono componenti di sola presentazione: nessuno stato globale, nessuno store.
 */

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { T, UI } from '../styles/palette';

import { displayLocale } from '../i18n/language';
// ---------------------------------------------------------------------------
// Stili condivisi
// ---------------------------------------------------------------------------

/** Doppio contorno netto: un bordo colorato e un filo scuro attorno. */
export function bordoPixel(colore: string = UI.bordo, esterno: string = T.abisso): CSSProperties {
  return {
    border: `2px solid ${colore}`,
    boxShadow: `0 0 0 2px ${esterno}`,
    borderRadius: 0,
  };
}

/** Testo da interfaccia: Silkscreen, corto, maiuscolo, spaziato. */
export const TESTO_UI: CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  lineHeight: 1.4,
};

/** Testo lungo: DotGothic16 alla sua taglia nativa, 16px. */
export const TESTO_LUNGO: CSSProperties = {
  fontFamily: 'var(--font-testo)',
  fontSize: 16,
  lineHeight: 1.5,
};

// ---------------------------------------------------------------------------
// Pannello
// ---------------------------------------------------------------------------

/** Le varianti storiche restano accettate: l'aspetto oggi e' uno solo. */
export type VariantePannello = 'scuro' | 'pergamena' | 'legno' | 'castello';

export interface PannelloProps {
  readonly titolo?: string;
  /** Contenuto allineato a destra nella barra del titolo (contatori, pulsanti piccoli). */
  readonly azione?: ReactNode;
  readonly children: ReactNode;
  /** Il corpo scorre invece di crescere. Serve al brief e alla task list. */
  readonly scorrevole?: boolean;
  /** Scanline CRT: ammesse sui pannelli di menu, MAI sulla griglia. */
  readonly crt?: boolean;
  /** Colore del titolo. */
  readonly colore?: string;
  readonly variante?: VariantePannello;
  /** Bordo dorato: il pannello che conta in questo momento. */
  readonly acceso?: boolean;
  readonly style?: CSSProperties;
  readonly bodyStyle?: CSSProperties;
}

export function Pannello({ titolo, azione, children, scorrevole, crt, colore, acceso, style, bodyStyle }: PannelloProps) {
  const classi = ['br-pannello'];
  if (acceso === true) classi.push('br-pannello--acceso');
  if (crt === true) classi.push('br-scan');

  return (
    <section className={classi.join(' ')} style={style}>
      {titolo !== undefined && (
        <header className="br-pannello__testa">
          <h2 className="br-pannello__titolo" style={colore !== undefined ? { color: colore } : undefined}>
            {titolo}
          </h2>
          {azione}
        </header>
      )}
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          padding: 14,
          overflowY: scorrevole === true ? 'auto' : 'visible',
          ...bodyStyle,
        }}
      >
        {children}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pulsante
// ---------------------------------------------------------------------------

export type VariantePulsante = 'primario' | 'secondario' | 'accento' | 'pericolo' | 'fantasma';
export type TagliaPulsante = 'piccolo' | 'normale' | 'grande';

export interface PulsanteProps {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly variante?: VariantePulsante;
  readonly taglia?: TagliaPulsante;
  readonly disabled?: boolean;
  readonly larghezzaPiena?: boolean;
  /** Etichetta del tasto equivalente, mostrata a destra: il gioco si gioca da tastiera. */
  readonly scorciatoia?: string;
  readonly title?: string;
  readonly autoFocus?: boolean;
  readonly style?: CSSProperties;
}

/** Le classi di un pulsante: servono anche a link e pulsanti scritti a mano. */
export function classiPulsante(variante: VariantePulsante = 'secondario', taglia: TagliaPulsante = 'normale'): string {
  const classi = ['br-btn'];
  if (variante !== 'secondario') classi.push(`br-btn--${variante}`);
  if (taglia !== 'normale') classi.push(`br-btn--${taglia}`);
  return classi.join(' ');
}

export function Pulsante({
  children,
  onClick,
  variante = 'secondario',
  taglia = 'normale',
  disabled = false,
  larghezzaPiena = false,
  scorciatoia,
  title,
  autoFocus,
  style,
}: PulsanteProps) {
  return (
    <button
      type="button"
      className={classiPulsante(variante, taglia)}
      onClick={onClick}
      disabled={disabled}
      title={title}
      autoFocus={autoFocus}
      style={{ width: larghezzaPiena ? '100%' : undefined, ...style }}
    >
      <span>{children}</span>
      {scorciatoia !== undefined && <span className="br-kbd">{scorciatoia}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Barra XP
// ---------------------------------------------------------------------------

export interface BarraXpProps {
  readonly valore: number;
  readonly massimo: number;
  /** Quanti segmenti compongono la barra. */
  readonly passi?: number;
  readonly colore?: string;
  readonly etichetta?: string;
  readonly altezza?: number;
  readonly style?: CSSProperties;
}

/**
 * Barra a step, non fluida: il riempimento e' fatto di blocchi discreti, come
 * nei giochi a cui somiglia.
 *
 * Il segmento si accende solo quando e' pieno per davvero (`floor`), tranne
 * l'ultimo, che si accende all'arrivo esatto al massimo: una barra "quasi piena"
 * non deve mai sembrare completa.
 */
export function BarraXp({ valore, massimo, passi = 20, colore = T.oro, etichetta, altezza = 14, style }: BarraXpProps) {
  const quota = massimo > 0 ? Math.max(0, Math.min(1, valore / massimo)) : 0;
  const pieni = quota >= 1 ? passi : Math.floor(quota * passi);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {etichetta !== undefined && (
        <div className="br-label" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{etichetta}</span>
          <span style={{ color: colore, whiteSpace: 'nowrap' }}>
            {Math.round(valore)} / {Math.round(massimo)}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(valore)}
        aria-valuemin={0}
        aria-valuemax={Math.round(massimo)}
        aria-label={etichetta}
        style={{
          display: 'flex',
          gap: 2,
          padding: 2,
          height: altezza,
          background: T.abisso,
          border: `2px solid ${T.linea}`,
        }}
      >
        {Array.from({ length: passi }, (_, i) => (
          <div
            key={i}
            style={{
              flex: '1 1 0',
              background: i < pieni ? colore : T.rialzo,
              boxShadow: i < pieni ? `0 0 6px ${colore}88` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export interface BadgeProps {
  readonly children: ReactNode;
  /** Colore di accento: bordo e testo, oppure sfondo se `pieno`. */
  readonly colore?: string;
  readonly pieno?: boolean;
  readonly title?: string;
  readonly style?: CSSProperties;
}

export function Badge({ children, colore = UI.testoTenue, pieno = false, title, style }: BadgeProps) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        fontFamily: 'var(--font-titolo)',
        fontSize: 12,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        color: pieno ? T.abisso : colore,
        background: pieno ? colore : 'transparent',
        border: `2px solid ${colore}`,
        borderRadius: 0,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Finestra
// ---------------------------------------------------------------------------

/** Le finestre aperte, dalla piu' vecchia alla piu' recente: Esc chiude solo l'ultima. */
const pilaFinestre: symbol[] = [];

export interface FinestraProps {
  readonly titolo: string;
  readonly sottotitolo?: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly larghezza?: number;
  /** Etichetta accessibile del pulsante di chiusura. */
  readonly chiudiLabel?: string;
  readonly zIndex?: number;
  /** Fascia fissa sotto il corpo (pulsanti di conferma). */
  readonly piede?: ReactNode;
  readonly bodyStyle?: CSSProperties;
}

/**
 * Finestra modale: velo scuro, pannello acceso, testata con chiusura.
 * Esc e il clic fuori chiudono; con piu' finestre aperte Esc chiude la piu' recente.
 */
export function Finestra({
  titolo,
  sottotitolo,
  onClose,
  children,
  larghezza = 560,
  chiudiLabel,
  zIndex = 100,
  piede,
  bodyStyle,
}: FinestraProps) {
  const chiudiRef = useRef(onClose);
  chiudiRef.current = onClose;

  useEffect(() => {
    const id = Symbol('finestra');
    pilaFinestre.push(id);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || pilaFinestre[pilaFinestre.length - 1] !== id) return;
      e.stopImmediatePropagation();
      chiudiRef.current();
    };
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('keydown', esc);
      const i = pilaFinestre.indexOf(id);
      if (i >= 0) pilaFinestre.splice(i, 1);
    };
  }, []);

  return (
    <div
      className="br-velo"
      style={{ zIndex }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label={titolo}
        className="br-pannello br-pannello--acceso br-finestra"
        style={{ width: larghezza, maxWidth: '100%', maxHeight: '90vh' }}
      >
        <header className="br-pannello__testa" style={{ padding: '10px 14px' }}>
          <div style={{ minWidth: 0 }}>
            <h2 className="br-pannello__titolo" style={{ fontSize: 14 }}>
              {titolo}
            </h2>
            {sottotitolo !== undefined && (
              <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.35, color: T.tenue }}>{sottotitolo}</div>
            )}
          </div>
          <button
            type="button"
            className="br-btn br-btn--fantasma br-btn--piccolo"
            onClick={onClose}
            aria-label={chiudiLabel ?? 'Esc'}
            style={{ flexShrink: 0 }}
          >
            ✕ <span className="br-kbd">ESC</span>
          </button>
        </header>
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: 18, ...bodyStyle }}>{children}</div>
        {piede !== undefined && (
          <footer
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 10,
              padding: '12px 14px',
              borderTop: `2px solid ${T.linea}`,
              background: T.rialzo,
            }}
          >
            {piede}
          </footer>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formattatori condivisi dai pannelli
// ---------------------------------------------------------------------------

/** `mm:ss` da millisecondi. Oltre l'ora resta a `mm:ss` con i minuti che crescono. */
export function formatDurata(ms: number): string {
  const totale = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totale / 60);
  const s = totale % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Scarto rispetto al par, gia' col segno: `-12s` sotto, `+34s` sopra. */
export function formatScarto(ms: number, parSecondi: number): string {
  const scarto = Math.round(ms / 1000) - parSecondi;
  return `${scarto > 0 ? '+' : scarto < 0 ? '-' : ''}${Math.abs(scarto)}s`;
}

/** Numero con separatore italiano, senza decimali. */
export function formatIntero(n: number): string {
  return Math.round(n).toLocaleString(displayLocale());
}

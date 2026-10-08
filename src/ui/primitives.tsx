/**
 * I mattoni 8-bit dell'interfaccia (spec §8).
 *
 * Regola d'arte: **chrome pixelato, contenuto leggibile**. Qui vive il chrome —
 * bordi netti, nessun raggio, nessuna ombra sfumata, riempimenti a step. Il
 * contenuto lungo (il brief, i messaggi del grader) usa DotGothic16 e resta leggibile.
 *
 * Nessun colore inventato: tutto arriva da `src/styles/palette.ts`. Se un colore
 * non e' nella palette non esiste, e non basta che "stia bene".
 *
 * Sono componenti di sola presentazione: nessuno stato globale, nessuno store.
 * L'unico stato ammesso e' quello puramente visivo (hover, pressione).
 */

import { useState, type CSSProperties, type ReactNode } from 'react';
import { PALETTE, UI } from '../styles/palette';

import { displayLocale } from '../i18n/language';
// ---------------------------------------------------------------------------
// Stili condivisi
// ---------------------------------------------------------------------------

/**
 * Il bordo "pixelato": due contorni netti e concentrici. E' un box-shadow senza
 * sfocatura, quindi resta un rettangolo duro anche a scale diverse — mentre un
 * `border` doppio richiederebbe un elemento in piu' per ogni pannello.
 */
export function bordoPixel(colore: string = UI.bordo, esterno: string = PALETTE.inchiostro): CSSProperties {
  return {
    border: `2px solid ${colore}`,
    boxShadow: `0 0 0 2px ${esterno}`,
    borderRadius: 0,
  };
}

/** Testo da interfaccia: Jersey 25, corto, spaziato. */
export const TESTO_UI: CSSProperties = {
  fontFamily: 'var(--font-titolo)',
  letterSpacing: '0.04em',
  lineHeight: 1.6,
};

/** Testo lungo: DotGothic16, alto e leggibile. */
export const TESTO_LUNGO: CSSProperties = {
  fontFamily: 'var(--font-testo)',
  fontSize: 17,
  lineHeight: 1.45,
};

// ---------------------------------------------------------------------------
export type VariantePannello = 'scuro' | 'pergamena' | 'legno' | 'castello';

export interface PannelloProps {
  readonly titolo?: string;
  /** Contenuto allineato a destra nella barra del titolo (contatori, pulsanti piccoli). */
  readonly azione?: ReactNode;
  readonly children: ReactNode;
  /** Il corpo scorre invece di crescere. Serve al brief e alla task list. */
  readonly scorrevole?: boolean;
  /** Scanline CRT (§8): ammesse sui pannelli di menu, MAI sulla griglia. */
  readonly crt?: boolean;
  readonly colore?: string;
  readonly variante?: VariantePannello;
  readonly style?: CSSProperties;
  readonly bodyStyle?: CSSProperties;
}

export function Pannello({
  titolo,
  azione,
  children,
  scorrevole,
  crt,
  colore = PALETTE.inchiostro,
  variante = 'scuro',
  style,
  bodyStyle,
}: PannelloProps) {
  const isPergamena = variante === 'pergamena';
  const isLegno = variante === 'legno';
  const isCastello = variante === 'castello';

  const bgCorpo = isPergamena ? PALETTE.bianco : isLegno ? PALETTE.bianco : isCastello ? PALETTE.ardesia : PALETTE.bianco;
  const coloreTesto = PALETTE.inchiostro;
  const bgHeader = isPergamena ? PALETTE.ambra : isLegno ? PALETTE.corallo : isCastello ? PALETTE.ardesia : PALETTE.nebbia;
  const headerBordo = colore;

  return (
    <section
      className={crt === true ? 'dd-crt dd-pannello' : 'dd-pannello'}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: bgCorpo,
        color: coloreTesto,
        border: `3px solid ${colore}`,
        boxShadow: `3px 3px 0 ${PALETTE.ardesia}`,
        ...style,
      }}
    >
      {titolo !== undefined && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '8px 10px',
            background: bgHeader,
            borderBottom: `2px solid ${headerBordo}`,
            flex: '0 0 auto',
          }}
        >
          <h2 style={{ ...TESTO_UI, margin: 0, fontSize: 16, color: isPergamena ? PALETTE.inchiostro : PALETTE.bianco }}>{titolo}</h2>
          {azione}
        </header>
      )}
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          padding: 12,
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

export type VariantePulsante = 'primario' | 'secondario' | 'pericolo' | 'fantasma';

interface Livrea {
  readonly sfondo: string;
  readonly testo: string;
  readonly bordo: string;
}

const LIVREE: Readonly<Record<VariantePulsante, Livrea>> = {
  primario: { sfondo: UI.accento, testo: PALETTE.inchiostro, bordo: PALETTE.bianco },
  secondario: { sfondo: PALETTE.notte, testo: UI.testo, bordo: UI.bordo },
  pericolo: { sfondo: UI.errore, testo: PALETTE.bianco, bordo: PALETTE.corallo },
  fantasma: { sfondo: 'transparent', testo: UI.testoTenue, bordo: UI.bordo },
};

export interface PulsanteProps {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly variante?: VariantePulsante;
  readonly disabled?: boolean;
  readonly larghezzaPiena?: boolean;
  /** Etichetta del tasto equivalente, mostrata a destra: il gioco si gioca da tastiera. */
  readonly scorciatoia?: string;
  readonly title?: string;
  readonly autoFocus?: boolean;
  readonly style?: CSSProperties;
}

export function Pulsante({
  children,
  onClick,
  variante = 'secondario',
  disabled = false,
  larghezzaPiena = false,
  scorciatoia,
  title,
  autoFocus,
  style,
}: PulsanteProps) {
  // Hover e pressione sono stato puramente visivo: restano dentro il componente,
  // non risalgono a nessuno store.
  const [hover, setHover] = useState(false);
  const [premuto, setPremuto] = useState(false);
  const livrea = LIVREE[variante];

  const spento = disabled === true;
  const acceso = !spento && (hover || premuto);

  return (
    <button
      type="button"
      onClick={spento ? undefined : onClick}
      disabled={spento}
      title={title}
      autoFocus={autoFocus}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPremuto(false);
      }}
      onMouseDown={() => setPremuto(true)}
      onMouseUp={() => setPremuto(false)}
      style={{
        ...TESTO_UI,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: larghezzaPiena ? '100%' : undefined,
        padding: '10px 14px',
        fontSize: 15,
        cursor: spento ? 'not-allowed' : 'pointer',
        color: spento ? UI.testoTenue : livrea.testo,
        background: spento ? PALETTE.grafite : acceso ? PALETTE.bianco : livrea.sfondo,
        ...bordoPixel(spento ? UI.bordo : livrea.bordo),
        // La pressione sposta il pulsante di 2px: e' l'unica "animazione" che un
        // bottone 8-bit puo' permettersi senza smettere di sembrare disegnato a pixel.
        transform: premuto && !spento ? 'translate(2px, 2px)' : undefined,
        ...style,
      }}
    >
      <span>{children}</span>
      {scorciatoia !== undefined && (
        <span
          style={{
            fontSize: 13,
            padding: '2px 4px',
            color: spento ? UI.testoTenue : PALETTE.inchiostro,
            background: spento ? 'transparent' : PALETTE.nebbia,
            border: `1px solid ${spento ? UI.bordo : PALETTE.inchiostro}`,
          }}
        >
          {scorciatoia}
        </span>
      )}
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
 * Barra a step, non fluida (§8): il riempimento e' fatto di blocchi discreti,
 * come nei giochi a cui somiglia. Un gradiente continuo sarebbe piu' facile e
 * sbagliato.
 *
 * Il segmento si accende solo quando e' pieno per davvero (`floor`), tranne
 * l'ultimo, che si accende all'arrivo esatto al massimo: una barra "quasi piena"
 * non deve mai sembrare completa.
 */
export function BarraXp({
  valore,
  massimo,
  passi = 20,
  colore = UI.accento,
  etichetta,
  altezza = 14,
  style,
}: BarraXpProps) {
  const quota = massimo > 0 ? Math.max(0, Math.min(1, valore / massimo)) : 0;
  const pieni = quota >= 1 ? passi : Math.floor(quota * passi);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {etichetta !== undefined && (
        <div
          style={{
            ...TESTO_UI,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 14,
            color: UI.testoTenue,
          }}
        >
          <span>{etichetta}</span>
          <span style={{ color: colore }}>
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
          background: PALETTE.inchiostro,
          ...bordoPixel(),
        }}
      >
        {Array.from({ length: passi }, (_, i) => (
          <div
            key={i}
            style={{
              flex: '1 1 0',
              background: i < pieni ? colore : PALETTE.grafite,
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
        ...TESTO_UI,
        display: 'inline-block',
        padding: '3px 6px',
        fontSize: 13,
        whiteSpace: 'nowrap',
        color: pieno ? PALETTE.inchiostro : colore,
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

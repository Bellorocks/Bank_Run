/**
 * Il pannello del mandato (spec §9, schermata Gioco).
 *
 * E' il testo che l'utente legge prima di toccare la griglia, quindi vale la
 * regola di §8: chrome pixelato, **contenuto leggibile**. Il corpo usa DotGothic16
 * (`--font-testo`) a corpo grande e interlinea larga; solo il titolo e i badge
 * usano Jersey 25.
 *
 * Il brief e' markdown (vedi i template in `src/content/templates/**`) e viene
 * disegnato come albero React da `markdown.ts`: mai `dangerouslySetInnerHTML`.
 * Un brief e' generato da slot, non da un LLM, ma resta contenuto che finisce a
 * schermo senza passare da una review: trattarlo come dati e' l'unica scelta
 * difendibile.
 */

import { useMemo, type CSSProperties, type ReactNode } from 'react';
import type { LevelMode } from '../content/types';
import { PALETTE, UI } from '../styles/palette';
import { parseMarkdown, type MdInline, type MdNode } from './markdown';
import { Badge, Pannello, TESTO_LUNGO, TESTO_UI } from './primitives';

import { tr } from '../i18n/ui';
// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

const STILE_CODICE: CSSProperties = {
  fontFamily: 'var(--font-griglia)',
  fontSize: 13,
  padding: '1px 4px',
  color: UI.evidenza,
  background: PALETTE.inchiostro,
  border: `1px solid ${UI.bordo}`,
  // La formula in un brief va letta carattere per carattere: qui l'antialiasing
  // serve, mentre il resto dell'interfaccia lo spegne per restare pixelata.
  WebkitFontSmoothing: 'antialiased',
};

function renderInline(nodes: readonly MdInline[]): ReactNode {
  return nodes.map((n, i) => {
    switch (n.kind) {
      case 'text':
        return <span key={i}>{n.text}</span>;
      case 'code':
        return (
          <code key={i} className="dd-selezionabile" style={STILE_CODICE}>
            {n.text}
          </code>
        );
      case 'strong':
        return (
          <strong key={i} style={{ color: PALETTE.inchiostro, fontWeight: 'bold' }}>
            {renderInline(n.children)}
          </strong>
        );
      case 'em':
        return (
          <em key={i} style={{ color: PALETTE.petrolio, fontStyle: 'italic' }}>
            {renderInline(n.children)}
          </em>
        );
    }
  });
}

function renderBlock(node: MdNode, key: number): ReactNode {
  switch (node.kind) {
    case 'heading': {
      // I titoli del brief sono chrome, non contenuto: font da interfaccia,
      // corpo piccolo, inchiostro su bianco/pergamena.
      const dimensione = node.level <= 2 ? 12 : 10;
      return (
        <h3
          key={key}
          style={{
            ...TESTO_UI,
            margin: key === 0 ? '0 0 10px' : '18px 0 8px',
            fontSize: dimensione,
            color: PALETTE.inchiostro,
          }}
        >
          {renderInline(node.children)}
        </h3>
      );
    }
    case 'paragraph':
      return (
        <p key={key} style={{ margin: '0 0 10px' }}>
          {renderInline(node.children)}
        </p>
      );
    case 'list':
      return (
        <ul key={key} style={{ margin: '0 0 10px', paddingLeft: 20, listStyle: 'none' }}>
          {node.items.map((item, i) => (
            <li key={i} style={{ position: 'relative', marginBottom: 4 }}>
              {/* Punto elenco quadrato */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: -14,
                  top: 8,
                  width: 6,
                  height: 6,
                  background: PALETTE.rubino,
                }}
              />
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
  }
}

export interface MarkdownProps {
  readonly source: string;
}

/** Il markdown dei brief disegnato come albero React. Esportato: lo usa anche il manuale (§7). */
export function Markdown({ source }: MarkdownProps) {
  // Il parsing e' economico ma il brief non cambia mai durante un livello:
  // rifarlo a ogni battuta di tasto sarebbe lavoro buttato.
  const nodes = useMemo(() => parseMarkdown(source), [source]);
  return <>{nodes.map((n, i) => renderBlock(n, i))}</>;
}

// ---------------------------------------------------------------------------
// Pannello
// ---------------------------------------------------------------------------

export interface BriefProps {
  /** Il testo markdown: `LevelInstance.brief`. */
  readonly brief: string;
  /** Titolo del livello (`LevelTemplate.title`). */
  readonly titolo?: string;
  readonly mode?: LevelMode;
  /** Seed dell'istanza: va mostrato, perche' "riprova stesso seed" deve avere un senso. */
  readonly seed?: number;
  readonly style?: CSSProperties;
}

/** Il badge della modalita' usa il colore che il gioco associa a quella tensione. */
const COLORE_MODE: Readonly<Record<LevelMode, string>> = {
  GUIDED: UI.info,
  PRACTICE: UI.successo,
  BLIND: UI.accento,
  SPEEDRUN: UI.attenzione,
  AUDIT: UI.evidenza,
  BOSS: PALETTE.prugna,
};

/** Un testo markdown con lo stesso aspetto del mandato (usato anche dall'informativa privacy). */
export function MarkdownBlocks({ src }: { readonly src: string }) {
  return <>{parseMarkdown(src).map(renderBlock)}</>;
}

export function Brief({ brief, titolo, mode, seed, style }: BriefProps) {
  return (
    <Pannello
      titolo={titolo ?? tr('Brief.1')}
      variante="pergamena"
      scorrevole
      style={style}
      azione={
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {mode !== undefined && (
            <Badge colore={COLORE_MODE[mode]} pieno title={tr('Brief.2')}>
              {mode}
            </Badge>
          )}
          {seed !== undefined && (
            <Badge title={tr('Brief.3')}>#{seed}</Badge>
          )}
        </span>
      }
      bodyStyle={{ ...TESTO_LUNGO, color: PALETTE.inchiostro }}
    >
      <div className="dd-selezionabile">
        <Markdown source={brief} />
      </div>
    </Pannello>
  );
}

export default Brief;

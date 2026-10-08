/**
 * Renderer markdown minimale per i brief dei livelli (spec §9, schermata Gioco).
 *
 * I brief sono markdown scritto a mano dentro i template (`src/content/templates/**`),
 * quindi il sottoinsieme da coprire e' piccolo e noto: titoli `##`, grassetto `**`,
 * corsivo `*`, codice inline con backtick, elenchi puntati con `-`, paragrafi.
 *
 * Due scelte non negoziabili:
 *
 *  1. **Nessuna dipendenza.** Il gioco deve funzionare offline (§13) e un parser
 *     markdown completo qui sarebbe cento volte piu' grande del sottoinsieme usato.
 *  2. **Nessun HTML.** Questo modulo produce un albero di nodi, non una stringa:
 *     chi lo disegna usa React normale, mai `dangerouslySetInnerHTML`. Cosi' un
 *     brief che contiene `<` e `>` — e prima o poi ne arrivera' uno, i modelli
 *     finanziari sono pieni di `>` — resta testo e non diventa markup.
 *
 * Il parser non lancia mai: markdown malformato degrada a testo. Un brief mezzo
 * rotto che si legge male e' un difetto di contenuto; una schermata di gioco che
 * esplode su un asterisco spaiato e' un difetto di prodotto.
 */

// ---------------------------------------------------------------------------
// Albero
// ---------------------------------------------------------------------------

export type MdInline =
  | { readonly kind: 'text'; readonly text: string }
  /** Codice inline: il contenuto e' letterale, dentro non si annida nulla. */
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'strong'; readonly children: readonly MdInline[] }
  | { readonly kind: 'em'; readonly children: readonly MdInline[] };

export type MdNode =
  /** `level` e' il numero di cancelletti, 1..6. I brief usano `##`. */
  | { readonly kind: 'heading'; readonly level: number; readonly children: readonly MdInline[] }
  | { readonly kind: 'paragraph'; readonly children: readonly MdInline[] }
  | { readonly kind: 'list'; readonly items: readonly (readonly MdInline[])[] };

// ---------------------------------------------------------------------------
// Blocchi
// ---------------------------------------------------------------------------

/** Solo `-`: usare anche `*` come punto elenco renderebbe una riga `*corsivo*` un item. */
const RE_ITEM = /^ {0,3}-\s+(.*)$/;
const RE_HEADING = /^(#{1,6})\s+(.*)$/;

/**
 * Le righe di un paragrafo vengono unite con uno spazio: nei template il testo e'
 * a capo "duro" a ~95 colonne per stare leggibile nel sorgente, e mandarlo a capo
 * anche a schermo produrrebbe righe corte a caso dentro un pannello stretto.
 */
export function parseMarkdown(src: string): MdNode[] {
  // Guardia di runtime, non di tipo: il brief puo' arrivare da un template
  // generato o — un giorno — dal database, dove il tipo non e' garantito.
  if (typeof src !== 'string' || src === '') return [];

  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const nodes: MdNode[] = [];

  let paragrafo: string[] = [];
  let lista: string[] | null = null;

  const chiudiParagrafo = (): void => {
    if (paragrafo.length === 0) return;
    nodes.push({ kind: 'paragraph', children: parseInline(paragrafo.join(' ')) });
    paragrafo = [];
  };

  const chiudiLista = (): void => {
    if (lista !== null && lista.length > 0) {
      nodes.push({ kind: 'list', items: lista.map((t) => parseInline(t)) });
    }
    lista = null;
  };

  const chiudiTutto = (): void => {
    chiudiParagrafo();
    chiudiLista();
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');

    // Riga vuota: e' il separatore di blocco, l'unico che questo dialetto conosce.
    if (line.trim() === '') {
      chiudiTutto();
      continue;
    }

    const heading = RE_HEADING.exec(line.trim());
    if (heading) {
      chiudiTutto();
      nodes.push({
        kind: 'heading',
        level: heading[1].length,
        children: parseInline(heading[2].trim()),
      });
      continue;
    }

    const item = RE_ITEM.exec(line);
    if (item) {
      chiudiParagrafo();
      if (lista === null) lista = [];
      lista.push(item[1].trim());
      continue;
    }

    // Riga indentata sotto un elenco: e' la continuazione dell'ultimo item,
    // non un paragrafo nuovo. Serve agli item lunghi mandati a capo nel sorgente.
    if (lista !== null && lista.length > 0 && /^ {2,}\S/.test(line)) {
      lista[lista.length - 1] += ` ${line.trim()}`;
      continue;
    }

    chiudiLista();
    paragrafo.push(line.trim());
  }

  chiudiTutto();
  return nodes;
}

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

/**
 * Scansione a sinistra-destra con ricorsione sul contenuto dei delimitatori.
 *
 * Il codice inline ha la precedenza su tutto: dentro i backtick `**` e' un
 * asterisco doppio e basta, ed e' esattamente cio' che serve per scrivere
 * `` `=B4*$B$7` `` in un brief senza che meta' formula diventi corsivo.
 *
 * Un delimitatore che non si chiude non e' un errore: torna a essere testo.
 */
export function parseInline(src: string): MdInline[] {
  const out: MdInline[] = [];
  let buf = '';
  let i = 0;

  const flush = (): void => {
    if (buf !== '') {
      out.push({ kind: 'text', text: buf });
      buf = '';
    }
  };

  while (i < src.length) {
    const c = src.charAt(i);

    if (c === '`') {
      const end = src.indexOf('`', i + 1);
      // `end > i + 1` esclude i backtick vuoti (``): niente nodo codice a vuoto.
      if (end > i + 1) {
        flush();
        out.push({ kind: 'code', text: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
      buf += c;
      i += 1;
      continue;
    }

    if (c === '*') {
      const doppio = src.charAt(i + 1) === '*';
      const delim = doppio ? '**' : '*';
      const start = i + delim.length;
      const end = findClosing(src, delim, start);
      if (end > start) {
        flush();
        // La ricorsione termina sempre: `inner` e' strettamente piu' corto di `src`.
        const inner = parseInline(src.slice(start, end));
        out.push(doppio ? { kind: 'strong', children: inner } : { kind: 'em', children: inner });
        i = end + delim.length;
        continue;
      }
      buf += c;
      i += 1;
      continue;
    }

    buf += c;
    i += 1;
  }

  flush();
  return out;
}

/**
 * Cerca il delimitatore di chiusura saltando i code span, cosi' un asterisco
 * dentro i backtick non chiude un'enfasi aperta fuori. Restituisce -1 se manca.
 */
function findClosing(src: string, delim: '*' | '**', from: number): number {
  let i = from;
  while (i < src.length) {
    const c = src.charAt(i);

    if (c === '`') {
      const end = src.indexOf('`', i + 1);
      if (end > i + 1) {
        i = end + 1;
        continue;
      }
      i += 1;
      continue;
    }

    if (c === '*') {
      const doppio = src.charAt(i + 1) === '*';
      if (delim === '**') {
        if (doppio) return i;
        // Asterisco singolo dentro un grassetto: lo risolvera' la ricorsione sul contenuto.
        i += 1;
        continue;
      }
      // Un `**` non chiude un corsivo aperto con un asterisco solo.
      if (doppio) {
        i += 2;
        continue;
      }
      return i;
    }

    i += 1;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Utilita'
// ---------------------------------------------------------------------------

/** Testo nudo di un albero inline: serve ai titoli di accessibilita' e ai test. */
export function inlineToText(nodes: readonly MdInline[]): string {
  return nodes
    .map((n) => {
      switch (n.kind) {
        case 'text':
        case 'code':
          return n.text;
        default:
          return inlineToText(n.children);
      }
    })
    .join('');
}

/** Testo nudo dell'intero documento, un blocco per riga. */
export function mdPlainText(nodes: readonly MdNode[]): string {
  return nodes
    .map((n) => (n.kind === 'list' ? n.items.map(inlineToText).join('\n') : inlineToText(n.children)))
    .join('\n');
}

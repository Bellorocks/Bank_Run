import { describe, it, expect } from 'vitest';
import { parseMarkdown, parseInline, inlineToText, mdPlainText } from './markdown';
import type { MdInline, MdNode } from './markdown';

/**
 * Il parser dei brief. Due famiglie di test:
 *
 *  - che il dialetto minimo funzioni (titoli, enfasi, codice, elenchi);
 *  - che NIENTE lo faccia lanciare e che niente produca HTML. Il brief arriva da
 *    un template generato: se un asterisco spaiato buttasse giu' la schermata di
 *    gioco, il difetto sarebbe qui, non nel contenuto.
 */

/** Scorciatoia: i figli inline del primo blocco. */
function inline(src: string): MdInline[] {
  const nodes = parseMarkdown(src);
  const first = nodes[0];
  if (!first || first.kind === 'list') throw new Error('atteso un blocco con figli inline');
  return [...first.children];
}

function kinds(nodes: readonly MdNode[]): string[] {
  return nodes.map((n) => n.kind);
}

describe('parseMarkdown — blocchi', () => {
  it('un testo semplice e\' un paragrafo con un nodo di testo', () => {
    expect(parseMarkdown('Ciao mondo')).toEqual([
      { kind: 'paragraph', children: [{ kind: 'text', text: 'Ciao mondo' }] },
    ]);
  });

  it('riconosce ## come titolo di livello 2', () => {
    const nodes = parseMarkdown('## Il tuo primo foglio');
    expect(nodes).toEqual([
      { kind: 'heading', level: 2, children: [{ kind: 'text', text: 'Il tuo primo foglio' }] },
    ]);
  });

  it('il livello del titolo e\' il numero di cancelletti', () => {
    const nodes = parseMarkdown('# Uno\n\n### Tre\n\n###### Sei');
    expect(nodes.map((n) => (n.kind === 'heading' ? n.level : 0))).toEqual([1, 3, 6]);
  });

  it('un cancelletto senza spazio NON e\' un titolo', () => {
    const nodes = parseMarkdown('#hashtag non e\' un titolo');
    expect(kinds(nodes)).toEqual(['paragraph']);
    expect(mdPlainText(nodes)).toBe('#hashtag non e\' un titolo');
  });

  it('la riga vuota separa due paragrafi', () => {
    expect(kinds(parseMarkdown('Primo.\n\nSecondo.'))).toEqual(['paragraph', 'paragraph']);
  });

  it('righe consecutive dello stesso paragrafo si uniscono con uno spazio', () => {
    const nodes = parseMarkdown('Una formula comincia\nsempre con il segno uguale.');
    expect(nodes).toHaveLength(1);
    expect(mdPlainText(nodes)).toBe('Una formula comincia sempre con il segno uguale.');
  });

  it('raggruppa i trattini consecutivi in un solo elenco', () => {
    const nodes = parseMarkdown('- ricavi\n- costi\n- margine');
    expect(nodes).toHaveLength(1);
    const lista = nodes[0];
    expect(lista.kind).toBe('list');
    if (lista.kind !== 'list') throw new Error();
    expect(lista.items.map(inlineToText)).toEqual(['ricavi', 'costi', 'margine']);
  });

  it('una riga indentata sotto un elenco continua l\'ultimo item', () => {
    const nodes = parseMarkdown('- il debito medio\n    dipende dal rimborso\n- gli interessi');
    const lista = nodes[0];
    if (lista.kind !== 'list') throw new Error('atteso un elenco');
    expect(lista.items.map(inlineToText)).toEqual([
      'il debito medio dipende dal rimborso',
      'gli interessi',
    ]);
  });

  it('un titolo chiude il blocco precedente senza bisogno di riga vuota', () => {
    expect(kinds(parseMarkdown('testo\n## Titolo\naltro testo'))).toEqual([
      'paragraph',
      'heading',
      'paragraph',
    ]);
  });

  it('normalizza i fine riga Windows', () => {
    expect(parseMarkdown('a\r\n\r\nb')).toEqual(parseMarkdown('a\n\nb'));
  });

  it('stringa vuota e stringa di soli spazi non producono blocchi', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('   \n\n  \n')).toEqual([]);
  });
});

describe('parseMarkdown — inline', () => {
  it('riconosce il grassetto', () => {
    expect(inline('una **formula** vera')).toEqual([
      { kind: 'text', text: 'una ' },
      { kind: 'strong', children: [{ kind: 'text', text: 'formula' }] },
      { kind: 'text', text: ' vera' },
    ]);
  });

  it('riconosce il corsivo con un asterisco solo', () => {
    expect(inline('*forse*')).toEqual([
      { kind: 'em', children: [{ kind: 'text', text: 'forse' }] },
    ]);
  });

  it('riconosce il codice inline e non lo interpreta', () => {
    expect(inline('scrivi `=B4*$B$7` e invio')).toEqual([
      { kind: 'text', text: 'scrivi ' },
      { kind: 'code', text: '=B4*$B$7' },
      { kind: 'text', text: ' e invio' },
    ]);
  });

  it('annida il codice dentro il grassetto', () => {
    expect(inline('**usa `SUMIF`**')).toEqual([
      {
        kind: 'strong',
        children: [
          { kind: 'text', text: 'usa ' },
          { kind: 'code', text: 'SUMIF' },
        ],
      },
    ]);
  });

  it('annida il corsivo dentro il grassetto', () => {
    expect(inline('**molto *molto* importante**')).toEqual([
      {
        kind: 'strong',
        children: [
          { kind: 'text', text: 'molto ' },
          { kind: 'em', children: [{ kind: 'text', text: 'molto' }] },
          { kind: 'text', text: ' importante' },
        ],
      },
    ]);
  });

  it('due grassetti nella stessa riga restano distinti', () => {
    const nodi = inline('**uno** e **due**');
    expect(nodi.filter((n) => n.kind === 'strong')).toHaveLength(2);
    expect(inlineToText(nodi)).toBe('uno e due');
  });

  it('un asterisco dentro un code span non apre un corsivo', () => {
    expect(inline('`a*b` *vero*')).toEqual([
      { kind: 'code', text: 'a*b' },
      { kind: 'text', text: ' ' },
      { kind: 'em', children: [{ kind: 'text', text: 'vero' }] },
    ]);
  });

  it('l\'enfasi vale anche dentro un titolo e dentro un item di elenco', () => {
    const titolo = parseMarkdown('## Il **margine**')[0];
    if (titolo.kind !== 'heading') throw new Error();
    expect(titolo.children.some((n) => n.kind === 'strong')).toBe(true);

    const lista = parseMarkdown('- usa `SUM`')[0];
    if (lista.kind !== 'list') throw new Error();
    expect(lista.items[0].some((n) => n.kind === 'code')).toBe(true);
  });
});

describe('parseMarkdown — malformato, non deve lanciare', () => {
  const rotti = [
    '**grassetto mai chiuso',
    '*corsivo mai chiuso',
    'backtick mai chiuso `qui',
    '****',
    '***',
    '*',
    '`',
    '``',
    '**a *b** c*',
    '- ',
    '-',
    '## ',
    '#',
    '\n\n\n',
    '**`**',
    'a ** b ** c',
    '- **item rotto',
  ];

  for (const src of rotti) {
    it(`non lancia su ${JSON.stringify(src)}`, () => {
      expect(() => parseMarkdown(src)).not.toThrow();
    });
  }

  it('un grassetto non chiuso resta testo, asterischi compresi', () => {
    expect(inlineToText(inline('**mai chiuso'))).toBe('**mai chiuso');
  });

  it('un backtick spaiato resta testo', () => {
    expect(inlineToText(inline('costa 5 ` euro'))).toBe('costa 5 ` euro');
  });

  it('quattro asterischi di fila restano quattro asterischi', () => {
    expect(inline('****')).toEqual([{ kind: 'text', text: '****' }]);
  });

  it('un input enorme di soli delimitatori termina (nessuna ricorsione infinita)', () => {
    const src = '*'.repeat(400);
    expect(() => parseMarkdown(src)).not.toThrow();
  });

  it('regge un input non stringa senza lanciare', () => {
    expect(parseMarkdown(undefined as unknown as string)).toEqual([]);
    expect(parseMarkdown(42 as unknown as string)).toEqual([]);
  });
});

describe('parseMarkdown — niente HTML, mai', () => {
  it('i tag restano testo letterale', () => {
    expect(inline('<script>alert(1)</script>')).toEqual([
      { kind: 'text', text: '<script>alert(1)</script>' },
    ]);
  });

  it('nessun nodo prodotto e\' una stringa di markup', () => {
    const nodes = parseMarkdown('## <b>Titolo</b>\n\n<img src=x onerror=1> e **<i>testo</i>**');
    // L'unico modo di far comparire HTML sarebbe un nodo con markup dentro:
    // qui i tag sono sempre e solo contenuto di nodi `text`.
    expect(mdPlainText(nodes)).toContain('<b>Titolo</b>');
    expect(mdPlainText(nodes)).toContain('<i>testo</i>');
    const soloTipiNoti = JSON.stringify(nodes).match(/"kind":"(\w+)"/g) ?? [];
    for (const k of soloTipiNoti) {
      expect(['heading', 'paragraph', 'list', 'text', 'code', 'strong', 'em']).toContain(
        k.replace('"kind":"', '').replace('"', ''),
      );
    }
  });

  it('le entita\' HTML non vengono decodificate', () => {
    expect(inline('&lt;b&gt; &amp; co.')).toEqual([{ kind: 'text', text: '&lt;b&gt; &amp; co.' }]);
  });

  it('i caratteri speciali sopravvivono intatti', () => {
    const src = 'EBITDA ≥ 12,5% — «già», 100% & “virgolette” ✓';
    expect(inlineToText(inline(src))).toBe(src);
  });

  it('un maggiore/minore dentro un code span resta letterale', () => {
    expect(inline('`=IF(A1>0,"<sì>","<no>")`')).toEqual([
      { kind: 'code', text: '=IF(A1>0,"<sì>","<no>")' },
    ]);
  });
});

describe('parseInline / helper', () => {
  it('parseInline e\' esportato e lavora su una riga sola', () => {
    expect(inlineToText(parseInline('a **b** c'))).toBe('a b c');
  });

  it('mdPlainText appiattisce anche gli elenchi', () => {
    expect(mdPlainText(parseMarkdown('## T\n\n- a\n- b\n\nfine'))).toBe('T\na\nb\nfine');
  });

  it('un brief realistico produce la sequenza di blocchi attesa', () => {
    const brief = [
      '## Il tuo primo foglio',
      '',
      'Ogni cella ha un nome: la colonna, poi la riga. Quella in alto a sinistra si chiama `A1`.',
      '',
      'Una **formula** comincia sempre con `=`. Se scrivi `10+5` Excel legge del testo.',
      '',
      '- ricavi',
      '- costi',
    ].join('\n');
    expect(kinds(parseMarkdown(brief))).toEqual(['heading', 'paragraph', 'paragraph', 'list']);
  });
});

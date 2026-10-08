/**
 * M0-C · 03 — SUMIFS, COUNTIFS, MAXIFS: aggregare su piu' criteri insieme.
 *
 * Il punto didattico e' la "S" finale, e non e' un dettaglio ortografico: SUMIF
 * accetta UN criterio, SUMIFS ne accetta quanti ne servono. Per farlo vedere
 * davvero serve una tabella con almeno due colonne che si possano incrociare —
 * categoria e mese — cosi' che filtrare su una sola non basti mai: la categoria
 * da sola somma mesi che non c'entrano, il mese da solo somma categorie che non
 * c'entrano. Le tre query del livello chiedono le tre funzioni gemelle sullo
 * stesso incrocio a due criteri, cosi' la forma della formula — intervallo,
 * poi coppie intervallo-criterio — si vede ripetersi tre volte con una sola
 * differenza reale: cosa c'e' prima delle coppie (la somma, il massimo, o
 * niente).
 *
 * NOTA su una deviazione rispetto alla sintesi originale dell'autore: la terza
 * query chiedeva AVERAGEIFS. Il motore formule di questo progetto (HyperFormula
 * 3.4.0, licenza GPL, vedi §2 dello spec) non implementa affatto AVERAGEIFS —
 * non e' un problema di configurazione: la funzione non e' nell'elenco di quelle
 * registrate in nessuna versione della libreria (verificato leggendo il sorgente
 * in `node_modules/hyperformula`), quindi qualunque formula corretta scritta dal
 * giocatore risulterebbe in `#NAME?` per sempre. Un task strutturalmente
 * insuperabile non e' un dettaglio: e' un livello rotto. `MAXIFS` e' registrato
 * e funziona, ha la STESSA forma di SUMIFS (intervallo da aggregare, poi le
 * coppie intervallo-criterio), quindi la lezione sulla forma comune resta
 * intatta; cambia solo quale aggregazione si insegna sulla terza query.
 */

import {
  defineTemplate,
  areaLibera,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  riga,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
  num,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

const CATEGORIE = [
  'Guarnizioni idrauliche',
  'Motori elettrici',
  'Sensori di pressione',
  'Cablaggi speciali',
  'Valvole pneumatiche',
] as const;

const MESI = ['Gennaio', 'Febbraio', 'Marzo'] as const;

const CLIENTI = [
  'Nord Meccanica Srl',
  'Officine Bianchi Spa',
  'Ferro & Co.',
  'Idro Sud Spa',
  'Meccanica Po Srl',
  'Techno Valve Srl',
  'Rossi Componenti Srl',
] as const;

interface Vendita {
  readonly cliente: string;
  readonly categoria: string;
  readonly mese: string;
  readonly importo: number;
}

interface Coppia {
  readonly categoria: string;
  readonly mese: string;
}

export default defineTemplate({
  id: 'M0C-03-SUMIFS',
  module: 'M0-C',
  title: 'Due criteri, non uno: SUMIFS e famiglia',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 280,
  skills: ['xl.sumifs'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const n = r.int(8, 12);
    const transazioni: Vendita[] = Array.from({ length: n }, () => ({
      cliente: r.pick(CLIENTI),
      categoria: r.pick(CATEGORIE),
      mese: r.pick(MESI),
      importo: roundTo(triangular(r, 4_000, 15_000, 45_000), 100),
    }));

    const filtra = (cat: string, mese: string): Vendita[] =>
      transazioni.filter((t) => t.categoria === cat && t.mese === mese);
    const sommaWhere = (cat: string, mese: string): number =>
      filtra(cat, mese).reduce((acc, t) => acc + t.importo, 0);
    const contaWhere = (cat: string, mese: string): number => filtra(cat, mese).length;
    const massimoWhere = (cat: string, mese: string): number => {
      const righe = filtra(cat, mese);
      return righe.length === 0 ? 0 : Math.max(...righe.map((t) => t.importo));
    };

    // Le tre query pescano da incroci categoria/mese REALMENTE presenti nei dati
    // (altrimenti COUNTIFS darebbe zero e il task sarebbe imbrogliato), preferendo
    // tre incroci distinti cosi' le tre domande non si sovrappongono.
    const chiavi = new Map<string, Coppia>();
    for (const t of transazioni) chiavi.set(`${t.categoria}__${t.mese}`, { categoria: t.categoria, mese: t.mese });
    const coppie = r.shuffle([...chiavi.values()]);
    const p1 = coppie[0];
    const p2 = coppie[1 % coppie.length];
    const p3 = coppie[2 % coppie.length];

    const totale1 = sommaWhere(p1.categoria, p1.mese);
    const conteggio2 = contaWhere(p2.categoria, p2.mese);
    const massimo3 = massimoWhere(p3.categoria, p3.mese);

    const HEADER_ROW = 3;
    const DATA_START = HEADER_ROW + 1;
    const DATA_END = DATA_START + n - 1;
    const QUERY_TITLE_ROW = DATA_END + 2;
    const QUERY_HEADER_ROW = QUERY_TITLE_ROW + 1;
    const Q1_ROW = QUERY_HEADER_ROW + 1;
    const Q2_ROW = Q1_ROW + 1;
    const Q3_ROW = Q2_ROW + 1;

    const rifCategorie = `B${DATA_START}`;
    const rifMesi = `C${DATA_START}`;
    const rifImporti = `D${DATA_START}`;

    const t1: Task = {
      id: 'T1',
      prompt:
        `In D${Q1_ROW} calcola il totale venduto per la categoria in B${Q1_ROW}, ma solo nel mese ` +
        `in C${Q1_ROW}. Un criterio solo non basta: la categoria da sola somma anche altri mesi, il ` +
        "mese da solo somma anche altre categorie. Serve una funzione che sommi rispettando entrambe " +
        'le condizioni insieme.',
      targetCell: `Model!D${Q1_ROW}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: totale1,
          message: "Il totale non torna: controlla che entrambi i criteri — categoria E mese — siano collegati alle colonne giuste.",
        },
        { kind: 'mustReference', cells: [`B${Q1_ROW}`, `C${Q1_ROW}`, rifCategorie, rifMesi, rifImporti] },
        { kind: 'mustUseFunction', functions: ['SUMIFS'] },
      ],
      skills: ['xl.sumifs'],
      minKeystrokes: 40,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        `In D${Q2_ROW} conta quante vendite risultano per la categoria in B${Q2_ROW}, nel mese in ` +
        `C${Q2_ROW}. Stesso principio del task precedente, ma qui non stai sommando un importo: stai ` +
        'contando righe che rispettano entrambi i criteri.',
      targetCell: `Model!D${Q2_ROW}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: conteggio2,
          message: "Il conteggio non torna: la funzione giusta non ha un intervallo da sommare davanti, solo coppie intervallo-criterio.",
        },
        { kind: 'mustReference', cells: [`B${Q2_ROW}`, `C${Q2_ROW}`, rifCategorie, rifMesi] },
        { kind: 'mustUseFunction', functions: ['COUNTIFS'] },
      ],
      skills: ['xl.sumifs'],
      minKeystrokes: 32,
    };

    const t3: Task = {
      id: 'T3',
      prompt:
        `In D${Q3_ROW} trova l'importo piu' alto tra le vendite per la categoria in B${Q3_ROW}, nel mese ` +
        `in C${Q3_ROW}. Di nuovo due criteri insieme: categoria e mese.`,
      targetCell: `Model!D${Q3_ROW}`,
      check: [
        { kind: 'mustBeFormula' },
        {
          kind: 'value',
          expected: massimo3,
          message: "Il massimo non torna: controlla di aver incrociato categoria e mese, non uno solo dei due.",
        },
        { kind: 'mustReference', cells: [`B${Q3_ROW}`, `C${Q3_ROW}`, rifCategorie, rifMesi, rifImporti] },
        { kind: 'mustUseFunction', functions: ['MAXIFS'] },
      ],
      skills: ['xl.sumifs'],
      minKeystrokes: 40,
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M0C-03-SUMIFS',
      seed: rng.seed,
      brief: [
        '## Un criterio solo non basta quasi mai',
        '',
        `Sotto c'e' il registro delle vendite del primo trimestre: ${num(n)} transazioni, ognuna con`,
        'un cliente, una categoria di prodotto, un mese e un importo.',
        '',
        '`SUMIF` (senza la S) sa sommare su **un** criterio. Nella pratica quasi ogni domanda che ti',
        'faranno ne ha due o tre insieme: "quanto abbiamo venduto di questa categoria, a marzo" non e\'',
        'una domanda, sono due domande incrociate. Con un criterio solo ottieni un numero che sembra',
        'giusto e non lo e\': la categoria da sola include gli altri mesi, il mese da solo include le',
        'altre categorie.',
        '',
        '`SUMIFS`, `COUNTIFS` e `MAXIFS` accettano quanti criteri servono, e la forma e\' sempre',
        'la stessa: prima (se serve) l\'intervallo da aggregare, poi le coppie **intervallo-criterio**',
        'una dopo l\'altra — quante ne vuoi. `COUNTIFS` fa eccezione su un punto solo: non c\'e\' niente',
        'da sommare, quindi non c\'e\' il primo intervallo, si parte gia\' dalle coppie.',
        '',
        `Le tre interrogazioni qui sotto ti chiedono le tre funzioni sullo stesso tipo di incrocio.`,
        `Il totale della prima query, per dirti che ordine di grandezza aspettarti, e' vicino a`,
        `${eur(totale1)}.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Registro vendite — primo trimestre'], { style: STILE_TITOLO }),
            riga(`A${HEADER_ROW}`, ['Cliente', 'Categoria', 'Mese', 'Importo (€)'], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, transazioni.map((t) => t.cliente), { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, transazioni.map((t) => t.categoria), { style: STILE_ETICHETTA }),
            colonna(`C${DATA_START}`, transazioni.map((t) => t.mese), { style: STILE_ETICHETTA }),
            colonna(`D${DATA_START}`, transazioni.map((t) => t.importo), { style: STILE_INPUT }),

            riga(`A${QUERY_TITLE_ROW}`, ['Interrogazioni'], { style: STILE_TITOLO }),
            riga(`A${QUERY_HEADER_ROW}`, ['Domanda', 'Categoria', 'Mese', 'Risultato'], { style: STILE_TITOLO }),
            blocco(`A${Q1_ROW}`, [['Totale venduto', p1.categoria, p1.mese]], { style: STILE_ETICHETTA }),
            blocco(`A${Q2_ROW}`, [['Numero di vendite', p2.categoria, p2.mese]], { style: STILE_ETICHETTA }),
            blocco(`A${Q3_ROW}`, [["Importo piu' alto", p3.categoria, p3.mese]], { style: STILE_ETICHETTA }),
            areaLibera([`D${Q1_ROW}`, `D${Q2_ROW}`, `D${Q3_ROW}`]),
          ],
          {
            colWidths: { A: 200, B: 190, C: 100, D: 140 },
            frozenRows: HEADER_ROW,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `SUMIFS(intervallo_da_sommare, intervallo_criterio1, criterio1, intervallo_criterio2, criterio2). Il primo argomento e' cosa sommare (${rifImporti} in giu'), poi le coppie si susseguono.`,
          12,
          'T1',
        ),
        hint(
          'H2',
          "COUNTIFS ha SOLO coppie intervallo-criterio: niente intervallo da sommare davanti, si parte direttamente dalla prima coppia.",
          10,
          'T2',
        ),
        hint(
          'H3',
          "MAXIFS ha la stessa forma di SUMIFS: intervallo su cui cercare il massimo, poi le coppie intervallo-criterio.",
          10,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!D${Q1_ROW}`,
    };
  },
});

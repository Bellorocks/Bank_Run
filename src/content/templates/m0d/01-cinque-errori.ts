/**
 * M0-D · 01 — I cinque errori.
 *
 * #REF!, #VALUE!, #DIV/0!, #N/A, #NAME?: cosa significano e come si risale
 * alla causa. Il foglio contiene GIA' cinque formule bloccate, ciascuna
 * costruita apposta per restituire uno dei cinque errori — il compito non e'
 * ripararle, e' riconoscerle.
 *
 * Decisione tecnica non ovvia, verificata sul motore vero prima di scrivere
 * questo file: HyperFormula riconosce un letterale come "#DIV/0!" come
 * ERRORE anche se scritto in una cella SENZA il segno `=` davanti (l'ho
 * provato con buildFromArray + setCellContents). Se quindi si chiedesse al
 * giocatore di "scrivere il codice dell'errore che vedi", la sua stessa
 * risposta diventerebbe una cella in errore, e il check testuale del grader
 * (che si aspetta una stringa) leggerebbe un oggetto errore invece del testo
 * battuto — il task sarebbe irrisolvibile per un motivo tecnico invisibile
 * al giocatore. La soluzione e' chiedere il NOME BREVE in italiano (mai un
 * simbolo che inizi per `#`), con la legenda data per esteso nel brief:
 * insegna comunque a riconoscere l'errore, senza urtare il motore.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_TITOLO,
} from '../../authoring';

import { tx } from '../../../i18n/content';
/**
 * Le cinque celle-trappola, in ordine di riga. Ogni formula e' scelta per
 * produrre l'errore giusto in modo diretto, verificabile a colpo d'occhio
 * nella barra della formula una volta selezionata la cella (bloccata, quindi
 * leggibile ma non modificabile).
 */
const TRAPPOLE = () => ([
  {
    riga: tx('M0D-01-CINQUEERRORI.1'),
    // Riferimenti RELATIVI alla riga r che ospita la formula (r-1 e r+1), mai
    // indirizzi assoluti fissi: l'ordine delle trappole viene rimescolato ad
    // ogni seed (vedi generate()), quindi una formula scritta con "B2/B3"
    // letterali finirebbe per leggere la CELLA DI UN'ALTRA TRAPPOLA (o se
    // stessa) invece di una cella vuota, restituendo un errore diverso da
    // quello previsto — o, nel caso peggiore, un #CYCLE! di auto-riferimento.
    // r-1 e r+1 non sono mai una riga-formula di nessuna trappola (le righe
    // formula sono sempre multipli di 3 a partire da 3: 3,6,9,12,15) e non si
    // sovrappongono mai fra trappole adiacenti, quindi restano sempre vuote.
    formula: (r: number) => `=B${r - 1}/B${r + 1}`,
    nome: tx('M0D-01-CINQUEERRORI.17'),
    spiegazione:
      tx('M0D-01-CINQUEERRORI.2'),
  },
  {
    riga: tx('M0D-01-CINQUEERRORI.3'),
    formula: (r: number) => `="CL-042"+B${r - 1}`,
    nome: tx('M0D-01-CINQUEERRORI.18'),
    spiegazione:
      tx('M0D-01-CINQUEERRORI.4'),
  },
  {
    riga: tx('M0D-01-CINQUEERRORI.5'),
    formula: (r: number) => `=MATCH("Delta",B${r - 1}:D${r - 1},0)`,
    nome: tx('M0D-01-CINQUEERRORI.19'),
    spiegazione:
      tx('M0D-01-CINQUEERRORI.6'),
  },
  {
    riga: tx('M0D-01-CINQUEERRORI.7'),
    formula: (r: number) => `=SOMMA(B${r + 1}:C${r + 1})`,
    nome: tx('M0D-01-CINQUEERRORI.20'),
    spiegazione:
      tx('M0D-01-CINQUEERRORI.8'),
  },
  {
    riga: tx('M0D-01-CINQUEERRORI.9'),
    // Letterale puro, senza dipendenze da nessuna cella: l'unica delle cinque
    // formule per cui la posizione non conta affatto.
    formula: (_r: number) => '=#REF!',
    nome: tx('M0D-01-CINQUEERRORI.21'),
    spiegazione:
      tx('M0D-01-CINQUEERRORI.10'),
  },
] as const);

export default defineTemplate({
  id: 'M0D-01-CINQUEERRORI',
  module: 'M0-D',
  get title() {
    return tx('M0D-01-CINQUEERRORI.title');
  },
  rank: 2,
  mode: 'AUDIT',
  estimatedSeconds: 210,
  skills: ['xl.errors'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    // Livello di puro riconoscimento: l'ordine delle cinque trappole cambia
    // col seed, cosi' non si impara "la terza riga e' sempre #N/A" a memoria.
    const ordine = rng.shuffle(TRAPPOLE().map((_, i) => i));

    const righeFoglio = ordine.map((idx) => TRAPPOLE()[idx]);

    const tasks = righeFoglio.map((t, i) => {
      const rigaCella = 3 + i * 3; // B3, B6, B9, B12, B15: una formula ogni tre righe, con spazio per etichetta+risposta
      return {
        id: `T${i + 1}`,
        prompt:
          tx('M0D-01-CINQUEERRORI.12', { rigaCella }),
        targetCell: `Model!C${rigaCella}`,
        check: [{ kind: 'text' as const, expected: t.nome, caseSensitive: false }],
        skills: ['xl.errors'],
        minKeystrokes: 6,
      };
    });

    const legenda = [tx('M0D-01-CINQUEERRORI.13')].join('\n');

    const brief = [tx('M0D-01-CINQUEERRORI.14', { legenda })].join('\n');

    const celleFoglio = righeFoglio.flatMap((t, i) => {
      const r = 3 + i * 3;
      return [
        ...blocco(`A${r - 1}`, [[t.riga]], { style: STILE_ETICHETTA }),
        ...blocco(`B${r}`, [[t.formula(r)]], { style: STILE_FORMULA }),
      ];
    });

    return {
      templateId: 'M0D-01-CINQUEERRORI',
      seed: rng.seed,
      brief,
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', [tx('M0D-01-CINQUEERRORI.15')], { style: STILE_TITOLO }),
            celleFoglio,
            areaLibera(righeFoglio.map((_, i) => `C${3 + i * 3}`)),
          ],
          { colWidths: { A: 380, B: 160, C: 120 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: righeFoglio.map((t, i) =>
        hint(
          `H${i + 1}`,
          tx('M0D-01-CINQUEERRORI.16', { p0: 3 + i * 3, p1: t.spiegazione, p2: t.nome }),
          8,
          `T${i + 1}`,
        ),
      ),
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: 'Model!C3',
    };
  },
});

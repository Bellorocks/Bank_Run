/**
 * M0-B · 02 — IF annidato: piu' di due risposte.
 *
 * `IF` sceglie fra due valori. Qui le alternative sono quattro: una scala di
 * commissioni di advisory a scaglioni di Enterprise Value, come quelle che un
 * mandato di M&A riporta davvero in calce. Un solo confronto non basta piu' —
 * bisogna incastrare un IF dentro il "valore se falsa" di quello precedente,
 * tante volte quante sono le fasce meno una.
 *
 * Le soglie (B4:B6) nascono da `rng.int`: il seed decide dove cadono i confini
 * e quindi in quale fascia finiscono le due operazioni del livello. Non e'
 * garantito che T1 e T2 cadano in fasce diverse fra loro — ma la fascia di
 * ciascuna, seed dopo seed, si sposta davvero: a volte la 1, a volte la 4.
 * Chi ha capito l'annidamento lo rifa' ogni volta; chi ha imparato a memoria
 * "il valore e' sempre B9" si schianta al primo seed che smentisce l'abitudine.
 *
 * T3 non fa scrivere una formula: chiede cosa succede esattamente sul confine
 * fra due fasce, lo stesso tipo di domanda che M0B-01-IF faceva su `>` contro
 * `>=`, qui applicata a una catena invece che a un singolo confronto.
 *
 * Il brief chiude accennando a IFS come alternativa quando le fasce diventano
 * tante: l'annidamento resta leggibile a quattro livelli, non a dieci.
 */

import {
  defineTemplate,
  blocco,
  colonna,
  foglio,
  hint,
  par,
  areaLibera,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  eur,
  pct,
} from '../../authoring';
import type { Task } from '../../types';

export default defineTemplate({
  id: 'M0B-02-IFANNIDATO',
  module: 'M0-B',
  title: "Piu' di due risposte: l'IF annidato",
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 260,
  skills: ['xl.if-nested'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const soglie = rng.fork('soglie');
    // Tre soglie crescenti, ciascuna un multiplo tondo di milione: e' cosi' che
    // si scrive davvero una scala di commissioni in un mandato.
    const soglia1 = soglie.int(30, 70) * 1_000_000;
    const soglia2 = soglia1 + soglie.int(60, 120) * 1_000_000;
    const soglia3 = soglia2 + soglie.int(150, 300) * 1_000_000;

    // Aliquote decrescenti al crescere della dimensione del deal: piu' l'Enterprise
    // Value e' grande, piu' basso e' il punto percentuale di commissione. E' la
    // forma classica — non generata a caso, e' lo schema che il livello insegna.
    const aliquota1 = 0.025;
    const aliquota2 = 0.02;
    const aliquota3 = 0.015;
    const aliquota4 = 0.01;

    const aliquotaPerFascia = (ev: number): number => {
      if (ev < soglia1) return aliquota1;
      if (ev < soglia2) return aliquota2;
      if (ev < soglia3) return aliquota3;
      return aliquota4;
    };

    // Range ampio quanto la piu' estrema combinazione possibile di soglie, cosi'
    // che ciascuna operazione possa davvero cadere in una qualunque delle
    // quattro fasce a seconda del seed.
    const operazioni = rng.fork('operazioni');
    const ev1 = operazioni.int(10, 560) * 1_000_000;
    const ev2 = operazioni.int(10, 560) * 1_000_000;

    const commissione1 = ev1 * aliquotaPerFascia(ev1);
    const commissione2 = ev2 * aliquotaPerFascia(ev2);

    const referenziaScala = ['B4', 'B5', 'B6', 'B9', 'B10', 'B11', 'B12'];

    const t1: Task = {
      id: 'T1',
      prompt:
        "In B15 calcola la commissione dell'operazione 1: individua in quale fascia cade " +
        "l'Enterprise Value in B14 confrontandolo con le soglie in B4, B5 e B6, poi applica " +
        "l'aliquota di quella fascia (B9, B10, B11 o B12) all'Enterprise Value stesso. Un solo " +
        "IF non basta: annidane uno dentro il valore-se-falsa dell'altro finche' non hai " +
        'coperto tutte e quattro le fasce.',
      targetCell: 'Model!B15',
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: commissione1 },
        { kind: 'mustReference', cells: [...referenziaScala, 'B14'] },
        { kind: 'mustUseFunction', functions: ['IF'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.if-nested'],
      minKeystrokes: 46,
    };

    const t2: Task = {
      id: 'T2',
      prompt:
        "In B18 fai lo stesso per l'operazione 2: Enterprise Value in B17, stessa scala di " +
        'soglie e aliquote. Non ricopiare il ragionamento a mente — questa operazione puo\' ' +
        "cadere in una fascia diversa dalla prima, e la formula deve funzionare per qualunque EV, " +
        'non solo per quello che hai davanti ora.',
      targetCell: 'Model!B18',
      check: [
        { kind: 'mustBeFormula' },
        { kind: 'value', expected: commissione2 },
        { kind: 'mustReference', cells: [...referenziaScala, 'B17'] },
        { kind: 'mustUseFunction', functions: ['IF'] },
        { kind: 'mustNotContainLiteral', except: [] },
      ],
      skills: ['xl.if-nested'],
      minKeystrokes: 46,
    };

    const t3: Task = {
      id: 'T3',
      prompt:
        "Non scrivere una formula: rispondi a parole in B20. Nella scala che hai appena usato, " +
        "la fascia 2 vale per EV che arriva FINO alla soglia 2 (esclusa) e la fascia 3 parte DA " +
        "quella soglia. Se un'operazione avesse un Enterprise Value esattamente uguale alla " +
        'soglia 2 — nemmeno un euro di piu\' o di meno — in quale fascia cadrebbe? Scrivi solo il numero.',
      targetCell: 'Model!B20',
      check: [{ kind: 'text', expected: '3' }],
      skills: ['xl.if-nested'],
      minKeystrokes: 1,
    };

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M0B-02-IFANNIDATO',
      seed: rng.seed,
      brief: [
        "## Quando due risposte non bastano",
        '',
        "`IF` sceglie fra due valori. Ma una scala di commissioni di advisory non ha due fasce,",
        "ne ha quattro — e per ognuna serve un'aliquota diversa. La soluzione e' annidare: il",
        "\"valore se falsa\" del primo IF non e' un numero, e' un altro IF, che a sua volta puo'",
        'contenerne un terzo. Si scrive cosi\':',
        '',
        '`=IF(condizione1, valore1, IF(condizione2, valore2, IF(condizione3, valore3, valore4)))`',
        '',
        "Ogni IF in piu' aggiunge una parentesi da chiudere alla fine: con tre IF annidati se ne",
        "chiudono tre insieme, tutte in fondo alla formula. E' il punto in cui la maggior parte",
        "degli errori nasce — non nella logica, nella conta delle parentesi.",
        '',
        `Qui la scala e' questa: sotto ${eur(soglia1)} di Enterprise Value la commissione e' del`,
        `${pct(aliquota1)}; da li' fino a ${eur(soglia2)} (esclusa) scende al ${pct(aliquota2)}; da`,
        `${eur(soglia2)} fino a ${eur(soglia3)} (esclusa) al ${pct(aliquota3)}; da ${eur(soglia3)} in`,
        `su al ${pct(aliquota4)}. E' lo schema classico: piu' grande e' il deal, piu' basso e'`,
        "il punto percentuale — il compenso in euro cresce comunque, solo piu' lentamente.",
        '',
        "Le soglie e le aliquote sono gia' scritte nel foglio: la formula deve **referenziarle**,",
        'mai riscriverle come numeri dentro la formula. Se domani la scala cambia, si aggiorna una',
        'cella sola e ogni commissione ricalcolata la segue da sola.',
        '',
        "Un avvertimento per quando le fasce non sono quattro ma dieci: annidare IF dieci volte",
        "si legge a fatica, e sbagliare una parentesi in mezzo diventa quasi automatico. In quel",
        "caso la funzione giusta e' **IFS**: `IFS(condizione1, valore1, condizione2, valore2, ...)`",
        "elenca le coppie condizione-valore una dopo l'altra, senza incastrarle — stessa logica",
        "dell'IF annidato, ma senza il muro di parentesi finale. Con quattro fasce l'IF annidato",
        "resta perfettamente leggibile: e' un'attrezzo che vale la pena conoscere comunque, perche'",
        "in un modello vero le fasce a volte sono davvero dieci.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            blocco('A1', [['Scala di commissioni di advisory a scaglioni']], { style: STILE_TITOLO }),

            blocco('A3', [["Soglie di Enterprise Value (€)"]], { style: STILE_TITOLO }),
            colonna(
              'A4',
              ['Soglia 1', 'Soglia 2', 'Soglia 3'],
              { style: STILE_ETICHETTA },
            ),
            colonna('B4', [soglia1, soglia2, soglia3], { style: STILE_INPUT }),

            blocco('A8', [['Aliquota di commissione per fascia']], { style: STILE_TITOLO }),
            colonna(
              'A9',
              [
                'Fascia 1 — EV sotto la soglia 1',
                'Fascia 2 — da soglia 1 a soglia 2 (esclusa)',
                'Fascia 3 — da soglia 2 a soglia 3 (esclusa)',
                'Fascia 4 — EV da soglia 3 in su',
              ],
              { style: STILE_ETICHETTA },
            ),
            colonna('B9', [aliquota1, aliquota2, aliquota3, aliquota4], { style: STILE_INPUT_PCT }),

            blocco('A14', [['Enterprise Value operazione 1 (€)']], { style: STILE_ETICHETTA }),
            blocco('B14', [[ev1]], { style: STILE_INPUT }),
            blocco('A15', [['Commissione operazione 1 (€)']], { style: STILE_ETICHETTA }),

            blocco('A17', [['Enterprise Value operazione 2 (€)']], { style: STILE_ETICHETTA }),
            blocco('B17', [[ev2]], { style: STILE_INPUT }),
            blocco('A18', [['Commissione operazione 2 (€)']], { style: STILE_ETICHETTA }),

            blocco(
              'A20',
              [["Un EV esattamente pari alla soglia 2: fascia 2 o fascia 3?"]],
              { style: STILE_ETICHETTA },
            ),

            areaLibera(['B15', 'B18', 'B20']),
          ],
          { colWidths: { A: 380, B: 150 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          "Tre confronti, tre IF incastrati: IF(B14<B4, B14*B9, IF(B14<B5, B14*B10, IF(B14<B6, B14*B11, B14*B12))). " +
            "Conta le parentesi aperte: alla fine ne mancano altrettante chiuse.",
          15,
          'T1',
        ),
        hint(
          'H2',
          "Stessa struttura di T1, stesse celle di soglia e aliquota: cambiano solo B14->B17 " +
            "e la cella di arrivo.",
          10,
          'T2',
        ),
        hint(
          'H3',
          "Nella formula la fascia 2 usa la condizione B14<B5 (minore stretto): al valore " +
            "esatto della soglia quella condizione e' falsa, quindi si scende al ramo successivo.",
          8,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 75 }),
      startAt: 'Model!B15',
    };
  },
});

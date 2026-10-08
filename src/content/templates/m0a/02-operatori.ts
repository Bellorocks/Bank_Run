/**
 * M0-A · 02 — Operatori aritmetici, ordine delle operazioni, parentesi.
 *
 * Il punto didattico non e' "sapere che * viene prima di +": quello lo sanno
 * tutti da scuola. Il punto e' che in una formula di modello finanziario le
 * parentesi non sono un vezzo estetico — spostano quale numero moltiplica quale,
 * e un errore di questo tipo produce un numero PLAUSIBILE, non un errore visibile.
 *
 * T1 e' il caso in cui l'ordine naturale delle operazioni basta da solo: si
 * scrive la formula cosi' com'e' descritta a parole e Excel fa gia' la cosa
 * giusta, moltiplicazione prima di somma.
 *
 * T2 e' il caso in cui NON basta: la formula del margine netto ha bisogno di
 * DUE gruppi di parentesi, e togliendole (come mostra il brief con i numeri
 * veri del livello) il risultato cambia di molto, non di poco — perche' una
 * percentuale sottratta come se fosse un numero intero non e' un arrotondamento,
 * e' un errore concettuale.
 */

import {
  defineTemplate,
  blocco,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  eur,
  num,
  pct,
} from '../../authoring';
import { roundTo } from '../../../rng/distributions';

export default defineTemplate({
  id: 'M0A-02-OPERATORI',
  module: 'M0-A',
  title: 'Le parentesi non sono decorazione',
  rank: 1,
  mode: 'GUIDED',
  estimatedSeconds: 150,
  skills: ['xl.arithmetic'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Scenario: piccola produzione e vendita di gadget personalizzati.
    const u = r.int(6, 19); // costo di produzione per pezzo, euro
    const q = r.int(80, 340); // quantita' prodotta
    const F = r.int(900, 3100); // costo fisso mensile (affitto, utenze)
    const R = r.int(3200, 9800); // ricavi del mese
    // Commissione trattenuta dalla piattaforma di vendita online, 4%-18%.
    const c = roundTo(0.04 + r.next() * 0.14, 0.001);

    const costoTotaleProduzione = u * q + F;
    const margineNetto = (R - F) * (1 - c);
    // La formula sbagliata del brief, presa alla lettera: si tolgono le
    // parentesi e si legge da sinistra a destra con le normali precedenze.
    // R - F*1 - c: la commissione, che e' una frazione, viene sottratta come
    // se fosse un numero intero di euro.
    const risultatoSenzaParentesi = R - F * 1 - c;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          'In B5 calcola il costo totale di produzione: costo per pezzo moltiplicato per la quantita\', piu\' il costo fisso mensile. Scrivila cosi\' come la leggi: qui l\'ordine delle operazioni gia\' fa la cosa giusta da solo.',
        target: 'Model!B5',
        atteso: costoTotaleProduzione,
        referenzia: ['B2', 'B3', 'B4'],
        senzaLiteral: [],
        skills: ['xl.arithmetic'],
        minKeystrokes: 12,
      }),
      taskFormula({
        id: 'T2',
        prompt:
          'In B10 calcola il margine netto dopo la commissione: prima sottrai il costo fisso mensile (B4, lo stesso di sopra) dai ricavi, poi moltiplica il risultato per (1 meno la commissione). Qui le parentesi non sono facoltative: senza, cambi cosa moltiplica cosa.',
        target: 'Model!B10',
        atteso: margineNetto,
        referenzia: ['B7', 'B4', 'B9'],
        senzaLiteral: [1],
        skills: ['xl.arithmetic'],
        minKeystrokes: 20,
      }),
    ];

    return {
      templateId: 'M0A-02-OPERATORI',
      seed: rng.seed,
      brief: [
        '## L\'ordine in cui Excel fa i conti',
        '',
        'Una formula non si legge da sinistra a destra come una frase: Excel rispetta le',
        '**precedenze** della matematica. Moltiplicazione e divisione vengono eseguite prima di',
        'somma e sottrazione, sempre — anche se nella formula sono scritte dopo.',
        '',
        `Se scrivi \`=2+3*4\` il risultato e' ${num(2 + 3 * 4)}, non ${num((2 + 3) * 4)}: prima si calcola`,
        `\`3*4\`, poi si somma \`2\`. Per ottenere ${num((2 + 3) * 4)} servirebbero le parentesi: \`=(2+3)*4\`.`,
        'Le parentesi non decorano la formula: dicono a Excel quale pezzo calcolare per primo.',
        '',
        '### Lo scenario',
        '',
        'Una piccola produzione di gadget personalizzati. Ogni pezzo costa',
        `${eur(u)} da produrre, questo mese ne sono usciti ${num(q)}, e ci sono`,
        `${eur(F)} di costi fissi mensili (affitto, utenze) indipendenti da quanto si produce.`,
        '',
        `Il primo task e' il caso semplice: **costo per pezzo × quantita', piu' il costo fisso**.`,
        'Scritta cosi\' com\'e\' descritta a parole, la formula e\' gia\' corretta — la moltiplicazione',
        'vince sulla somma da sola, senza bisogno di parentesi.',
        '',
        `I ricavi del mese sono ${eur(R)}. La piattaforma di vendita online trattiene una`,
        `commissione del ${pct(c)} sul margine che resta dopo aver coperto il costo fisso mensile.`,
        'Il margine netto e\':',
        '',
        '`= (Ricavi − CostoFisso) × (1 − Commissione)`',
        '',
        'Qui le parentesi servono davvero. Guarda cosa succede a toglierle: se scrivessi',
        '`=Ricavi-CostoFisso*1-Commissione`, Excel calcolerebbe prima `CostoFisso*1` (che non cambia',
        'niente) e poi sottrarrebbe sia quello sia la commissione da Ricavi, una dopo l\'altra —',
        `come se la commissione, che e' una frazione (${pct(c)}), fosse un importo intero in euro da togliere`,
        `di netto. Il risultato verrebbe ${eur(risultatoSenzaParentesi, 2)}, ben lontano dal`,
        `margine vero di ${eur(margineNetto, 2)}. Lo sbaglio non e' un arrotondamento: e\' aver`,
        'moltiplicato la cosa sbagliata per la cosa sbagliata.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Produzione e vendita di gadget'], { style: STILE_TITOLO }),
            blocco('A2', [
              ['Costo di produzione per pezzo'],
              ['Quantita\' prodotta'],
              ['Costo fisso mensile'],
              ['Costo totale di produzione'],
            ], { style: STILE_ETICHETTA }),
            blocco('B2', [[u], [q], [F]], { style: STILE_INPUT }),

            blocco('A7', [
              ['Ricavi del mese'],
            ], { style: STILE_ETICHETTA }),
            blocco('B7', [[R]], { style: STILE_INPUT }),
            blocco('A9', [
              ['Commissione piattaforma di vendita'],
              ['Margine netto dopo la commissione'],
            ], { style: STILE_ETICHETTA }),
            blocco('B9', [[c]], { style: STILE_INPUT_PCT }),

            areaLibera(['B5', 'B10']),
          ],
          { colWidths: { A: 260, B: 130 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          'Moltiplicazione prima, somma dopo: Excel lo fa da solo. Scrivi la formula cosi\' come la leggi, senza parentesi.',
          8,
          'T1',
        ),
        hint(
          'H2',
          'Fai prima (B7-B4) fra parentesi, poi moltiplica tutto per (1-B9), anche questo fra parentesi. Due gruppi, due coppie di parentesi.',
          12,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: 'Model!B5',
    };
  },
});

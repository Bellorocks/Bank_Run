/**
 * M3 · 08 — Leakage: valore che esce a beneficio del venditore, permesso o no.
 *
 * Ultimo livello del modulo per dipendenza (il combo, se esiste, viene dopo).
 * M3-07 (prerequisito) ha spiegato lo schema locked box: prezzo fissato alla
 * locked box date, nessun aggiustamento sui conti reali al closing. Il rischio
 * che il compratore si accolla in cambio di quella certezza e' che, fra la
 * locked box date e il closing, l'azienda resti gestita dal VENDITORE — che
 * potrebbe farne uscire valore a proprio beneficio prima di consegnarla. Quel
 * valore in uscita e' il "leakage": ogni euro che lascia l'azienda fra le due
 * date A BENEFICIO DEL VENDITORE (non un costo operativo normale che sarebbe
 * uscito comunque, sotto qualunque proprietario).
 *
 * La distinzione centrale, che i contratti di locked box regolano esplicitamente:
 *  - leakage PERMESSO ("permitted leakage"): concordato in anticipo nel
 *    contratto — lo stipendio ordinario del management-venditore, l'affitto a
 *    mercato di un immobile del venditore, un dividendo gia' deliberato prima
 *    della locked box date. E' valore che sarebbe uscito comunque, quali che
 *    fossero i piani di vendita: NON richiede compensazione.
 *  - leakage NON PERMESSO ("unpermitted leakage"): tutto il resto — un
 *    dividendo straordinario deliberato dopo la locked box date, spese
 *    personali del venditore pagate con cassa aziendale, una management fee
 *    straordinaria verso una societa' del venditore. E' valore che il
 *    compratore non ha mai visto e su cui non ha mai potuto contare: va
 *    rimborsato al compratore EURO PER EURO, riducendo il prezzo finale.
 *
 * IL PARALLELO DIDATTICO (esplicitato nel brief): e' esattamente la stessa
 * disciplina di ambito gia' vista in M2-05 (isolare le sole spese legali
 * "straordinarie", non l'intero elenco) e in M2-11 (isolare i soli addback
 * legittimi in un elenco misto): un elenco di movimenti misti, un'etichetta
 * che classifica ciascuna riga, e la tentazione — sbagliata — di sommare
 * tutto indiscriminatamente. Qui la posta in gioco e' il prezzo pagato dal
 * compratore, non l'EBITDA normalizzato, ma il meccanismo Excel e' identico:
 * SUMIF con un solo criterio testuale.
 *
 * DUE TASK IN CASCATA:
 *   T1  Leakage non permesso totale = SUMIF sulla colonna etichetta = "non permesso"
 *   T2  Prezzo finale rettificato = prezzo concordato (dato, bloccato) - T1
 *
 * Il segno di T2 e' il punto che un giocatore distratto sbaglia piu' facilmente:
 * il leakage non permesso ha gia' beneficiato il venditore PRIMA del closing,
 * quindi il compratore lo RECUPERA riducendo quanto paga — si SOTTRAE dal
 * prezzo concordato, non si aggiunge. Il prompt lo dice esplicitamente.
 *
 * Geometria: DATA_END dipende da `n` (4 o 5, deciso a runtime dal seed) — tutti
 * i riferimenti sotto sono calcolati come funzione di DATA_START/n, mai
 * scritti come letterali fissi, stesso pattern di M2-05.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_TITOLO,
  STILE_TOTALE,
  eur,
  eurM,
  num,
} from '../../authoring';
import { roundTo, triangular } from '../../../rng/distributions';
import type { Task } from '../../types';

const PERMESSO = [
  'Stipendio mensile ordinario del management-venditore, come da contratto',
  "Canone di locazione ordinario per l'immobile aziendale, dovuto al venditore a condizioni di mercato",
  'Bonus annuale del management previsto dal piano di incentivazione ordinario',
  'Dividendo ordinario deliberato PRIMA della locked box date',
  'Rimborso spese di viaggio ordinarie del management, documentate',
] as const;

const NON_PERMESSO = [
  'Dividendo straordinario deliberato DOPO la locked box date',
  "Spese personali del venditore pagate con la carta aziendale",
  'Bonus una tantum al management-venditore, non previsto dal contratto',
  "Management fee straordinaria pagata a una societa' riconducibile al venditore",
  "Estinzione di un debito personale del venditore con cassa dell'azienda",
] as const;

interface Movimento {
  readonly descrizione: string;
  readonly tipo: 'permesso' | 'non permesso';
  readonly importo: number;
}

// --- Geometria fissa dell'intestazione: non dipende dal seed. --------------
const ROW_TITOLO = 1;
const ROW_SEZ1 = 3;
const ROW_PREZZO = 4; // B4: prezzo concordato al signing (dato, bloccato)
const ROW_SEZ2 = 6;
const ROW_HEADER = 7; // Movimento | Tipo | Importo (€)
const DATA_START = 8;

export default defineTemplate({
  id: 'M3-08-LEAKAGE',
  module: 'M3',
  title: 'Leakage: valore che esce a beneficio del venditore',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 270,
  skills: ['nwc.leakage'],
  prerequisites: ['M3-07-LOCKEDBOX'],

  generate: (rng) => {
    const r = rng.fork('dati');

    // Prezzo concordato al signing, alla locked box date — stessa scala degli
    // altri livelli del modulo (M3-07 usa lo stesso range per il valore d'impresa).
    const prezzoConcordato = r.int(5000, 60000) * 1000;

    // 4 o 5 movimenti totali, con un mix garantito: almeno uno permesso e
    // almeno uno non permesso (mai tutti dello stesso tipo, altrimenti SUMIF
    // e SUM darebbero lo stesso risultato e il livello non insegnerebbe
    // niente) — stesso schema di generazione di M2-05.
    const n = r.int(4, 5);
    const kNonPermesso = r.int(1, n - 1);
    const nPermesso = n - kNonPermesso;

    const descrizioniPermesso = r.shuffle([...PERMESSO]).slice(0, nPermesso);
    const descrizioniNonPermesso = r.shuffle([...NON_PERMESSO]).slice(0, kNonPermesso);

    const movimentiPermesso: Movimento[] = descrizioniPermesso.map((descrizione) => ({
      descrizione,
      tipo: 'permesso',
      // Voci ordinarie, gia' previste dal contratto: importi contenuti.
      importo: roundTo(triangular(r, 20_000, 60_000, 150_000), 500),
    }));
    const movimentiNonPermesso: Movimento[] = descrizioniNonPermesso.map((descrizione) => ({
      descrizione,
      tipo: 'non permesso',
      // Leakage non autorizzato: tipicamente piu' consistente (dividendo
      // straordinario, spese personali importanti).
      importo: roundTo(triangular(r, 40_000, 120_000, 350_000), 500),
    }));

    // Rimescolati insieme: nell'elenco che il giocatore vede, permesso e non
    // permesso non sono raggruppati.
    const movimenti: Movimento[] = r.shuffle([...movimentiPermesso, ...movimentiNonPermesso]);

    const DATA_END = DATA_START + n - 1;
    const ROW_SEZ3 = DATA_END + 2;
    const ROW_LEAKAGE = ROW_SEZ3 + 1; // T1
    const ROW_PREZZO_RETT = ROW_LEAKAGE + 1; // T2

    const rifTipo = `B${DATA_START}`;
    const rifImporti = `C${DATA_START}`;
    const B_PREZZO = `B${ROW_PREZZO}`;
    const C_LEAKAGE = `C${ROW_LEAKAGE}`;
    const C_PREZZO_RETT = `C${ROW_PREZZO_RETT}`;

    const leakageNonPermesso = movimenti
      .filter((m) => m.tipo === 'non permesso')
      .reduce((acc, m) => acc + m.importo, 0);
    const totaleElencoCompleto = movimenti.reduce((acc, m) => acc + m.importo, 0);
    const prezzoRettificato = prezzoConcordato - leakageNonPermesso;

    const t1: Task = (() => {
      const base = taskFormula({
        id: 'T1',
        prompt:
          `In ${C_LEAKAGE} calcola il leakage non permesso totale: la somma dei SOLI importi con ` +
          `Tipo = "non permesso" nell'elenco qui sopra (${rifTipo}:B${DATA_END} per il tipo, ` +
          `${rifImporti}:C${DATA_END} per gli importi). Le voci "permesso" sono valore che sarebbe ` +
          "uscito dall'azienda comunque, quali che fossero i piani di vendita — gia' concordate nel " +
          "contratto — e NON vanno toccate: sommare l'intero elenco, incluse le voci permesse, non e' " +
          "solo impreciso ma un errore concettuale grave, esattamente come normalizzare l'EBITDA " +
          "sommando anche le rettifiche ricorrenti (M2). Serve una funzione che sommi solo le righe che " +
          'rispettano il criterio.',
        target: `Model!${C_LEAKAGE}`,
        atteso: leakageNonPermesso,
        referenzia: [rifTipo, rifImporti],
        senzaLiteral: [],
        skills: ['nwc.leakage'],
        minKeystrokes: 30,
      });
      return {
        ...base,
        check: [...base.check, { kind: 'mustUseFunction' as const, functions: ['SUMIF'] }],
      };
    })();

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${C_PREZZO_RETT} calcola il prezzo finale rettificato a carico del compratore: il prezzo ` +
        `concordato al signing (${B_PREZZO}) MENO il leakage non permesso appena isolato (${C_LEAKAGE}). ` +
        "Quel leakage ha gia' fatto uscire valore dall'azienda a beneficio del venditore, prima del " +
        "closing: il compratore lo recupera riducendo quanto paga, quindi si SOTTRAE dal prezzo — non " +
        'si aggiunge.',
      target: `Model!${C_PREZZO_RETT}`,
      atteso: prezzoRettificato,
      referenzia: [B_PREZZO, C_LEAKAGE],
      senzaLiteral: [],
      skills: ['nwc.leakage'],
      minKeystrokes: 6,
    });

    const tasks = [t1, t2];

    return {
      templateId: 'M3-08-LEAKAGE',
      seed: rng.seed,
      brief: [
        '## Leakage: valore che esce a beneficio del venditore',
        '',
        "Nello schema locked box (livello precedente) il prezzo si fissa alla locked box date e non si " +
          "aggiusta piu' sui conti reali al closing. Ma fra quella data e il closing effettivo l'azienda " +
          "resta gestita dal VENDITORE — e in quella finestra il venditore potrebbe far uscire valore " +
          "dall'azienda a proprio beneficio, prima di consegnarla. Quel valore in uscita si chiama " +
          '**leakage**, e i contratti di locked box lo regolano esplicitamente distinguendo due casi.',
        '',
        '- **Leakage permesso** ("permitted leakage"): concordato in anticipo nel contratto — lo ' +
          "stipendio ordinario del management-venditore, un affitto a mercato dovuto al venditore, un " +
          "dividendo gia' deliberato prima della locked box date. E' valore che sarebbe uscito comunque, " +
          "sotto qualunque proprietario: NON richiede compensazione.",
        '- **Leakage non permesso** ("unpermitted leakage"): tutto il resto — un dividendo straordinario ' +
          "deliberato dopo la locked box date, spese personali del venditore pagate con cassa aziendale, " +
          "una management fee straordinaria verso una societa' del venditore. E' valore che il " +
          "compratore non ha mai visto e su cui non ha mai potuto contare: va rimborsato al compratore " +
          '**euro per euro**, riducendo il prezzo finale.',
        '',
        `Il prezzo concordato al signing e' ${eurM(prezzoConcordato)} (${eur(prezzoConcordato)}). Qui ` +
          `sotto trovi ${num(n)} movimenti avvenuti fra la locked box date e il closing, ciascuno ` +
          'etichettato Tipo = "permesso" oppure Tipo = "non permesso", in ordine sparso.',
        '',
        "Sommare l'intero elenco indiscriminatamente sarebbe un errore concettuale, non un dettaglio — " +
          "esattamente lo stesso tipo di disciplina che hai gia' allenato in M2 isolando le sole voci " +
          "straordinarie in un elenco di spese legali, o i soli addback legittimi in un elenco misto: " +
          `il totale di TUTTI i movimenti e' ${eur(totaleElencoCompleto)}, ma solo una parte di quel ` +
          "numero e' leakage non permesso, ed e' quella parte che riduce il prezzo. Isola prima le righe " +
          'giuste, poi somma.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga(`A${ROW_TITOLO}`, ['Leakage: locked box date → closing'], { style: STILE_TITOLO }),

            riga(`A${ROW_SEZ1}`, ['Dati concordati al signing'], { style: STILE_TITOLO }),
            colonna(`A${ROW_PREZZO}`, ['Prezzo concordato, €'], { style: STILE_ETICHETTA }),
            [{ ref: B_PREZZO, content: prezzoConcordato, style: STILE_INPUT, locked: true }],

            riga(`A${ROW_SEZ2}`, ['Movimenti fra locked box date e closing — elenco completo'], {
              style: STILE_TITOLO,
            }),
            riga(`A${ROW_HEADER}`, ['Movimento', 'Tipo', 'Importo (€)'], { style: STILE_TITOLO }),
            colonna(`A${DATA_START}`, movimenti.map((m) => m.descrizione), { style: STILE_ETICHETTA }),
            colonna(`B${DATA_START}`, movimenti.map((m) => m.tipo), { style: STILE_ETICHETTA }),
            colonna(`C${DATA_START}`, movimenti.map((m) => m.importo), { style: STILE_INPUT }),

            riga(`A${ROW_SEZ3}`, ['Rettifica del prezzo'], { style: STILE_TITOLO }),
            colonna(
              `A${ROW_LEAKAGE}`,
              ['Leakage non permesso totale, €', 'Prezzo finale rettificato, €'],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: C_LEAKAGE, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: C_PREZZO_RETT, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 460, B: 130, C: 140 }, frozenRows: ROW_HEADER },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=SUMIF(${rifTipo}:B${DATA_END},"non permesso",${rifImporti}:C${DATA_END}): somma solo gli ` +
            'importi delle righe con Tipo uguale a "non permesso", ignorando le righe "permesso".',
          12,
          'T1',
        ),
        hint(
          'H2',
          `=${B_PREZZO}-${C_LEAKAGE}: prezzo concordato MENO il leakage non permesso. Il venditore ne ha ` +
            "gia' beneficiato prima del closing, quindi il compratore lo recupera riducendo il prezzo.",
          8,
          'T2',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 75 }),
      startAt: `Model!${C_LEAKAGE}`,
    };
  },
});

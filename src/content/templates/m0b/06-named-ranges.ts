/**
 * M0-B · 06 — Il nome al posto dell'indirizzo (named ranges, in attesa del motore).
 *
 * NOTA DI IMPLEMENTAZIONE: `HyperFormula.addNamedExpression` esiste nel motore
 * (vedi node_modules/hyperformula/typings/HyperFormula.d.ts), ma `Workbook`
 * (src/engine/workbook.ts) non lo espone ancora — non c'e' un modo per un
 * `LevelTemplate` di pre-registrare un nome, ne' un `Check` che lo verifichi.
 * Aggiungerlo era fuori dal perimetro di questo file (avrebbe voluto dire
 * toccare `workbook.ts` e `types.ts`, entrambi assegnati altrove).
 *
 * Il livello insegna quindi il concetto per via indiretta, con lo schema gia'
 * disponibile: un'unica cella di assunzione, resa visivamente inconfondibile,
 * che OGNI riga della tabella deve referenziare con un ancoraggio assoluto —
 * esattamente il pattern che un named range formalizza. Il brief spiega cosa
 * sarebbe un vero nome definito e perche' rende le formule leggibili; quando
 * il motore avra' un modo di registrare nomi (vedi apertura in `openIssues`
 * del batch), questo livello e' il candidato naturale da riscrivere con un
 * vero `mustReference` su un nome invece che su un indirizzo.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  areaLibera,
  taskFormula,
  STILE_ETICHETTA,
  STILE_INPUT,
  STILE_TITOLO,
  eur,
  num,
  pct,
} from '../../authoring';
import { MODEL_COLORS } from '../../../styles/palette';
import { roundTo, triangular } from '../../../rng/distributions';
import type { CellStyle } from '../../../engine/types';

/** Prezzo per azione: due decimali, e un bordo tutto intorno — la casella che "farebbe" da nome. */
const STILE_ASSUNZIONE_PREZZO: CellStyle = {
  fontColor: MODEL_COLORS.input,
  numFmt: '#,##0.00',
  borders: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

const STILE_ASSUNZIONE_PCT: CellStyle = {
  fontColor: MODEL_COLORS.input,
  numFmt: '0.0%',
  borders: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

interface Socio {
  readonly nome: string;
  readonly azioni: number;
}

export default defineTemplate({
  id: 'M0B-06-NAMEDRANGES',
  module: 'M0-B',
  title: 'Il nome al posto dell\'indirizzo',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 330,
  skills: ['xl.named-ranges', 'xl.anchoring', 'xl.fill', 'xl.row-consistency', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const prezzoAzione = roundTo(triangular(r, 6.5, 15, 38), 0.05);
    const commissionePct = roundTo(triangular(r, 0.006, 0.014, 0.028), 0.001);

    const soci: readonly Socio[] = [
      { nome: 'Fondatore e CEO', azioni: r.int(420_000, 680_000) },
      { nome: 'Family office storico', azioni: r.int(180_000, 340_000) },
      { nome: 'Fondo di co-investimento', azioni: r.int(90_000, 220_000) },
      { nome: 'Manager operativo', azioni: r.int(60_000, 140_000) },
      { nome: 'Soci di minoranza (aggregato)', azioni: r.int(15_000, 55_000) },
    ];

    const lordo = soci.map((s) => s.azioni * prezzoAzione);
    const netto = lordo.map((l) => l - l * commissionePct);
    const totaleNetto = netto.reduce((acc, n) => acc + n, 0);

    const RIGA_PRIMO_SOCIO = 6;
    const RIGA_ULTIMO_SOCIO = RIGA_PRIMO_SOCIO + soci.length - 1; // 10
    const RIGA_TOTALE = 12;

    const rangeLordo = `Model!C${RIGA_PRIMO_SOCIO}:C${RIGA_ULTIMO_SOCIO}`;
    const rangeNetto = `Model!D${RIGA_PRIMO_SOCIO}:D${RIGA_ULTIMO_SOCIO}`;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          `In C${RIGA_PRIMO_SOCIO} calcola il corrispettivo lordo del primo socio: azioni per il prezzo per azione. ` +
          'Il prezzo sta nella casella riquadrata in C2 — non e\' una cella come le altre: e\' quella che TUTTE le righe della tabella devono guardare. Bloccala con il dollaro, cosi\' resta ferma quando la copi in basso.',
        target: `Model!C${RIGA_PRIMO_SOCIO}`,
        atteso: lordo[0],
        referenzia: [`B${RIGA_PRIMO_SOCIO}`, 'C2'],
        ancoraggio: '$C$2',
        senzaLiteral: [],
        skills: ['xl.named-ranges', 'xl.anchoring'],
        minKeystrokes: 12,
      }),
      {
        id: 'T2',
        prompt:
          `Riempi C${RIGA_PRIMO_SOCIO}:C${RIGA_ULTIMO_SOCIO} copiando quella formula su tutti i soci. Stessa formula, stesso ancoraggio, nessun ritocco riga per riga.`,
        targetCell: rangeLordo,
        check: [
          { kind: 'consistentRow' as const, range: rangeLordo },
          { kind: 'noError' as const },
        ],
        skills: ['xl.fill', 'xl.row-consistency'],
        minKeystrokes: 8,
      },
      taskFormula({
        id: 'T3',
        prompt:
          `In D${RIGA_PRIMO_SOCIO} calcola il corrispettivo netto del primo socio: il lordo meno la commissione bancaria sul lordo. La commissione sta nell'altra casella riquadrata, C3 — stessa logica del prezzo: un punto solo, referenziato da ogni riga.`,
        target: `Model!D${RIGA_PRIMO_SOCIO}`,
        atteso: netto[0],
        referenzia: [`C${RIGA_PRIMO_SOCIO}`, 'C3'],
        ancoraggio: '$C$3',
        senzaLiteral: [],
        skills: ['xl.named-ranges', 'xl.anchoring'],
        minKeystrokes: 16,
      }),
      {
        id: 'T4',
        prompt: `Riempi anche D${RIGA_PRIMO_SOCIO}:D${RIGA_ULTIMO_SOCIO} allo stesso modo.`,
        targetCell: rangeNetto,
        check: [
          { kind: 'consistentRow' as const, range: rangeNetto },
          { kind: 'noError' as const },
        ],
        skills: ['xl.fill', 'xl.row-consistency'],
        minKeystrokes: 8,
      },
      taskFormula({
        id: 'T5',
        prompt: `In D${RIGA_TOTALE} il totale del corrispettivo netto pagato a tutti i soci.`,
        target: `Model!D${RIGA_TOTALE}`,
        atteso: totaleNetto,
        referenzia: [`D${RIGA_PRIMO_SOCIO}`, `D${RIGA_ULTIMO_SOCIO}`],
        skills: ['xl.aggregates'],
        minKeystrokes: 12,
      }),
    ];

    const areaLavoro = [
      ...Array.from({ length: soci.length }, (_, i) => `C${RIGA_PRIMO_SOCIO + i}`),
      ...Array.from({ length: soci.length }, (_, i) => `D${RIGA_PRIMO_SOCIO + i}`),
      `D${RIGA_TOTALE}`,
    ];

    return {
      templateId: 'M0B-06-NAMEDRANGES',
      seed: rng.seed,
      brief: [
        '## Un nome al posto di un indirizzo',
        '',
        'Quando scrivi `$C$2` dentro una formula stai dicendo "questa cella, sempre quella, non spostarti',
        'mai". Funziona — l\'hai gia\' allenato. Ma chi rilegge la formula fra sei mesi deve andare fisicamente',
        'su C2 per capire cosa contiene.',
        '',
        'In Excel vero esiste un modo piu\' leggibile: dai **un nome** a quella cella, con **Formule >',
        'Definisci nome**, oppure scrivendo il nome direttamente nella **Name box** — il campo a sinistra',
        'della barra della formula, dove di solito leggi l\'indirizzo tipo "C2" — e premendo Invio. Da quel',
        'momento `=B6*$C$2` si scrive `=B6*PrezzoAzione`: la formula si legge da sola senza bisogno di andare',
        'a controllare cosa c\'e\' dentro, e se un giorno sposti la cella il nome la segue.',
        '',
        '*(Questo trainer non genera ancora named range veri dentro il foglio — e\' un lavoro futuro sul',
        'motore di gioco. L\'esercizio comunque allena esattamente la disciplina che li rende utili:',
        'individuare la cella unica che tutte le formule devono condividere, e bloccarla con `$` cosi\'',
        'non scivola quando la copi.)*',
        '',
        '## Il caso',
        '',
        `E' stata accettata un'offerta di acquisizione a **${eur(prezzoAzione, 2)}** per azione. La banca`,
        `che gestisce il closing trattiene una commissione del **${pct(commissionePct)}** sul lordo di ogni`,
        'socio prima di girare il netto.',
        '',
        'Prezzo e commissione stanno in **due caselle sole**, riquadrate in alto: sono i due numeri che',
        `ogni riga della tabella dei ${num(soci.length)} soci deve guardare — mai un altro punto del foglio,`,
        'mai un valore ribattuto a mano riga per riga.',
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Riparto del corrispettivo di cessione'], { style: STILE_TITOLO }),
            colonna('A2', ['Prezzo per azione offerto', 'Commissione bancaria sul lordo'], { style: STILE_ETICHETTA }),
            [{ ref: 'C2', content: prezzoAzione, style: STILE_ASSUNZIONE_PREZZO, locked: true }],
            [{ ref: 'C3', content: commissionePct, style: STILE_ASSUNZIONE_PCT, locked: true }],

            riga('A5', ['Socio', 'Azioni', 'Corrispettivo lordo', 'Corrispettivo netto'], { style: STILE_TITOLO }),
            colonna(`A${RIGA_PRIMO_SOCIO}`, soci.map((s) => s.nome), { style: STILE_ETICHETTA }),
            colonna(`B${RIGA_PRIMO_SOCIO}`, soci.map((s) => s.azioni), { style: STILE_INPUT }),

            colonna(`A${RIGA_TOTALE}`, ['Totale netto ai soci'], { style: STILE_ETICHETTA }),

            areaLibera(areaLavoro),
          ],
          {
            colWidths: { A: 230, B: 100, C: 140, D: 140 },
            frozenRows: 5,
            frozenCols: 1,
          },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          'Scrivi `=B6*C2`, poi torna sul riferimento a C2 con F2 e premi F4 finche\' non diventa `$C$2`.',
          10,
          'T1',
        ),
        hint('H2', `Copia C${RIGA_PRIMO_SOCIO}, seleziona ${rangeLordo.replace('Model!', '')}, incolla (o Ctrl+D).`, 8, 'T2'),
        hint(
          'H3',
          `Il netto e' il lordo meno la commissione sul lordo: =C${RIGA_PRIMO_SOCIO}-C${RIGA_PRIMO_SOCIO}*C3, con C3 bloccato allo stesso modo di C2.`,
          10,
          'T3',
        ),
        hint('H4', `Copia D${RIGA_PRIMO_SOCIO}, seleziona ${rangeNetto.replace('Model!', '')}, incolla (o Ctrl+D).`, 8, 'T4'),
        hint('H5', 'SUM sulla colonna del netto, dal primo all\'ultimo socio.', 8, 'T5'),
      ],
      parScore: par(tasks, { letturaSecondi: 70 }),
      startAt: `Model!C${RIGA_PRIMO_SOCIO}`,
    };
  },
});

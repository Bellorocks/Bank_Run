/**
 * M1 · 09 — Imposte correnti e imposte differite (DTA).
 *
 * SEMPLIFICAZIONE DICHIARATA — questo livello calcola SOLO l'IRES (aliquota
 * fissa 24%, la vera aliquota italiana post-2017: e' un dato di legge, quindi
 * NON viene randomizzata). L'IRAP resta fuori: introdurrebbe una seconda base
 * imponibile con regole di deducibilita' diverse (es. il costo del lavoro),
 * che non e' il punto didattico di questo livello.
 *
 * IL PUNTO DIDATTICO — l'utile civilistico (quello di bilancio) e la base
 * imponibile fiscale (quella su cui si calcolano davvero le imposte) non
 * coincidono quasi mai. Qui si generano due scostamenti:
 *
 *   - una VARIAZIONE IN AUMENTO: un costo gia' spesato in bilancio
 *     quest'anno, ma che il fisco non riconosce come deducibile quest'anno
 *     (tipico: quota di un costo pluriennale che eccede il tetto fiscale).
 *     Fa salire la base imponibile fiscale sopra l'utile di bilancio.
 *
 *   - una DIFFERENZA TEMPORANEA DEDUCIBILE IN FUTURO: l'esempio da manuale e'
 *     un accantonamento a un fondo rischi, che il bilancio spesa (ed e' gia'
 *     dentro l'utile ante imposte) ma che il fisco NON lascia dedurre finche'
 *     il fondo non verra' effettivamente utilizzato, in un anno successivo.
 *     Quest'anno quella differenza fa parte della base imponibile fiscale
 *     tanto quanto la variazione in aumento; ma, a differenza sua, si
 *     RIASSORBIRA' in futuro — ed e' proprio quel riassorbimento futuro a
 *     generare oggi un CREDITO fiscale: le imposte anticipate (DTA).
 *
 * CONVENZIONE DI SEGNO (il punto piu' a rischio di confusione, ripetuto nel
 * brief e in ogni prompt che la tocca):
 *   - Le imposte anticipate (DTA, T2) NON sono un costo aggiuntivo: sono un
 *     PROVENTO fiscale, un credito verso l'Erario che matura oggi perche' in
 *     futuro pagherai meno imposte di quelle "correnti" pure. Riducono
 *     l'onere fiscale totale di competenza dell'anno.
 *   - Le imposte totali di competenza (T3, quelle che vanno a Conto
 *     Economico) sono quindi le imposte correnti MENO le anticipate, non
 *     piu' le anticipate.
 *
 * DERIVAZIONE ALGEBRICA DEI TRE TASK, calcolata in forma chiusa nel
 * generate() (non un placeholder):
 *
 *   BaseImponibile   = UtileAnteImposte + VariazioneInAumento
 *                        + DifferenzaTemporaneaDeducibile
 *   T1 ImposteCorrenti = BaseImponibile * AliquotaIRES
 *   T2 DTA             = DifferenzaTemporaneaDeducibile * AliquotaIRES
 *   T3 ImposteTotali   = T1 - T2
 *
 * Nota: la variazione in aumento e la differenza temporanea deducibile
 * entrano ENTRAMBE nella base imponibile con lo stesso segno (sommandosi
 * all'utile ante imposte): quest'anno il fisco le tassa allo stesso modo. La
 * differenza fra le due sta in quello che succede DOPO — solo la seconda
 * genera un credito che si vedra' negli anni successivi, ed e' quel credito
 * (non la base imponibile) l'oggetto di T2.
 *
 * Tutti gli input sono generati come multipli di 1.000 e l'aliquota e' un
 * multiplo di 0,01: ogni prodotto (base * 24%, differenza * 24%) resta un
 * numero esatto in virgola, senza residui di arrotondamento — non serve una
 * tolleranza allargata sui task.
 */

import {
  defineTemplate,
  colonna,
  foglio,
  hint,
  par,
  riga,
  taskFormula,
  eur,
  pct,
  STILE_ETICHETTA,
  STILE_FORMULA,
  STILE_INPUT,
  STILE_INPUT_PCT,
  STILE_TITOLO,
  STILE_TOTALE,
} from '../../authoring';

// --- Geometria fissa del foglio: nessuna posizione dipende dal seed. --------
const B_UAI = 'B4'; // Utile ante imposte
const B_VAR = 'B5'; // Variazione in aumento permanente (costi mai deducibili)
const B_DTD = 'B6'; // Differenza temporanea deducibile in futuro (es. accantonamento)
const B_ALIQ = 'B7'; // Aliquota IRES

const B_IMPCORR = 'B10'; // T1 — imposte correnti
const B_DTA = 'B11'; // T2 — imposte anticipate (DTA) dell'anno
const B_IMPTOT = 'B12'; // T3 — imposte totali di competenza a Conto Economico

const ALIQUOTA_IRES = 0.24; // dato di legge, non randomizzato

export default defineTemplate({
  id: 'M1-09-IMPOSTE',
  module: 'M1',
  title: 'Imposte correnti e imposte anticipate (DTA)',
  rank: 3,
  mode: 'PRACTICE',
  estimatedSeconds: 300,
  skills: ['acc.taxes'],
  prerequisites: ['M1-07-TREPROSPETTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const utileAnteImposte = r.int(100, 800) * 1000;
    const variazioneInAumento = r.int(5, 80) * 1000;
    const differenzaTemporaneaDeducibile = r.int(10, 150) * 1000;

    const baseImponibile = utileAnteImposte + variazioneInAumento + differenzaTemporaneaDeducibile;
    const imposteCorrenti = baseImponibile * ALIQUOTA_IRES;
    const dta = differenzaTemporaneaDeducibile * ALIQUOTA_IRES;
    const imposteTotali = imposteCorrenti - dta;

    const t1 = taskFormula({
      id: 'T1',
      prompt:
        `In ${B_IMPCORR} calcola le IMPOSTE CORRENTI dell'anno: parti dall'utile ante imposte (${B_UAI}), ` +
        `aggiungi la variazione in aumento permanente (${B_VAR} — un costo gia' spesato in bilancio che il ` +
        `fisco non riconoscera' mai) e la differenza temporanea deducibile in futuro (${B_DTD} — ` +
        "es. un accantonamento a fondo rischi, che il fisco tassa oggi e lascera' dedurre solo quando il " +
        `fondo verra' utilizzato). Ottieni cosi' la base imponibile fiscale: moltiplicala per l'aliquota ` +
        `IRES (${B_ALIQ}).`,
      target: `Model!${B_IMPCORR}`,
      atteso: imposteCorrenti,
      referenzia: [B_UAI, B_VAR, B_DTD, B_ALIQ],
      senzaLiteral: [],
      skills: ['acc.taxes'],
      minKeystrokes: 24,
    });

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In ${B_DTA} calcola le IMPOSTE ANTICIPATE (DTA) generate quest'anno: la differenza temporanea ` +
        `deducibile in futuro (${B_DTD}) moltiplicata per l'aliquota IRES (${B_ALIQ}). ATTENZIONE al ` +
        "segno: questo NON e' un costo aggiuntivo. E' un CREDITO fiscale — un provento che matura oggi " +
        "perche' negli anni futuri, quando il fondo rischi verra' utilizzato, pagherai meno imposte di " +
        'quelle correnti pure. Riduce (non aumenta) l\'onere fiscale totale di competenza dell\'anno, che ' +
        'calcolerai nel prossimo task.',
      target: `Model!${B_DTA}`,
      atteso: dta,
      referenzia: [B_DTD, B_ALIQ],
      senzaLiteral: [],
      skills: ['acc.taxes'],
      minKeystrokes: 6,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        `In ${B_IMPTOT} calcola le IMPOSTE TOTALI di competenza dell'anno, quelle che vanno a Conto ` +
        `Economico: le imposte correnti (${B_IMPCORR}) MENO le imposte anticipate (${B_DTA}). Le ` +
        "anticipate sono un provento che riduce l'onere fiscale complessivo: si sottraggono, non si " +
        'sommano.',
      target: `Model!${B_IMPTOT}`,
      atteso: imposteTotali,
      referenzia: [B_IMPCORR, B_DTA],
      senzaLiteral: [],
      skills: ['acc.taxes'],
      minKeystrokes: 8,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M1-09-IMPOSTE',
      seed: rng.seed,
      brief: [
        '## Utile di bilancio e base imponibile fiscale non sono la stessa cosa',
        '',
        "**Semplificazione dichiarata**: qui calcoli solo l'IRES, con l'aliquota vera del 24%. L'IRAP " +
          "resta fuori — ha una base imponibile diversa (include il costo del lavoro) e non e' il punto " +
          'di questo livello.',
        '',
        "L'utile ante imposte che il bilancio riporta non e' quasi mai la cifra su cui il fisco calcola " +
          "le imposte. Quest'anno ci sono due scostamenti fra i due mondi:",
        '',
        `- una **variazione in aumento permanente** di ${eur(variazioneInAumento)}: un costo gia' spesato in ` +
          "bilancio che il fisco non riconoscera' mai (per esempio una quota di spese di rappresentanza " +
          "indeducibile). Essendo permanente, non genera imposte anticipate;",
        `- una **differenza temporanea deducibile in futuro** di ${eur(differenzaTemporaneaDeducibile)}: ` +
          "l'esempio classico e' un accantonamento a fondo rischi, gia' dentro l'utile di bilancio, che " +
          "il fisco tassa oggi ma lascera' dedurre solo nell'anno in cui il fondo verra' effettivamente " +
          'utilizzato.',
        '',
        "Quest'anno il fisco tratta le due voci allo stesso modo: ENTRAMBE si aggiungono all'utile ante " +
          "imposte per formare la base imponibile su cui si calcolano le imposte correnti. La differenza " +
          "fra le due sta in cosa succede DOPO: solo la seconda si riassorbira' in un anno futuro, e quel " +
          'riassorbimento futuro genera oggi un credito fiscale — le imposte anticipate (DTA).',
        '',
        "**Il punto piu' delicato**: le imposte anticipate NON sono un costo in piu'. Sono un provento — " +
          "un credito verso l'Erario che riduce l'onere fiscale totale di competenza dell'anno, non lo " +
          'aumenta.',
        '',
        `Dati dell'anno: utile ante imposte ${eur(utileAnteImposte)}, variazione in aumento ` +
          `${eur(variazioneInAumento)}, differenza temporanea deducibile in futuro ` +
          `${eur(differenzaTemporaneaDeducibile)}, aliquota IRES ${pct(ALIQUOTA_IRES)}.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Imposte correnti e imposte anticipate (DTA)'], { style: STILE_TITOLO }),
            riga('A3', ['Dati di partenza'], { style: STILE_TITOLO }),
            colonna(
              'A4',
              [
                'Utile ante imposte, €',
                'Variazione in aumento permanente (costi mai deducibili), €',
                "Differenza temporanea deducibile in futuro (accantonamento fondo rischi), €",
                'Aliquota IRES',
              ],
              { style: STILE_ETICHETTA },
            ),
            [
              { ref: B_UAI, content: utileAnteImposte, style: STILE_INPUT, locked: true },
              { ref: B_VAR, content: variazioneInAumento, style: STILE_INPUT, locked: true },
              { ref: B_DTD, content: differenzaTemporaneaDeducibile, style: STILE_INPUT, locked: true },
              { ref: B_ALIQ, content: ALIQUOTA_IRES, style: STILE_INPUT_PCT, locked: true },
            ],

            riga('A9', ['Imposte'], { style: STILE_TITOLO }),
            colonna(
              'A10',
              [
                'Imposte correnti (IRES sulla base imponibile fiscale), €',
                "Imposte anticipate (DTA) generate dall'anno, €",
                'Imposte totali di competenza (a Conto Economico), €',
              ],
              { style: STILE_ETICHETTA },
            ),
            [{ ref: B_IMPCORR, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_DTA, content: null, locked: false, style: STILE_FORMULA }],
            [{ ref: B_IMPTOT, content: null, locked: false, style: STILE_TOTALE }],
          ],
          { colWidths: { A: 420, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          `=(${B_UAI}+${B_VAR}+${B_DTD})*${B_ALIQ}: utile ante imposte piu' variazione in aumento piu' ` +
            "differenza temporanea deducibile, e' la base imponibile fiscale; moltiplicala per l'aliquota.",
          10,
          'T1',
        ),
        hint(
          'H2',
          `=${B_DTD}*${B_ALIQ}: la differenza temporanea deducibile per l'aliquota IRES. E' un credito, non un costo.`,
          8,
          'T2',
        ),
        hint(
          'H3',
          `=${B_IMPCORR}-${B_DTA}: imposte correnti meno le anticipate, che riducono l'onere totale.`,
          8,
          'T3',
        ),
      ],
      parScore: par(tasks, { letturaSecondi: 90 }),
      startAt: `Model!${B_IMPCORR}`,
    };
  },
});

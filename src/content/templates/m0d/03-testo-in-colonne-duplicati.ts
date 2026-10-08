/**
 * M0-D · 03 — Dati sporchi: il doppione che gonfia il totale.
 *
 * Il tema dello spec per questo slot e' "Testo in colonne" + "Rimuovi duplicati".
 * Al momento in cui questo file e' stato scritto, GridSession/Workbook
 * (src/game/session.ts, src/engine/workbook.ts) NON espongono comandi nativi per
 * nessuno dei due (verificato: nessun risultato per "textToColumns|removeDuplicates"
 * nei sorgenti) — sono funzioni avanzate non ancora implementate nel motore.
 *
 * Questo livello allena il concetto affine con gli strumenti gia' disponibili:
 * un elenco con un doppione vero (stesso fornitore, stesso importo, incollato
 * due volte) che il giocatore deve TROVARE A MANO — sul modello del task T2 di
 * `m0a/01-riferimenti.ts`, un check testuale sul riferimento della cella — e poi
 * CORREGGERE nel totale senza poter cancellare la riga (in un modello vero non
 * si cancella mai una riga a cuor leggero: si documenta la rettifica). Il brief
 * spiega cosa farebbero "Rimuovi duplicati" e "Testo in colonne" in Excel vero;
 * il foglio mostra anche un esempio di dato incollato in blocco unico, cosi' la
 * spiegazione ha qualcosa di concreto sotto gli occhi. Vedi STATO.md/openIssues:
 * i comandi nativi restano lavoro futuro per session.ts.
 */

import {
  defineTemplate,
  blocco,
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
  STILE_TOTALE,
  eur,
  num,
} from '../../authoring';
import { triangular, roundTo } from '../../../rng/distributions';
import type { Task } from '../../types';

const FORNITORI = [
  'Meccanica Bianchi S.r.l.',
  'Officine Rossi S.p.A.',
  'Trasporti Verdi & Figli',
  'Elettroforniture Colombo',
  'Imballaggi Ferrari S.r.l.',
  'Logistica Romano',
  'Utensileria Moretti',
  'Componentistica Galli',
  'Materiali Ricci S.p.A.',
  'Servizi Industriali Conti',
] as const;

const N_UNICI = 7;
const RIGA_INIZIO = 4;

export default defineTemplate({
  id: 'M0D-03-PULIZIADATI',
  module: 'M0-D',
  title: 'Il fornitore incollato due volte',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.dedup', 'xl.aggregates'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const nomi = r.shuffle(FORNITORI).slice(0, N_UNICI);
    const importi = nomi.map(() => roundTo(triangular(r, 1500, 6000, 32000), 50));
    const unici = nomi.map((nome, i) => ({ nome, importo: importi[i] }));

    // Il doppione: lo stesso fornitore, con lo stesso importo, ricomparso piu'
    // in basso nell'elenco — esattamente come lo produce un copia-incolla da un
    // export CRM fatto scrollando due volte sullo stesso blocco.
    const idxDup = r.int(0, N_UNICI - 1);
    const posInserimento = r.int(idxDup + 1, N_UNICI); // indice nell'elenco finale
    const duplicato = { ...unici[idxDup] };
    const elenco = [...unici.slice(0, posInserimento), duplicato, ...unici.slice(posInserimento)];

    const rigaDuplicato = RIGA_INIZIO + posInserimento;
    const rigaFine = RIGA_INIZIO + elenco.length - 1;
    const refNomeDuplicato = `A${rigaDuplicato}`;
    const refImportoDuplicato = `B${rigaDuplicato}`;
    const refPrimaRiga = `B${RIGA_INIZIO}`;
    const refUltimaRiga = `B${rigaFine}`;

    const totaleCorretto = importi.reduce((acc, v) => acc + v, 0);
    const totaleGrezzo = totaleCorretto + duplicato.importo;

    const rigaTotaleGrezzo = rigaFine + 1;
    const rigaRispostaDup = rigaFine + 2;
    const rigaRispostaTotale = rigaFine + 3;
    const rigaRispostaConteggio = rigaFine + 4;
    const rigaEsempioGrezzo = rigaFine + 6;

    const esempioGrezzo = `${elenco[0].nome};${elenco[0].importo}`;

    const t1: Task = {
      id: 'T1',
      prompt:
        `Nell'elenco un fornitore e' stato incollato due volte, con lo stesso nome e ` +
        `lo stesso importo: e' il classico errore di un copia-incolla da un export CRM ` +
        `fatto scrollando due volte sullo stesso blocco. Trova la copia — quella piu' in ` +
        `basso nell'elenco, non l'originale — e scrivi in B${rigaRispostaDup} il riferimento ` +
        `della cella che contiene il suo nome (es. "A9"), come testo, senza il segno =.`,
      targetCell: `Model!B${rigaRispostaDup}`,
      check: [{ kind: 'text', expected: refNomeDuplicato }],
      skills: ['xl.dedup'],
      minKeystrokes: 4,
    };

    const t2 = taskFormula({
      id: 'T2',
      prompt:
        `In B${rigaRispostaTotale} calcola il totale corretto delle fatture: la somma di ` +
        `tutto l'elenco, meno l'importo del fornitore duplicato contato una volta di troppo. ` +
        `Non cancellare la riga del doppione: in un modello vero si documenta la rettifica, non ` +
        `si fa sparire la riga.`,
      target: `Model!B${rigaRispostaTotale}`,
      atteso: totaleCorretto,
      referenzia: [refPrimaRiga, refUltimaRiga, refImportoDuplicato],
      senzaLiteral: [],
      skills: ['xl.dedup', 'xl.aggregates'],
      minKeystrokes: 16,
    });

    const t3 = taskFormula({
      id: 'T3',
      prompt:
        `In B${rigaRispostaConteggio} conta quante fatture sono davvero distinte: quante ` +
        `righe ha l'elenco meno il doppione che hai gia' trovato.`,
      target: `Model!B${rigaRispostaConteggio}`,
      atteso: N_UNICI,
      referenzia: [`A${RIGA_INIZIO}`, `A${rigaFine}`],
      senzaLiteral: [1],
      skills: ['xl.dedup', 'xl.aggregates'],
      minKeystrokes: 10,
    });

    const tasks = [t1, t2, t3];

    return {
      templateId: 'M0D-03-PULIZIADATI',
      seed: rng.seed,
      brief: [
        '## Dati grezzi: due modi in cui un export ti mente',
        '',
        `Hai incollato nel foglio l'export delle fatture fornitori del CRM: ${num(elenco.length)} righe.`,
        'Prima di sommare qualsiasi cosa, un dato incollato da fuori va sempre controllato: due',
        "problemi sono cosi' comuni che Excel ci ha costruito sopra due comandi dedicati (Dati >",
        '**Testo in colonne**, Dati > **Rimuovi duplicati**), che pero\' questa build non ha ancora.',
        'Li alleni comunque, a mano, capendo cosa fanno davvero:',
        '',
        '- **Testo in colonne** prende una colonna dove piu\' informazioni sono finite incollate',
        '  in un unico blocco di testo, separate da un carattere (virgola, punto e virgola, spazio),',
        `  e le spezza in colonne distinte. Guarda B${num(rigaEsempioGrezzo)}, qui sotto: cosi'`,
        '  arrivano i dati grezzi da molti CRM, nome e importo appiccicati con un `;`. In Excel',
        '  vero selezioneresti la colonna, apriresti Testo in colonne, sceglieresti "delimitato" e',
        '  il punto e virgola, e otterresti due colonne pulite.',
        '- **Rimuovi duplicati** confronta le righe di una selezione e cancella le copie esatte,',
        '  tenendone una sola. Qui sotto ce n\'e\' una: un fornitore compare due volte, stesso nome',
        `  e stesso importo (${eur(duplicato.importo)}) — non e' un cliente che ha fatturato due`,
        '  volte, e\' la stessa riga incollata per sbaglio due volte.',
        '',
        'Il problema non e\' estetico: quel doppione **gonfia il totale**. Se lo sommi cosi\' com\'e\',',
        `ottieni ${eur(totaleGrezzo)}; il totale vero, con quel fornitore contato una volta sola, e\'`,
        `${eur(totaleCorretto)}. La differenza — ${eur(duplicato.importo)} — e\' un numero che finirebbe`,
        'in una fairness opinion o in un working capital adjustment senza che nessuno se ne accorga.',
        '',
        "Trova il doppione, poi correggi il totale senza cancellare niente: e' l'abitudine da",
        "avere quando lavori su un file che non hai preparato tu, e non sai ancora di chi fidarti.",
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Fatture fornitori — export dal CRM'], { style: STILE_TITOLO }),
            riga('A3', ['Fornitore', 'Importo fattura (€)'], { style: STILE_TITOLO }),
            colonna(
              'A' + RIGA_INIZIO,
              elenco.map((e) => e.nome),
              { style: STILE_ETICHETTA },
            ),
            colonna(
              'B' + RIGA_INIZIO,
              elenco.map((e) => e.importo),
              { style: STILE_INPUT },
            ),
            blocco('A' + rigaTotaleGrezzo, [['Totale grezzo (somma ingenua, doppione compreso)']], {
              style: STILE_ETICHETTA,
            }),
            blocco('B' + rigaTotaleGrezzo, [[totaleGrezzo]], { style: STILE_TOTALE }),
            blocco('A' + rigaRispostaDup, [['Il fornitore duplicato e\' nella riga']], {
              style: STILE_ETICHETTA,
            }),
            blocco('A' + rigaRispostaTotale, [['Totale corretto (doppione contato una sola volta)']], {
              style: STILE_ETICHETTA,
            }),
            blocco('A' + rigaRispostaConteggio, [['Fatture realmente distinte']], {
              style: STILE_ETICHETTA,
            }),
            blocco(
              'A' + rigaEsempioGrezzo,
              [["Cosi' arriva un CRM che non separa i campi (esempio, non fa parte dell'elenco):"]],
              { style: STILE_ETICHETTA },
            ),
            blocco('B' + rigaEsempioGrezzo, [[esempioGrezzo]], { locked: true }),
            areaLibera([`B${rigaRispostaDup}`, `B${rigaRispostaTotale}`, `B${rigaRispostaConteggio}`]),
          ],
          { colWidths: { A: 340, B: 200 }, frozenRows: 3 },
        ),
      ],
      tasks,
      hints: [
        hint(
          'H1',
          'Scorri la colonna A dall\'alto: quando un nome che hai gia\' visto riappare identico, con anche lo stesso importo nella colonna B, hai trovato la copia.',
          8,
          'T1',
        ),
        hint(
          'H2',
          `SUM(B${RIGA_INIZIO}:B${rigaFine}) somma il doppione due volte: sottraici una volta l'importo della riga che hai trovato in T1.`,
          10,
          'T2',
        ),
        hint('H3', 'COUNTA su tutta la colonna A conta anche la riga duplicata: togline una.', 8, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 75 }),
      startAt: `Model!B${rigaRispostaDup}`,
    };
  },
});

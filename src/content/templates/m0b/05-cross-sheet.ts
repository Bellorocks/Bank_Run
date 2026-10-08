/**
 * M0-B · 05 — Riferimenti fra fogli.
 *
 * Fin qui ogni formula viveva dentro un solo foglio: `B2` bastava da solo perche'
 * il contesto era ovvio. Un modello vero non sta mai su un foglio solo, e la
 * sintassi che collega due fogli e' `Foglio!A1` — con una trappola sola, ma
 * frequente: se il nome del foglio contiene uno spazio (o qualsiasi carattere
 * che non sia lettera, cifra, underscore o punto), Excel pretende gli apici
 * singoli attorno al nome, altrimenti legge `Conto` ed `Economico!A1` come due
 * cose diverse e si rompe.
 *
 * Struttura in due passi apposta: prima si scrive il riferimento come TESTO
 * (T2, sul modello di M0A-01·T2), cosi' la sintassi si vede senza che il
 * risultato di una formula la nasconda; poi lo stesso riferimento rientra in
 * una formula vera (T3), dove serve davvero.
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
  STILE_TITOLO,
  eur,
} from '../../authoring';
import { revenue } from '../../../rng/finance';

const FOGLIO_DATI = 'Conto Economico';
const RIF_ONERI = `'${FOGLIO_DATI}'!B2`;

export default defineTemplate({
  id: 'M0B-05-CROSSSHEET',
  module: 'M0-B',
  title: 'Il nome del foglio davanti alla cella',
  rank: 2,
  mode: 'PRACTICE',
  estimatedSeconds: 240,
  skills: ['xl.cross-sheet', 'xl.references'],
  prerequisites: ['M0A-01-RIFERIMENTI'],

  generate: (rng) => {
    const r = rng.fork('dati');

    const ricavi = revenue(r);
    const quotaCosti = 0.55 + r.next() * 0.3;
    const costiOperativi = Math.round((ricavi * quotaCosti) / 500) * 500;
    const margineOperativo = ricavi - costiOperativi;

    // Legati al margine, non a un range fisso: oneri finanziari plausibili
    // (una manciata di punti di margine), mai cosi' grandi da mandare in
    // rosso l'utile netto.
    const quotaOneri = 0.05 + r.next() * 0.22;
    const oneriFinanziari = Math.round((margineOperativo * quotaOneri) / 500) * 500;
    const utileNetto = margineOperativo - oneriFinanziari;

    const tasks = [
      taskFormula({
        id: 'T1',
        prompt:
          'In B5 calcola il margine operativo: ricavi meno costi operativi. Sei gia\' dentro il foglio Model: le celle che ti servono sono qui, non serve nominare nessun foglio.',
        target: 'Model!B5',
        atteso: margineOperativo,
        referenzia: ['B2', 'B3'],
        skills: ['xl.references'],
        minKeystrokes: 8,
      }),
      {
        id: 'T2',
        prompt:
          `In B7 scrivi, come TESTO (senza il segno =), il riferimento completo alla cella che contiene gli oneri finanziari: sta nel foglio "${FOGLIO_DATI}", cella B2. Il nome del foglio ha uno spazio: Excel lo pretende fra apici singoli, poi il punto esclamativo, poi la cella.`,
        targetCell: 'Model!B7',
        check: [{ kind: 'text' as const, expected: RIF_ONERI }],
        skills: ['xl.cross-sheet'],
        minKeystrokes: RIF_ONERI.length,
      },
      taskFormula({
        id: 'T3',
        prompt:
          'In B9 calcola l\'utile netto: margine operativo meno oneri finanziari. Il margine e\' qui in Model (B5); gli oneri sono nell\'altro foglio, e ti serve la stessa sintassi con gli apici che hai appena scritto — stavolta dentro una formula vera.',
        target: 'Model!B9',
        atteso: utileNetto,
        referenzia: ['B5', RIF_ONERI],
        skills: ['xl.cross-sheet'],
        minKeystrokes: 4 + RIF_ONERI.length,
      }),
    ];

    return {
      templateId: 'M0B-05-CROSSSHEET',
      seed: rng.seed,
      brief: [
        '## Un modello vive su piu\' fogli',
        '',
        `Qui il conto economico e' spezzato in due fogli: **Model**, dove lavori, e **"${FOGLIO_DATI}"**,`,
        'dove sta un\'altra voce di bilancio. Non e\' un caso strano: e\' cosi\' che sono fatti quasi',
        'tutti i modelli veri, con le voci sparse su fogli diversi che si parlano fra loro.',
        '',
        'Finora una cella si chiamava solo `B2`, perche\' il foglio in cui scrivevi era ovvio.',
        'Quando la cella che ti serve sta su **un altro foglio**, quell\'ovvieta\' sparisce: devi dirlo,',
        'con la sintassi `Foglio!Cella` — per esempio `Model!B2`.',
        '',
        `Il foglio "${FOGLIO_DATI}" ha pero' uno spazio nel nome. Se scrivi \`Conto Economico!B2\` senza`,
        'apici, Excel legge due parole distinte e non capisce piu\' niente. La regola: **se il nome del',
        'foglio contiene uno spazio (o quasi qualunque cosa che non sia lettera, cifra o underscore),',
        'va chiuso fra apici singoli**: `\'Conto Economico\'!B2`. Sul foglio in cui ti trovi gia\', invece,',
        'quell\'apparato non serve mai: `B2` basta, esattamente come prima.',
        '',
        `Numeri di partenza: ricavi ${eur(ricavi)}, costi operativi ${eur(costiOperativi)} — entrambi in Model.`,
        `Gli oneri finanziari stanno nell'altro foglio e li vedrai solo aprendolo.`,
      ].join('\n'),
      sheets: [
        foglio(
          'Model',
          [
            riga('A1', ['Conto economico semplificato'], { style: STILE_TITOLO }),
            blocco('A2', [['Ricavi'], ['Costi operativi']], { style: STILE_ETICHETTA }),
            blocco('B2', [[ricavi], [costiOperativi]], { style: STILE_INPUT }),
            blocco('A5', [['Margine operativo']], { style: STILE_ETICHETTA }),
            blocco('A7', [[`Riferimento (testo) agli oneri finanziari, dal foglio "${FOGLIO_DATI}"`]], {
              style: STILE_ETICHETTA,
            }),
            blocco('A9', [['Utile netto']], { style: STILE_ETICHETTA }),
            areaLibera(['B5', 'B7', 'B9']),
          ],
          { colWidths: { A: 320, B: 140 }, frozenRows: 1 },
        ),
        foglio(
          FOGLIO_DATI,
          [
            riga('A1', ['Altre voci del conto economico'], { style: STILE_TITOLO }),
            blocco('A2', [['Oneri finanziari']], { style: STILE_ETICHETTA }),
            blocco('B2', [[oneriFinanziari]], { style: STILE_INPUT }),
          ],
          { colWidths: { A: 220, B: 140 }, frozenRows: 1 },
        ),
      ],
      tasks,
      hints: [
        hint('H1', 'Sei nel foglio Model: B2 e B3 bastano cosi\' come sono, nessun nome di foglio davanti.', 8, 'T1'),
        hint(
          'H2',
          `Il foglio si chiama "${FOGLIO_DATI}": due parole con uno spazio in mezzo. Apici singoli attorno al nome, poi !, poi la cella: cosi' -> ${RIF_ONERI}`,
          12,
          'T2',
        ),
        hint('H3', 'Hai gia\' scritto il riferimento giusto nel task precedente: rimettilo dentro una formula vera, preceduto dal segno meno.', 10, 'T3'),
      ],
      parScore: par(tasks, { letturaSecondi: 50 }),
      startAt: 'Model!B5',
    };
  },
});

/**
 * Registro delle skill — i nodi dello skill tree (spec §6).
 *
 * Ogni template dichiara le skill che allena; la mastery per skill e' la media
 * mobile delle ultime 5 performance su quella skill, decade del 3% a settimana
 * senza pratica, e alimenta l'Adaptive Drill ("Daily Deal Flow").
 *
 * Regole per chi aggiunge skill:
 *  - l'id e' `<area>.<nome-kebab>` e non cambia mai: e' una chiave di database
 *  - `requires` disegna gli archi del grafo: tienilo aciclico
 *  - `label` in italiano, `EBITDA`/`net debt`/`anchoring` restano in inglese
 */

import type { ModuleId, SkillId } from './types';

/** Aree dello skill tree: determinano il raggruppamento visivo a "isole". */
export type SkillArea =
  | 'meccanica'      // come si guida Excel
  | 'formule'        // funzioni e costruzione
  | 'igiene'         // diagnosi, audit, disciplina costruttiva
  | 'velocita'       // scorciatoie pure
  | 'contabilita'    // i tre prospetti
  | 'valutazione'    // comps, DCF, precedenti
  | 'transazione'    // bridge, NWC, QoE
  | 'strutturazione';// LBO, M&A, credito

export interface SkillDef {
  readonly id: SkillId;
  readonly label: string;
  readonly area: SkillArea;
  readonly module: ModuleId;
  readonly description: string;
  readonly requires: readonly SkillId[];
}

function s(
  id: string,
  label: string,
  area: SkillArea,
  module: ModuleId,
  description: string,
  requires: readonly string[] = [],
): SkillDef {
  return { id, label, area, module, description, requires };
}

export const SKILLS: readonly SkillDef[] = [
  // -------------------------------------------------------------------------
  // M0-A · Alfabeto
  // -------------------------------------------------------------------------
  s('xl.grid', 'La griglia', 'meccanica', 'M0-A',
    'Righe, colonne, riferimento di cella, barra della formula.'),
  s('xl.formula-basics', 'Il segno =', 'formule', 'M0-A',
    'Cosa distingue una formula da un valore, e perche\' conta.', ['xl.grid']),
  s('xl.arithmetic', 'Operatori e precedenze', 'formule', 'M0-A',
    'Ordine delle operazioni, parentesi, il caso -2^2.', ['xl.formula-basics']),
  s('xl.aggregates', 'SUM e famiglia', 'formule', 'M0-A',
    'SUM, AVERAGE, MIN, MAX, COUNT, COUNTA e la differenza fra COUNT e COUNTA.', ['xl.formula-basics']),
  s('xl.references', 'Relativo, assoluto, misto', 'formule', 'M0-A',
    'I tre tipi di riferimento, spiegati prima di introdurre F4.', ['xl.formula-basics']),
  s('xl.anchoring', 'Anchoring con F4', 'meccanica', 'M0-A',
    'Il ciclo A1 → $A$1 → A$1 → $A1 e quando serve ciascuno.', ['xl.references']),
  s('xl.copy-shift', 'Cosa succede quando copi', 'formule', 'M0-A',
    'Come si traslano i riferimenti relativi durante una copia.', ['xl.anchoring']),
  s('xl.datatypes', 'Tipi di dato', 'igiene', 'M0-A',
    'Numero, testo, data, booleano, e come distinguerli a vista dall\'allineamento.', ['xl.grid']),
  s('xl.dates-serial', 'Le date sono numeri', 'igiene', 'M0-A',
    'Seriali Excel, il bug del 1900 e perche\' le date si sommano.', ['xl.datatypes']),
  s('xl.percentages', 'Percentuali', 'igiene', 'M0-A',
    'Excel memorizza 0,15 e mostra 15%: l\'errore del 1500% va fatto una volta.', ['xl.datatypes']),
  s('xl.numfmt', 'Formati numerici', 'igiene', 'M0-A',
    'Formati di base e custom format in sintassi Excel.', ['xl.datatypes']),

  // -------------------------------------------------------------------------
  // M0-B · Costruire
  // -------------------------------------------------------------------------
  s('xl.if', 'IF', 'formule', 'M0-B',
    'Condizione singola, e leggere una formula IF senza eseguirla a mente.', ['xl.arithmetic']),
  s('xl.if-nested', 'IF annidato', 'formule', 'M0-B',
    'Annidare, e riconoscere quando invece serve un\'altra struttura.', ['xl.if']),
  s('xl.logical', 'AND / OR / NOT', 'formule', 'M0-B', 'Operatori logici dentro le condizioni.', ['xl.if']),
  s('xl.iferror', 'IFERROR', 'igiene', 'M0-B',
    'Intercettare gli errori senza nasconderli sotto il tappeto.', ['xl.if']),
  s('xl.cross-sheet', 'Riferimenti fra fogli', 'formule', 'M0-B',
    'Sintassi Foglio!A1 e gli apici obbligatori se il nome ha spazi.', ['xl.references']),
  s('xl.named-ranges', 'Named ranges', 'formule', 'M0-B', 'Nomi definiti e Name box.', ['xl.references']),
  s('xl.fill', 'Fill down e fill right', 'meccanica', 'M0-B',
    'Ctrl+D, Ctrl+R, Ctrl+Invio e il maniglione di riempimento.', ['xl.copy-shift']),
  s('xl.row-consistency', 'Coerenza di riga', 'igiene', 'M0-B',
    'La stessa formula su tutto l\'orizzonte: l\'errore silenzioso piu\' comune dei modelli veri.', ['xl.fill']),

  // -------------------------------------------------------------------------
  // M0-C · Cercare e aggregare
  // -------------------------------------------------------------------------
  s('xl.index-match', 'INDEX / MATCH', 'formule', 'M0-C',
    'Perche\' si preferisce a VLOOKUP: fragilita\' all\'inserimento di colonne.', ['xl.aggregates', 'xl.references']),
  s('xl.match-exact', 'MATCH esatto vs approssimato', 'igiene', 'M0-C',
    'Il disastro del terzo argomento omesso.', ['xl.index-match']),
  s('xl.sumifs', 'SUMIFS / COUNTIFS / AVERAGEIFS', 'formule', 'M0-C',
    'Aggregazione condizionale su piu\' criteri.', ['xl.aggregates']),
  s('xl.sumproduct', 'SUMPRODUCT', 'formule', 'M0-C',
    'Somma di prodotti e uso come conteggio condizionale.', ['xl.sumifs']),
  s('xl.offset', 'OFFSET e range dinamici', 'formule', 'M0-C',
    'Range che si adattano, e il costo in volatilita\'.', ['xl.index-match']),
  s('xl.choose', 'CHOOSE e scenario switch', 'formule', 'M0-C',
    'Il selettore di scenario, mattone di ogni modello.', ['xl.index-match']),

  // -------------------------------------------------------------------------
  // M0-D · Igiene e diagnosi
  // -------------------------------------------------------------------------
  s('xl.errors', 'I cinque errori', 'igiene', 'M0-D',
    '#REF!, #VALUE!, #DIV/0!, #N/A, #NAME?: cosa significano e come si risale alla causa.', ['xl.formula-basics']),
  s('xl.text-numbers', 'Numeri importati come testo', 'igiene', 'M0-D',
    'Riconoscerli, convertirli, capire perche\' rompono ogni SUM.', ['xl.datatypes']),
  s('xl.text-to-columns', 'Testo in colonne', 'igiene', 'M0-D', 'Separare dati incollati male.', ['xl.text-numbers']),
  s('xl.dedup', 'Rimuovi duplicati', 'igiene', 'M0-D', 'Pulizia di una lista prima di aggregarla.', ['xl.text-numbers']),
  s('xl.find-replace', 'Trova e sostituisci', 'igiene', 'M0-D',
    'Anche dentro le formule: e\' cosi\' che si ripara un modello in fretta.', ['xl.errors']),
  s('xl.trace', 'Trace precedents / dependents', 'igiene', 'M0-D',
    'Risalire la catena di calcolo invece di indovinare.', ['xl.errors']),
  s('xl.f9', 'F9 su frammento', 'igiene', 'M0-D',
    'Valutare un pezzo di formula: il modo piu\' rapido di trovare l\'errore.', ['xl.trace']),
  s('xl.freeze', 'Congela riquadri', 'meccanica', 'M0-D', 'Tenere visibili intestazioni e periodi.', ['xl.grid']),
  s('xl.div-guard', 'Guard sui denominatori', 'igiene', 'M0-D',
    'Proteggere le divisioni che possono incontrare uno zero.', ['xl.iferror']),

  // -------------------------------------------------------------------------
  // M0-E · Velocita'
  // -------------------------------------------------------------------------
  s('spd.navigation', 'Navigazione a blocchi', 'velocita', 'M0-E',
    'Ctrl+frecce, Ctrl+Home/End, salto ai bordi dei dati.', ['xl.grid']),
  s('spd.selection', 'Selezione', 'velocita', 'M0-E',
    'Ctrl+Shift+frecce, Ctrl+Spazio, Shift+Spazio, current region.', ['spd.navigation']),
  s('spd.paste-special', 'Paste special', 'velocita', 'M0-E',
    'Ctrl+Alt+V e la sotto-keymap V/T/F/E.', ['spd.selection']),
  s('spd.alt-format', 'Formattazione con Alt', 'velocita', 'M0-E',
    'Le sequenze Alt legacy, quelle che si usano davvero.', ['xl.numfmt']),
  s('spd.rows-cols', 'Inserisci ed elimina', 'velocita', 'M0-E',
    'Righe e colonne senza toccare il mouse.', ['spd.selection']),
  s('spd.mouse-free', 'Mouse-free', 'velocita', 'M0-E',
    'Completare un task senza mai toccare il mouse.', ['spd.navigation', 'spd.selection']),

  // -------------------------------------------------------------------------
  // M0-F · Meccaniche avanzate
  // -------------------------------------------------------------------------
  s('xl.data-table', 'Data table 1-way e 2-way', 'formule', 'M0-F',
    'Le sensitivity table native, non copiate a mano.', ['xl.choose']),
  s('xl.goal-seek', 'Goal Seek', 'formule', 'M0-F', 'Risolvere all\'indietro su una cella.', ['xl.data-table']),
  s('xl.iterative', 'Calcolo iterativo', 'formule', 'M0-F',
    'Riferimenti circolari controllati: la base del debt schedule.', ['xl.goal-seek']),
  s('xl.cond-format', 'Formattazione condizionale', 'igiene', 'M0-F',
    'Rendere visibile un problema invece di cercarlo.', ['xl.numfmt']),
  s('xl.grouping', 'Raggruppamento righe', 'meccanica', 'M0-F', 'Outline e livelli.', ['spd.rows-cols']),
  s('xl.sanity-checks', 'Sanity check ed error flag', 'igiene', 'M0-F',
    'Il modello ti dice da solo quando non quadra.', ['xl.cond-format', 'xl.row-consistency']),
  s('xl.date-functions', 'Funzioni data', 'formule', 'M0-F',
    'EOMONTH, EDATE, YEARFRAC e la calendarizzazione.', ['xl.dates-serial']),
  s('xl.color-discipline', 'Disciplina dei colori', 'igiene', 'M0-F',
    'Input blu, formule nere, link cross-sheet verdi: standard di mestiere.', ['xl.cross-sheet']),
  s('xl.model-audit', 'Audit di un modello', 'igiene', 'M0-F',
    'Ricostruire un modello rotto usando solo gli strumenti di audit.', ['xl.trace', 'xl.f9', 'xl.sanity-checks']),

  // -------------------------------------------------------------------------
  // M1 · Contabilita' e i tre prospetti
  // -------------------------------------------------------------------------
  s('acc.cee', 'Schema CEE', 'contabilita', 'M1',
    'Stato patrimoniale e conto economico in formato italiano.', ['xl.aggregates']),
  s('acc.reclass', 'Riclassificazione', 'contabilita', 'M1',
    'Valore aggiunto e margine di contribuzione.', ['acc.cee']),
  s('acc.three-statement', 'Collegamento CE→SP→CF', 'contabilita', 'M1',
    'I tre prospetti che si parlano, con il balance check.', ['acc.reclass', 'xl.row-consistency']),
  s('acc.accruals', 'Ratei e risconti', 'contabilita', 'M1', 'Competenza economica vs manifestazione finanziaria.', ['acc.cee']),
  s('acc.da-schedule', 'D&A schedule', 'contabilita', 'M1', 'Ammortamenti per cespite e per coorte.', ['acc.three-statement']),
  s('acc.provisions', 'Fondi rischi e TFR', 'contabilita', 'M1', 'Poste italiane che diventano debt-like.', ['acc.cee']),
  s('acc.taxes', 'Imposte correnti e differite', 'contabilita', 'M1', 'IRES, IRAP, DTA e DTL.', ['acc.three-statement']),
  s('acc.ifrs16', 'IFRS 16', 'contabilita', 'M1',
    'Leasing in bilancio e l\'effetto su EBITDA: la trappola classica.', ['acc.three-statement']),
  s('acc.stock-comp', 'Stock comp', 'contabilita', 'M1', 'Compensi in azioni e diluizione.', ['acc.three-statement']),
  s('acc.minorities', 'Minorities e equity method', 'contabilita', 'M1', 'Consolidamento e quote di terzi.', ['acc.three-statement']),
  s('acc.inventory', 'Rimanenze', 'contabilita', 'M1', 'Metodi di valutazione e effetto sul margine.', ['acc.cee']),
  s('acc.capitalization', 'Capitalizzazione costi', 'contabilita', 'M1', 'Sviluppo capitalizzato e qualita\' dell\'utile.', ['acc.cee']),

  // -------------------------------------------------------------------------
  // M2 · Quality of Earnings
  // -------------------------------------------------------------------------
  s('qoe.normalization', 'EBITDA normalizzato', 'transazione', 'M2',
    'Dalla contabilita\' all\'EBITDA difendibile.', ['acc.reclass']),
  s('qoe.related-party', 'Poste infragruppo', 'transazione', 'M2',
    'Compenso amministratore, affitti, costi personali del socio.', ['qoe.normalization']),
  s('qoe.one-off', 'One-off', 'transazione', 'M2',
    'Legali, ristrutturazioni, plus/minusvalenze, contributi non ricorrenti.', ['qoe.normalization']),
  s('qoe.run-rate', 'Run-rate vs pro-forma', 'transazione', 'M2',
    'Azioni gia\' eseguite contro aspirazioni: dove passa la linea.', ['qoe.one-off']),
  s('qoe.ltm', 'LTM e calendarizzazione', 'transazione', 'M2',
    'FY + H1 corrente − H1 precedente, e la stagionalita\'.', ['xl.date-functions', 'qoe.normalization']),
  s('qoe.aggressive', 'Addback aggressivi', 'transazione', 'M2',
    'Riconoscere e rigettare cio\' che il compratore rigettera\'.', ['qoe.run-rate']),

  // -------------------------------------------------------------------------
  // M3 · Capitale circolante e cassa
  // -------------------------------------------------------------------------
  s('nwc.cycle', 'DSO / DIO / DPO', 'transazione', 'M3', 'Cash conversion cycle.', ['acc.three-statement']),
  s('nwc.peg', 'Il peg del NWC', 'transazione', 'M3',
    'Media 12 mesi aggiustata per stagionalita\', e l\'aggiustamento prezzo.', ['nwc.cycle']),
  s('nwc.fcf-impact', 'NWC e free cash flow', 'transazione', 'M3', 'Come la variazione di circolante mangia la cassa.', ['nwc.cycle']),
  s('nwc.factoring', 'Factoring', 'transazione', 'M3', 'Debito mascherato da circolante.', ['nwc.peg']),
  s('nwc.locked-box', 'Locked box vs completion accounts', 'transazione', 'M3',
    'Due meccanismi di prezzo, due rischi diversi.', ['nwc.peg']),
  s('nwc.leakage', 'Leakage', 'transazione', 'M3', 'Permitted e non permitted.', ['nwc.locked-box']),
  s('nwc.capex', 'Capex maintenance vs growth', 'transazione', 'M3', 'La distinzione che cambia la valutazione.', ['nwc.fcf-impact']),

  // -------------------------------------------------------------------------
  // M4 · EV ↔ Equity bridge
  // -------------------------------------------------------------------------
  s('ev.net-debt', 'Net debt', 'transazione', 'M4', 'Cosa entra e cosa no.', ['acc.three-statement']),
  s('ev.debt-like', 'Debt-like items', 'transazione', 'M4',
    'TFR, fondi pensione, earn-out, contenziosi, leasing, dividendi deliberati.', ['ev.net-debt', 'acc.provisions']),
  s('ev.cash-like', 'Cash-like e cassa non disponibile', 'transazione', 'M4',
    'Restricted cash e cassa operativa minima.', ['ev.net-debt']),
  s('ev.bridge', 'Il bridge completo', 'transazione', 'M4',
    'Da enterprise value a equity value, posta per posta.', ['ev.debt-like', 'ev.cash-like']),
  s('ev.minorities', 'Minorities e partecipazioni', 'transazione', 'M4', 'Cosa si somma e cosa si sottrae.', ['ev.bridge', 'acc.minorities']),
  s('ev.options', 'Opzioni e treasury stock method', 'transazione', 'M4', 'Diluizione da opzioni in the money.', ['ev.bridge']),
  s('ev.dilution', 'Warrant e convertibili', 'transazione', 'M4', 'Diluizione potenziale e if-converted.', ['ev.options']),
  s('ev.price-per-share', 'Prezzo per azione', 'transazione', 'M4', 'L\'ultimo passo del bridge.', ['ev.dilution']),

  // -------------------------------------------------------------------------
  // M5 · Trading comps
  // -------------------------------------------------------------------------
  s('comps.peer-selection', 'Selezione dei peer', 'valutazione', 'M5', 'Criteri di comparabilita\' difendibili.', ['ev.bridge']),
  s('comps.ltm-ntm', 'LTM vs NTM', 'valutazione', 'M5', 'Quale multiplo per quale scopo.', ['qoe.ltm']),
  s('comps.calendarization', 'Calendarizzazione', 'valutazione', 'M5', 'Fiscal year diversi allineati.', ['comps.ltm-ntm', 'xl.date-functions']),
  s('comps.multiples', 'I multipli', 'valutazione', 'M5',
    'EV/EBITDA, EV/EBIT, EV/Sales, EV/(EBITDA−Capex), P/E, P/BV e quando ciascuno.', ['comps.peer-selection']),
  s('comps.statistics', 'Mediana, media, outlier', 'valutazione', 'M5', 'Come si sintetizza un comp set.', ['comps.multiples']),
  s('comps.adjustments', 'Aggiustamenti', 'valutazione', 'M5', 'Size, crescita, margine, illiquidita\', minoranza.', ['comps.statistics']),
  s('comps.football-field', 'Football field', 'valutazione', 'M5', 'Il range di valutazione, letto bene.', ['comps.adjustments']),

  // -------------------------------------------------------------------------
  // M6 · Precedent transactions
  // -------------------------------------------------------------------------
  s('prec.transaction-multiples', 'Multipli di transazione', 'valutazione', 'M6', 'Perche\' non coincidono col trading.', ['comps.multiples']),
  s('prec.control-premium', 'Premio di controllo', 'valutazione', 'M6', 'Quanto vale comandare.', ['prec.transaction-multiples']),
  s('prec.synergies-in-price', 'Sinergie nel prezzo pagato', 'valutazione', 'M6', 'Quanto del premio e\' stato regalato.', ['prec.control-premium']),
  s('prec.timing', 'Announced vs completed', 'valutazione', 'M6', 'E l\'aggiustamento per ciclo di mercato.', ['prec.transaction-multiples']),
  s('prec.triangulation', 'Triangolazione', 'valutazione', 'M6', 'Comps, precedenti e DCF che divergono: spiegare perche\'.', ['prec.synergies-in-price']),

  // -------------------------------------------------------------------------
  // M7 · DCF
  // -------------------------------------------------------------------------
  s('dcf.fcff-fcfe', 'FCFF vs FCFE', 'valutazione', 'M7', 'Due flussi, due tassi di sconto.', ['nwc.fcf-impact']),
  s('dcf.build-fcf', 'Costruzione del FCF', 'valutazione', 'M7', 'Da EBITDA a free cash flow, riga per riga.', ['dcf.fcff-fcfe']),
  s('dcf.mid-year', 'Mid-year convention e stub', 'valutazione', 'M7', 'Quando i flussi arrivano davvero.', ['dcf.build-fcf', 'xl.date-functions']),
  s('dcf.capm', 'CAPM', 'valutazione', 'M7', 'Risk free, equity risk premium, beta.', ['dcf.build-fcf']),
  s('dcf.beta', 'Beta unlevered e relevered', 'valutazione', 'M7', 'La formula di Hamada e la struttura target.', ['dcf.capm']),
  s('dcf.country-risk', 'Country risk premium', 'valutazione', 'M7', 'Rilevante per l\'Italia, non un dettaglio.', ['dcf.capm']),
  s('dcf.wacc', 'WACC', 'valutazione', 'M7', 'Costo del debito after-tax e struttura finanziaria target.', ['dcf.beta', 'dcf.country-risk']),
  s('dcf.terminal-value', 'Terminal value', 'valutazione', 'M7',
    'Gordon growth ed exit multiple, con il cross-check dell\'implicito di ciascuno.', ['dcf.wacc']),
  s('dcf.terminal-capex', 'Capex terminale', 'valutazione', 'M7', 'Normalizzare l\'ultimo anno.', ['dcf.terminal-value']),
  s('dcf.nol', 'NOL e perdite riportabili', 'valutazione', 'M7', 'Lo scudo fiscale che vale davvero.', ['dcf.build-fcf', 'acc.taxes']),
  s('dcf.sensitivity', 'Sensitivity WACC × g', 'valutazione', 'M7', 'La tabella che finisce in comitato.', ['dcf.terminal-value', 'xl.data-table']),

  // -------------------------------------------------------------------------
  // M8 · LBO
  // -------------------------------------------------------------------------
  s('lbo.sources-uses', 'Sources & uses', 'strutturazione', 'M8', 'Con le fee: arrangement, advisory, OID.', ['ev.bridge']),
  s('lbo.debt-structure', 'Struttura del debito', 'strutturazione', 'M8',
    'Senior A/B, unitranche, mezzanine, PIK, vendor loan, revolver.', ['lbo.sources-uses']),
  s('lbo.debt-schedule', 'Debt schedule', 'strutturazione', 'M8',
    'Cash sweep e interessi circolari: qui serve il calcolo iterativo.', ['lbo.debt-structure', 'xl.iterative']),
  s('lbo.covenants', 'Covenant e headroom', 'strutturazione', 'M8', 'Leverage, ICR, test trimestrale.', ['lbo.debt-schedule']),
  s('lbo.mip', 'Management incentive plan', 'strutturazione', 'M8', 'Sweet equity e ratchet.', ['lbo.sources-uses']),
  s('lbo.returns', 'IRR e MoIC', 'strutturazione', 'M8', 'I due numeri che contano, e perche\' divergono.', ['lbo.debt-schedule']),
  s('lbo.value-bridge', 'Value creation bridge', 'strutturazione', 'M8',
    'Crescita EBITDA, espansione multiplo, deleveraging, cash generation.', ['lbo.returns']),
  s('lbo.dividend-recap', 'Dividend recap', 'strutturazione', 'M8', 'Anticipare il ritorno senza uscire.', ['lbo.returns']),
  s('lbo.buy-and-build', 'Add-on e buy-and-build', 'strutturazione', 'M8', 'Multiple arbitrage.', ['lbo.value-bridge']),
  s('lbo.exit', 'Exit: scenari e timing', 'strutturazione', 'M8', 'Quando uscire cambia l\'IRR piu\' del prezzo.', ['lbo.returns']),
  s('lbo.attribution', 'Returns attribution', 'strutturazione', 'M8', 'Sponsor, management, mezzanine.', ['lbo.mip', 'lbo.returns']),

  // -------------------------------------------------------------------------
  // M9 · M&A e accretion/dilution
  // -------------------------------------------------------------------------
  s('ma.consideration', 'Cash, stock o mix', 'strutturazione', 'M9', 'Exchange ratio e chi paga cosa.', ['ev.price-per-share']),
  s('ma.synergies', 'Sinergie', 'strutturazione', 'M9', 'Costi e ricavi, con phasing e costi di realizzazione.', ['ma.consideration']),
  s('ma.ppa', 'PPA, goodwill e intangibili', 'strutturazione', 'M9', 'E l\'ammortamento che mangia l\'EPS.', ['ma.consideration', 'acc.taxes']),
  s('ma.accretion', 'Accretion / dilution', 'strutturazione', 'M9',
    'EPS pro-forma, foregone interest, nuove azioni.', ['ma.ppa', 'ma.synergies']),
  s('ma.breakeven', 'Breakeven synergies', 'strutturazione', 'M9', 'Quanto devi sinergizzare per non diluire.', ['ma.accretion']),
  s('ma.eps-bridge', 'EPS bridge', 'strutturazione', 'M9', 'Da EPS standalone a EPS pro-forma.', ['ma.accretion']),
  s('ma.proforma-leverage', 'Leverage pro-forma', 'strutturazione', 'M9', 'La struttura regge?', ['ma.consideration', 'lbo.covenants']),

  // -------------------------------------------------------------------------
  // M10 · Credito e debito
  // -------------------------------------------------------------------------
  s('cred.ratios', 'Leverage e coverage ratios', 'strutturazione', 'M10', 'I numeri che guarda la banca.', ['acc.three-statement']),
  s('cred.capacity', 'Debt capacity', 'strutturazione', 'M10', 'Quanto debito regge questa azienda.', ['cred.ratios']),
  s('cred.amortization', 'Piani di ammortamento', 'strutturazione', 'M10', 'Bullet, amortizing, balloon.', ['cred.capacity']),
  s('cred.stress', 'Stress test', 'strutturazione', 'M10', 'Shock sull\'EBITDA e verifica del breach.', ['cred.amortization', 'lbo.covenants']),
  s('cred.refinancing', 'Rifinanziamento', 'strutturazione', 'M10', 'Maturity wall e finestra di mercato.', ['cred.amortization']),

  // -------------------------------------------------------------------------
  // M11 · Sporco e reale
  // -------------------------------------------------------------------------
  s('real.read-cee', 'Leggere un bilancio CEE', 'igiene', 'M11', 'Con la nota integrativa, non solo i prospetti.', ['acc.cee']),
  s('real.dirty-tables', 'Tabelle mal formattate', 'igiene', 'M11', 'Estrarre dati da cio\' che ti mandano davvero.', ['xl.text-numbers']),
  s('real.units', 'Unita\' e valute miste', 'igiene', 'M11', 'Euro, migliaia, milioni nello stesso file.', ['real.dirty-tables']),
  s('real.estimate', 'Dati mancanti', 'igiene', 'M11', 'Stimare in modo difendibile e dichiararlo.', ['real.read-cee']),
  s('real.find-errors', 'Trovare gli errori piantati', 'igiene', 'M11',
    'Off-by-one, riga sbagliata, formula incoerente, segno invertito, hardcode nascosto.', ['xl.model-audit']),
  s('real.restatement', 'Restatement', 'igiene', 'M11', 'Rifare i conti quando il passato cambia.', ['real.read-cee']),
] as const;

export const SKILLS_BY_ID: ReadonlyMap<SkillId, SkillDef> = new Map(SKILLS.map((k) => [k.id, k]));

export function getSkill(id: SkillId): SkillDef | undefined {
  return SKILLS_BY_ID.get(id);
}

export function skillsOfArea(area: SkillArea): SkillDef[] {
  return SKILLS.filter((k) => k.area === area);
}

export function skillsOfModule(module: ModuleId): SkillDef[] {
  return SKILLS.filter((k) => k.module === module);
}

/**
 * Verifica di integrita' del grafo: nessun prerequisito verso una skill inesistente,
 * nessun ciclo. Va chiamata da un test — un ciclo nel tree lo rende non disegnabile.
 */
export function validateSkillGraph(): string[] {
  const problems: string[] = [];
  for (const k of SKILLS) {
    for (const req of k.requires) {
      if (!SKILLS_BY_ID.has(req)) problems.push(`${k.id}: prerequisito inesistente "${req}"`);
    }
  }

  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const color = new Map<SkillId, number>(SKILLS.map((k) => [k.id, WHITE]));

  const visit = (id: SkillId, path: SkillId[]): void => {
    const c = color.get(id);
    if (c === BLACK) return;
    if (c === GREY) {
      problems.push(`ciclo nello skill tree: ${[...path, id].join(' -> ')}`);
      return;
    }
    color.set(id, GREY);
    for (const req of SKILLS_BY_ID.get(id)?.requires ?? []) {
      if (SKILLS_BY_ID.has(req)) visit(req, [...path, id]);
    }
    color.set(id, BLACK);
  };

  for (const k of SKILLS) visit(k.id, []);
  return problems;
}

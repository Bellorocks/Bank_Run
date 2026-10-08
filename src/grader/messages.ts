/**
 * I messaggi del grader.
 *
 * Sono il prodotto (spec §14). "Task 4 sbagliato" non insegna niente;
 * "hai hardcodato il multiplo — deve referenziare la cella delle assumption"
 * insegna. Vivono in un file separato perche' vanno riletti e curati come testo,
 * non sepolti dentro la logica.
 *
 * Regola d'oro di §4.2: al primo tentativo il grader dice COSA hai sbagliato e
 * di che famiglia e' l'errore, ma non DOVE. Il dettaglio (quale cella, quale
 * riferimento manca, quale valore hai prodotto) e' in `detail` e si sblocca dal
 * secondo tentativo. Il debug e' l'esercizio.
 */

import type { CheckFamily } from '../content/types';

export const FAMILY_LABEL: Record<CheckFamily, string> = {
  numerico: 'valore',
  strutturale: 'struttura',
  stilistico: 'stile',
};

export const MESSAGES = {
  value: 'Il numero non torna.',
  valueClose:
    'Ci sei quasi: il numero e\' vicino ma fuori tolleranza. Di solito e\' un arrotondamento fatto troppo presto, oppure una posta inclusa a meta\'.',
  valueSignFlipped:
    'Il valore e\' giusto in modulo ma col segno invertito. Decidi una convenzione (costi negativi oppure costi positivi) e tienila su tutto il modello.',
  text: 'Il testo non corrisponde a quello richiesto.',
  boolean: 'Il valore logico non e\' quello atteso.',

  mustBeFormula:
    'Hai battuto il numero a mano. Il valore e\' giusto ma il livello e\' fallito: un numero hardcodato non si aggiorna quando cambiano le assumption, ed e\' il modo piu\' comune di far esplodere un modello in comitato.',
  mustReference:
    'La formula non pesca dalle celle giuste. Il risultato puo\' anche coincidere per caso: quello che conta e\' che il legame ci sia.',
  mustNotContainLiteral:
    'C\'e\' un numero magico dentro la formula. Ogni parametro deve stare in una cella di assumption, visibile e modificabile, non sepolto in mezzo a un calcolo.',
  anchoring:
    'Gli ancoraggi non sono quelli richiesti. Senza il $ giusto la formula smette di funzionare appena la copi: e\' il primo test che le fai fare.',
  consistentRow:
    'La riga non e\' coerente: almeno una cella contiene una formula diversa dalle altre. E\' l\'errore silenzioso piu\' comune nei modelli veri, perche\' nessuno lo vede finche\' non e\' tardi.',
  noCircular:
    'C\'e\' un riferimento circolare dove non dovrebbe essercene. Segui la catena dei precedenti per trovare dove si chiude l\'anello.',
  requiresCircular:
    'Qui il riferimento circolare ci vuole: gli interessi dipendono dal debito medio, che dipende dal rimborso, che dipende dalla cassa dopo interessi. Attiva il calcolo iterativo e chiudi l\'anello.',
  mustUseFunction: 'Non hai usato la funzione richiesta dal task.',
  mustNotUseFunction:
    'Hai usato una funzione che questo livello vieta. Non e\' un capriccio: c\'e\' un motivo tecnico, ed e\' spiegato nel brief.',
  noError: 'La cella restituisce un errore.',
  colorDiscipline:
    'Il color coding non e\' rispettato. Convenzione di mestiere: input battuti a mano in blu, formule in nero, link ad altri fogli in verde. Serve a chi apre il tuo file a capire in tre secondi cosa puo\' toccare.',
  numberFormat: 'Il formato numerico non e\' quello richiesto.',

  emptyCell: 'La cella e\' vuota.',
  lockedCell: 'Hai scritto in una cella che il livello aveva bloccato.',
} as const;

/** Sintesi mostrata al primo tentativo: dice quale task e di che famiglia, non dove. */
export function firstAttemptSummary(failing: { taskId: string; families: CheckFamily[] }[]): string {
  if (failing.length === 0) return 'Tutto corretto.';
  const parti = failing.map((f) => {
    const fam = f.families.map((x) => FAMILY_LABEL[x]).join(' + ');
    return `${f.taskId} (${fam})`;
  });
  return failing.length === 1
    ? `Un task non passa: ${parti[0]}. Ritrova l'errore da solo — poi te lo spiego.`
    : `${failing.length} task non passano: ${parti.join(', ')}.`;
}

export function passedSummary(tasks: number, seconds: number, par: number): string {
  if (seconds <= par) {
    return `Tutti i ${tasks} task corretti, e sotto il par time. Questo e\' il ritmo giusto.`;
  }
  const scarto = Math.round(((seconds - par) / par) * 100);
  return `Tutti i ${tasks} task corretti, ma ${scarto}% sopra il par time. La correttezza c\'e\', la velocita\' no.`;
}

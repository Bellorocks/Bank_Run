/**
 * Soglia di XP per avanzare di rank in carriera (spec §6).
 *
 * Lo spec elenca la scala (`Intern → Analyst 1 → ... → MD`) ma non da' i
 * numeri: 1000 XP per gradino e' un valore dichiarato e ricalibrabile, non
 * dedotto da nessuna fonte. Vive in una costante sola apposta, cosi' il giorno
 * in cui si vorra' una curva diversa (o non lineare) il cambiamento e' qui.
 */

import { CAREER_LADDER, type CareerRank } from './profile';

export const XP_PER_RANK = 1000;

export function rankForXp(xpTotale: number): CareerRank {
  const indice = Math.min(CAREER_LADDER.length - 1, Math.floor(Math.max(0, xpTotale) / XP_PER_RANK));
  return CAREER_LADDER[indice];
}

/** XP gia' accumulato nel rank corrente (0..XP_PER_RANK-1), per la barra a step. */
export function xpWithinRank(xpTotale: number): number {
  const gia = CAREER_LADDER.length * XP_PER_RANK;
  return Math.max(0, xpTotale) >= gia ? XP_PER_RANK : Math.max(0, xpTotale) % XP_PER_RANK;
}

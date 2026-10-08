/**
 * Schermata di fine livello (spec §9 punto 7).
 *
 * DEAL CLOSED / DEAL BROKEN, punteggio, tempo contro il par, breakdown degli
 * XP voce per voce, l'elenco degli errori per tipo, e i tre pulsanti dello
 * spec: riprova lo stesso seed, genera un seed nuovo, esporta in .xlsx.
 *
 * Puro rispetto a `GradeReport`/`XpResult`: nessun accesso a Workbook o a
 * GridSession, cosi' resta testabile a occhio senza dover montare una partita.
 */

import type { CSSProperties } from 'react';
import { Pannello, Pulsante, Badge, BarraXp, formatDurata, formatScarto, formatIntero } from './primitives';
import { UI, PALETTE } from '../styles/palette';
import { FAMILY_LABEL } from '../grader/messages';
import type { GradeReport } from '../grader/grade';
import type { RunMetrics, XpResult } from '../input/metrics';
import type { ParScore } from '../content/types';

import { tr } from '../i18n/ui';
export interface RisultatoProps {
  readonly report: GradeReport;
  readonly metrics: RunMetrics;
  readonly xp: XpResult;
  readonly par: ParScore;
  /** XP totale del profilo, prima e dopo questa run: alimentano solo il testo "X → Y XP totali". */
  readonly xpTotalePrima: number;
  readonly xpTotaleDopo: number;
  /**
   * Posizione nella progressione di carriera (spec §6): quanto XP ha gia'
   * accumulato nel rank CORRENTE e quanto gliene serve per il prossimo. Valori
   * distinti dal totale assoluto apposta — e' cio' che la barra a step deve
   * mostrare, non il totale, o dopo il primo rank sforerebbe sempre il massimo.
   */
  readonly xpNelRank: number;
  readonly xpPerRank: number;
  readonly onRiprovaStessoSeed: () => void;
  readonly onNuovoSeed: () => void;
  readonly onEsportaXlsx: () => void;
  readonly onEsci?: () => void;
}

export function Risultato(props: RisultatoProps) {
  const { report, metrics, xp, par, xpTotalePrima, xpTotaleDopo, xpNelRank, xpPerRank, onRiprovaStessoSeed, onNuovoSeed, onEsportaXlsx, onEsci } = props;

  const superato = report.passed;
  const erroriPerTipo = raggruppaErrori(report);

  return (
    <div className="dd-crt" style={sfondoStyle}>
      <div style={colonnaStyle}>
        <h1
          className="dd-titolo"
          style={{ fontSize: 30, color: superato ? UI.successo : UI.errore, textAlign: 'center', margin: 0 }}
        >
          {superato ? tr('Risultato.1') : tr('Risultato.2')}
        </h1>

        <Pannello titolo="Punteggio Missione" variante="pergamena">
          <div style={rigaMetricheStyle}>
            <Metrica etichetta="Task" valore={`${report.tasksCorrect}/${report.tasksTotal}`} />
            <Metrica
              etichetta="Tempo"
              valore={formatDurata(metrics.durationMs)}
              nota={formatScarto(metrics.durationMs, par.seconds)}
              notaColore={metrics.durationMs <= par.seconds * 1000 ? PALETTE.smeraldo : PALETTE.corallo}
            />
            <Metrica etichetta="Tasti" valore={`${formatIntero(metrics.keystrokes)}`} nota={tr('Risultato.3', { p0: (metrics.keystrokeEfficiency * 100).toFixed(0) })} />
            <Metrica etichetta="Mouse" valore={formatIntero(metrics.mouseClicks)} nota={metrics.mouseBlocked > 0 ? tr('Risultato.4', { p0: metrics.mouseBlocked }) : undefined} />
          </div>
        </Pannello>

        <Pannello titolo={tr('Risultato.5', { p0: formatIntero(xp.total) })} variante="pergamena">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {xp.breakdown.map((v) => (
              <div key={v.label} style={vociXpStyle}>
                <span style={{ color: PALETTE.grafite }}>{v.label}</span>
                <span style={{ color: v.delta >= 0 ? PALETTE.smeraldo : PALETTE.rubino, fontFamily: 'var(--font-griglia)', fontWeight: 'bold' }}>
                  {v.delta >= 0 ? '+' : ''}
                  {v.delta}
                </span>
              </div>
            ))}
          </div>
          <BarraXp
            valore={xpNelRank}
            massimo={xpPerRank}
            etichetta="Progresso verso il prossimo grado di Gilda"
            colore={PALETTE.ambra}
          />
          {xpTotaleDopo !== xpTotalePrima && (
            <p style={{ color: PALETTE.ardesia, fontSize: 16, marginTop: 6 }}>
              {formatIntero(xpTotalePrima)} → {formatIntero(xpTotaleDopo)}{' '}{tr('Risultato.6')}
            </p>
          )}
        </Pannello>

        {erroriPerTipo.length > 0 && (
          <Pannello titolo="Revisione Errori di Gilda" variante="pergamena">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {erroriPerTipo.map((e) => (
                <div key={e.tipo} style={erroreRigaStyle}>
                  <Badge colore={UI.errore}>{FAMILY_LABEL[e.famiglia]}</Badge>
                  <span style={{ flex: 1 }}>{e.tipo}</span>
                  <Badge colore={PALETTE.rubino} pieno>
                    ×{e.conteggio}
                  </Badge>
                </div>
              ))}
            </div>
          </Pannello>
        )}

        <div style={pulsantiStyle}>
          <Pulsante variante="secondario" onClick={onRiprovaStessoSeed} scorciatoia="R">
            {tr('Risultato.7')}
          </Pulsante>
          <Pulsante variante="primario" onClick={onNuovoSeed} scorciatoia="N">
            {tr('Risultato.8')}
          </Pulsante>
          <Pulsante variante="secondario" onClick={onEsportaXlsx}>
            {tr('Risultato.9')}
          </Pulsante>
          {onEsci && (
            <Pulsante variante="fantasma" onClick={onEsci}>
              {tr('Risultato.10')}
            </Pulsante>
          )}
        </div>
      </div>
    </div>
  );
}

function Metrica({
  etichetta,
  valore,
  nota,
  notaColore,
}: {
  etichetta: string;
  valore: string;
  nota?: string;
  notaColore?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 90 }}>
      <span style={{ fontFamily: 'var(--font-titolo)', fontSize: 13, color: PALETTE.ardesia }}>{etichetta}</span>
      <span style={{ fontFamily: 'var(--font-griglia)', fontSize: 20, color: PALETTE.inchiostro }}>{valore}</span>
      {nota !== undefined && (
        <span style={{ fontSize: 15, color: notaColore ?? PALETTE.ardesia }}>{nota}</span>
      )}
    </div>
  );
}

interface ErroreAggregato {
  readonly tipo: string;
  readonly famiglia: import('../content/types').CheckFamily;
  readonly conteggio: number;
}

/** Raggruppa i check falliti per messaggio: e' quello che l'utente riconosce, non il kind grezzo. */
function raggruppaErrori(report: GradeReport): ErroreAggregato[] {
  const conteggi = new Map<string, ErroreAggregato>();
  for (const task of report.tasks) {
    for (const check of task.checks) {
      if (check.passed) continue;
      const esistente = conteggi.get(check.message);
      if (esistente) conteggi.set(check.message, { ...esistente, conteggio: esistente.conteggio + 1 });
      else conteggi.set(check.message, { tipo: check.message, famiglia: check.family, conteggio: 1 });
    }
  }
  return [...conteggi.values()].sort((a, b) => b.conteggio - a.conteggio);
}

const sfondoStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(26, 28, 44, 0.85)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  overflowY: 'auto',
  padding: '32px 16px',
  zIndex: 90,
};

const colonnaStyle: CSSProperties = {
  width: 'min(560px, 100%)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const rigaMetricheStyle: CSSProperties = {
  display: 'flex',
  gap: 20,
  flexWrap: 'wrap',
};

const vociXpStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 14,
  fontFamily: 'var(--font-testo)',
};

const erroreRigaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
  fontFamily: 'var(--font-testo)',
  color: PALETTE.inchiostro,
};

const pulsantiStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  justifyContent: 'center',
};

export default Risultato;

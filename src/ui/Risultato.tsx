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
import { T } from '../styles/palette';
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
    <div className="br-velo" style={sfondoStyle}>
      <div className="br-entra" style={colonnaStyle}>
        <h1
          className="br-logo"
          style={{ fontSize: 'clamp(64px, 11vw, 112px)', textAlign: 'center', ...(superato ? null : { color: T.rosso }) }}
        >
          {superato ? tr('Risultato.1') : tr('Risultato.2')}
        </h1>
        <div style={xpGrandeStyle}>+{formatIntero(xp.total)} XP</div>

        <Pannello titolo={tr('Risultato.punteggio')} acceso>
          <div style={rigaMetricheStyle}>
            <Metrica etichetta="Task" valore={`${report.tasksCorrect}/${report.tasksTotal}`} />
            <Metrica
              etichetta={tr('Hud.tempo')}
              valore={formatDurata(metrics.durationMs)}
              nota={formatScarto(metrics.durationMs, par.seconds)}
              notaColore={metrics.durationMs <= par.seconds * 1000 ? T.menta : T.oro}
            />
            <Metrica etichetta={tr('Hud.tasti')} valore={`${formatIntero(metrics.keystrokes)}`} nota={tr('Risultato.3', { p0: (metrics.keystrokeEfficiency * 100).toFixed(0) })} />
            <Metrica etichetta="Mouse" valore={formatIntero(metrics.mouseClicks)} nota={metrics.mouseBlocked > 0 ? tr('Risultato.4', { p0: metrics.mouseBlocked }) : undefined} />
          </div>
        </Pannello>

        <Pannello titolo={tr('Risultato.5', { p0: formatIntero(xp.total) })} colore={T.oro}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {xp.breakdown.map((v) => (
              <div key={v.label} style={vociXpStyle}>
                <span style={{ color: T.tenue }}>{v.label}</span>
                <span style={{ color: v.delta >= 0 ? T.menta : T.rosso, fontFamily: 'var(--font-griglia)', fontSize: 14, fontWeight: 'bold' }}>
                  {v.delta >= 0 ? '+' : ''}
                  {v.delta}
                </span>
              </div>
            ))}
          </div>
          <BarraXp
            valore={xpNelRank}
            massimo={xpPerRank}
            etichetta={tr('Risultato.progresso')}
            colore={T.oro}
          />
          {xpTotaleDopo !== xpTotalePrima && (
            <p style={{ color: T.tenue, fontSize: 15, margin: '8px 0 0' }}>
              {formatIntero(xpTotalePrima)} → {formatIntero(xpTotaleDopo)}{' '}{tr('Risultato.6')}
            </p>
          )}
        </Pannello>

        {erroriPerTipo.length > 0 && (
          <Pannello titolo={tr('Risultato.revisione')} colore={T.rosso}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {erroriPerTipo.map((e) => (
                <div key={e.tipo} style={erroreRigaStyle}>
                  <Badge colore={T.rosso}>{FAMILY_LABEL[e.famiglia]}</Badge>
                  <span style={{ flex: 1 }}>{e.tipo}</span>
                  <Badge colore={T.rosso} pieno>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 96, flex: '1 1 0' }}>
      <span className="br-label">{etichetta}</span>
      <span style={{ fontFamily: 'var(--font-logo)', fontSize: 40, lineHeight: 0.9, letterSpacing: '0.03em', color: T.testo }}>{valore}</span>
      <span style={{ fontSize: 14, lineHeight: 1.2, minHeight: 17, color: notaColore ?? T.tenue }}>{nota ?? ''}</span>
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
  alignItems: 'flex-start',
  overflowY: 'auto',
  padding: '36px 16px',
  background: 'rgba(26, 28, 44, 0.92)',
  zIndex: 90,
};

const colonnaStyle: CSSProperties = {
  position: 'relative',
  zIndex: 6,
  width: 'min(600px, 100%)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

/** Il bottino, grande, subito sotto il verdetto. */
const xpGrandeStyle: CSSProperties = {
  marginTop: -4,
  textAlign: 'center',
  fontFamily: 'var(--font-titolo)',
  fontSize: 16,
  letterSpacing: '0.3em',
  color: T.oro,
};

const rigaMetricheStyle: CSSProperties = {
  display: 'flex',
  gap: 16,
  flexWrap: 'wrap',
};

const vociXpStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  fontSize: 16,
  fontFamily: 'var(--font-testo)',
};

const erroreRigaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 16,
  fontFamily: 'var(--font-testo)',
  color: T.testo,
};

const pulsantiStyle: CSSProperties = {
  display: 'flex',
  // Piu' larga della scheda: le quattro azioni stanno su una riga anche in italiano.
  width: 'min(820px, calc(100vw - 32px))',
  alignSelf: 'center',
  gap: 10,
  flexWrap: 'wrap',
  justifyContent: 'center',
};

export default Risultato;

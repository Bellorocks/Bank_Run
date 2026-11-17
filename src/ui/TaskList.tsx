/**
 * Elenco dei task del livello.
 *
 * Applica la regola d'oro del feedback (spec §4.2): mostra COSA e' sbagliato e
 * di che famiglia e' l'errore, mai DOVE. Il campo `detail` del `CheckResult`
 * arriva gia' assente dal grader al primo tentativo — qui ci si limita a
 * mostrarlo quando c'e', senza reintrodurre dalla porta di servizio
 * l'informazione che il grader ha deciso di trattenere.
 */

import type { CSSProperties } from 'react';
import { Pannello, Badge, TESTO_LUNGO } from './primitives';
import { T } from '../styles/palette';
import { FAMILY_LABEL } from '../grader/messages';
import type { GradeReport, TaskResult } from '../grader/grade';
import type { Hint, Task } from '../content/types';
import { Markdown } from './Brief';

import { tr } from '../i18n/ui';
export interface TaskListProps {
  readonly tasks: readonly Task[];
  readonly report: GradeReport | null;
  readonly attempt: number;
  readonly onHint?: (taskId: string) => void;
  /** Suggerimenti gia' sbloccati dall'utente, nell'ordine in cui li ha chiesti. */
  readonly revealedHints?: readonly Hint[];
  /** Task che hanno ancora suggerimenti da sbloccare. */
  readonly hintsLeft?: ReadonlySet<string>;
  readonly style?: CSSProperties;
}

export function TaskList({ tasks, report, attempt, onHint, revealedHints = [], hintsLeft, style }: TaskListProps) {
  const generali = revealedHints.filter((h) => h.taskId === undefined || !tasks.some((t) => t.id === h.taskId));
  const esiti = new Map<string, TaskResult>((report?.tasks ?? []).map((t) => [t.taskId, t]));

  return (
    <Pannello
      titolo={tr('TaskList.titolo')}
      scorrevole
      azione={
        report ? (
          <Badge colore={report.passed ? T.menta : T.oro} pieno>
            {report.tasksCorrect}/{report.tasksTotal}
          </Badge>
        ) : (
          <Badge colore={T.tenue}>{tasks.length}</Badge>
        )
      }
      style={style}
    >
      {generali.length > 0 && (
        <div style={{ ...suggerimentoStyle, marginBottom: 10 }}>
          {generali.map((h) => (
            <Markdown key={h.id} source={h.text} />
          ))}
        </div>
      )}
      <ol style={listaStyle}>
        {tasks.map((task, i) => {
          const esito = esiti.get(task.id);
          const colore = esito === undefined ? T.linea : esito.passed ? T.menta : T.rosso;

          return (
            <li key={task.id} style={{ ...voceStyle, borderLeftColor: colore }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={segnoStyle(esito === undefined ? T.spento : colore, esito !== undefined)}>
                  {esito === undefined ? i + 1 : esito.passed ? '✓' : '✕'}
                </span>
                <span style={{ ...TESTO_LUNGO, color: esito?.passed === true ? T.spento : T.testo }}>
                  {task.prompt}
                </span>
              </div>

              {esito && !esito.passed && (
                <div style={erroreStyle}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    {esito.failedFamilies.map((f) => (
                      <Badge key={f} colore={T.rosso} pieno>
                        {FAMILY_LABEL[f]}
                      </Badge>
                    ))}
                  </div>
                  {esito.checks
                    .filter((c) => !c.passed)
                    .map((c, k) => (
                      <p key={k} style={{ ...TESTO_LUNGO, margin: '0 0 6px', color: T.testo }}>
                        {c.message}
                        {c.detail !== undefined && (
                          <span style={{ color: T.rosso }}> — {c.detail}</span>
                        )}
                      </p>
                    ))}
                  {attempt < 2 && (
                    <p style={{ ...TESTO_LUNGO, margin: 0, color: T.tenue }}>
                      {tr('TaskList.1')}
                    </p>
                  )}
                </div>
              )}

              {revealedHints.filter((h) => h.taskId === task.id).map((h) => (
                <div key={h.id} style={suggerimentoStyle}>
                  <Markdown source={h.text} />
                </div>
              ))}

              {onHint && esito?.passed !== true && (hintsLeft?.has(task.id) ?? true) && (
                <button type="button" onClick={() => onHint(task.id)} className="br-btn br-btn--piccolo" style={hintStyle}>
                  {tr('TaskList.2')}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </Pannello>
  );
}

const listaStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const voceStyle: CSSProperties = {
  borderLeft: `2px solid ${T.linea}`,
  paddingLeft: 10,
};

/** Il numero del task: diventa spunta o croce dopo la verifica. */
function segnoStyle(colore: string, pieno: boolean): CSSProperties {
  return {
    flexShrink: 0,
    width: 22,
    height: 22,
    marginTop: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-titolo)',
    fontSize: 12,
    color: pieno ? T.abisso : colore,
    background: pieno ? colore : 'transparent',
    border: `2px solid ${colore}`,
  };
}

const erroreStyle: CSSProperties = {
  marginTop: 8,
  marginLeft: 32,
  padding: 10,
  background: 'rgba(255, 107, 107, 0.09)',
  borderLeft: `2px solid ${T.rosso}`,
};

const suggerimentoStyle: CSSProperties = {
  marginTop: 8,
  marginLeft: 32,
  padding: '6px 10px',
  color: T.testo,
  background: 'rgba(255, 200, 87, 0.09)',
  borderLeft: `2px solid ${T.oro}`,
  ...TESTO_LUNGO,
};

const hintStyle: CSSProperties = {
  marginTop: 8,
  marginLeft: 32,
  color: T.oro,
};

export default TaskList;

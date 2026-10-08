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
import { PALETTE, UI } from '../styles/palette';
import { FAMILY_LABEL } from '../grader/messages';
import type { GradeReport, TaskResult } from '../grader/grade';
import type { Task } from '../content/types';

export interface TaskListProps {
  readonly tasks: readonly Task[];
  readonly report: GradeReport | null;
  readonly attempt: number;
  readonly onHint?: (taskId: string) => void;
  readonly style?: CSSProperties;
}

export function TaskList({ tasks, report, attempt, onHint, style }: TaskListProps) {
  const esiti = new Map<string, TaskResult>((report?.tasks ?? []).map((t) => [t.taskId, t]));

  return (
    <Pannello
      titolo="Obiettivi della Missione"
      variante="legno"
      scorrevole
      azione={
        report ? (
          <Badge colore={report.passed ? UI.successo : UI.attenzione}>
            {report.tasksCorrect}/{report.tasksTotal}
          </Badge>
        ) : (
          <Badge colore={UI.testoTenue}>{tasks.length}</Badge>
        )
      }
      style={style}
    >
      <ol style={listaStyle}>
        {tasks.map((task, i) => {
          const esito = esiti.get(task.id);
          const colore = esito === undefined ? PALETTE.ardesia : esito.passed ? UI.successo : UI.errore;

          return (
            <li key={task.id} style={voceStyle}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ color: colore, fontFamily: 'var(--font-titolo)', fontSize: 15 }}>
                  {esito === undefined ? '·' : esito.passed ? '✓' : '✕'}
                </span>
                <span style={{ color: PALETTE.corallo, fontFamily: 'var(--font-titolo)', fontSize: 14 }}>
                  {i + 1}
                </span>
                <span style={{ ...TESTO_LUNGO, color: esito?.passed === true ? PALETTE.ardesia : PALETTE.inchiostro }}>
                  {task.prompt}
                </span>
              </div>

              {esito && !esito.passed && (
                <div style={erroreStyle}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    {esito.failedFamilies.map((f) => (
                      <Badge key={f} colore={UI.errore} pieno>
                        {FAMILY_LABEL[f]}
                      </Badge>
                    ))}
                  </div>
                  {esito.checks
                    .filter((c) => !c.passed)
                    .map((c, k) => (
                      <p key={k} style={{ ...TESTO_LUNGO, margin: '0 0 6px', color: PALETTE.inchiostro }}>
                        {c.message}
                        {c.detail !== undefined && (
                          <span style={{ color: PALETTE.rubino, fontWeight: 'bold' }}> — {c.detail}</span>
                        )}
                      </p>
                    ))}
                  {attempt < 2 && (
                    <p style={{ ...TESTO_LUNGO, margin: 0, color: PALETTE.petrolio, fontStyle: 'italic' }}>
                      Trovalo da solo. Al prossimo tentativo ti dico anche dove.
                    </p>
                  )}
                  {onHint && (
                    <button type="button" onClick={() => onHint(task.id)} style={hintStyle}>
                      Suggerimento (costa XP)
                    </button>
                  )}
                </div>
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
  gap: 12,
};

const voceStyle: CSSProperties = {
  borderLeft: `2px solid ${PALETTE.ardesia}`,
  paddingLeft: 8,
};

const erroreStyle: CSSProperties = {
  marginTop: 6,
  marginLeft: 22,
  padding: 8,
  background: PALETTE.rubino + '22',
  borderLeft: `2px solid ${UI.errore}`,
};

const hintStyle: CSSProperties = {
  background: PALETTE.grafite,
  border: `1px solid ${PALETTE.inchiostro}`,
  color: PALETTE.ambra,
  padding: '2px 8px',
  cursor: 'pointer',
  fontFamily: 'var(--font-titolo)',
  fontSize: 13,
};

export default TaskList;

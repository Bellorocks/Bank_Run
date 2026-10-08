/**
 * La schermata di gioco (spec §9, punto 6) e il suo esito (punto 7).
 *
 * Mette insieme quello che finora esisteva solo separato: istanza del livello,
 * `Workbook`, `GridSession`, griglia, barra della formula, brief, task, HUD,
 * overlay delle scorciatoie e schermata risultato con persistenza. E' il punto
 * in cui si verifica il criterio d'uscita di M1 — "puoi costruire un piccolo
 * modello usando solo la tastiera e ti senti come in Excel".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid } from '../grid/Grid';
import { FormulaBar } from '../grid/FormulaBar';
import { useWindowKeyboard } from '../grid/useWindowKeyboard';
import { useSessionSnapshot } from '../state/useSession';
import { Brief } from '../ui/Brief';
import { TaskList } from '../ui/TaskList';
import { Hud } from '../ui/Hud';
import { CheatSheet } from '../ui/CheatSheet';
import { Risultato } from '../ui/Risultato';
import { PALETTE } from '../styles/palette';
import { instantiate, getTemplate } from '../content/registry';
import { loadInstance } from './loadLevel';
import { GridSession } from './session';
import { gradeLevel, type GradeReport } from '../grader/grade';
import { detectCycleCells } from '../engine/iterative';
import { applyReplayPenalty, computeMetrics, computeXp, type RunMetrics, type XpResult } from '../input/metrics';
import { workbookToExport } from '../export/fromWorkbook';
import { loadProgress, recordProgress } from '../persistence/progress';
import { rankForXp, xpWithinRank, XP_PER_RANK } from '../persistence/progression';
import type { Command } from '../keymap/commands';

export interface PlayScreenProps {
  readonly templateId: string;
  readonly seed: number;
  readonly onRiprovaStessoSeed: () => void;
  readonly onNuovoSeed: () => void;
  readonly onEsci?: () => void;
}

/** Ricompensa base a livello superato: le modalita' la moltiplicano (spec §6). */
const BASE_XP = 100;

export function PlayScreen({ templateId, seed, onRiprovaStessoSeed, onNuovoSeed, onEsci }: PlayScreenProps) {
  const template = getTemplate(templateId);

  // Il livello si costruisce UNA volta per (template, seed): rigenerarlo a ogni
  // render butterebbe via il lavoro dell'utente a ogni battuta.
  const caricato = useMemo(() => loadInstance(instantiate(templateId, seed)), [templateId, seed]);

  const [report, setReport] = useState<GradeReport | null>(null);
  const [tentativo, setTentativo] = useState(1);
  const [durataMs, setDurataMs] = useState(0);
  const [esito, setEsito] = useState<{ metrics: RunMetrics; xp: XpResult; xpTotalePrima: number; xpTotaleDopo: number } | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.48);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const colonnaSinistraRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<GradeReport | null>(null);
  const registrataRef = useRef(false);
  /** Il livello era gia' stato superato in passato: le ripetizioni valgono meno XP. */
  const giaSuperatoRef = useRef(false);
  useEffect(() => {
    let vivo = true;
    void loadProgress().then((p) => {
      if (vivo) giaSuperatoRef.current = p.levels[templateId] !== undefined;
    });
    return () => {
      vivo = false;
    };
  }, [templateId]);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!colonnaSinistraRef.current) return;
      const rect = colonnaSinistraRef.current.getBoundingClientRect();
      const totalHeight = rect.height - 16; // 8px padding top and bottom
      if (totalHeight <= 0) return;
      const offsetY = e.clientY - rect.top - 8;
      const minRatio = 120 / totalHeight;
      const maxRatio = (totalHeight - 120) / totalHeight;
      const clamped = Math.max(minRatio, Math.min(maxRatio, offsetY / totalHeight));
      setSplitRatio(clamped);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  // SPEEDRUN: "il mouse e' disabilitato hard" (spec §3.3) — non un default
  // toglibile, un blocco per tutta la durata del livello.
  const speedrun = template?.mode === 'SPEEDRUN';

  const session = useMemo(() => {
    return new GridSession(caricato.workbook, caricato.start, {
      mouseFree: speedrun,
      mouseFreeLocked: speedrun,
      onGameCommand: (c: Command) => {
        if (c === 'game.verify') {
          verificaRef.current();
          return true;
        }
        if (c === 'game.hint') {
          hintRef.current();
          return true;
        }
        return false;
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- verifica passa da un ref apposta
  }, [caricato, speedrun]);

  const snap = useSessionSnapshot(session);
  useWindowKeyboard(session, { enabled: !snap.cheatSheetOpen && esito === null });

  /*
   * Il cronometro si mette in PAUSA, non si ferma.
   *
   * `stop()` e' definitivo per costruzione — congela il tempo finale della run —
   * e `start()` non lo risuscita. In sviluppo React StrictMode monta, smonta e
   * rimonta ogni componente: con `stop()` nel cleanup il timer restava a zero
   * per sempre. La pausa e' anche la semantica giusta: uscire dalla schermata
   * non deve far scorrere il tempo, ma non chiude la partita.
   */
  useEffect(() => {
    // Il cronometro parte al primo tasto premuto (vedi GridSession.handleKey), non
    // all'apertura: il tempo di lettura del brief non deve costare punti.
    session.recorder.resume();
    const t = window.setInterval(() => setDurataMs(session.recorder.elapsedMs()), 250);
    return () => {
      window.clearInterval(t);
      session.recorder.pause();
    };
  }, [session]);

  const verifica = useCallback((): void => {
    if (esito !== null) return; // livello gia' chiuso: Verifica non fa piu' nulla
    const wb = caricato.workbook;
    // Il calcolo iterativo non gira da solo: senza questo, un modello circolare modificato
    // dopo l'ultimo F9 verrebbe valutato sui valori vecchi.
    if (wb.getIterative().enabled) wb.recalcIterative();
    const cicli = new Set(detectCycleCells(wb.engine));
    const tentativoCorrente = reportRef.current === null ? 1 : tentativo;
    const r = gradeLevel(wb, caricato.instance, {
      attempt: tentativoCorrente,
      enforceStyle: (template?.rank ?? 1) >= 3,
      cycleCells: cicli,
    });
    reportRef.current = r;
    setReport(r);

    if (!r.passed) {
      setTentativo((n) => n + 1);
      return;
    }
    if (registrataRef.current) return; // Verifica premuta di nuovo a livello gia' superato
    registrataRef.current = true;

    const metrics = computeMetrics(session.recorder, {
      minKeystrokes: Math.max(1, caricato.instance.parScore.keystrokes),
    });
    const hintsUsed = session.recorder.events.filter((e) => e.kind === 'hint').length;
    const xpPieno = computeXp({
      baseXp: BASE_XP,
      mode: template?.mode ?? 'PRACTICE',
      metrics,
      par: caricato.instance.parScore,
      retryCount: tentativoCorrente - 1,
      perfectStructure: r.perfectStructure,
    });
    const xp = giaSuperatoRef.current ? applyReplayPenalty(xpPieno) : xpPieno;

    void chiudiLivello(metrics, xp, hintsUsed, r);
  }, [caricato, template, tentativo, session, esito]);

  const verificaRef = useRef(verifica);
  verificaRef.current = verifica;

  /**
   * Suggerimenti: si sbloccano uno alla volta, nell'ordine del template. F1 (o il
   * pulsante sotto il task) apre il prossimo per il task indicato o, senza task,
   * per il primo task non ancora risolto. Ogni suggerimento costa XP a fine livello.
   */
  const [hintsRevealed, setHintsRevealed] = useState<string[]>([]);
  const tuttiGliHint = caricato.instance.hints;
  const hintsLeft = useMemo(
    () =>
      new Set(
        tuttiGliHint
          .filter((h) => h.taskId !== undefined && !hintsRevealed.includes(h.id))
          .map((h) => h.taskId as string),
      ),
    [tuttiGliHint, hintsRevealed],
  );
  const revealHint = useCallback(
    (taskId?: string): void => {
      if (esito !== null) return;
      const nonVisti = tuttiGliHint.filter((h) => !hintsRevealed.includes(h.id));
      let bersaglio = taskId;
      if (bersaglio === undefined) {
        const risolti = new Set((reportRef.current?.tasks ?? []).filter((t) => t.passed).map((t) => t.taskId));
        bersaglio = caricato.instance.tasks.find(
          (t) => !risolti.has(t.id) && nonVisti.some((h) => h.taskId === t.id),
        )?.id;
      }
      const scelto =
        nonVisti.find((h) => h.taskId === bersaglio) ?? nonVisti.find((h) => h.taskId === undefined);
      if (!scelto) {
        session.announce('Nessun altro suggerimento disponibile.');
        return;
      }
      session.recorder.record({ kind: 'hint', hintId: scelto.id });
      setHintsRevealed((prev) => [...prev, scelto.id]);
    },
    [esito, tuttiGliHint, hintsRevealed, caricato, session],
  );
  const hintRef = useRef(revealHint);
  hintRef.current = revealHint;

  /**
   * Persistenza a fine livello.
   *
   * `@tauri-apps/plugin-sql` esiste solo dentro il runtime Tauri: durante
   * `npm run dev` nel browser (o in questa stessa sessione di verifica) le
   * chiamate falliscono perche' l'IPC non c'e'. La partita non deve rompersi
   * per questo: si registra l'errore e si mostra comunque la schermata
   * risultato con gli XP calcolati, semplicemente non sopravvivono al riavvio.
   */
  const chiudiLivello = async (
    metrics: RunMetrics,
    xp: XpResult,
    hintsUsed: number,
    r: GradeReport,
  ): Promise<void> => {
    let xpTotalePrima = 0;
    let xpTotaleDopo = xp.total;
    try {
      const out = await recordProgress({
        templateId,
        seed,
        mode: template?.mode ?? 'PRACTICE',
        startedAt: new Date(Date.now() - metrics.durationMs).toISOString(),
        metrics,
        hintsUsed,
        xpEarned: xp.total,
        report: r,
      });
      xpTotalePrima = out.xpBefore;
      xpTotaleDopo = out.xpAfter;
    } catch (err) {
      // eslint-disable-next-line no-console -- diagnostica di sviluppo, non un errore per l'utente
      console.warn('Salvataggio dei progressi non riuscito:', err);
    }
    setEsito({ metrics, xp, xpTotalePrima, xpTotaleDopo });
  };

  const esportaXlsx = useCallback(async (): Promise<void> => {
    // SheetJS pesa: si carica solo quando qualcuno esporta davvero.
    const { exportToXlsx } = await import('../export/toXlsx');
    const buf = exportToXlsx(workbookToExport(caricato.workbook, template?.title));
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateId}-seed${seed}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [caricato, template, templateId, seed]);

  const keystrokes = session.recorder.events.filter((e) => e.kind === 'key').length;
  const par = caricato.instance.parScore;

  return (
    <div style={schermoStyle}>
      <div style={corpoStyle}>
        <div
          ref={colonnaSinistraRef}
          style={{
            ...colonnaSinistraStyle,
            userSelect: isDragging ? 'none' : 'auto',
          }}
        >
          <Brief
            brief={caricato.instance.brief}
            titolo={template?.title}
            mode={template?.mode}
            seed={seed}
            style={{ flex: `${splitRatio} 1 0px`, minHeight: 120 }}
          />

          <div
            role="separator"
            aria-orientation="horizontal"
            onPointerDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              height: 12,
              minHeight: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'row-resize',
              userSelect: 'none',
              background: isDragging ? PALETTE.ardesia : isHovered ? PALETTE.grafite : 'transparent',
              transition: 'background 0.1s ease',
            }}
            title="Trascina per ridimensionare"
          >
            <div
              style={{
                width: 42,
                height: 4,
                background: isDragging || isHovered ? PALETTE.ambra : PALETTE.ardesia,
                border: `1px solid ${PALETTE.inchiostro}`,
              }}
            />
          </div>

          <TaskList
            tasks={caricato.instance.tasks}
            report={report}
            attempt={tentativo}
            onHint={(taskId) => revealHint(taskId)}
            revealedHints={hintsRevealed
              .map((id) => tuttiGliHint.find((h) => h.id === id))
              .filter((h): h is NonNullable<typeof h> => h !== undefined)}
            hintsLeft={hintsLeft}
            style={{ flex: `${1 - splitRatio} 1 0px`, minHeight: 120 }}
          />
        </div>

        <div style={colonnaDestraStyle}>
          <FormulaBar session={session} snap={snap} />
          <div style={{ flex: 1, minHeight: 0 }}>
            <Grid session={session} snap={snap} />
          </div>
        </div>
      </div>

      <Hud
        durataMs={durataMs}
        parSecondi={par.seconds}
        keystrokes={keystrokes}
        parKeystrokes={par.keystrokes}
        mouseBloccati={snap.mouseBlocked}
        mouseFree={snap.mouseFree}
        mouseFreeLocked={snap.mouseFreeLocked}
        statusMessage={snap.status}
        altPath={snap.altPath}
        onVerifica={verifica}
        onMouseFree={() => session.setMouseFree(!snap.mouseFree)}
        onCheatSheet={() => session.execute('ui.toggleCheatSheet')}
      />

      <CheatSheet open={snap.cheatSheetOpen} onClose={() => session.execute('ui.toggleCheatSheet')} />

      {esito && (
        <Risultato
          report={reportRef.current!}
          metrics={esito.metrics}
          xp={esito.xp}
          par={par}
          xpTotalePrima={esito.xpTotalePrima}
          xpTotaleDopo={esito.xpTotaleDopo}
          xpNelRank={xpWithinRank(esito.xpTotaleDopo)}
          xpPerRank={XP_PER_RANK}
          onRiprovaStessoSeed={onRiprovaStessoSeed}
          onNuovoSeed={onNuovoSeed}
          onEsportaXlsx={esportaXlsx}
          {...(onEsci ? { onEsci } : {})}
        />
      )}
    </div>
  );
}

// Riesportata per chi vuole mostrare il rank accanto al profilo senza ricalcolarlo a mano.
export { rankForXp };

const schermoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: PALETTE.bianco,
};

const corpoStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  minHeight: 0,
  background: PALETTE.bianco,
};

const colonnaSinistraStyle: React.CSSProperties = {
  width: 390,
  minWidth: 320,
  display: 'flex',
  flexDirection: 'column',
  padding: 10,
  background: PALETTE.nebbia + '22',
  borderRight: `3px solid ${PALETTE.inchiostro}`,
  minHeight: 0,
};

const colonnaDestraStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  minHeight: 0,
  background: PALETTE.bianco,
};

export default PlayScreen;

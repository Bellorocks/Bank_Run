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

import { tr } from '../i18n/ui';
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
  s('xl.grid', tr('skills.1'), 'meccanica', 'M0-A',
    tr('skills.2')),
  s('xl.formula-basics', tr('skills.3'), 'formule', 'M0-A',
    tr('skills.4'), ['xl.grid']),
  s('xl.arithmetic', tr('skills.5'), 'formule', 'M0-A',
    tr('skills.6'), ['xl.formula-basics']),
  s('xl.aggregates', tr('skills.7'), 'formule', 'M0-A',
    tr('skills.8'), ['xl.formula-basics']),
  s('xl.references', tr('skills.245'), 'formule', 'M0-A',
    tr('skills.9'), ['xl.formula-basics']),
  s('xl.anchoring', tr('skills.10'), 'meccanica', 'M0-A',
    tr('skills.11'), ['xl.references']),
  s('xl.copy-shift', tr('skills.12'), 'formule', 'M0-A',
    tr('skills.13'), ['xl.anchoring']),
  s('xl.datatypes', tr('skills.14'), 'igiene', 'M0-A',
    tr('skills.15'), ['xl.grid']),
  s('xl.dates-serial', tr('skills.16'), 'igiene', 'M0-A',
    tr('skills.17'), ['xl.datatypes']),
  s('xl.percentages', tr('skills.250'), 'igiene', 'M0-A',
    tr('skills.18'), ['xl.datatypes']),
  s('xl.numfmt', tr('skills.19'), 'igiene', 'M0-A',
    tr('skills.20'), ['xl.datatypes']),

  // -------------------------------------------------------------------------
  // M0-B · Costruire
  // -------------------------------------------------------------------------
  s('xl.if', tr('skills.251'), 'formule', 'M0-B',
    tr('skills.21'), ['xl.arithmetic']),
  s('xl.if-nested', tr('skills.22'), 'formule', 'M0-B',
    tr('skills.23'), ['xl.if']),
  s('xl.logical', tr('skills.24'), 'formule', 'M0-B', tr('skills.25'), ['xl.if']),
  s('xl.iferror', tr('skills.252'), 'igiene', 'M0-B',
    tr('skills.26'), ['xl.if']),
  s('xl.cross-sheet', tr('skills.27'), 'formule', 'M0-B',
    tr('skills.28'), ['xl.references']),
  s('xl.named-ranges', tr('skills.29'), 'formule', 'M0-B', tr('skills.30'), ['xl.references']),
  s('xl.fill', tr('skills.31'), 'meccanica', 'M0-B',
    tr('skills.32'), ['xl.copy-shift']),
  s('xl.row-consistency', tr('skills.33'), 'igiene', 'M0-B',
    tr('skills.34'), ['xl.fill']),

  // -------------------------------------------------------------------------
  // M0-C · Cercare e aggregare
  // -------------------------------------------------------------------------
  s('xl.index-match', tr('skills.35'), 'formule', 'M0-C',
    tr('skills.36'), ['xl.aggregates', 'xl.references']),
  s('xl.match-exact', tr('skills.37'), 'igiene', 'M0-C',
    tr('skills.38'), ['xl.index-match']),
  s('xl.sumifs', tr('skills.39'), 'formule', 'M0-C',
    tr('skills.40'), ['xl.aggregates']),
  s('xl.sumproduct', tr('skills.253'), 'formule', 'M0-C',
    tr('skills.41'), ['xl.sumifs']),
  s('xl.offset', tr('skills.42'), 'formule', 'M0-C',
    tr('skills.43'), ['xl.index-match']),
  s('xl.choose', tr('skills.44'), 'formule', 'M0-C',
    tr('skills.45'), ['xl.index-match']),

  // -------------------------------------------------------------------------
  // M0-D · Igiene e diagnosi
  // -------------------------------------------------------------------------
  s('xl.errors', tr('skills.46'), 'igiene', 'M0-D',
    tr('skills.47'), ['xl.formula-basics']),
  s('xl.text-numbers', tr('skills.48'), 'igiene', 'M0-D',
    tr('skills.49'), ['xl.datatypes']),
  s('xl.text-to-columns', tr('skills.50'), 'igiene', 'M0-D', tr('skills.51'), ['xl.text-numbers']),
  s('xl.dedup', tr('skills.52'), 'igiene', 'M0-D', tr('skills.53'), ['xl.text-numbers']),
  s('xl.find-replace', tr('skills.54'), 'igiene', 'M0-D',
    tr('skills.55'), ['xl.errors']),
  s('xl.trace', tr('skills.56'), 'igiene', 'M0-D',
    tr('skills.57'), ['xl.errors']),
  s('xl.f9', tr('skills.58'), 'igiene', 'M0-D',
    tr('skills.59'), ['xl.trace']),
  s('xl.freeze', tr('skills.60'), 'meccanica', 'M0-D', tr('skills.61'), ['xl.grid']),
  s('xl.div-guard', tr('skills.62'), 'igiene', 'M0-D',
    tr('skills.63'), ['xl.iferror']),

  // -------------------------------------------------------------------------
  // M0-E · Velocita'
  // -------------------------------------------------------------------------
  s('spd.navigation', tr('skills.64'), 'velocita', 'M0-E',
    tr('skills.65'), ['xl.grid']),
  s('spd.selection', tr('skills.254'), 'velocita', 'M0-E',
    tr('skills.66'), ['spd.navigation']),
  s('spd.paste-special', tr('skills.67'), 'velocita', 'M0-E',
    tr('skills.68'), ['spd.selection']),
  s('spd.alt-format', tr('skills.69'), 'velocita', 'M0-E',
    tr('skills.70'), ['xl.numfmt']),
  s('spd.rows-cols', tr('skills.71'), 'velocita', 'M0-E',
    tr('skills.72'), ['spd.selection']),
  s('spd.mouse-free', tr('skills.255'), 'velocita', 'M0-E',
    tr('skills.73'), ['spd.navigation', 'spd.selection']),

  // -------------------------------------------------------------------------
  // M0-F · Meccaniche avanzate
  // -------------------------------------------------------------------------
  s('xl.data-table', tr('skills.74'), 'formule', 'M0-F',
    tr('skills.75'), ['xl.choose']),
  s('xl.goal-seek', tr('skills.76'), 'formule', 'M0-F', tr('skills.77'), ['xl.data-table']),
  s('xl.iterative', tr('skills.78'), 'formule', 'M0-F',
    tr('skills.79'), ['xl.goal-seek']),
  s('xl.cond-format', tr('skills.80'), 'igiene', 'M0-F',
    tr('skills.81'), ['xl.numfmt']),
  s('xl.grouping', tr('skills.82'), 'meccanica', 'M0-F', tr('skills.83'), ['spd.rows-cols']),
  s('xl.sanity-checks', tr('skills.84'), 'igiene', 'M0-F',
    tr('skills.85'), ['xl.cond-format', 'xl.row-consistency']),
  s('xl.date-functions', tr('skills.86'), 'formule', 'M0-F',
    tr('skills.87'), ['xl.dates-serial']),
  s('xl.color-discipline', tr('skills.88'), 'igiene', 'M0-F',
    tr('skills.89'), ['xl.cross-sheet']),
  s('xl.model-audit', tr('skills.90'), 'igiene', 'M0-F',
    tr('skills.91'), ['xl.trace', 'xl.f9', 'xl.sanity-checks']),

  // -------------------------------------------------------------------------
  // M1 · Contabilita' e i tre prospetti
  // -------------------------------------------------------------------------
  s('acc.cee', tr('skills.92'), 'contabilita', 'M1',
    tr('skills.93'), ['xl.aggregates']),
  s('acc.reclass', tr('skills.256'), 'contabilita', 'M1',
    tr('skills.94'), ['acc.cee']),
  s('acc.three-statement', tr('skills.95'), 'contabilita', 'M1',
    tr('skills.96'), ['acc.reclass', 'xl.row-consistency']),
  s('acc.accruals', tr('skills.97'), 'contabilita', 'M1', tr('skills.98'), ['acc.cee']),
  s('acc.da-schedule', tr('skills.257'), 'contabilita', 'M1', tr('skills.99'), ['acc.three-statement']),
  s('acc.provisions', tr('skills.100'), 'contabilita', 'M1', tr('skills.101'), ['acc.cee']),
  s('acc.taxes', tr('skills.102'), 'contabilita', 'M1', tr('skills.103'), ['acc.three-statement']),
  s('acc.ifrs16', tr('skills.104'), 'contabilita', 'M1',
    tr('skills.105'), ['acc.three-statement']),
  s('acc.stock-comp', tr('skills.106'), 'contabilita', 'M1', tr('skills.107'), ['acc.three-statement']),
  s('acc.minorities', tr('skills.108'), 'contabilita', 'M1', tr('skills.109'), ['acc.three-statement']),
  s('acc.inventory', tr('skills.258'), 'contabilita', 'M1', tr('skills.110'), ['acc.cee']),
  s('acc.capitalization', tr('skills.111'), 'contabilita', 'M1', tr('skills.112'), ['acc.cee']),

  // -------------------------------------------------------------------------
  // M2 · Quality of Earnings
  // -------------------------------------------------------------------------
  s('qoe.normalization', tr('skills.113'), 'transazione', 'M2',
    tr('skills.114'), ['acc.reclass']),
  s('qoe.related-party', tr('skills.115'), 'transazione', 'M2',
    tr('skills.116'), ['qoe.normalization']),
  s('qoe.one-off', tr('skills.259'), 'transazione', 'M2',
    tr('skills.117'), ['qoe.normalization']),
  s('qoe.run-rate', tr('skills.118'), 'transazione', 'M2',
    tr('skills.119'), ['qoe.one-off']),
  s('qoe.ltm', tr('skills.120'), 'transazione', 'M2',
    tr('skills.121'), ['xl.date-functions', 'qoe.normalization']),
  s('qoe.aggressive', tr('skills.122'), 'transazione', 'M2',
    tr('skills.123'), ['qoe.run-rate']),

  // -------------------------------------------------------------------------
  // M3 · Capitale circolante e cassa
  // -------------------------------------------------------------------------
  s('nwc.cycle', tr('skills.124'), 'transazione', 'M3', tr('skills.125'), ['acc.three-statement']),
  s('nwc.peg', tr('skills.126'), 'transazione', 'M3',
    tr('skills.127'), ['nwc.cycle']),
  s('nwc.fcf-impact', tr('skills.128'), 'transazione', 'M3', tr('skills.129'), ['nwc.cycle']),
  s('nwc.factoring', tr('skills.260'), 'transazione', 'M3', tr('skills.130'), ['nwc.peg']),
  s('nwc.locked-box', tr('skills.131'), 'transazione', 'M3',
    tr('skills.132'), ['nwc.peg']),
  s('nwc.leakage', tr('skills.261'), 'transazione', 'M3', tr('skills.133'), ['nwc.locked-box']),
  s('nwc.capex', tr('skills.134'), 'transazione', 'M3', tr('skills.135'), ['nwc.fcf-impact']),

  // -------------------------------------------------------------------------
  // M4 · EV ↔ Equity bridge
  // -------------------------------------------------------------------------
  s('ev.net-debt', tr('skills.136'), 'transazione', 'M4', tr('skills.137'), ['acc.three-statement']),
  s('ev.debt-like', tr('skills.138'), 'transazione', 'M4',
    tr('skills.139'), ['ev.net-debt', 'acc.provisions']),
  s('ev.cash-like', tr('skills.140'), 'transazione', 'M4',
    tr('skills.141'), ['ev.net-debt']),
  s('ev.bridge', tr('skills.142'), 'transazione', 'M4',
    tr('skills.143'), ['ev.debt-like', 'ev.cash-like']),
  s('ev.minorities', tr('skills.144'), 'transazione', 'M4', tr('skills.145'), ['ev.bridge', 'acc.minorities']),
  s('ev.options', tr('skills.146'), 'transazione', 'M4', tr('skills.147'), ['ev.bridge']),
  s('ev.dilution', tr('skills.148'), 'transazione', 'M4', tr('skills.149'), ['ev.options']),
  s('ev.price-per-share', tr('skills.150'), 'transazione', 'M4', tr('skills.151'), ['ev.dilution']),

  // -------------------------------------------------------------------------
  // M5 · Trading comps
  // -------------------------------------------------------------------------
  s('comps.peer-selection', tr('skills.152'), 'valutazione', 'M5', tr('skills.153'), ['ev.bridge']),
  s('comps.ltm-ntm', tr('skills.154'), 'valutazione', 'M5', tr('skills.155'), ['qoe.ltm']),
  s('comps.calendarization', tr('skills.262'), 'valutazione', 'M5', tr('skills.156'), ['comps.ltm-ntm', 'xl.date-functions']),
  s('comps.multiples', tr('skills.263'), 'valutazione', 'M5',
    tr('skills.157'), ['comps.peer-selection']),
  s('comps.statistics', tr('skills.246'), 'valutazione', 'M5', tr('skills.158'), ['comps.multiples']),
  s('comps.adjustments', tr('skills.264'), 'valutazione', 'M5', tr('skills.247'), ['comps.statistics']),
  s('comps.football-field', tr('skills.159'), 'valutazione', 'M5', tr('skills.160'), ['comps.adjustments']),

  // -------------------------------------------------------------------------
  // M6 · Precedent transactions
  // -------------------------------------------------------------------------
  s('prec.transaction-multiples', tr('skills.161'), 'valutazione', 'M6', tr('skills.162'), ['comps.multiples']),
  s('prec.control-premium', tr('skills.163'), 'valutazione', 'M6', tr('skills.164'), ['prec.transaction-multiples']),
  s('prec.synergies-in-price', tr('skills.165'), 'valutazione', 'M6', tr('skills.166'), ['prec.control-premium']),
  s('prec.timing', tr('skills.167'), 'valutazione', 'M6', tr('skills.168'), ['prec.transaction-multiples']),
  s('prec.triangulation', tr('skills.265'), 'valutazione', 'M6', tr('skills.169'), ['prec.synergies-in-price']),

  // -------------------------------------------------------------------------
  // M7 · DCF
  // -------------------------------------------------------------------------
  s('dcf.fcff-fcfe', tr('skills.170'), 'valutazione', 'M7', tr('skills.171'), ['nwc.fcf-impact']),
  s('dcf.build-fcf', tr('skills.172'), 'valutazione', 'M7', tr('skills.173'), ['dcf.fcff-fcfe']),
  s('dcf.mid-year', tr('skills.174'), 'valutazione', 'M7', tr('skills.175'), ['dcf.build-fcf', 'xl.date-functions']),
  s('dcf.capm', tr('skills.266'), 'valutazione', 'M7', tr('skills.176'), ['dcf.build-fcf']),
  s('dcf.beta', tr('skills.177'), 'valutazione', 'M7', tr('skills.178'), ['dcf.capm']),
  s('dcf.country-risk', tr('skills.179'), 'valutazione', 'M7', tr('skills.180'), ['dcf.capm']),
  s('dcf.wacc', tr('skills.267'), 'valutazione', 'M7', tr('skills.181'), ['dcf.beta', 'dcf.country-risk']),
  s('dcf.terminal-value', tr('skills.182'), 'valutazione', 'M7',
    tr('skills.183'), ['dcf.wacc']),
  s('dcf.terminal-capex', tr('skills.184'), 'valutazione', 'M7', tr('skills.185'), ['dcf.terminal-value']),
  s('dcf.nol', tr('skills.186'), 'valutazione', 'M7', tr('skills.187'), ['dcf.build-fcf', 'acc.taxes']),
  s('dcf.sensitivity', tr('skills.188'), 'valutazione', 'M7', tr('skills.189'), ['dcf.terminal-value', 'xl.data-table']),

  // -------------------------------------------------------------------------
  // M8 · LBO
  // -------------------------------------------------------------------------
  s('lbo.sources-uses', tr('skills.190'), 'strutturazione', 'M8', tr('skills.191'), ['ev.bridge']),
  s('lbo.debt-structure', tr('skills.192'), 'strutturazione', 'M8',
    tr('skills.193'), ['lbo.sources-uses']),
  s('lbo.debt-schedule', tr('skills.194'), 'strutturazione', 'M8',
    tr('skills.195'), ['lbo.debt-structure', 'xl.iterative']),
  s('lbo.covenants', tr('skills.196'), 'strutturazione', 'M8', tr('skills.197'), ['lbo.debt-schedule']),
  s('lbo.mip', tr('skills.198'), 'strutturazione', 'M8', tr('skills.199'), ['lbo.sources-uses']),
  s('lbo.returns', tr('skills.200'), 'strutturazione', 'M8', tr('skills.201'), ['lbo.debt-schedule']),
  s('lbo.value-bridge', tr('skills.202'), 'strutturazione', 'M8',
    tr('skills.203'), ['lbo.returns']),
  s('lbo.dividend-recap', tr('skills.204'), 'strutturazione', 'M8', tr('skills.205'), ['lbo.returns']),
  s('lbo.buy-and-build', tr('skills.206'), 'strutturazione', 'M8', tr('skills.207'), ['lbo.value-bridge']),
  s('lbo.exit', tr('skills.208'), 'strutturazione', 'M8', tr('skills.209'), ['lbo.returns']),
  s('lbo.attribution', tr('skills.210'), 'strutturazione', 'M8', tr('skills.248'), ['lbo.mip', 'lbo.returns']),

  // -------------------------------------------------------------------------
  // M9 · M&A e accretion/dilution
  // -------------------------------------------------------------------------
  s('ma.consideration', tr('skills.211'), 'strutturazione', 'M9', tr('skills.212'), ['ev.price-per-share']),
  s('ma.synergies', tr('skills.268'), 'strutturazione', 'M9', tr('skills.213'), ['ma.consideration']),
  s('ma.ppa', tr('skills.214'), 'strutturazione', 'M9', tr('skills.215'), ['ma.consideration', 'acc.taxes']),
  s('ma.accretion', tr('skills.216'), 'strutturazione', 'M9',
    tr('skills.217'), ['ma.ppa', 'ma.synergies']),
  s('ma.breakeven', tr('skills.218'), 'strutturazione', 'M9', tr('skills.219'), ['ma.accretion']),
  s('ma.eps-bridge', tr('skills.220'), 'strutturazione', 'M9', tr('skills.221'), ['ma.accretion']),
  s('ma.proforma-leverage', tr('skills.222'), 'strutturazione', 'M9', tr('skills.223'), ['ma.consideration', 'lbo.covenants']),

  // -------------------------------------------------------------------------
  // M10 · Credito e debito
  // -------------------------------------------------------------------------
  s('cred.ratios', tr('skills.224'), 'strutturazione', 'M10', tr('skills.225'), ['acc.three-statement']),
  s('cred.capacity', tr('skills.226'), 'strutturazione', 'M10', tr('skills.227'), ['cred.ratios']),
  s('cred.amortization', tr('skills.228'), 'strutturazione', 'M10', tr('skills.249'), ['cred.capacity']),
  s('cred.stress', tr('skills.229'), 'strutturazione', 'M10', tr('skills.230'), ['cred.amortization', 'lbo.covenants']),
  s('cred.refinancing', tr('skills.269'), 'strutturazione', 'M10', tr('skills.231'), ['cred.amortization']),

  // -------------------------------------------------------------------------
  // M11 · Sporco e reale
  // -------------------------------------------------------------------------
  s('real.read-cee', tr('skills.232'), 'igiene', 'M11', tr('skills.233'), ['acc.cee']),
  s('real.dirty-tables', tr('skills.234'), 'igiene', 'M11', tr('skills.235'), ['xl.text-numbers']),
  s('real.units', tr('skills.236'), 'igiene', 'M11', tr('skills.237'), ['real.dirty-tables']),
  s('real.estimate', tr('skills.238'), 'igiene', 'M11', tr('skills.239'), ['real.read-cee']),
  s('real.find-errors', tr('skills.240'), 'igiene', 'M11',
    tr('skills.241'), ['xl.model-audit']),
  s('real.restatement', tr('skills.270'), 'igiene', 'M11', tr('skills.242'), ['real.read-cee']),
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
      if (!SKILLS_BY_ID.has(req)) problems.push(tr('skills.243', { p0: k.id, req }));
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
      problems.push(tr('skills.244', { p0: [...path, id].join(' -> ') }));
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

/* Junta catálogo + build e devolve tudo que a interface (e o 3D) precisa. */
import { compatIssues } from './rules';
import { fitIssues } from './fit';
import { powerIssues, powerReport } from './power';
import { totals } from './money';
import {
  BLOCKING, SLOTS,
  type Build, type Catalog, type Evaluation, type Issue, type Option, type OptionStatus, type Part, type Psu, type Selected, type Slot,
} from './types';

const RANK: Record<OptionStatus, number> = { ok: 0, warning: 1, power: 2, nofit: 3, incompatible: 4 };

export const worst = (issues: Issue[]): OptionStatus =>
  issues.reduce<OptionStatus>((w, i) => (RANK[i.severity] > RANK[w] ? i.severity : w), 'ok');

export const isBlocking = (i: Issue) => BLOCKING.includes(i.severity);

export const slotLabel = (slot: Slot) => SLOTS.find(s => s.slot === slot)?.label ?? slot;

/**
 * Estado único do build, pelo pior caso, para status, barra do celular e mensagem do COMPRAR:
 * faltam peças → 'incomplete'; algum conflito que bloqueia → 'blocked'; só avisos → 'warning'; nada → 'ready'.
 */
export function buildStatus(ev: Pick<Evaluation, 'issues' | 'missingRequired' | 'doneCount' | 'requiredCount'>) {
  const conflicts = ev.issues.filter(isBlocking).length;
  const warnings = ev.issues.filter(i => i.severity === 'warning').length;
  const level = ev.missingRequired.length ? 'incomplete' : conflicts ? 'blocked' : warnings ? 'warning' : 'ready';
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts = [`${ev.doneCount}/${ev.requiredCount} peças`, ...(conflicts ? [plural(conflicts, 'conflito', 'conflitos')] : []), ...(warnings ? [plural(warnings, 'aviso', 'avisos')] : [])];
  const title = { incomplete: 'Faltam peças', blocked: 'Com conflitos', warning: 'Completa, com avisos', ready: 'Pronta para comprar' }[level];
  return { level, conflicts, warnings, title, summary: parts.join(' · ') } as const;
}

/** Peças do build que existem no catálogo e estão no slot certo. */
export function resolve(catalog: Catalog, build: Build): Selected {
  const sel: Selected = {};
  for (const [slot, id] of Object.entries(build) as [Slot, string][]) {
    const part = catalog.parts.find(p => p.id === id && p.slot === slot);
    if (part) (sel as Record<Slot, Part>)[slot] = part;
  }
  return sel;
}

export function issuesFor(sel: Selected, psus: Psu[]): Issue[] {
  return [...compatIssues(sel), ...fitIssues(sel), ...powerIssues(powerReport(sel, psus))];
}

/**
 * Só culpa a opção pelo que ela causa. Conflito de encaixe que já existe sem ela (ex.: a GPU já não cabe no
 * gabinete) não a marca como "não cabe"; se ela piora esse conflito, vira um aviso dizendo quanto piora.
 */
function attributable(reasons: Issue[], base: Issue[]): Issue[] {
  return reasons.flatMap(r => {
    if (r.severity !== 'nofit') return [r];
    const before = base.find(b => b.code === r.code);
    if (!before) return [r];
    const more = (r.deltaMm ?? 0) - (before.deltaMm ?? 0);
    if (more <= 0) return [];
    return [{ ...r, severity: 'warning' as const, message: `Aumenta em ${more} mm um conflito que já existe: ${r.message.charAt(0).toLowerCase()}${r.message.slice(1)}`, deltaMm: more }];
  });
}

export function evaluate(catalog: Catalog, build: Build): Evaluation {
  const sel = resolve(catalog, build);
  const psus = catalog.parts.filter((p): p is Psu => p.slot === 'psu');
  const issues = issuesFor(sel, psus);
  /** Conflitos do build sem a peça do slot (base para saber o que cada opção causa). */
  const baseline = (slot: Slot) => { const rest = { ...sel }; delete rest[slot]; return issuesFor(rest, psus); };

  const slots = {} as Evaluation['slots'];
  for (const { slot } of SLOTS) {
    const options: Option[] = catalog.parts
      .filter(p => p.slot === slot)
      .sort((a, b) => a.pricePix - b.pricePix)
      .map(part => {
        // Avalia a peça como se ela substituísse a atual, contra as demais escolhidas.
        const reasons = attributable(issuesFor({ ...sel, [slot]: part }, psus).filter(i => i.slots.includes(slot)), baseline(slot));
        return { part, status: worst(reasons), reasons };
      });
    slots[slot] = { selected: sel[slot], options };
  }

  const required = SLOTS.filter(s => s.required);
  const missingRequired = required.filter(s => !sel[s.slot]).map(s => s.slot);
  const blocking = issues.filter(isBlocking);
  const blockers = [
    ...(missingRequired.length ? [`Falta escolher: ${missingRequired.map(slotLabel).join(', ')}`] : []),
    ...blocking.map(i => i.message),
  ];
  const pix = Object.values(sel).reduce((sum, p) => sum + (p?.pricePix ?? 0), 0);

  return {
    build: { ...build },
    selected: sel,
    slots,
    issues,
    power: powerReport(sel, psus),
    totals: totals(pix),
    missingRequired,
    requiredCount: required.length,
    doneCount: required.length - missingRequired.length,
    blockers,
    canBuy: blockers.length === 0,
  };
}

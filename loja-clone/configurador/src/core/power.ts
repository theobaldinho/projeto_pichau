/* Consumo estimado e dimensionamento da fonte. */
import type { Issue, PowerReport, Psu, Selected } from './types';

/** Placa-mãe, memória, SSD, fans e periféricos USB. */
export const BASE_W = 75;
/** Carga ideal: até 70% da fonte. Acima de 85% a compra é bloqueada. */
export const TARGET_LOAD = 0.7;
export const MAX_LOAD = 0.85;

export const needW = (s: Selected): number => (s.cpu?.tdpW ?? 0) + (s.gpu?.tbpW ?? 0) + BASE_W;

export const recommendedW = (need: number): number => Math.ceil(need / TARGET_LOAD / 50) * 50;

export function powerReport(s: Selected, psus: Psu[]): PowerReport {
  const need = needW(s);
  const rec = recommendedW(need);
  const psu = s.psu;
  if (!psu) return { needW: need, recommendedW: rec, level: 'none' };
  const load = need / psu.wattage;
  const level = load > MAX_LOAD ? 'block' : load > TARGET_LOAD ? 'warn' : 'ok';
  const report: PowerReport = { needW: need, recommendedW: rec, psuW: psu.wattage, loadPct: Math.round(load * 100), level };
  if (level !== 'ok') {
    const conns = s.gpu?.powerConnectors ?? [];
    report.suggestion = psus
      .filter(p => p.wattage >= rec && conns.every(c => p.connectors.includes(c)))
      .sort((a, b) => a.wattage - b.wattage || a.pricePix - b.pricePix)[0];
  }
  return report;
}

export function powerIssues(r: PowerReport): Issue[] {
  if (r.level !== 'block' && r.level !== 'warn') return [];
  const message = `A fonte de ${r.psuW}W ficaria com ${r.loadPct}% de carga (consumo estimado de ${r.needW}W). Recomendado: ${r.recommendedW}W ou mais`;
  return [r.level === 'block'
    ? { code: 'power', severity: 'power', slots: ['psu', 'gpu', 'cpu'], message }
    : { code: 'power-warn', severity: 'warning', slots: ['psu'], message }];
}

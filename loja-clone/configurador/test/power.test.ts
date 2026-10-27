import { describe, expect, it } from 'vitest';
import { needW, powerIssues, powerReport, recommendedW } from '../src/core';
import { psus, sel } from './helpers';

describe('energia', () => {
  it('soma processador + placa de vídeo + base', () => {
    expect(needW(sel('cpu-r9-am5', 'gpu-16gb-340'))).toBe(170 + 300 + 75);
    expect(recommendedW(545)).toBe(800);
  });
  it('sem fonte só informa o recomendado', () => {
    expect(powerReport(sel('cpu-r5-am5', 'gpu-8gb-240'), psus)).toMatchObject({ level: 'none', needW: 300, recommendedW: 450 });
  });
  it('até 70% de carga está ok', () => {
    const r = powerReport(sel('cpu-r5-am5', 'gpu-8gb-240', 'psu-550'), psus);
    expect(r).toMatchObject({ level: 'ok', loadPct: 55 });
    expect(r.suggestion).toBeUndefined();
    expect(powerIssues(r)).toEqual([]);
  });
  it('entre 70% e 85% avisa sem bloquear', () => {
    const r = powerReport(sel('cpu-r7-am5', 'gpu-12gb-305', 'psu-550'), psus);
    expect(r).toMatchObject({ level: 'warn', loadPct: 73 });
    expect(powerIssues(r)).toMatchObject([{ severity: 'warning' }]);
  });
  it('acima de 85% bloqueia e sugere a menor fonte compatível', () => {
    const r = powerReport(sel('cpu-r9-am5', 'gpu-16gb-340', 'psu-550'), psus);
    expect(r).toMatchObject({ level: 'block', loadPct: 99, recommendedW: 800 });
    // A de 850W não tem 12V-2x6, então a sugestão é a de 1000W.
    expect(r.suggestion?.id).toBe('psu-1000');
    expect(powerIssues(r)).toMatchObject([{ severity: 'power', slots: ['psu', 'gpu', 'cpu'] }]);
  });
});

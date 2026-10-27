import { describe, expect, it } from 'vitest';
import { evaluate, type Case } from '../src/core';
import { buildLayout, caseDims, type Box } from '../src/three/layout';
import { buildOf, catalog } from './helpers';

const cases = catalog.parts.filter((p): p is Case => p.slot === 'case');
const lo = (b: Box, a: number) => b.pos[a] - b.size[a] / 2, hi = (b: Box, a: number) => b.pos[a] + b.size[a] / 2;

/** Cada limite do catálogo tem que coincidir com a peça física que o impõe (sem espaço sobrando nem faltando). */
describe('medidas do gabinete batem com os limites do catálogo', () => {
  for (const cs of cases) {
    const { L, H, W, zm, top } = caseDims(cs);
    const l = buildLayout(evaluate(catalog, buildOf(cs.id, 'mobo-x670e', 'psu-750')));
    const model = l.boxes.find(b => b.model?.type === 'case')!.model as Extract<Box['model'], { type: 'case' }>;

    it(`${cs.id}: GPU máxima termina na face de trás das ventoinhas da frente`, () => {
      const gpuLimit = L - 15 - cs.maxGpuLengthMm, fansBack = 28;
      expect(gpuLimit - fansBack).toBeGreaterThanOrEqual(0);
      expect(gpuLimit - fansBack).toBeLessThanOrEqual(3);
    });

    it(`${cs.id}: cooler máximo vai da placa-mãe até a face interna do vidro`, () => expect(zm - cs.maxCoolerHeightMm).toBe(3));

    it(`${cs.id}: fonte máxima termina na parede da gaiola de discos`, () => expect(L - 3 - cs.maxPsuLengthMm).toBe(model.cage[1]));

    it(`${cs.id}: com radiador na frente, a GPU para na face de trás dele`, () => {
      if (!cs.radiatorMounts.front.length) return;
      const lr = buildLayout(evaluate(catalog, buildOf(cs.id, 'cooler-aio-240')));
      const rad = lr.boxes.find(b => b.key === 'cooler:cooler-aio-240:rad')!;
      if (lo(rad, 0) > 10) return;   // foi para o topo
      const limit = L - 15 - (cs.maxGpuLengthFrontRadMm ?? cs.maxGpuLengthMm - 30);
      expect(hi(rad, 0)).toBeCloseTo(limit);
      expect(lo(rad, 0)).toBeGreaterThanOrEqual(2);   // não atravessa a tela da frente
    });

    it(`${cs.id}: radiador no topo (com ventoinhas) cabe entre o teto e a placa-mãe`, () => {
      if (!cs.radiatorMounts.top.length) return;
      const r = Math.max(...cs.radiatorMounts.top);
      const id = r >= 360 ? 'cooler-aio-360' : 'cooler-aio-240';
      const lr = buildLayout(evaluate(catalog, buildOf(cs.id, id, 'mobo-x670e')));
      const rad = lr.boxes.find(b => b.key === `cooler:${id}:rad`)!;
      if (hi(rad, 1) < H - 10) return;   // foi para a frente
      expect(rad.size[1]).toBe(52);
      expect(lo(rad, 1)).toBeGreaterThanOrEqual(H - top);
    });

    it(`${cs.id}: medidas externas plausíveis (${L} × ${H} × ${Math.round(W)} mm)`, () => {
      expect(L).toBeGreaterThan(300); expect(L).toBeLessThan(560);
      expect(H).toBeGreaterThan(300); expect(H).toBeLessThan(600);
      expect(W).toBeGreaterThan(180); expect(W).toBeLessThan(260);
    });
  }
});

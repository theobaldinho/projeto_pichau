import { Box3, Mesh, type Group } from 'three';
import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core';
import { buildLayout, type Box } from '../src/three/layout';
import { buildModel } from '../src/three/models';
import { buildOf, catalog } from './helpers';

/** Caixa envolvente do modelo sem as mangueiras do AIO (filhos `extra`). */
function bounds(g: Group) {
  const box = new Box3();
  g.updateMatrixWorld(true);
  for (const c of g.children) if (!c.userData.extra) box.expandByObject(c as Mesh);
  return box;
}

const BUILDS = [
  ['cpu-r5-am5', 'cooler-air-155', 'mobo-x670e', 'ram-32-ddr5', 'gpu-12gb-305', 'ssd-1tb-nvme', 'case-mid', 'psu-750'],
  ['cpu-r9-am5', 'cooler-aio-360', 'mobo-x670e', 'ram-64-ddr5-4x', 'gpu-24gb-357', 'ssd-1tb-sata', 'case-full', 'psu-1000'],
  ['cpu-r5-am5', 'cooler-aio-240', 'mobo-b650i', 'ram-16-ddr5', 'gpu-16gb-285', 'ssd-500-nvme', 'case-itx', 'psu-750'],
  ['cpu-c5-1700', 'cooler-air-lp', 'mobo-b660m-ddr4', 'ram-16-ddr4', 'gpu-8gb-240', 'ssd-2tb-nvme', 'case-matx', 'psu-550'],
  ['cpu-r7-am5', 'cooler-air-165', 'mobo-b650m', 'ram-32-ddr4', 'gpu-16gb-340', 'case-mid', 'psu-850'],
  ['cooler-aio-360', 'case-matx'], ['cooler-aio-240', 'case-mid'],
];

const modeled: Box[] = [];
for (const ids of BUILDS) for (const b of buildLayout(evaluate(catalog, buildOf(...ids))).boxes) if (b.model) modeled.push(b);

describe('modelos 3D', () => {
  it('todo tipo de modelo aparece nos casos de teste', () => {
    const types = new Set(modeled.map(b => b.model!.type));
    expect([...types].sort()).toEqual(['air', 'case', 'cpu', 'gpu', 'm2', 'mobo', 'psu', 'pump', 'radiator', 'ram', 'sata']);
  });

  // É o que mantém o "faltam X mm" e as regras de encaixe exatos no 3D.
  for (const b of modeled) it(`${b.key} ocupa exatamente a caixa do layout`, () => {
    const box = bounds(buildModel(b.model!, b.size));
    const half = b.size.map(v => v / 2);
    for (const a of [0, 1, 2] as const) {
      const min = box.min.getComponent(a), max = box.max.getComponent(a);
      expect(max, `${b.key} eixo ${a} max`).toBeCloseTo(half[a], 1);
      // A placa-mãe tem componentes saindo da face do lado do vidro (z < 0), até 22 mm.
      if (b.model!.type === 'mobo' && a === 2) { expect(min).toBeLessThan(-half[a]); expect(min).toBeGreaterThanOrEqual(-half[a] - 22.7); }
      else expect(min, `${b.key} eixo ${a} min`).toBeCloseTo(-half[a], 1);
    }
  });

  it('peça vira poucas malhas (geometria unida por material)', () => {
    for (const b of modeled) expect(buildModel(b.model!, b.size).children.length, b.key).toBeLessThanOrEqual(12);
  });
});

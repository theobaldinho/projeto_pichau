import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core';
import { buildLayout, ioZ, rearFanFit, type Box } from '../src/three/layout';
import { buildOf, catalog } from './helpers';

const layoutOf = (...ids: string[]) => buildLayout(evaluate(catalog, buildOf(...ids)));
const parts = (boxes: Box[]) => boxes.filter(b => b.kind === 'part');
const inside = (b: Box, [L, H, W]: number[]) =>
  [0, 1, 2].every(a => b.pos[a] - b.size[a] / 2 >= -0.01 && b.pos[a] + b.size[a] / 2 <= [L, H, W][a] + 0.01);
const overlap = (a: Box, b: Box) =>
  [0, 1, 2].every(i => Math.abs(a.pos[i] - b.pos[i]) * 2 < a.size[i] + b.size[i] - 0.01);

const BUILDS: Record<string, string[]> = {
  'mid-tower ATX, ar': ['cpu-r5-am5', 'cooler-air-155', 'mobo-x670e', 'ram-32-ddr5', 'gpu-12gb-305', 'ssd-1tb-nvme', 'case-mid', 'psu-750'],
  'full-tower, AIO 360 + GPU grande': ['cpu-r9-am5', 'cooler-aio-360', 'mobo-x670e', 'ram-64-ddr5-4x', 'gpu-24gb-357', 'ssd-1tb-sata', 'case-full', 'psu-1000'],
  'ITX, AIO 240 na frente': ['cpu-r5-am5', 'cooler-aio-240', 'mobo-b650i', 'ram-16-ddr5', 'gpu-16gb-285', 'ssd-500-nvme', 'case-itx', 'psu-750'],
  'micro-ATX DDR4': ['cpu-c5-1700', 'cooler-air-lp', 'mobo-b660m-ddr4', 'ram-16-ddr4', 'gpu-8gb-240', 'ssd-2tb-nvme', 'case-matx', 'psu-550'],
};

describe('layout 3D', () => {
  for (const [name, ids] of Object.entries(BUILDS)) {
    it(`${name}: sem conflitos, toda peça dentro do gabinete e sem peças se atravessando`, () => {
      const ev = evaluate(catalog, buildOf(...ids));
      expect(ev.issues.filter(i => i.severity !== 'warning')).toEqual([]);
      const l = buildLayout(ev);
      const ps = parts(l.boxes);
      for (const b of ps) expect(inside(b, l.caseSize), b.key).toBe(true);
      // Peças diferentes não se atravessam (a CPU fica sob o cooler de propósito).
      for (const a of ps) for (const b of ps) {
        if (a.slot >= b.slot || [a.slot, b.slot].sort().join() === 'cooler,cpu') continue;
        expect(overlap(a, b), `${a.key} × ${b.key}`).toBe(false);
      }
      expect(l.boxes.some(b => b.kind === 'excess')).toBe(false);
      expect(l.dims).toEqual([]);
    });
  }

  it('GPU de 340 mm no ITX: sobra vermelha de 20 mm + cota', () => {
    const l = layoutOf('gpu-16gb-340', 'case-itx');
    const ex = l.boxes.find(b => b.key === 'gpu:gpu-16gb-340:excess')!;
    expect(ex.size[0]).toBeCloseTo(20);
    expect(l.dims.map(d => d.label)).toContain('faltam 20 mm');
    expect(l.boxes.find(b => b.key === 'gpu:gpu-16gb-340')!.conflict).toBe(true);
    // 3,5 slots num gabinete de 3: sobra embaixo também.
    expect(l.boxes.find(b => b.key === 'gpu:gpu-16gb-340:excess-slots')!.size[1]).toBeCloseTo(10);
  });

  it('cooler alto atravessa o painel lateral exatamente o que falta', () => {
    const l = layoutOf('cooler-air-165', 'case-itx');
    expect(l.boxes.find(b => b.key === 'cooler:cooler-air-165:excess')!.size[2]).toBeCloseTo(10);
    expect(l.dims[0].label).toBe('faltam 10 mm');
  });

  it('radiador sem suporte fica fora do gabinete, em vermelho', () => {
    const l = layoutOf('cooler-aio-360', 'case-itx');
    const rad = l.boxes.find(b => b.key === 'cooler:cooler-aio-360:rad')!;
    expect(rad.conflict).toBe(true);
    expect(rad.pos[1] - rad.size[1] / 2).toBeGreaterThan(l.caseSize[1]);
  });

  it('sem gabinete usa contorno genérico; sem peças só o contorno e a placa-mãe fantasma', () => {
    const l = buildLayout(evaluate(catalog, {}));
    expect(l.ghostCase).toBe(true);
    expect(parts(l.boxes)).toEqual([]);
    expect(l.boxes.find(b => b.slot === 'mobo')!.kind).toBe('ghost');
  });

  it('trocar a peça troca a chave (para animar o encaixe)', () => {
    const a = layoutOf('gpu-8gb-240').boxes.map(b => b.key);
    const b = layoutOf('gpu-12gb-305').boxes.map(b => b.key);
    expect(a).toContain('gpu:gpu-8gb-240');
    expect(b).not.toContain('gpu:gpu-8gb-240');
  });

  it('ventoinha traseira fica ao lado do recorte do I/O, sem sobrepor, e cabe até o vidro', () => {
    for (const cs of catalog.parts.filter(p => p.slot === 'case')) {
      const l = layoutOf(cs.id, 'mobo-b650i');
      const m = l.boxes.find(b => b.model?.type === 'case')!.model as Extract<Box['model'], { type: 'case' }>;
      if (!m.rearMount) continue;
      const { mm, z } = rearFanFit(m.zm);
      expect(m.rear).toEqual({ mm, z });
      expect(z + mm / 2, cs.id).toBeLessThan(ioZ(m.zm)[0]);
      expect(z - mm / 2, cs.id).toBeGreaterThanOrEqual(2);
      expect(m.ioBox[0]).toBe(ioZ(m.zm)[0]);
    }
    expect(rearFanFit(170).mm).toBe(120);   // mid-tower
    expect(rearFanFit(160).mm).toBe(92);    // micro-ATX: 120 mm não cabe ao lado do I/O
  });

  it('fonte longa bate na gaiola de discos (o que limita o comprimento); a que cabe para antes dela', () => {
    const cageOf = (l: ReturnType<typeof layoutOf>) => l.boxes.find(b => b.key.endsWith(':cage'))!;
    const front = (b: Box) => b.pos[0] - b.size[0] / 2;
    const bad = layoutOf('psu-1000', 'case-itx'), ok = layoutOf('psu-750', 'case-itx');
    const cBad = cageOf(bad), cOk = cageOf(ok);
    const rear = (c: Box) => c.pos[0] + c.size[0] / 2;
    expect(rear(cBad) - front(bad.boxes.find(b => b.key === 'psu:psu-1000')!)).toBeCloseTo(20);   // = "faltam 20 mm"
    expect(front(ok.boxes.find(b => b.key === 'psu:psu-750')!)).toBeGreaterThanOrEqual(rear(cOk));
    // SSD de 2,5" fica em cima da gaiola.
    const ssd = layoutOf('ssd-1tb-sata', 'case-mid').boxes.find(b => b.slot === 'storage')!;
    const cage = cageOf(layoutOf('ssd-1tb-sata', 'case-mid'));
    expect(ssd.pos[1] - ssd.size[1] / 2).toBeCloseTo(cage.pos[1] + cage.size[1] / 2);
  });

  it('air coolers nas medidas reais: torre 120 ≈ 75 × 125, dupla 140 ≈ 125 × 138, baixo 95 × 95', () => {
    const size = (id: string) => layoutOf(id, 'case-full', 'mobo-x670e').boxes.find(b => b.key === `cooler:${id}`)!.size;
    expect(size('cooler-air-155').slice(0, 2)).toEqual([75, 125]);
    expect(size('cooler-air-165').slice(0, 2)).toEqual([125, 138]);   // largura limitada para não invadir o 1º slot PCIe
    expect(size('cooler-air-lp').slice(0, 2)).toEqual([95, 95]);
  });

  it('radiador tem o comprimento real (nominal + tanques)', () => {
    const rad = layoutOf('cooler-aio-360', 'case-full').boxes.find(b => b.key === 'cooler:cooler-aio-360:rad')!;
    expect(Math.max(...rad.size)).toBe(396);
  });
});

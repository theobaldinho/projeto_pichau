import { describe, expect, it } from 'vitest';
import { evaluate, type Mobo } from '../src/core';
import { buildLayout } from '../src/three/layout';
import { IO_H, IO_W, PORT_SIZE, ioLayout, type IoPort } from '../src/three/rear-io';
import { buildOf, catalog } from './helpers';

const mobos = catalog.parts.filter((p): p is Mobo => p.slot === 'mobo');
const count = (ports: IoPort[], kind: IoPort['kind']) => ports.filter(p => p.kind === kind).length;

describe('espelho de I/O traseiro', () => {
  it('toda placa-mãe do catálogo descreve o painel traseiro', () => {
    for (const m of mobos) expect(m.rearIo, m.id).toBeDefined();
  });

  for (const m of mobos) it(`${m.id}: as portas do 3D são exatamente as da placa`, () => {
    const io = m.rearIo!, l = ioLayout(io);
    expect(count(l.ports, 'usb2')).toBe(io.usb2);
    expect(count(l.ports, 'usb5')).toBe(io.usb5);
    expect(count(l.ports, 'usb10')).toBe(io.usb10);
    expect(count(l.ports, 'usbc')).toBe(io.usbc);
    expect(count(l.ports, 'hdmi')).toBe(io.hdmi);
    expect(count(l.ports, 'dp')).toBe(io.dp);
    expect(count(l.ports, 'rj45')).toBe(1);
    expect(count(l.ports, 'sma')).toBe(io.wifi ? 2 : 0);
    expect(count(l.ports, 'ps2')).toBe(io.ps2 ? 1 : 0);
    expect(count(l.ports, 'audio')).toBe(io.audio);
    expect(count(l.ports, 'spdif')).toBe(io.spdif ? 1 : 0);
    expect(count(l.ports, 'btn')).toBe(+io.biosFlashback + +io.clearCmos);
  });

  for (const m of mobos) it(`${m.id}: cabe no espelho (44 × 142 mm) sem portas sobrepostas`, () => {
    const { ports, height } = ioLayout(m.rearIo!);
    expect(height).toBeLessThanOrEqual(IO_H);
    const r = ports.map(p => { const [w, h] = PORT_SIZE[p.kind]; return [p.a - w / 2, p.b - h / 2, p.a + w / 2, p.b + h / 2]; });
    for (const [a0, b0, a1, b1] of r) { expect(a0).toBeGreaterThanOrEqual(0); expect(a1).toBeLessThanOrEqual(IO_W); expect(b0).toBeGreaterThanOrEqual(0); expect(b1).toBeLessThanOrEqual(IO_H); }
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const [a, b] = [r[i], r[j]];
      expect(a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3], `${ports[i].kind} × ${ports[j].kind}`).toBe(false);
    }
  });

  it('o gabinete mostra o painel da placa escolhida (e nenhum sem placa-mãe)', () => {
    const io = (ids: string[]) => (buildLayout(evaluate(catalog, buildOf(...ids))).boxes.find(b => b.model?.type === 'case')!.model as { io: ReturnType<typeof ioLayout> | null }).io;
    expect(io(['case-mid'])).toBeNull();
    const top = io(['case-mid', 'mobo-x670e'])!, basic = io(['case-mid', 'mobo-b660m-ddr4'])!;
    expect(count(top.ports, 'sma')).toBe(2);
    expect(count(basic.ports, 'sma')).toBe(0);
    expect(count(basic.ports, 'ps2')).toBe(1);
  });
});

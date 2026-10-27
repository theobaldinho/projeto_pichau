/*
 * Arranjo do espelho de I/O a partir das portas da placa-mãe escolhida (sem Three.js, testável).
 * Espelho de 44 × 142 mm, em pé: duas colunas de portas, de cima para baixo como nas placas reais
 * (botões, antenas, vídeo, USB, rede) e o áudio embaixo. `a` = mm da borda do lado da bandeja, `b` = mm do topo.
 */
import type { RearIo } from '../core/types';

export type PortKind = 'usb2' | 'usb5' | 'usb10' | 'usbc' | 'hdmi' | 'dp' | 'rj45' | 'sma' | 'btn' | 'audio' | 'spdif' | 'ps2';
export interface IoPort { kind: PortKind; a: number; b: number; color?: string }
export interface IoLayout { ports: IoPort[]; labels: { text: string; a: number; b: number }[]; height: number }

export const IO_W = 44, IO_H = 142;
const COLS = [12.5, 31.5];

/** Largura × altura (mm) de cada porta. */
export const PORT_SIZE: Record<PortKind, [number, number]> = {
  usb2: [13, 5.6], usb5: [13, 5.6], usb10: [13, 5.6], usbc: [3, 8.6], hdmi: [15, 6], dp: [16, 6.6],
  rj45: [16, 13.6], sma: [7, 7], btn: [5, 5], audio: [7, 7], spdif: [7, 7], ps2: [9.5, 9.5],
};

/** Célula = o que ocupa uma coluna numa linha (até 2 USB-A empilhadas, par de USB-C, uma porta de vídeo…). */
interface Cell { kinds: PortKind[]; label: string; h: number }

const usbLabel: Record<'usb2' | 'usb5' | 'usb10', string> = { usb2: 'USB 2.0', usb5: 'USB 5G', usb10: 'USB 10G' };

export function ioLayout(io: RearIo): IoLayout {
  const cells: Cell[] = [];
  if (io.biosFlashback) cells.push({ kinds: ['btn'], label: 'BIOS', h: 5 });
  if (io.clearCmos) cells.push({ kinds: ['btn'], label: 'CMOS', h: 5 });
  if (cells.length === 1) cells.push({ kinds: [], label: '', h: 0 });
  if (io.wifi) cells.push({ kinds: ['sma'], label: 'WI-FI', h: 7 }, { kinds: ['sma'], label: 'WI-FI', h: 7 });
  if (io.ps2) cells.push({ kinds: ['ps2'], label: 'PS/2', h: 9.5 });
  for (let i = 0; i < io.hdmi; i++) cells.push({ kinds: ['hdmi'], label: 'HDMI', h: 6 });
  for (let i = 0; i < io.dp; i++) cells.push({ kinds: ['dp'], label: 'DP', h: 6.6 });
  for (const kind of ['usb2', 'usb5', 'usb10'] as const) {
    for (let n = io[kind]; n > 0; n -= 2) cells.push({ kinds: n >= 2 ? [kind, kind] : [kind], label: usbLabel[kind], h: n >= 2 ? 13.6 : 5.6 });
  }
  for (let n = io.usbc; n > 0; n -= 2) cells.push({ kinds: n >= 2 ? ['usbc', 'usbc'] : ['usbc'], label: 'USB-C', h: 8.6 });
  cells.push({ kinds: ['rj45'], label: `LAN ${String(io.lanGbps).replace('.', ',')}G`, h: 13.6 });

  const ports: IoPort[] = [], labels: IoLayout['labels'] = [];
  let b = 4;
  for (let i = 0; i < cells.length; i += 2) {
    const row = cells.slice(i, i + 2);
    const h = Math.max(...row.map(c => c.h));
    row.forEach((c, col) => {
      const a = COLS[col];
      if (c.kinds.length === 2 && c.kinds[0] === 'usbc') ports.push({ kind: 'usbc', a: a - 3.5, b: b + c.h / 2 }, { kind: 'usbc', a: a + 3.5, b: b + c.h / 2 });
      else if (c.kinds.length === 2) ports.push({ kind: c.kinds[0], a, b: b + 2.8 }, { kind: c.kinds[1], a, b: b + 10.8 });
      else if (c.kinds.length === 1) ports.push({ kind: c.kinds[0], a, b: b + PORT_SIZE[c.kinds[0]][1] / 2 });
      if (c.label) labels.push({ text: c.label, a, b: b + h + 2.3 });
    });
    b += h + 6.2;
  }
  // Áudio: fileira(s) de até 3 conectores; cores padrão (entrada azul, saída verde, microfone rosa…).
  const jacks: [PortKind, string][] = (io.audio === 5
    ? [['audio', '#3b6fd6'], ['audio', '#3ddc5a'], ['audio', '#f06292'], ['audio', '#ff9800'], ['audio', '#1b1b1d']]
    : [['audio', '#3b6fd6'], ['audio', '#3ddc5a'], ['audio', '#f06292']]) as [PortKind, string][];
  if (io.spdif) jacks.push(['spdif', '#1b1b1d']);
  for (let i = 0; i < jacks.length; i += 3) {
    const row = jacks.slice(i, i + 3);
    row.forEach(([kind, color], j) => ports.push({ kind, a: IO_W / 2 + (j - (row.length - 1) / 2) * 11, b: b + 3.5, color }));
    b += 9;
  }
  return { ports, labels, height: b };
}

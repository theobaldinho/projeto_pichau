/*
 * Vista 2D detalhada (SVG): o PC visto pelo vidro lateral, frente à direita (como no 3D).
 * Desenha a partir do mesmo layout do 3D, com as mesmas medidas internas de cada modelo
 * (`src/three/models.ts`), então peças, folgas e "faltam X mm" batem com o 3D.
 */
import { svg, type SVGTemplateResult } from 'lit';
import type { Box, Layout, Model, Vec3 } from '../three/layout';

type M<T extends Model['type']> = Extract<Model, { type: T }>;

interface Ctx { L: number; top: number }
const C = {
  frame: '#1b1c1f', inner: '#26272b', tray: '#2c2d31', dark: '#151517', black: '#0e0e10', plastic: '#2f3033', metal: '#c3c7cc',
  alu: '#6d7278', fin: '#aeb3b9', copper: '#c07a44', pcb: '#141619', pcbGreen: '#17301f', red: '#e90313', rgb: '#ff3b47',
  gold: '#d4a53c', usb: '#2f6fd6', ram: '#9c1219', diffuser: '#ffb3b8', label: '#e9eaec', rubber: '#0b0b0c', beige: '#e2dac4',
};

/* ---------- primitivas (coordenadas do gabinete → SVG) ---------- */

type Attrs = { fill?: string; stroke?: string; sw?: number; rx?: number; op?: number; title?: string; filter?: string };
function R(c: Ctx, x0: number, x1: number, y0: number, y1: number, a: Attrs = {}) {
  if (x1 <= x0 || y1 <= y0) return svg``;
  return svg`<rect x=${c.L - x1} y=${c.top - y1} width=${x1 - x0} height=${y1 - y0} rx=${a.rx ?? 0}
    fill=${a.fill ?? 'none'} stroke=${a.stroke ?? 'none'} stroke-width=${a.sw ?? 1} opacity=${a.op ?? 1} filter=${a.filter ?? 'none'}>${a.title ? svg`<title>${a.title}</title>` : ''}</rect>`;
}
const Circ = (c: Ctx, x: number, y: number, r: number, a: Attrs = {}) =>
  svg`<circle cx=${c.L - x} cy=${c.top - y} r=${r} fill=${a.fill ?? 'none'} stroke=${a.stroke ?? 'none'} stroke-width=${a.sw ?? 1} opacity=${a.op ?? 1} filter=${a.filter ?? 'none'}/>`;
const Line = (c: Ctx, x0: number, y0: number, x1: number, y1: number, stroke: string, sw = 1, op = 1) =>
  svg`<line x1=${c.L - x0} y1=${c.top - y0} x2=${c.L - x1} y2=${c.top - y1} stroke=${stroke} stroke-width=${sw} opacity=${op}/>`;
const Txt = (c: Ctx, x: number, y: number, t: string, size: number, fill: string, anchor = 'middle', weight = 800) =>
  svg`<text x=${c.L - x} y=${c.top - y} font-size=${size} font-weight=${weight} fill=${fill} text-anchor=${anchor} dominant-baseline="middle" font-family="Roboto, Arial, sans-serif">${t}</text>`;
const Path = (c: Ctx, pts: Vec3[], stroke: string, sw: number, op = 1) =>
  svg`<polyline points=${pts.map(p => `${c.L - p[0]},${c.top - p[1]}`).join(' ')} fill="none" stroke=${stroke} stroke-width=${sw} stroke-linejoin="round" stroke-linecap="round" opacity=${op}/>`;

const min = (b: Box): Vec3 => [b.pos[0] - b.size[0] / 2, b.pos[1] - b.size[1] / 2, b.pos[2] - b.size[2] / 2];

/** Ventoinha vista de lado (de perfil): moldura, pás de perfil e o anel RGB. */
function fanEdge(c: Ctx, x0: number, x1: number, y0: number, y1: number, vertical: boolean) {
  const out = [R(c, x0, x1, y0, y1, { fill: C.dark, stroke: '#000', rx: 2 })];
  const n = 7;
  if (vertical) for (let i = 1; i < n; i++) { const y = y0 + ((y1 - y0) * i) / n; out.push(Line(c, x0 + 3, y - 4, x1 - 3, y + 4, '#3a3b40', 2)); }
  else for (let i = 1; i < n; i++) { const x = x0 + ((x1 - x0) * i) / n; out.push(Line(c, x - 4, y0 + 3, x + 4, y1 - 3, '#3a3b40', 2)); }
  out.push(vertical ? R(c, x1 - 2, x1 - 0.8, y0 + 4, y1 - 4, { fill: C.rgb, filter: 'url(#glow)' }) : R(c, x0 + 4, x1 - 4, y1 - 2, y1 - 0.8, { fill: C.rgb, filter: 'url(#glow)' }));
  return out;
}

/** Ventoinha vista de frente (cooler baixo, deitada). */
function fanFace(c: Ctx, cx: number, cy: number, d: number) {
  const r = d * 0.47, out = [R(c, cx - d / 2, cx + d / 2, cy - d / 2, cy + d / 2, { fill: C.dark, stroke: '#000', rx: 4 }),
    Circ(c, cx, cy, r, { fill: '#09090a', stroke: C.rgb, sw: 2.2, filter: 'url(#glow)' })];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, a2 = a + 0.5;
    out.push(svg`<path d="M ${c.L - cx - Math.cos(a) * d * 0.16} ${c.top - cy - Math.sin(a) * d * 0.16}
      Q ${c.L - cx - Math.cos(a + 0.2) * r} ${c.top - cy - Math.sin(a + 0.2) * r} ${c.L - cx - Math.cos(a2) * r * 0.92} ${c.top - cy - Math.sin(a2) * r * 0.92}" stroke="#2b2c31" stroke-width=${d * 0.09} fill="none" stroke-linecap="round"/>`);
  }
  out.push(Circ(c, cx, cy, d * 0.16, { fill: C.plastic, stroke: '#000' }), Circ(c, cx, cy, d * 0.1, { fill: '#8f9399' }));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) out.push(Circ(c, cx + sx * d * 0.43, cy + sy * d * 0.43, d * 0.022, { fill: '#000' }));
  return out;
}

/* ---------- peças ---------- */

function caseBack(c: Ctx, b: Box, m: M<'case'>) {
  const [L, H] = b.size, e = 5, out: SVGTemplateResult[] = [];
  out.push(R(c, 0, L, 0, H, { fill: C.frame, stroke: '#000', sw: 2, rx: 6 }));
  out.push(R(c, e, L - e, e, H - e, { fill: C.tray, title: 'Bandeja da placa-mãe' }));
  // Recorte atrás do processador, passa-cabos (borracha com fenda) e rasgo do EPS.
  const [cx, cy] = m.cpu;
  out.push(R(c, cx - 62, cx + 62, cy - 58, cy + 58, { fill: '#1a1a1d', stroke: '#3a3b40', rx: 3 }));
  for (const [a, y0, a1, y1] of [...m.grommets, m.epsHole]) {
    out.push(R(c, a, a1, y0, y1, { fill: C.rubber, stroke: '#3a3b40', rx: 4, title: 'Passa-cabos' }));
    out.push(a1 - a < y1 - y0 ? Line(c, (a + a1) / 2, y0 + 3, (a + a1) / 2, y1 - 3, '#2a2b2f', 1.5) : Line(c, a + 3, (y0 + y1) / 2, a1 - 3, (y0 + y1) / 2, '#2a2b2f', 1.5));
  }
  for (const [x, y] of m.standoffs) out.push(Circ(c, x, y, 3, { fill: C.gold, stroke: '#7a5a12' }));
  return out;
}

function caseFront(c: Ctx, b: Box, m: M<'case'>) {
  const [L, H] = b.size, e = 5, out: SVGTemplateResult[] = [];
  // Topo e frente com tela; traseira com tampas dos slots e a ventoinha.
  out.push(R(c, e, L - e, H - 2.5, H, { fill: 'url(#mesh)' }), R(c, 0, 2.5, e, H - e, { fill: 'url(#mesh)', title: 'Frente com tela' }));
  out.push(R(c, L - 3, L, e, H - e, { fill: C.inner, title: 'Traseira' }));
  for (let i = 0; i < m.slots; i++) {
    const y1 = m.slotTop - i * 20 - 2.5, y0 = m.slotTop - (i + 1) * 20 + 2.5;
    out.push(R(c, L - 4.5, L - 3, y0, y1, { fill: i < m.gpuSlots ? '#000' : C.metal }));
    out.push(Circ(c, L - 1.5, (y0 + y1) / 2, 2.2, { fill: C.metal, stroke: '#555' }));
  }
  const [io0, iy0, , iy1] = m.ioBox; void io0;
  out.push(R(c, L - 3, L - 0.5, iy0, iy1, { fill: m.io ? '#2a2c30' : '#000', title: m.io ? 'Espelho de I/O' : 'Recorte do I/O' }));
  if (m.rearFan) out.push(...fanEdge(c, L - 3 - 25 - 2, L - 3 - 2, (m.rearFan[0] + m.rearFan[1]) / 2 - m.rear.mm / 2, (m.rearFan[0] + m.rearFan[1]) / 2 + m.rear.mm / 2, true));
  for (const y of m.frontFans) out.push(...fanEdge(c, 3, 28, y - 60, y + 60, true));
  // Piso: filtro de poeira e pés de borracha da fonte.
  out.push(R(c, e, L - e, 0, 2, { fill: C.inner }));
  out.push(R(c, L - 3 - 175, L - 3 - 8, 2, 2.4, { fill: 'url(#mesh)' }));
  for (const x of [L - 3 - 22, L - 3 - 128]) out.push(R(c, x - 6, x + 6, 2, 4, { fill: C.rubber }));
  // Painel de I/O no topo (botão e USB).
  out.push(R(c, 16, 29, H - 0.5, H + 0.6, { fill: C.usb }), Circ(c, 22, H, 3, { fill: C.metal, stroke: C.rgb, sw: 1.2 }));
  return out;
}

function cage(c: Ctx, m: M<'case'>) {
  const [x0, x1, y0, y1] = m.cage, out: SVGTemplateResult[] = [];
  out.push(R(c, x0, x1, y0, y1, { fill: C.inner, stroke: '#000', sw: 1.5, title: 'Gaiola de discos (limite da fonte)' }));
  for (const [a, z] of [[y0 + 3, y0 + 24], [y0 + 27, y1 - 4]]) {
    out.push(R(c, x0 + 3, x1 - 3, a, z, { fill: C.plastic, stroke: '#000', rx: 2 }));
    out.push(R(c, x0, x0 + 3, a + 4, z - 4, { fill: C.black }), R(c, x0, x0 + 1, a + 8, z - 8, { fill: C.red }));
  }
  return out;
}

function glassFrame(c: Ctx, b: Box) {
  const [L, H] = b.size, e = 5, bw = 10;
  return [
    svg`<rect x=${c.L - L + e + bw / 2} y=${c.top - H + e + bw / 2} width=${L - 2 * e - bw} height=${H - 2 * e - bw} fill="url(#glass)" stroke="#050506" stroke-width=${bw}/>`,
    R(c, 0, L, 0, H, { stroke: '#000', sw: 3, rx: 6 }),
  ];
}

function mobo(c: Ctx, b: Box, m: M<'mobo'>) {
  const [ox, oy] = min(b), [w, h] = b.size, out: SVGTemplateResult[] = [];
  const r = (x0: number, x1: number, y0: number, y1: number, a: Attrs) => R(c, ox + x0, ox + x1, oy + y0, oy + y1, a);
  const [sx, sy] = m.socket;
  out.push(r(0, w, 0, h, { fill: 'url(#pcb)', stroke: '#000', sw: 1.5, rx: 2, title: 'Placa-mãe' }));
  // Tampa do I/O, VRMs com aletas e bobinas.
  out.push(r(w - 20, w, sy - 50, h - 5, { fill: C.black, stroke: '#000', rx: 2 }), r(w - 19, w - 1, sy - 30, sy - 26, { fill: C.red }));
  out.push(r(sx - 40, sx + 42, sy + 38, sy + 60, { fill: 'url(#finv)', stroke: '#2a2c30', rx: 2 }), r(sx + 42, sx + 62, sy - 40, sy + 60, { fill: 'url(#finh)', stroke: '#2a2c30', rx: 2 }));
  for (let x = sx - 34; x <= sx + 34; x += 11) out.push(r(x - 4, x + 4, sy + 33.5, sy + 37.8, { fill: '#3a3b3f' }));
  for (let y = sy - 34; y <= sy + 28; y += 11) out.push(r(sx + 37.5, sx + 41.8, y - 4, y + 4, { fill: '#3a3b3f' }));
  // Soquete conforme o modelo.
  if (m.sock === 'lga1700') {
    out.push(r(sx - 23, sx + 23, sy - 29, sy + 29, { fill: C.metal, stroke: '#7d8187', rx: 2, title: 'Soquete LGA1700' }), r(sx - 17, sx + 17, sy - 21, sy + 21, { fill: '#202124' }));
    out.push(r(sx + 24.5, sx + 26.5, sy - 28, sy + 28, { fill: C.metal }));
  } else {
    if (m.sock === 'am4') out.push(r(sx - 24, sx + 24, sy - 24, sy + 24, { fill: 'url(#pga)', stroke: '#9b927c', title: 'Soquete AM4' }));
    else out.push(r(sx - 24, sx + 24, sy - 24, sy + 24, { fill: C.metal, stroke: '#7d8187', rx: 2, title: 'Soquete AM5' }), r(sx - 18, sx + 18, sy - 18, sy + 18, { fill: '#202124' }));
    out.push(r(sx + 25.5, sx + 27, sy - 23, sy + 23, { fill: C.metal }));
    for (const d of [-1, 1]) out.push(r(sx - 36, sx + 36, sy + (d < 0 ? -32 : 26), sy + (d < 0 ? -26 : 32), { fill: C.plastic, stroke: '#000', rx: 1.5 }));
  }
  // Memória, PCIe, chipset, bateria, conectores.
  for (const x of m.dimmX) out.push(r(x - 3, x + 3, sy - 63, sy + 73, { fill: C.plastic, stroke: '#000' }), r(x - 3, x + 3, sy + 73, sy + 79, { fill: '#8d9096' }));
  out.push(r(w - 137, w - 48, m.pcieY - 7, m.pcieY - 1, { fill: C.metal, stroke: '#6b6f75', title: 'PCIe x16' }), r(w - 135, w - 50, m.pcieY - 4.6, m.pcieY - 3.4, { fill: '#000' }));
  for (const dy of [40, 80]) if (m.pcieY - dy - 7 > 6) out.push(r(w - 137, w - (dy === 40 ? 112 : 48), m.pcieY - dy - 7, m.pcieY - dy - 1, { fill: C.plastic, stroke: '#000' }));
  if (m.pcieY - 70 > 4) {
    out.push(r(w - 45, w - 8, m.pcieY - 70, m.pcieY - 30, { fill: C.alu, stroke: '#3a3d42', rx: 2 }), r(w - 43, w - 10, m.pcieY - 52, m.pcieY - 48, { fill: C.red }));
    out.push(Circ(c, ox + w - 62, oy + m.pcieY - 50, 10, { fill: '#d3d6da', stroke: '#8a8e94', sw: 1.5 }));
  }
  if (m.atx24) {
    out.push(r(6, 20, sy - 30, sy + 30, { fill: C.plastic, stroke: '#000', title: 'Conector de 24 pinos' }));
    for (let i = 0; i < 4; i++) out.push(r(2, 12, 14 + i * 9, 21 + i * 9, { fill: C.black, stroke: '#333' }));
    for (let y = sy - 40; y <= sy + 40; y += 10) out.push(Circ(c, ox + 27, oy + y, 2.5, { fill: '#3a3d44', stroke: '#9aa0a6', sw: 0.8 }));
  }
  out.push(r(sx - 55, sx - 40, h - 14, h - 4, { fill: C.plastic, stroke: '#000', title: 'EPS (8 pinos)' }), r(sx - 12, sx - 2, h - 10, h - 4, { fill: '#8d9096' }));
  out.push(Txt(c, ox + w - 70, oy + 20, 'EXEMPLO', 9, '#5f646b'));
  return out;
}

function cpu(c: Ctx, b: Box, m: M<'cpu'>) {
  const [ox, oy] = min(b), [w, h] = b.size;
  return [
    R(c, ox, ox + w, oy, oy + h, { fill: m.sock === 'lga1700' ? '#101113' : C.pcbGreen, stroke: '#000', title: `Processador ${m.label}` }),
    R(c, ox + 2.5, ox + w - 2.5, oy + 3, oy + h - 3, { fill: C.metal, stroke: '#8a8e94', rx: 1 }),
    Txt(c, ox + w / 2, oy + h / 2 + 4, 'EXEMPLO', 5, '#6f747b'), Txt(c, ox + w / 2, oy + h / 2 - 4, m.label, 4.5, '#6f747b'),
  ];
}

function air(c: Ctx, b: Box, m: M<'air'>) {
  const [ox, oy] = min(b), [w, h, d] = b.size, out: SVGTemplateResult[] = [];
  const r = (x0: number, x1: number, y0: number, y1: number, a: Attrs) => R(c, ox + x0, ox + x1, oy + y0, oy + y1, a);
  if (m.low) {
    out.push(r(0, w, 0, h, { fill: 'url(#finv)', stroke: '#555', title: 'Cooler baixo' }));
    out.push(...fanFace(c, ox + w / 2, oy + h / 2, Math.min(m.fanMm, w, h)));
    return out;
  }
  // Visto de cima (do vidro): tampa das torres com a faixa vermelha e as pontas dos heatpipes; ventoinha de perfil.
  const stacks: [number, number][] = m.dual ? [[0, (w - 25) / 2], [(w + 25) / 2, w]] : [[25, w]];
  for (const [x0, x1] of stacks) {
    out.push(r(x0, x1, 0, h, { fill: '#1d1e21', stroke: '#000', rx: 2, title: m.dual ? 'Air cooler torre dupla' : 'Air cooler torre' }));
    out.push(r(x0 + 4, x1 - 4, h * 0.16 - 2, h * 0.16 + 2, { fill: C.red }));
    [0.25, 0.5, 0.75].forEach((f, i) => out.push(Circ(c, ox + x0 + (x1 - x0) * f, oy + h / 2 + (i % 2 ? 9 : -9), 3.6, { fill: C.copper, stroke: '#7b4a22' })));
    for (const y of [3, h - 3]) out.push(r(x0, x1, y - 1.5, y + 1.5, { fill: C.fin, op: 0.5 }));
  }
  const fx = m.dual ? w / 2 : 12.5, fd = Math.min(m.fanMm, h - 2, d - 32);
  out.push(...fanEdge(c, ox + fx - 12.5, ox + fx + 12.5, oy + h / 2 - fd / 2, oy + h / 2 + fd / 2, true));
  return out;
}

function pump(c: Ctx, b: Box, m: M<'pump'>) {
  const [ox, oy, oz] = min(b), [w] = b.size, cx = b.pos[0], cy = b.pos[1];
  const out = m.tubes.map(t => svg`${Path(c, t.map(p => [ox + p[0], oy + p[1], oz + p[2]] as Vec3), '#0b0b0c', 10)}${Path(c, t.map(p => [ox + p[0], oy + p[1], oz + p[2]] as Vec3), '#2c2d31', 2.5, 0.8)}`);
  out.push(Circ(c, cx, cy, w / 2, { fill: C.black, stroke: '#000', sw: 1.5 }), Circ(c, cx, cy, w / 2 - 4, { stroke: C.rgb, sw: 3, filter: 'url(#glow)' }),
    Circ(c, cx, cy, w / 2 - 7, { fill: '#09090a' }), Circ(c, cx, cy, w / 2 - 12.5, { stroke: C.rgb, sw: 1, op: 0.6 }), Circ(c, cx, cy, w / 2 - 18.5, { stroke: C.rgb, sw: 1, op: 0.35 }),
    Txt(c, cx, cy, 'EXEMPLO', 6, '#6f747b'));
  return out;
}

function radiator(c: Ctx, b: Box, m: M<'radiator'>) {
  const [ox, oy] = min(b), [w, h] = b.size, out: SVGTemplateResult[] = [];
  // Visto de perfil: tanques nas pontas, núcleo de aletas e ventoinhas encostadas.
  const alongX = m.axis === 'y';           // comprimento em x (topo) ou em y (frente/traseira)
  const len = alongX ? w : h, thick = alongX ? h : w;
  const fanT = thick >= 45 ? 25 : thick - 4, coreT = thick - fanT;
  const [c0, c1, f0] = m.inward === 1 ? [0, coreT, coreT] : [fanT, thick, 0];
  const box = (u0: number, u1: number, v0: number, v1: number, a: Attrs) =>
    alongX ? R(c, ox + u0, ox + u1, oy + v0, oy + v1, a) : R(c, ox + v0, ox + v1, oy + u0, oy + u1, a);
  out.push(box(0, 14, c0, c1, { fill: C.dark, stroke: '#000' }), box(len - 14, len, c0, c1, { fill: C.dark, stroke: '#000' }));
  out.push(box(14, len - 14, c0, c1, { fill: alongX ? 'url(#finv)' : 'url(#finh)', stroke: '#2a2c30', title: 'Radiador' }));
  const step = (len - 28) / m.fans;
  for (let i = 0; i < m.fans; i++) {
    const u0 = 14 + step * i + 1, u1 = 14 + step * (i + 1) - 1;
    out.push(...(alongX ? fanEdge(c, ox + u0, ox + u1, oy + f0, oy + f0 + fanT, false) : fanEdge(c, ox + f0, ox + f0 + fanT, oy + u0, oy + u1, true)));
  }
  return out;
}

function ram(c: Ctx, b: Box, m: M<'ram'>) {
  const [ox, oy] = min(b), [w, h] = b.size, out: SVGTemplateResult[] = [];
  out.push(R(c, ox, ox + w, oy, oy + h, { fill: C.ram, stroke: '#3a0508', rx: 1, title: 'Memória' }));
  if (m.rgb) for (let i = 0; i < 8; i++) { const s = (h - 4) / 8; out.push(R(c, ox + 0.6, ox + w - 0.6, oy + 2 + i * s + 0.5, oy + 2 + (i + 1) * s - 0.5, { fill: C.diffuser, filter: 'url(#glow)' })); }
  else for (let y = 3; y < h - 6; y += 8) out.push(R(c, ox, ox + w, oy + y, oy + y + 5, { fill: C.black }));
  return out;
}

function gpu(c: Ctx, b: Box, m: M<'gpu'>) {
  const [ox, oy] = min(b), [len, t] = b.size, body = len - 3, out: SVGTemplateResult[] = [];
  const r = (x0: number, x1: number, y0: number, y1: number, a: Attrs) => R(c, ox + x0, ox + x1, oy + y0, oy + y1, a);
  out.push(r(0, body, 9, t - 5, { fill: 'url(#gpuside)', stroke: '#000', sw: 1.5, rx: 3, title: 'Placa de vídeo' }));
  out.push(r(0, body, t - 2.5, t, { fill: C.alu }), r(0, body, t - 5, t - 2.5, { fill: C.pcb }));
  out.push(r(0, body, 6, 9, { fill: '#2c2d30' }));
  const step = body / m.fans;
  for (let i = 0; i < m.fans; i++) out.push(r(step * i + 6, step * (i + 1) - 6, 0, 6, { fill: C.dark, stroke: '#000', rx: 2 }));
  out.push(r(len - 2, len, 0, t, { fill: C.metal, stroke: '#6b6f75', title: 'Suporte PCIe' }));
  out.push(r(body * 0.06, body * 0.6, t * 0.32 - 1.5, t * 0.32 + 1.5, { fill: C.red, filter: 'url(#glow)' }));
  const cx0 = body * 0.62;
  out.push(r(cx0, cx0 + 22, t - 13, t - 5, { fill: C.black, stroke: '#333', title: 'Conector de energia' }));
  out.push(Txt(c, ox + body * 0.3, oy + t * 0.62, 'EXEMPLO', Math.min(14, t * 0.3), '#e8e8e8'));
  return out;
}

function m2(c: Ctx, b: Box, m: M<'m2'>) {
  const [ox, oy] = min(b);
  return [
    R(c, ox, ox + 4, oy + 2, oy + 20, { fill: C.gold }), R(c, ox + 4, ox + 80, oy, oy + 22, { fill: C.pcb, stroke: '#000' }),
    R(c, ox + 5, ox + 78, oy + 0.5, oy + 21.5, { fill: C.alu, rx: 1, title: `SSD NVMe ${m.label}` }),
    R(c, ox + 9, ox + 62, oy + 2, oy + 20, { fill: C.label }), R(c, ox + 9, ox + 11, oy + 2, oy + 20, { fill: C.red }),
    Txt(c, ox + 36, oy + 11, `NVMe ${m.label}`, 7, '#1b1c1f'),
  ];
}

function sata(c: Ctx, b: Box, m: M<'sata'>) {
  const [ox, oy] = min(b), [w, h] = b.size;
  return [R(c, ox, ox + w, oy, oy + h, { fill: C.alu, stroke: '#000', rx: 1, title: `SSD SATA ${m.label}` }), R(c, ox + 8, ox + w - 8, oy + h - 1.2, oy + h, { fill: C.label }), R(c, ox, ox + 0.8, oy + 1.5, oy + h - 1.5, { fill: '#000' })];
}

function psu(c: Ctx, b: Box, m: M<'psu'>) {
  const [ox, oy] = min(b), [len, h] = b.size;
  const r = (x0: number, x1: number, y0: number, y1: number, a: Attrs) => R(c, ox + x0, ox + x1, oy + y0, oy + y1, a);
  return [
    r(0, len, 0, h, { fill: '#141416', stroke: '#000', sw: 1.5, rx: 3, title: `Fonte ${m.watts}W` }),
    r(len * 0.12, len * 0.88, 14, h - 14, { fill: '#1f2023', stroke: '#2f3034', rx: 2 }), r(len * 0.12, len * 0.88, 20, 24, { fill: C.red }),
    Txt(c, ox + len / 2, oy + h / 2 + 8, `${m.watts}W`, 22, '#f2f2f2'), Txt(c, ox + len / 2, oy + h / 2 - 8, 'EXEMPLO · 80 PLUS', 7, '#bdbdbd', 'middle', 600),
    r(0, 1.5, 12, h - 12, { fill: C.plastic }), r(len - 1.5, len, 4, h - 4, { fill: '#3b3d42' }),
  ];
}

function cables(c: Ctx, m: M<'case'>) {
  const out: SVGTemplateResult[] = [];
  for (const [k, n, r] of [['atx24', 4, 3.2], ['eps', 2, 3.2], ['pcie', 3, 3]] as const) {
    const pts = m.cables[k];
    if (!pts) continue;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * r * 2.1;
      const p = pts.map(([x, y, z]) => [x + (k === 'atx24' ? 0 : off), y + (k === 'atx24' ? off : 0), z] as Vec3);
      out.push(Path(c, p, '#050505', r * 2), Path(c, p, '#2a2b2f', r * 0.6, 0.9));
    }
  }
  return out;
}

const DRAW: Partial<{ [T in Model['type']]: (c: Ctx, b: Box, m: M<T>) => SVGTemplateResult[] }> = { mobo, cpu, air, pump, radiator, ram, gpu, m2, sata, psu };

/** Vista lateral completa. `top`: y do topo do desenho (radiador fora do gabinete pode passar do teto). */
export function sideView(l: Layout) {
  const [L, H] = l.caseSize;
  const pad = 34;
  const top = Math.max(H, ...l.boxes.map(b => b.pos[1] + b.size[1] / 2));
  const c: Ctx = { L, top };
  const caseBox = l.boxes.find(b => b.model?.type === 'case');
  const cm = caseBox?.model as M<'case'> | undefined;
  // Peças com modelo, da mais funda (perto da bandeja) para a mais perto do vidro.
  const parts = l.boxes.filter(b => b.model && b.model.type !== 'case').sort((a, b) => (b.pos[2] + b.size[2] / 2) - (a.pos[2] + a.size[2] / 2));
  const ghosts = l.boxes.filter(b => b.kind === 'ghost' && b.key.startsWith('mobo'));
  // Sobra em profundidade (em direção ao vidro) não aparece de lado: vai para o detalhe "vista de cima".
  const deep = l.boxes.filter(b => b.kind === 'excess' && b.axis === 2);
  const deepKeys = new Set(deep.map(b => b.key.replace(/:excess$/, '')));
  const red = l.boxes.filter(b => (b.kind === 'excess' && b.axis !== 2) || (b.kind === 'limit' && !deepKeys.has(b.key.replace(/:limit$/, ''))));
  const bad = new Set(l.boxes.filter(b => b.conflict).map(b => b.key));
  // Com o detalhe "vista de cima", o desenho ganha uma faixa embaixo para ele (não cobre nenhuma peça).
  const extra = deep.length ? INSET_H + 12 : 0;
  return svg`<svg viewBox="${-pad} ${-pad} ${L + pad * 2} ${top + pad * 2 + extra}" aria-hidden="true">
    <defs>
      <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#e5484d"/><rect width="4" height="10" fill="#fff" opacity=".8"/></pattern>
      <pattern id="mesh" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#2b2c30"/><circle cx="2" cy="2" r="1.1" fill="#060607"/></pattern>
      <pattern id="pcb" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#15171b"/><path d="M0 10h14v12h18M8 40V28h20M40 6H26v8" stroke="#232930" stroke-width="1.2" fill="none"/><rect x="30" y="30" width="3" height="3" fill="#2c3238"/></pattern>
      <pattern id="finv" width="3" height="10" patternUnits="userSpaceOnUse"><rect width="3" height="10" fill="#5d6268"/><rect width="1" height="10" fill="#b8bcc1"/></pattern>
      <pattern id="finh" width="10" height="3" patternUnits="userSpaceOnUse"><rect width="10" height="3" fill="#5d6268"/><rect width="10" height="1" fill="#b8bcc1"/></pattern>
      <pattern id="pga" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${C.beige}"/><rect x="1.5" y="1.5" width="1.6" height="1.6" fill="#9b927c"/></pattern>
      <pattern id="gpuside" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="18" height="18" fill="#232427"/><rect width="5" height="18" fill="#2c2e32"/></pattern>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe3f0" stop-opacity=".10"/><stop offset=".35" stop-color="#cfe3f0" stop-opacity=".02"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".07"/><stop offset=".62" stop-color="#cfe3f0" stop-opacity="0"/></linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    ${caseBox && cm ? caseBack(c, caseBox, cm) : svg`<rect class="shell ghost" x="0" y=${top - H} width=${L} height=${H} rx="6" fill="none"/>`}
    ${ghosts.map(b => R(c, min(b)[0], min(b)[0] + b.size[0], min(b)[1], min(b)[1] + b.size[1], { stroke: '#777', sw: 2, title: 'Placa-mãe (escolha uma)' }))}
    ${parts.map(b => svg`<g class=${bad.has(b.key) ? 'bad' : ''}>${(DRAW[b.model!.type] as (c: Ctx, b: Box, m: Model) => SVGTemplateResult[])(c, b, b.model!)}
      ${bad.has(b.key) ? R(c, min(b)[0], min(b)[0] + b.size[0], min(b)[1], min(b)[1] + b.size[1], deepKeys.has(b.key)
        ? { stroke: '#ff8a8a', sw: 3 }                                     // só o contorno: o problema é a profundidade
        : { fill: '#e5484d', op: 0.28, stroke: '#ff8a8a', sw: 3 }) : ''}</g>`)}
    ${cm ? cage(c, cm) : ''}
    ${cm ? cables(c, cm) : ''}
    ${caseBox && cm ? caseFront(c, caseBox, cm) : ''}
    ${caseBox ? glassFrame(c, caseBox) : ''}
    ${red.map(b => R(c, min(b)[0], min(b)[0] + Math.max(b.size[0], 1), min(b)[1], min(b)[1] + Math.max(b.size[1], 1), b.kind === 'excess' ? { fill: 'url(#hatch)', stroke: '#ff8a8a', sw: 2, op: 0.9 } : { fill: '#e5484d' }))}
    ${l.dims.filter(d => d.from[0] !== d.to[0]).map(d => svg`
      <line class="dimline" x1=${L - d.from[0]} y1=${top - d.from[1]} x2=${L - d.to[0]} y2=${top - d.to[1]}/>
      <text class="dimtext" x=${Math.min(L - 50, Math.max(50, L - d.at[0]))} y=${top - d.at[1]} text-anchor="middle" dominant-baseline="middle">${d.label}</text>`)}
    ${deep.map(b => depthInset(c, l, b))}
    ${scaleBar(c)}
  </svg>`;
}

/**
 * Detalhe "vista de cima" para sobra em profundidade (cooler alto): gabinete em corte, do vidro até a tampa de trás,
 * com o plano da placa-mãe, o cooler e a parte que passa do vidro em escala real.
 */
const INSET_H = 96;
function depthInset(c: Ctx, l: Layout, ex: Box) {
  const [, , W] = l.caseSize;
  const part = l.boxes.find(b => b.key === ex.key.replace(/:excess$/, ''))!;
  const dim = l.dims.find(d => d.key === part.key + ':dim');
  const zFar = part.pos[2] + part.size[2] / 2, zNear = part.pos[2] - part.size[2] / 2, glass = ex.pos[2] + ex.size[2] / 2;
  const s = 150 / W, w = W * s + 40, h = INSET_H, x0 = c.L - w, y0 = c.top + 26;   // embaixo do gabinete, à direita
  const Z = (z: number) => x0 + 20 + z * s;                                 // z cresce para a direita (vidro à esquerda)
  const cy = y0 + 54, bh = Math.max(16, part.size[0] * s * 0.6);
  return svg`<g class="inset" role="presentation">
    <rect x=${x0} y=${y0} width=${w} height=${h} rx="6" fill="#111214" opacity=".92" stroke="#3a3b40"/>
    <text x=${x0 + 10} y=${y0 + 14} font-size="10.5" font-weight="700" fill="#d7d9dc" font-family="Roboto, Arial, sans-serif">Vista de cima</text>
    <rect x=${Z(0)} y=${cy - 28} width=${W * s} height="56" fill="#26272b" stroke="#000"/>
    <rect x=${Z(zFar)} y=${cy - 26} width="2" height="52" fill="#2e6b45"><title>Placa-mãe</title></rect>
    <rect x=${Z(zNear)} y=${cy - bh / 2} width=${(zFar - zNear) * s} height=${bh} fill="#9aa0a6" stroke="#000"><title>Cooler</title></rect>
    <rect x=${Z(zNear)} y=${cy - bh / 2} width=${(glass - zNear) * s} height=${bh} fill="url(#hatch)" stroke="#ff8a8a"/>
    <rect x=${Z(glass) - 1} y=${cy - 30} width="2" height="60" fill="#e5484d"><title>Vidro lateral</title></rect>
    <text x=${Z(glass) + 4} y=${cy + 38} font-size="9.5" fill="#ffb3b3" font-family="Roboto, Arial, sans-serif">vidro</text>
    <text x=${Z(zFar) + 4} y=${cy - 32} font-size="9.5" fill="#9fd3b0" text-anchor="end" font-family="Roboto, Arial, sans-serif">placa-mãe</text>
    <text x=${x0 + w - 8} y=${y0 + 14} font-size="11" font-weight="800" fill="#ff8a8a" text-anchor="end" font-family="Roboto, Arial, sans-serif">${dim?.label ?? ''}</text>
  </g>`;
}

/** Régua de 100 mm embaixo, do lado da traseira (dá noção do tamanho real). */
function scaleBar(c: Ctx) {
  const x = 100, y = c.top + 16;
  return svg`<g opacity=".85"><line x1=${x - 100} y1=${y} x2=${x} y2=${y} stroke="currentColor" stroke-width="2"/>
    <line x1=${x - 100} y1=${y - 4} x2=${x - 100} y2=${y + 4} stroke="currentColor" stroke-width="2"/><line x1=${x} y1=${y - 4} x2=${x} y2=${y + 4} stroke="currentColor" stroke-width="2"/>
    <text x=${x + 8} y=${y} font-size="11" font-weight="700" text-anchor="start" dominant-baseline="middle" fill="currentColor" font-family="Roboto, Arial, sans-serif">100 mm</text></g>`;
}

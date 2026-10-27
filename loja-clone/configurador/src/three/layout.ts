/*
 * Geometria ilustrativa da montagem, em mm, sem Three.js (testável e reaproveitada pelo 2D).
 * Eixos do gabinete (torre vista pelo lado da janela):
 *   x: frente (0) → traseira (L) · y: chão (0) → topo (H) · z: painel lateral aberto (0) → bandeja da placa-mãe (W).
 * A placa-mãe fica na parede do fundo (z ≈ W); o que sobe dela (cooler, GPU, RAM) cresce em direção a z = 0.
 */
import { radiatorPlacement } from '../core/fit';
import { ioLayout, type IoLayout } from './rear-io';
import type { Case, Evaluation, FormFactor, RearIo, Selected, Slot } from '../core/types';

export type Vec3 = [number, number, number];

export interface Box {
  /** Identidade estável: mudar a peça muda a chave (dispara a animação de encaixe). */
  key: string;
  slot: Slot | 'case';
  kind: 'part' | 'shell' | 'ghost' | 'excess' | 'limit';
  /** Centro e tamanho em mm. */
  pos: Vec3;
  size: Vec3;
  color: string;
  /** Peça com conflito de encaixe/energia: fica vermelha. */
  conflict?: boolean;
  /** Sobra (`excess`): eixo em que a peça passa do limite (0 = comprimento, 1 = altura, 2 = em direção ao vidro). */
  axis?: 0 | 1 | 2;
  /** Modelo detalhado do 3D (só dados). Ocupa exatamente `size`; sem ele o 3D desenha a caixa. */
  model?: Model;
}

/**
 * Descrição do modelo procedural de cada peça, em coordenadas locais da caixa (origem no canto mínimo, mm).
 * Fica aqui (sem Three.js) porque as posições saem das mesmas medidas do layout.
 */
export type Model =
  /**
   * Gabinete (coordenadas do próprio gabinete). Furos da traseira: I/O da placa-mãe, slots de expansão
   * (os `gpuSlots` de cima ficam sem tampa, a placa de vídeo ocupa), grade da ventoinha traseira e fonte.
   */
  | { type: 'case'; slotTop: number; slots: number; zm: number; frontFans: number[]; rearFan?: [number, number];
      rearMount?: [number, number]; rear: { mm: number; z: number }; ioBox: [number, number, number, number];
      /** Portas do espelho de I/O, da placa-mãe escolhida (null sem placa-mãe). */
      io: IoLayout | null; gpuSlots: number;
      /** Gaiola de discos na frente da fonte: é ela que limita o comprimento da fonte (x0, x1, y0, y1, z0, z1). */
      cage: [number, number, number, number, number, number];
      /** Face da bandeja (z) e da tampa de trás; espaçadores (x, y); passa-cabos e rasgo do EPS (x0, y0, x1, y1); cabos. */
      tray: number; back: number; standoffs: [number, number][]; grommets: [number, number, number, number][];
      epsHole: [number, number, number, number]; cables: Partial<Record<'atx24' | 'eps' | 'pcie', Vec3[]>>; psu: [number, number, number, number]; cpu: [number, number]; moboFront: number }
  /** Componentes saem da face z = 0 (lado do vidro) para z < 0. */
  /** `sock`: modelo do soquete (AM4 com pinos na CPU, AM5 e LGA1700 com placa de pressão). */
  | { type: 'mobo'; socket: [number, number]; sock: SocketKind; dimmX: number[]; pcieY: number; atx24: boolean }
  /** `label`: texto gravado no dissipador do processador (IHS). */
  | { type: 'cpu'; label: string; sock: SocketKind }
  /** `cpu`: centro do processador dentro da caixa do cooler (x, y), onde fica a base. */
  | { type: 'air'; fanMm: number; dual: boolean; low: boolean; cpu: [number, number] }
  /** `tubes`: mangueiras até o radiador, relativas ao canto da bomba (saem da caixa de propósito). */
  | { type: 'pump'; tubes: Vec3[][] }
  /** `axis`: eixo da espessura; `inward`: lado das ventoinhas (+1 ou -1 nesse eixo). */
  | { type: 'radiator'; fans: number; axis: 'x' | 'y'; inward: 1 | -1 }
  | { type: 'ram'; rgb: boolean }
  | { type: 'gpu'; fans: number }
  | { type: 'm2'; label: string }
  | { type: 'sata'; label: string }
  | { type: 'psu'; watts: number };

/** Cota "faltam X mm": linha de `from` a `to`; o rótulo fica colado na parte que sobra (`at`). */
export interface Dimension { key: string; from: Vec3; to: Vec3; label: string; at: Vec3 }

export interface Layout {
  caseSize: Vec3;
  /** Sem gabinete escolhido: o contorno é genérico. */
  ghostCase: boolean;
  boxes: Box[];
  dims: Dimension[];
  /** Região de interesse por slot (para a câmera focar). */
  focus: Partial<Record<Slot, { pos: Vec3; size: Vec3; dir?: Vec3 }>>;
}

const SLOT_MM = 20;
/*
 * Estrutura do gabinete (mm). Os limites do catálogo viram posições físicas:
 * - GPU: do suporte das placas (REAR) até a face de trás das ventoinhas frontais (FRONT).
 * - Cooler: da superfície da placa-mãe (zm) até a face interna do vidro (GLASS).
 * - Fonte: da traseira até a parede da gaiola de discos.
 * Atrás da placa: espaçadores (6,35 mm, padrão ATX), bandeja, espaço de cabos e a tampa de trás.
 */
const REAR = 15;          // da traseira até o suporte das placas (slot bracket)
const FRONT = 30;         // tela (2) + ventoinhas frontais (25) + folga: a GPU para aqui
const GLASS = 3;          // vidro lateral (face interna em z = 3)
const STANDOFF = 6.35;    // espaçadores da placa-mãe
const TRAY_T = 3, CABLES = 22, BACK = 2;   // bandeja, espaço de cabos atrás dela, tampa de trás
const WALL = 3;           // chapa da traseira
const PSU_H = 86, PSU_W = 150, PSU_FLOOR = 4;   // fonte apoiada nos pés de borracha (piso 2 + pés 2)
const GPU_DEPTH = 125;    // "altura" da placa de vídeo, do slot em direção ao painel lateral
const RAD_T = 52;         // radiador (27) + ventoinhas (25)

/** Do teto até a borda de cima da placa-mãe: com suporte a radiador no topo precisa caber radiador + ventoinhas. */
const topClearance = (cs: Case) => (cs.radiatorMounts.top.length ? RAD_T + 6 : 30);

const MOBO: Record<FormFactor, { w: number; h: number; slot: number }> = {
  itx: { w: 170, h: 170, slot: 150 },
  matx: { w: 244, h: 244, slot: 155 },
  atx: { w: 244, h: 305, slot: 155 },
  eatx: { w: 330, h: 305, slot: 155 },
};
const FF_ORDER: FormFactor[] = ['itx', 'matx', 'atx', 'eatx'];

/** Gabinete genérico (mid-tower) usado enquanto nenhum foi escolhido. */
const GHOST_CASE: Case = {
  id: 'ghost', slot: 'case', name: '', brand: '', pricePix: 1,
  formFactors: ['itx', 'matx', 'atx'], maxGpuLengthMm: 360, expansionSlots: 7, maxCoolerHeightMm: 170,
  radiatorMounts: { front: [240, 280, 360], top: [240, 280], rear: [120] }, maxPsuLengthMm: 200,
};

export const COLORS = {
  shell: '#8a8a8a', mobo: '#1f3a2c', cpu: '#c9c9c9', cooler: '#9aa0a6', pump: '#2b2b2b', radiator: '#3b3b3b',
  ram: '#b8141d', cage: '#55575c', gpu: '#2e2e30', gpuAccent: '#e90313', storage: '#4a6fa5', psu: '#262626', excess: '#e5484d',
};

export type SocketKind = 'am4' | 'am5' | 'lga1700';
const sockKind = (socket: string): SocketKind => (socket === 'AM4' ? 'am4' : socket === 'LGA1700' ? 'lga1700' : 'am5');

/** Tamanho do processador (x × y, mm): AM4/AM5 40 × 40; LGA1700 37,5 × 45 (lado comprido na vertical). */
const CPU_SIZE: Record<SocketKind, [number, number]> = { am4: [40, 40], am5: [40, 40], lga1700: [37.5, 45] };

/**
 * Dimensões reais de air cooler (em volta do processador, mm). x = profundidade (frente → traseira),
 * y = largura da ventoinha. Torre simples 120 mm: ~75 de profundidade, ventoinha na frente do bloco de aletas.
 * Torre dupla 140 mm: ~125, ventoinha no meio. Baixo (92 mm): ~95 × 95. A largura não passa do primeiro slot PCIe.
 */
export function airFootprint(h: number, roomBelow: number) {
  if (h < 80) return { x: [-47.5, 47.5], y: 47.5, fanMm: 92, dual: false, low: true };
  if (h >= 165) { const y = Math.min(72.5, roomBelow - 1); return { x: [-62.5, 62.5], y, fanMm: Math.min(140, 2 * y - 4), dual: true, low: false }; }
  return { x: [-50, 25], y: Math.min(62.5, roomBelow - 1), fanMm: 120, dual: false, low: false };
}

/** Radiador: comprimento real = tamanho nominal + tanques (~36 mm). */
const radLength = (r: number) => r + 36;

/** Placa-mãe sem `rearIo` no catálogo: painel básico. */
const BASIC_IO: RearIo = { usb2: 2, usb5: 2, usb10: 0, usbc: 0, hdmi: 1, dp: 0, lanGbps: 1, wifi: false, audio: 3, spdif: false, ps2: false, biosFlashback: false, clearCmos: false };

/** Recorte do I/O da placa-mãe na traseira, em z: do plano da placa (zm) 44 mm em direção ao vidro. */
export const ioZ = (zm: number): [number, number] => [zm - 45, zm - 1];

/**
 * Ventoinha traseira: fica ao lado do recorte do I/O, sem sobrepor, e usa o maior tamanho
 * que cabe até o vidro (120 mm; senão 92 mm). `z` é o centro.
 */
export function rearFanFit(zm: number) {
  const edge = ioZ(zm)[0] - 1, glass = GLASS;   // a moldura pode encostar no vidro; 1 mm de folga do I/O
  const mm = edge - glass >= 120 ? 120 : 92;
  return { mm, z: edge - mm / 2 };
}

/** Caixa a partir de intervalos [min, max] em cada eixo. */
function span(key: string, slot: Box['slot'], kind: Box['kind'], color: string, x: [number, number], y: [number, number], z: [number, number]): Box {
  return {
    key, slot, kind, color,
    pos: [(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2],
    size: [x[1] - x[0], y[1] - y[0], z[1] - z[0]],
  };
}

/**
 * Medidas externas do gabinete a partir dos limites do catálogo (nada de folga inventada):
 * comprimento = GPU máxima + suporte traseiro + zona das ventoinhas frontais (ou a fonte + gaiola, se for maior);
 * altura = folga do teto + maior placa-mãe + fonte embaixo (ou os slots de expansão, se forem mais baixos);
 * largura = vidro + cooler máximo + placa + espaçadores + bandeja + cabos + tampa.
 */
export function caseDims(cs: Case) {
  const big = FF_ORDER.filter(f => cs.formFactors.includes(f)).pop() ?? 'atx';
  const m = MOBO[big];
  const top = topClearance(cs);
  const L = Math.max(cs.maxGpuLengthMm + REAR + FRONT, cs.maxPsuLengthMm + WALL + 106 + FRONT);
  const H = Math.max(top + m.h + 15 + PSU_H + PSU_FLOOR, top + m.slot + cs.expansionSlots * SLOT_MM + 5 + PSU_H + PSU_FLOOR);
  const zm = GLASS + cs.maxCoolerHeightMm;          // superfície da placa-mãe
  const tray = zm + 3 + STANDOFF;                   // face da bandeja
  return { L, H, W: tray + TRAY_T + CABLES + BACK, zm, big, top, tray };
}

export function buildLayout(ev: Pick<Evaluation, 'selected' | 'issues'>): Layout {
  const s: Selected = ev.selected;
  const cs = s.case ?? GHOST_CASE;
  const ghostCase = !s.case;
  const { L, H, W, zm, big, top, tray } = caseDims(cs);
  const psuZ = (GLASS + W - BACK) / 2;   // fonte e gaiola centradas entre o vidro e a tampa de trás
  const boxes: Box[] = [];
  const dims: Dimension[] = [];
  const focus: Layout['focus'] = {};
  // Vermelha só a peça "culpada" (primeiro slot do conflito); o gabinete e o radiador frontal não.
  const conflict = (slot: Slot) => ev.issues.some(i => (i.severity === 'nofit' || i.severity === 'power') && i.slots[0] === slot);
  const add = (b: Box) => { boxes.push(b); return b; };
  const setFocus = (slot: Slot, b: Box) => { if (!focus[slot]) focus[slot] = { pos: b.pos, size: b.size }; };

  // Gabinete: piso, bandeja do fundo e traseira (o resto é só contorno).
  const caseKey = `case:${cs.id}`;
  add(span(`${caseKey}:floor`, 'case', ghostCase ? 'ghost' : 'shell', COLORS.shell, [0, L], [0, 2], [0, W]));
  add(span(`${caseKey}:tray`, 'case', ghostCase ? 'ghost' : 'shell', COLORS.shell, [0, L], [0, H], [tray, tray + TRAY_T]));
  add(span(`${caseKey}:rear`, 'case', ghostCase ? 'ghost' : 'shell', COLORS.shell, [L - WALL, L], [0, H], [0, W]));
  focus.case = { pos: [L / 2, H / 2, W / 2], size: [L, H, W] };

  // Placa-mãe: borda traseira no suporte das placas, borda de cima a TOP do teto.
  const ff = s.mobo?.formFactor ?? big;
  const m = MOBO[ff];
  const mRear = L - REAR, mTop = H - top;
  const cpuX = mRear - 85, cpuY = mTop - 85;
  const slotTop = mTop - m.slot;
  const slotBottom = slotTop - cs.expansionSlots * SLOT_MM;
  const ramX = (i: number) => cpuX - 70 - i * 9;

  const mobo = add(span(s.mobo ? `mobo:${s.mobo.id}` : 'mobo:ghost', 'mobo', s.mobo ? 'part' : 'ghost', COLORS.mobo,
    [mRear - m.w, mRear], [mTop - m.h, mTop], [zm, zm + 3]));
  if (s.mobo) {
    const x0 = mRear - m.w, y0 = mTop - m.h;
    mobo.model = { type: 'mobo', socket: [cpuX - x0, cpuY - y0], sock: sockKind(s.mobo.socket), dimmX: Array.from({ length: s.mobo.memSlots }, (_, i) => ramX(i) - x0),
      pcieY: slotTop - y0, atx24: ff !== 'itx' };
  }
  setFocus('mobo', mobo);

  // Gaiola de discos na frente da fonte (a fonte não passa dela: é o limite de comprimento do gabinete).
  const psuLimitX = L - WALL - cs.maxPsuLengthMm;
  const cage: [number, number, number, number, number, number] = [psuLimitX - 106, psuLimitX, 2, PSU_FLOOR + 56, psuZ - PSU_W / 2, psuZ + PSU_W / 2];
  add(span(`${caseKey}:cage`, 'case', ghostCase ? 'ghost' : 'shell', COLORS.cage, [cage[0], cage[1]], [cage[2], cage[3]], [cage[4], cage[5]]));

  if (!ghostCase) {
    const radPos = s.cooler?.kind === 'aio' ? radiatorPlacement(cs, s.cooler.radiatorMm ?? 240) : null;
    // Ventoinhas de fábrica: 120 mm na frente (de cima para baixo) e uma traseira, se o gabinete tiver o suporte e o radiador não ocupar o lugar.
    const frontFans = radPos === 'front' ? [] : Array.from({ length: Math.min(3, Math.floor((H - 50) / 125)) }, (_, i) => H - 30 - 60 - i * 125);
    const rearMount: [number, number] | undefined = cs.radiatorMounts.rear.includes(120) ? [mTop - 125, mTop - 5] : undefined;
    const rearFan = radPos !== 'rear' ? rearMount : undefined;
    // Passa-cabos da bandeja (na frente da maior placa aceita): um na altura do conector de 24 pinos e um embaixo,
    // mais o rasgo em cima da placa para o cabo do processador (EPS).
    const moboFront = mRear - MOBO[big].w, gx = moboFront - 26;
    const grommets: [number, number, number, number][] = gx - 11 > FRONT
      ? [[gx - 11, cpuY - 40, gx + 11, cpuY + 40], [gx - 11, mTop - MOBO[big].h + 20, gx + 11, mTop - MOBO[big].h + 80]] : [];
    const epsX = cpuX - 47.5, epsHole: [number, number, number, number] = [epsX - 22, mTop + 6, epsX + 22, Math.min(mTop + 20, H - 8)];
    // Espaçadores atrás da placa-mãe (furação da placa escolhida, ou da maior aceita).
    const sm = MOBO[ff], sx0 = mRear - sm.w, sy0 = mTop - sm.h;
    const standoffs: [number, number][] = ff === 'itx'
      ? [[sx0 + 10, sy0 + 10], [mRear - 10, sy0 + 10], [sx0 + 10, mTop - 10], [mRear - 10, mTop - 10]]
      : [sx0 + 6.35, sx0 + sm.w / 2, mRear - 6.35].flatMap(x => [sy0 + 6.35, sy0 + sm.h / 2, mTop - 6.35].map(y => [x, y] as [number, number]));
    // Cabos (com fonte): 24 pinos saindo do passa-cabos, EPS descendo do rasgo de cima, PCIe subindo até a GPU pelo lado do vidro.
    const cables: Partial<Record<'atx24' | 'eps' | 'pcie', Vec3[]>> = {};
    if (s.psu && s.mobo && ff !== 'itx' && grommets.length) cables.atx24 = [[gx, cpuY, tray], [gx, cpuY, zm - 10], [mRear - sm.w + 4, cpuY, zm - 7]];
    if (s.psu && s.mobo) cables.eps = [[epsX, epsHole[1] + 7, tray], [epsX, epsHole[1] + 7, zm - 12], [epsX, mTop - 6, zm - 6]];
    if (s.psu && s.gpu) {
      const gx0 = mRear - s.gpu.lengthMm, xc = gx0 + (s.gpu.lengthMm - 3) * 0.62 + 11, gz0 = zm - GPU_DEPTH - 5;
      cables.pcie = [[xc, PSU_FLOOR + PSU_H + 6, GLASS + 26], [xc, slotTop - 30, GLASS + 26], [xc, slotTop - 9, gz0 - 1]];
    }
    add({ ...span(`${caseKey}:body`, 'case', 'shell', COLORS.shell, [0, L], [0, H], [0, W]),
      model: { type: 'case', slotTop, slots: cs.expansionSlots, zm, frontFans, rearFan, rearMount, rear: rearFanFit(zm),
        tray, back: W - BACK, standoffs, grommets, epsHole, cables,
        ioBox: [ioZ(zm)[0], slotTop + 8, ioZ(zm)[1], slotTop + 150], io: s.mobo ? ioLayout(s.mobo.rearIo ?? BASIC_IO) : null,
        gpuSlots: s.gpu ? Math.min(Math.ceil(s.gpu.slotWidth), cs.expansionSlots) : 0,
        psu: [PSU_FLOOR, PSU_FLOOR + PSU_H, psuZ - PSU_W / 2, psuZ + PSU_W / 2], cpu: [cpuX, cpuY], moboFront, cage } });
  }

  if (s.cpu) {
    const sock = sockKind(s.cpu.socket), [cw, ch] = CPU_SIZE[sock];
    setFocus('cpu', add({ ...span(`cpu:${s.cpu.id}`, 'cpu', 'part', COLORS.cpu, [cpuX - cw / 2, cpuX + cw / 2], [cpuY - ch / 2, cpuY + ch / 2], [zm - 6, zm]),
      model: { type: 'cpu', label: cpuLabel(s.cpu.name), sock } }));
  }

  if (s.cooler) {
    const c = s.cooler, k = `cooler:${c.id}`, bad = conflict('cooler');
    if (c.kind === 'air') {
      const h = c.heightMm ?? 150;
      const f = airFootprint(h, cpuY - slotTop);
      const xs: [number, number] = [cpuX + f.x[0], cpuX + f.x[1]], ys: [number, number] = [cpuY - f.y, cpuY + f.y];
      const model: Model = { type: 'air', fanMm: f.fanMm, dual: f.dual, low: f.low, cpu: [-f.x[0], f.y] };
      const b = add({ ...span(k, 'cooler', 'part', COLORS.cooler, xs, ys, [zm - h, zm]), conflict: bad, model });
      setFocus('cooler', b);
      if (h > cs.maxCoolerHeightMm) {
        // A sobra é só a fatia que passa do vidro; o vidro vira um plano vermelho para mostrar onde ele bate.
        add({ ...span(`${k}:excess`, 'cooler', 'excess', COLORS.excess, xs, ys, [zm - h, GLASS]), axis: 2 });
        add(span(`${k}:limit`, 'cooler', 'limit', COLORS.excess, [xs[0] - 10, xs[1] + 10], [ys[0] - 10, ys[1] + 10], [GLASS - 0.6, GLASS + 0.6]));
        dims.push({ key: `${k}:dim`, from: [xs[1] + 8, ys[1] + 5, GLASS], to: [xs[1] + 8, ys[1] + 5, zm - h], label: `faltam ${h - cs.maxCoolerHeightMm} mm`,
          at: [(xs[0] + xs[1]) / 2, ys[1] - 12, zm - h] });
        // A câmera olha de frente/de lado (não pelo vidro), para a sobra em profundidade aparecer com o tamanho real.
        focus.cooler = { pos: b.pos, size: b.size, dir: [-1, 0.5, -0.45] };
      }
    } else {
      const pump = add({ ...span(`${k}:pump`, 'cooler', 'part', COLORS.pump, [cpuX - 33, cpuX + 33], [cpuY - 33, cpuY + 33], [zm - 51, zm - 6]), conflict: bad });
      setFocus('cooler', pump);
      const r = c.radiatorMm ?? 240;
      const pos = radiatorPlacement(cs, r);
      const zc = zm / 2, len = radLength(r);
      const rad = pos === 'top'
        // No topo: radiador + ventoinhas (52 mm) entre o teto e a borda de cima da placa-mãe.
        ? span(`${k}:rad`, 'cooler', 'part', COLORS.radiator, [L - 30 - len, L - 30], [H - 3 - RAD_T, H - 3], [zc - 60, zc + 60])
        : pos === 'front'
          ? span(`${k}:rad`, 'cooler', 'part', COLORS.radiator, [frontRadX(cs, L) - RAD_T, frontRadX(cs, L)], [H - 30 - len, H - 30], [zc - 60, zc + 60])
          : pos === 'rear'
            ? span(`${k}:rad`, 'cooler', 'part', COLORS.radiator, [L - 4 - RAD_T, L - 4], [mTop - 65 - len / 2, mTop - 65 + len / 2], [rearFanFit(zm).z - 60, rearFanFit(zm).z + 60])
            // Sem suporte: o radiador fica do lado de fora, em cima do gabinete.
            : span(`${k}:rad`, 'cooler', 'part', COLORS.radiator, [L / 2 - len / 2, L / 2 + len / 2], [H + 20, H + 47], [zc - 60, zc + 60]);
      const fans = Math.round(r / 120);
      rad.model = pos === 'front' ? { type: 'radiator', fans, axis: 'x', inward: 1 }
        : pos === 'rear' ? { type: 'radiator', fans: 1, axis: 'x', inward: -1 }
          : { type: 'radiator', fans, axis: 'y', inward: -1 };
      add({ ...rad, conflict: !pos || bad });
      if (!pos) add({ ...rad, key: `${k}:excess`, kind: 'excess', color: COLORS.excess, model: undefined });
      pump.model = { type: 'pump', tubes: tubes(pump, rad, pos, mTop) };
      focus.cooler = { pos: rad.pos, size: rad.size };
    }
  }

  if (s.ram) {
    const r = s.ram;
    for (let i = 0; i < r.modules; i++) {
      const x = ramX(i);
      const b = add({ ...span(`ram:${r.id}:${i}`, 'ram', 'part', COLORS.ram, [x - 3.5, x + 3.5], [cpuY + 5 - 66.5, cpuY + 5 + 66.5], [zm - r.heightMm, zm]),
        model: { type: 'ram', rgb: /rgb/i.test(r.name) } });
      if (i === 0) setFocus('ram', b);
    }
  }

  if (s.gpu) {
    const g = s.gpu, k = `gpu:${g.id}`;
    const t = g.slotWidth * SLOT_MM;
    const b = add({ ...span(k, 'gpu', 'part', COLORS.gpu, [mRear - g.lengthMm, mRear], [slotTop - t, slotTop], [zm - GPU_DEPTH - 5, zm - 5]),
      conflict: conflict('gpu'), model: { type: 'gpu', fans: g.lengthMm > 270 ? 3 : 2 } });
    setFocus('gpu', b);
    const front = s.cooler?.kind === 'aio' && s.cooler.radiatorMm && radiatorPlacement(cs, s.cooler.radiatorMm) === 'front';
    const max = front ? cs.maxGpuLengthFrontRadMm ?? cs.maxGpuLengthMm : cs.maxGpuLengthMm;
    const limitX = mRear - max;
    if (g.lengthMm > max) {
      add({ ...span(`${k}:excess`, 'gpu', 'excess', COLORS.excess, [mRear - g.lengthMm, limitX], [slotTop - t, slotTop], [zm - GPU_DEPTH - 5, zm - 5]), axis: 0 });
      add(span(`${k}:limit`, 'gpu', 'limit', COLORS.excess, [limitX - 1, limitX + 1], [slotTop - t - 20, slotTop + 20], [zm - GPU_DEPTH - 25, zm]));
      dims.push({ key: `${k}:dim`, from: [limitX, slotTop + 12, zm - GPU_DEPTH - 5], to: [mRear - g.lengthMm, slotTop + 12, zm - GPU_DEPTH - 5], label: `faltam ${g.lengthMm - max} mm`,
        at: [(mRear - g.lengthMm + limitX) / 2, slotTop - t / 2, zm - GPU_DEPTH - 6] });
    }
    if (t > cs.expansionSlots * SLOT_MM) {
      add({ ...span(`${k}:excess-slots`, 'gpu', 'excess', COLORS.excess, [mRear - g.lengthMm, mRear], [slotTop - t, slotBottom], [zm - GPU_DEPTH - 5, zm - 5]), axis: 1 });
    }
  }

  if (s.storage) {
    const st = s.storage, k = `storage:${st.id}`;
    const b = st.interface === 'sata'
      // SSD de 2,5" em cima da gaiola de discos.
      ? span(k, 'storage', 'part', COLORS.storage, [cage[0] + 3, cage[0] + 103], [cage[3], cage[3] + 7], [zm - 110, zm - 40])
      : ff === 'itx'   // no ITX o M.2 fica atrás da placa
        ? span(k, 'storage', 'part', COLORS.storage, [cpuX - 40, cpuX + 40], [mTop - m.h + 20, mTop - m.h + 42], [zm + 3, zm + 7])
        : span(k, 'storage', 'part', COLORS.storage, [mRear - 160, mRear - 80], [slotTop - 51, slotTop - 29], [zm - 4, zm]);
    const label = st.capacityGb >= 1000 ? `${st.capacityGb / 1000}TB` : `${st.capacityGb}GB`;
    setFocus('storage', add({ ...b, model: { type: st.interface === 'sata' ? 'sata' : 'm2', label } }));
  }

  if (s.psu) {
    const p = s.psu, k = `psu:${p.id}`;
    const zc = psuZ;
    const b = add({ ...span(k, 'psu', 'part', COLORS.psu, [L - WALL - p.lengthMm, L - WALL], [PSU_FLOOR, PSU_FLOOR + PSU_H], [zc - PSU_W / 2, zc + PSU_W / 2]),
      conflict: conflict('psu'), model: { type: 'psu', watts: p.wattage } });
    setFocus('psu', b);
    const limitX = L - WALL - cs.maxPsuLengthMm;
    if (p.lengthMm > cs.maxPsuLengthMm) {
      add({ ...span(`${k}:excess`, 'psu', 'excess', COLORS.excess, [L - WALL - p.lengthMm, limitX], [PSU_FLOOR, PSU_FLOOR + PSU_H], [zc - PSU_W / 2, zc + PSU_W / 2]), axis: 0 });
      dims.push({ key: `${k}:dim`, from: [limitX, PSU_FLOOR + PSU_H / 2, zc - PSU_W / 2 - 1], to: [L - WALL - p.lengthMm, PSU_FLOOR + PSU_H / 2, zc - PSU_W / 2 - 1], label: `faltam ${p.lengthMm - cs.maxPsuLengthMm} mm`,
        at: [(L - WALL - p.lengthMm + limitX) / 2, PSU_FLOOR + PSU_H / 2, zc - PSU_W / 2 - 1] });
    }
  }

  return { caseSize: [L, H, W], ghostCase, boxes, dims, focus };
}

/** "Processador Exemplo R5 7600, 6-Core…" → "R5 7600". */
const cpuLabel = (name: string) => name.replace(/^Processador\s+(Exemplo\s+)?/i, '').split(',')[0].trim();

/**
 * Mangueiras da bomba até o radiador (pontos relativos ao canto mínimo da bomba).
 * Sobem por cima da memória (acima da placa-mãe) para não atravessar outras peças.
 */
function tubes(pump: Box, rad: Box, pos: ReturnType<typeof radiatorPlacement>, mTop: number): Vec3[][] {
  const p0: Vec3 = [pump.pos[0] - pump.size[0] / 2, pump.pos[1] - pump.size[1] / 2, pump.pos[2] - pump.size[2] / 2];
  const rel = (v: Vec3): Vec3 => [v[0] - p0[0], v[1] - p0[1], v[2] - p0[2]];
  const [px, , pz] = pump.pos, top = pump.pos[1] + pump.size[1] / 2;
  const [rx, ry, rz] = rad.pos, [rl, rh] = rad.size;
  return [-1, 1].map(side => {
    const z = pz + side * 8, o = side * 11;
    const start: Vec3 = [px + o, top - 4, z];
    if (pos === 'rear') {
      const fx = rx - rl / 2;
      return ([start, [px + o, top + 18, z], [fx - 20, ry + o, rz + side * 20], [fx, ry + o, rz + side * 20]] as Vec3[]).map(rel);
    }
    if (pos === 'front') {
      const ex = rx + rl / 2, ey = ry + rh / 2 - 30 + side * 12;
      return ([start, [px + o, mTop + 6, z], [ex + 60, mTop + 6 + side * 4, rz + side * 20], [ex, ey, rz + side * 20]] as Vec3[]).map(rel);
    }
    // Em cima (ou fora, sem suporte): sobe direto até a face de baixo do radiador.
    const by = ry - rh / 2;
    return ([start, [px + o, (top + by) / 2, z], [px + o, by, rz + side * 20]] as Vec3[]).map(rel);
  });
}

/** Face traseira do radiador frontal = limite da GPU com radiador na frente. */
function frontRadX(cs: Case, L: number) {
  return L - REAR - (cs.maxGpuLengthFrontRadMm ?? cs.maxGpuLengthMm - 30);
}

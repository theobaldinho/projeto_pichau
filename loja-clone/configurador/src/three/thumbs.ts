/*
 * Só para desenvolvimento (`npm run thumbs`): renderiza as miniaturas das peças e as fotos dos PCs montados
 * a partir dos mesmos modelos do 3D. Fica fora do build da biblioteca.
 */
import { Box3, Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import data from '../../data/catalog.json';
import { evaluate, type Build, type Catalog, type Cooler, type Part, type Slot } from '../core';
import { buildLayout, type Box } from './layout';
import { buildModel, studio } from './models';

const catalog = data as unknown as Catalog;

/**
 * PCs prontos da loja (PCs Gamers): cada um é uma build do catálogo do configurador, validada aqui
 * (sem conflito nem aviso). O script grava a foto (render) e os dados que a loja usa nos cards.
 */
export const PCS: { name: string; build: Build; off?: number }[] = [
  { name: 'Hestia', build: { cpu: 'cpu-r5-am5', cooler: 'cooler-air-155', mobo: 'mobo-b650m', ram: 'ram-16-ddr5', gpu: 'gpu-8gb-240', storage: 'ssd-500-nvme', case: 'case-matx', psu: 'psu-550' }, off: 17 },
  { name: 'Orion', build: { cpu: 'cpu-r5-am4', cooler: 'cooler-air-155', mobo: 'mobo-b550', ram: 'ram-16-ddr4', gpu: 'gpu-12gb-305', storage: 'ssd-1tb-nvme', case: 'case-mid', psu: 'psu-750' } },
  { name: 'Atlas', build: { cpu: 'cpu-r7-am4', cooler: 'cooler-air-165', mobo: 'mobo-b550', ram: 'ram-32-ddr4', gpu: 'gpu-16gb-285', storage: 'ssd-1tb-nvme', case: 'case-mid', psu: 'psu-750' }, off: 20 },
  { name: 'Nova', build: { cpu: 'cpu-c5-1700', cooler: 'cooler-air-155', mobo: 'mobo-b660m-ddr4', ram: 'ram-16-ddr4', gpu: 'gpu-8gb-240', storage: 'ssd-500-nvme', case: 'case-matx', psu: 'psu-550' } },
  { name: 'Krypto', build: { cpu: 'cpu-r7-am5', cooler: 'cooler-aio-240', mobo: 'mobo-x670e', ram: 'ram-32-ddr5', gpu: 'gpu-12gb-305', storage: 'ssd-1tb-nvme', case: 'case-mid', psu: 'psu-750' }, off: 15 },
  { name: 'Juno', build: { cpu: 'cpu-r5-am5', cooler: 'cooler-aio-240', mobo: 'mobo-b650i', ram: 'ram-16-ddr5', gpu: 'gpu-16gb-285', storage: 'ssd-500-nvme', case: 'case-itx', psu: 'psu-750' } },
  { name: 'Vega', build: { cpu: 'cpu-c7-1700', cooler: 'cooler-aio-360', mobo: 'mobo-z790', ram: 'ram-32-ddr5', gpu: 'gpu-16gb-340', storage: 'ssd-2tb-nvme', case: 'case-full', psu: 'psu-1000' }, off: 22 },
  { name: 'Titan', build: { cpu: 'cpu-r9-am5', cooler: 'cooler-aio-360', mobo: 'mobo-x670e', ram: 'ram-64-ddr5-4x', gpu: 'gpu-24gb-357', storage: 'ssd-2tb-nvme', case: 'case-full', psu: 'psu-1000' } },
];

/** Montagem e teste (somada ao preço das peças no PIX). */
const ASSEMBLY_PIX = 19990;

/** De onde a câmera olha cada peça (a GPU por baixo, para mostrar as ventoinhas). */
const VIEW: Partial<Record<Slot | 'pc', [number, number, number]>> = {
  gpu: [-0.45, -0.55, -1], psu: [-0.5, 0.45, -1], ram: [-1, 0.35, -0.55], cpu: [-0.3, 0.3, -1], pc: [-0.5, 0.3, -1],
};

const SIZE = 512;
const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(SIZE, SIZE);
renderer.setClearColor(0x000000, 0);
const scene = new Scene();
studio(scene, renderer);
const camera = new PerspectiveCamera(28, 1, 1, 20000);

/** `radius`: fixo por tipo de peça, para a GPU de 357 mm aparecer maior que a de 240 mm. */
function shoot(boxes: Box[], view: [number, number, number], radius?: number): string {
  const group = new Group();
  for (const b of boxes) {
    const g = buildModel(b.model!, b.size);
    g.position.set(...b.pos);
    group.add(g);
  }
  scene.add(group);
  const bb = new Box3().setFromObject(group);
  const center = bb.getCenter(new Vector3()), r = radius ?? bb.getSize(new Vector3()).length() / 2;
  const dir = new Vector3(...view).normalize();
  const dist = (r / Math.sin((camera.fov * Math.PI) / 360)) * 0.92;
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/webp', 0.86);
  scene.remove(group);
  group.traverse(o => (o as { geometry?: { dispose(): void } }).geometry?.dispose());
  return url;
}

/** id da peça → dataURL WebP. Peças sem modelo (extras) ficam de fora. */
export function renderParts(): Record<string, string> {
  const shots = catalog.parts.filter(p => p.slot !== 'extras').map(p => {
    const l = buildLayout({ selected: { [p.slot]: p }, issues: [] });
    const boxes = l.boxes.filter(b => b.model && b.slot === p.slot);
    return { p, boxes, r: boxes.length ? radiusOf(boxes) : 0 };
  }).filter(s => s.boxes.length);
  // A maior peça de cada grupo ocupa o quadro; as outras aparecem proporcionais (air cooler e AIO em grupos separados).
  const group = (p: Part) => p.slot === 'cooler' ? `cooler-${(p as Cooler).kind}` : p.slot;
  const maxR = new Map<string, number>();
  for (const s of shots) maxR.set(group(s.p), Math.max(maxR.get(group(s.p)) ?? 0, s.r));
  const out: Record<string, string> = {};
  for (const s of shots) out[s.p.id] = shoot(s.boxes, VIEW[s.p.slot as Slot] ?? [-0.55, 0.42, -1], maxR.get(group(s.p)));
  return out;
}

function radiusOf(boxes: Box[]) {
  const bb = new Box3();
  for (const b of boxes) for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1])
    bb.expandByPoint(new Vector3(b.pos[0] + sx * b.size[0] / 2, b.pos[1] + sy * b.size[1] / 2, b.pos[2] + sz * b.size[2] / 2));
  return bb.getSize(new Vector3()).length() / 2;
}

/** Foto + dados de cada PC pronto. Falha se alguma build tiver conflito ou aviso (não pode ir para a loja). */
export function renderPcs() {
  return PCS.map(({ name, build, off }, i) => {
    const ev = evaluate(catalog, build);
    if (!ev.canBuy || ev.issues.length) throw new Error(`PC ${name}: ${ev.blockers.concat(ev.issues.map(x => x.message)).join('; ')}`);
    const s = ev.selected;
    const cpu = s.cpu!.name.replace(/^Processador Exemplo /, '').split(',')[0];
    const vram = s.gpu!.name.match(/(\d+)GB/)?.[1];
    const ssd = s.storage!.capacityGb >= 1000 ? `${s.storage!.capacityGb / 1000}TB` : `${s.storage!.capacityGb}GB`;
    return {
      img: shoot(buildLayout(ev).boxes.filter(b => b.model), VIEW.pc!),
      data: {
        id: `pc-${i + 1}`, name, build, off: off ?? 0, pix: ev.totals.pix + ASSEMBLY_PIX,
        cpuBrand: s.cpu!.socket === 'LGA1700' ? 'Intel' : 'AMD', socket: s.cpu!.socket, vramGb: Number(vram), ramGb: s.ram!.capacityGb, memType: s.ram!.memType,
        specs: [cpu, `GPU ${vram}GB`, `${s.ram!.capacityGb}GB ${s.ram!.memType}`, `SSD ${ssd}`],
        parts: Object.values(s).map(p => p!.name),
      },
    };
  });
}

Object.assign(window, { renderParts, renderPcs });

import { Vector3, type Group } from 'three';
import { describe, expect, it } from 'vitest';
import { evaluate, type Slot } from '../src/core';
import { buildLayout, type Box } from '../src/three/layout';
import { buildModel } from '../src/three/models';
import { FOCUS_DIR, focusDistance, occluders } from '../src/three/occlusion';
import { buildOf, catalog } from './helpers';

/** Monta as peças do layout (coordenadas do gabinete) e diz quem tampa `slot` vista da câmera de foco. */
function blockers(ids: string[], slot: Slot) {
  const l = buildLayout(evaluate(catalog, buildOf(...ids)));
  const objs = l.boxes.filter(b => b.kind === 'part' && b.model).map(b => {
    const g = buildModel(b.model!, b.size);
    g.position.set(...b.pos);
    g.updateMatrixWorld(true);
    return { b, g };
  });
  const f = l.focus[slot]!;
  const cam = new Vector3(...f.pos).addScaledVector(FOCUS_DIR, focusDistance(f.size));
  const targets = objs.filter(o => o.b.slot === slot).map(o => o.g);
  const others = objs.filter(o => o.b.slot !== slot);
  const hit = occluders(cam, targets, others.map(o => o.g));
  return [...new Set(others.filter(o => hit.has(o.g as Group)).map((o: { b: Box }) => o.b.slot))].sort();
}

const MID = ['cpu-r5-am5', 'cooler-air-155', 'mobo-x670e', 'ram-32-ddr5', 'gpu-12gb-305', 'ssd-1tb-nvme', 'case-mid', 'psu-750'];

describe('peça em foco', () => {
  it('processador escolhido depois do cooler: o cooler fica transparente', () => expect(blockers(MID, 'cpu')).toContain('cooler'));
  it('SSD M.2 embaixo da placa de vídeo: a placa de vídeo fica transparente', () => expect(blockers(MID, 'storage')).toContain('gpu'));
  it('torre simples de 120 mm (75 mm de profundidade) não tampa a placa de vídeo', () => expect(blockers(MID, 'gpu')).toEqual([]));
  it('vista do lado do vidro, a placa-mãe (no fundo) nunca tampa nada', () => {
    for (const s of ['cpu', 'ram', 'gpu', 'storage', 'cooler', 'psu'] as Slot[]) expect(blockers(MID, s), s).not.toContain('mobo');
  });
  it('peça sem nada na frente não apaga ninguém', () => {
    for (const s of ['cooler', 'psu', 'ram'] as Slot[]) expect(blockers(MID, s), s).toEqual([]);
  });
  it('cooler baixo não tampa a placa de vídeo', () =>
    expect(blockers(['cpu-c5-1700', 'cooler-air-lp', 'mobo-b660m-ddr4', 'ram-16-ddr4', 'gpu-8gb-240', 'ssd-2tb-nvme', 'case-matx', 'psu-550'], 'gpu')).toEqual([]));

  it('girando para a frente do gabinete, só o painel da frente apaga (o vidro nunca conta)', () => {
    const l = buildLayout(evaluate(catalog, buildOf(...MID)));
    const caseBox = l.boxes.find(b => b.slot === 'case' && b.model)!;
    const cs = buildModel(caseBox.model!, caseBox.size);
    cs.position.set(...caseBox.pos);
    cs.updateMatrixWorld(true);
    const ssd = l.boxes.find(b => b.slot === 'storage')!;
    const g = buildModel(ssd.model!, ssd.size);
    g.position.set(...ssd.pos);
    g.updateMatrixWorld(true);
    const panels = cs.children.filter(c => c.userData.section !== 'glass');
    const front = new Vector3(...ssd.pos).add(new Vector3(-600, 60, -60));
    expect([...occluders(front, [g], panels)].map(o => o.userData.section)).toEqual(['front']);
    const glassSide = new Vector3(...ssd.pos).addScaledVector(FOCUS_DIR, focusDistance(ssd.size));
    expect([...occluders(glassSide, [g], cs.children)].map(o => o.userData.section)).toEqual([]);
  });

  it('olhando por trás: tampa e placa-mãe apagam (o processador aparece pelo recorte da bandeja); na frente da GPU a bandeja também', () => {
    const l = buildLayout(evaluate(catalog, buildOf(...MID)));
    const at = (b: Box) => { const g = buildModel(b.model!, b.size); g.position.set(...b.pos); g.updateMatrixWorld(true); return g; };
    const cs = at(l.boxes.find(b => b.slot === 'case' && b.model)!);
    const cpu = l.boxes.find(b => b.slot === 'cpu')!, mobo = at(l.boxes.find(b => b.slot === 'mobo')!);
    const behind = new Vector3(...cpu.pos).add(new Vector3(120, 80, 520));
    const hit = occluders(behind, [at(cpu)], [mobo, ...cs.children]);
    expect(hit.has(mobo)).toBe(true);
    // A tampa de trás apaga; a bandeja não (o processador aparece pelo recorte dela).
    expect([...hit].map(o => o.userData.section).filter(Boolean)).toEqual(['back']);
    const gpu = l.boxes.find(b => b.slot === 'gpu')!;
    const behindGpu = new Vector3(...gpu.pos).add(new Vector3(60, 60, 560));
    expect([...occluders(behindGpu, [at(gpu)], cs.children)].map(o => o.userData.section)).toContain('tray');
  });
});

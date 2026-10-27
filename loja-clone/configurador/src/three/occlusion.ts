/*
 * Quem tampa a peça em foco: raios da câmera até o centro e os cantos da peça; o que for atingido antes dela
 * fica transparente na cena. Sem DOM, então também roda nos testes.
 */
import { Box3, Raycaster, Vector3, type Object3D } from 'three';

/** Direção (a partir da peça) de onde a câmera olha quando foca uma peça. */
export const FOCUS_DIR = new Vector3(-0.42, 0.38, -1).normalize();

/** Distância da câmera à peça focada, pelo maior lado da região de foco (mm). */
export const focusDistance = (size: number[]) => Math.min(Math.max(Math.max(...size) * 2.6, 380), 1400);

const ray = new Raycaster();
/** Folga (mm): o que só encosta na peça não conta como estar na frente dela. */
const MARGIN = 3;
const box = new Box3(), size = new Vector3(), center = new Vector3(), dir = new Vector3(), hitPoint = new Vector3();

/**
 * Objetos de `others` que ficam entre a câmera e `targets` (coordenadas de mundo).
 * Conta como "tampando" quem bloqueia o centro ou pelo menos `minRays` dos 9 raios de alguma peça:
 * encostar num cantinho não apaga a peça vizinha (e não pisca ao girar).
 */
export function occluders(camera: Vector3, targets: Object3D[], others: Object3D[], minRays = 3): Set<Object3D> {
  const hit = new Set<Object3D>();
  if (!targets.length || !others.length) return hit;
  const boxes = new Map(others.map(o => [o, new Box3().setFromObject(o)]));
  for (const t of targets) {
    box.setFromObject(t);
    box.getCenter(center);
    box.getSize(size).multiplyScalar(0.4);
    const points = [center.clone()];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1])
      points.push(center.clone().add(new Vector3(sx * size.x, sy * size.y, sz * size.z)));
    const count = new Map<Object3D, number>();
    points.forEach((p, i) => {
      dir.copy(p).sub(camera);
      const dist = dir.length();
      ray.set(camera, dir.normalize());
      // O slot em volta do pente, por exemplo, só encosta nele.
      ray.far = dist - MARGIN;
      for (const o of others) {
        if (hit.has(o)) continue;
        // Filtro barato pela caixa envolvente antes de testar os triângulos.
        const b = boxes.get(o)!;
        if (!ray.ray.intersectBox(b, hitPoint) || hitPoint.distanceTo(camera) > ray.far) continue;
        if (!ray.intersectObject(o, true).length) continue;
        const n = (count.get(o) ?? 0) + 1;
        count.set(o, n);
        if (i === 0 || n >= minRays) hit.add(o);
      }
    });
  }
  return hit;
}

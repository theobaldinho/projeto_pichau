/*
 * Modelos procedurais das peças (Three.js), construídos já no tamanho real em mm.
 * Regra: cada modelo ocupa exatamente a caixa do layout (`test/models.test.ts`), então encaixe e "faltam X mm"
 * continuam exatos. Exceções declaradas: componentes da placa-mãe saem da face z = 0 e as mangueiras do AIO
 * (filhos com `userData.extra`).
 * Cada peça vira poucas malhas: as geometrias são unidas por material.
 */
import {
  BoxGeometry, BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, CylinderGeometry, DirectionalLight, ExtrudeGeometry,
  Group, HemisphereLight, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Path, PMREMGenerator, RepeatWrapping, SRGBColorSpace, Scene, Shape,
  TubeGeometry, Vector3, type Material, type WebGLRenderer,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Model, SocketKind, Vec3 } from './layout';
import { IO_H, IO_W, PORT_SIZE, type IoLayout } from './rear-io';

type Axis = 'x' | 'y' | 'z';
const hasDom = typeof document !== 'undefined';

/* ---------- materiais ---------- */

const std = (color: string, roughness: number, metalness: number, extra: Partial<MeshStandardMaterial> = {}) =>
  Object.assign(new MeshStandardMaterial({ color, roughness, metalness }), extra);

let palette: ReturnType<typeof makePalette> | undefined;
function makePalette() {
  return {
    frame: std('#1d1e21', 0.5, 0.6),
    inner: std('#2a2b2f', 0.7, 0.3),
    mesh: std('#141416', 0.8, 0.2, hasDom ? { map: meshTexture() } : {}),
    glass: std('#a9c4d6', 0.05, 0.1, { transparent: true, opacity: 0.09, depthWrite: false }),
    metal: std('#c3c7cc', 0.3, 0.9),
    alu: std('#5d6268', 0.4, 0.8),
    black: std('#151517', 0.55, 0.3),
    plastic: std('#2f3033', 0.6, 0.05),
    latch: std('#8d9096', 0.5, 0.1),
    pcb: std('#17301f', 0.65, 0.15),
    pcbDark: std('#101113', 0.65, 0.15),
    copper: std('#b9733f', 0.35, 0.95),
    fin: std('#b8bcc1', 0.35, 0.85),
    blade: std('#1b1b1d', 0.6, 0.05),
    rgb: std('#ff4652', 0.4, 0, { emissive: new Color('#ff1e2d'), emissiveIntensity: 1.4 }),
    ledGreen: std('#3ddc5a', 0.4, 0, { emissive: new Color('#2bd14e'), emissiveIntensity: 0.9 }),
    ledAmber: std('#ffb020', 0.4, 0, { emissive: new Color('#ff9a00'), emissiveIntensity: 0.9 }),
    rgbDim: std('#a0232b', 0.4, 0, { emissive: new Color('#ff1e2d'), emissiveIntensity: 0.55 }),
    diffuser: std('#ffd6d9', 0.5, 0, { emissive: new Color('#ff2433'), emissiveIntensity: 0.9 }),
    ramShell: std('#9c1219', 0.4, 0.7),
    shroud: std('#2c2d30', 0.45, 0.45),
    accent: std('#e90313', 0.4, 0.3, { emissive: new Color('#e90313'), emissiveIntensity: 0.5 }),
    rubber: std('#111112', 0.8, 0),
    label: std('#8f9399', 0.6, 0.1),
    board: std('#141619', 0.6, 0.2, hasDom ? { map: pcbTexture() } : {}),
    gold: std('#d4a53c', 0.3, 0.95),
    usb: std('#2f6fd6', 0.5, 0.1),
    grille: std('#3b3d42', 0.45, 0.7),
    choke: std('#2a2b2e', 0.5, 0.4),
    cap: std('#3a3d44', 0.35, 0.8),
    grommet: std('#0c0c0d', 0.9, 0),
    hole: std('#050505', 1, 0),
  };
}

/** Trilhas e serigrafia da placa-mãe (desenho fixo: mesmo resultado sempre). */
function pcbTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  let seed = 11;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#16181c'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#22272c'; g.lineWidth = 2;
  for (let i = 0; i < 140; i++) {
    let x = r() * 512, y = r() * 512;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 3; k++) { if (r() < 0.5) x += (r() - 0.5) * 160; else y += (r() - 0.5) * 160; g.lineTo(x, y); }
    g.stroke();
  }
  g.fillStyle = '#2c3238';
  for (let i = 0; i < 260; i++) g.fillRect(r() * 512, r() * 512, 3, 3);
  g.strokeStyle = '#6b7178'; g.lineWidth = 1.2;
  for (let i = 0; i < 26; i++) { const x = r() * 480, y = r() * 480; g.strokeRect(x, y, 10 + r() * 22, 6 + r() * 12); }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

const canvasMats = new Map<string, MeshStandardMaterial>();
/** Material com textura desenhada em canvas (etiquetas). Sem DOM (testes) fica só a cor de fundo. */
function canvasMat(key: string, w: number, h: number, bg: string, draw: (g: CanvasRenderingContext2D) => void) {
  let m = canvasMats.get(key);
  if (m) return m;
  m = std(bg, 0.6, 0.15);
  if (hasDom) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d')!;
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    draw(g);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    m.map = t;
    m.color.set('#ffffff');
  }
  canvasMats.set(key, m);
  return m;
}
export const mats = () => (palette ??= makePalette());

/** Grade de furos do topo e da frente do gabinete. */
function meshTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2b2c30'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#060607';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.beginPath(); g.arc(x * 8 + (y % 2) * 4 + 2, y * 8 + 4, 2.6, 0, Math.PI * 2); g.fill(); }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(12, 12);
  t.colorSpace = SRGBColorSpace;
  return t;
}

let gpuSideMat: MeshStandardMaterial | undefined;
/** Face da placa de vídeo virada para o vidro: painel com marca fictícia e faixa iluminada. */
function gpuSide() {
  if (gpuSideMat) return gpuSideMat;
  gpuSideMat = std('#232427', 0.45, 0.5, { emissive: new Color('#ffffff'), emissiveIntensity: 0 });
  if (hasDom) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#232427'; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#34363a'; g.lineWidth = 10;
    for (let x = -128; x < 640; x += 46) { g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 70, 0); g.stroke(); }
    g.fillStyle = '#e90313'; g.fillRect(24, 96, 300, 7);
    g.fillStyle = '#e8e8e8'; g.font = '800 44px Roboto, Arial, sans-serif'; g.fillText('EXEMPLO', 24, 70);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    const e = document.createElement('canvas');
    e.width = 512; e.height = 128;
    const ge = e.getContext('2d')!;
    ge.fillStyle = '#000'; ge.fillRect(0, 0, 512, 128);
    ge.fillStyle = '#ff2433'; ge.fillRect(24, 96, 300, 7);
    gpuSideMat.map = t;
    gpuSideMat.emissiveMap = new CanvasTexture(e);
    gpuSideMat.emissive.set('#ffffff');
    gpuSideMat.emissiveIntensity = 1;
    gpuSideMat.color.set('#ffffff');
  }
  return gpuSideMat;
}

const ihs = new Map<string, MeshStandardMaterial>();
/** Tampa metálica do processador com o modelo gravado. */
function ihsMat(label: string) {
  let m = ihs.get(label);
  if (m) return m;
  m = std('#c3c7cc', 0.35, 0.85);
  if (hasDom) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#c9cdd2'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#6f747b'; g.textAlign = 'center';
    g.font = '800 40px Roboto, Arial, sans-serif'; g.fillText('EXEMPLO', 128, 104);
    g.font = '600 34px Roboto, Arial, sans-serif'; g.fillText(label, 128, 154, 220);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    m.map = t;
    m.color.set('#ffffff');
  }
  ihs.set(label, m);
  return m;
}

const labels = new Map<number, MeshStandardMaterial>();
/** Etiqueta lateral da fonte com a potência (textura de canvas). */
function psuLabel(watts: number) {
  let m = labels.get(watts);
  if (m) return m;
  m = std('#1f2023', 0.6, 0.2);
  if (hasDom) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#1f2023'; g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#e90313'; g.fillRect(0, 100, 256, 6);
    g.fillStyle = '#f2f2f2'; g.font = '700 54px Roboto, Arial, sans-serif'; g.textAlign = 'center';
    g.fillText(`${watts}W`, 128, 70);
    g.font = '500 18px Roboto, Arial, sans-serif'; g.fillStyle = '#bdbdbd';
    g.fillText('EXEMPLO · 80 PLUS', 128, 94);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    m.map = t;
    m.color.set('#ffffff');
  }
  labels.set(watts, m);
  return m;
}

const tinted = new WeakMap<Material, Material>();
/** Variante avermelhada de um material (peça em conflito). */
export function tint(m: Material): Material {
  let t = tinted.get(m);
  if (!t) {
    const c = (m as MeshStandardMaterial).clone();
    c.color.lerp(new Color('#e5484d'), 0.45);
    c.emissive = new Color('#6a0d12');
    c.emissiveIntensity = 0.55;
    tinted.set(m, t = c);
  }
  return t;
}

/** Passe só de profundidade da peça transparente: depois dele só a superfície da frente é pintada. */
let depthOnly: MeshBasicMaterial | undefined;
export const depthOnlyMaterial = () => (depthOnly ??= new MeshBasicMaterial({ colorWrite: false, transparent: true }));

/**
 * Aparência de um modelo inteiro: vermelho de conflito e opacidade (`alpha` < 1 quando tampa a peça em foco).
 * Os materiais são compartilhados entre peças; a versão transparente é uma cópia só deste modelo.
 * Transparente, cada malha ganha um "irmão" que grava só a profundidade (renderiza antes, na fase transparente,
 * então a peça de trás já está pintada): sem isso as 50 aletas do cooler somariam opacidade e virariam neblina.
 */
export function setLook(obj: Group, conflict: boolean, alpha = 1) {
  obj.userData.conflict = conflict;
  obj.userData.alpha = alpha;
  const meshes: Mesh[] = [];
  obj.traverse(o => { if ((o as Mesh).isMesh && !o.userData.pre) meshes.push(o as Mesh); });
  for (const mesh of meshes) {
    mesh.userData.base ??= mesh.material;
    const shared = (conflict ? tint(mesh.userData.base) : mesh.userData.base) as MeshStandardMaterial;
    let fade = mesh.userData.fade as MeshStandardMaterial | undefined;
    let pre = mesh.userData.preMesh as Mesh | undefined;
    if (alpha >= 1) {
      fade?.dispose();
      mesh.userData.fade = undefined;
      mesh.material = shared;
      mesh.renderOrder = 0;
      if (pre) { mesh.remove(pre); mesh.userData.preMesh = undefined; }
      continue;
    }
    if (!pre) {
      pre = new Mesh(mesh.geometry, depthOnlyMaterial());
      pre.userData.pre = true;
      pre.renderOrder = 1;
      pre.raycast = () => {};
      mesh.add(pre);
      mesh.userData.preMesh = pre;
    }
    mesh.renderOrder = 2;
    if (!fade || fade.userData.src !== shared) {
      fade?.dispose();
      fade = shared.clone();
      fade.userData.src = shared;
      fade.transparent = true;
      fade.depthWrite = false;
      mesh.userData.fade = fade;
    }
    fade.opacity = alpha * (shared.transparent ? shared.opacity : 1);
    mesh.material = fade;
  }
}

/* ---------- montagem por material ---------- */

type Merged = Map<Material, BufferGeometry>;
/**
 * Seções já unidas, pela chave (seção, tamanho, dados de que dependem). Trocar a placa de vídeo remonta o gabinete,
 * mas só os cabos e as tampas dos slots mudam: o resto volta daqui, sem triangular nem subir de novo para a GPU.
 * Geometrias marcadas `cached`: a cena não as descarta ao trocar o modelo; só saem quando expulsas daqui.
 */
const sectionCache = new Map<string, Merged>();
const SECTION_CACHE_MAX = 48;

class Kit {
  /** Seção → material → geometrias. Seções viram subgrupos (o gabinete apaga só o painel que tampa a peça). */
  private sections = new Map<string, Map<Material, BufferGeometry[]>>();
  private geos = new Map<Material, BufferGeometry[]>();
  /** Seções reaproveitadas do cache e chaves das seções novas a guardar. */
  private hits = new Map<string, Merged>();
  private keys = new Map<string, string>();
  readonly extras: Mesh[] = [];

  constructor(private size: Vec3) {}

  section(name: string) {
    let s = this.sections.get(name);
    if (!s) this.sections.set(name, s = new Map());
    this.geos = s;
  }

  /**
   * Seção que só depende de `deps` (e do tamanho): `draw` só roda se ela não estiver no cache.
   * `rear:slots` é um bloco à parte da seção `rear` (cache próprio, mesmo subgrupo na cena).
   */
  cached(name: string, deps: unknown[], draw: () => void) {
    const key = JSON.stringify([name, this.size, deps]);
    this.section(name);
    const hit = sectionCache.get(key);
    if (hit) {
      // Mais recente no fim (ordem de expulsão).
      sectionCache.delete(key);
      sectionCache.set(key, hit);
      this.hits.set(name, hit);
      return;
    }
    this.keys.set(name, key);
    draw();
  }

  add(mat: Material, g: BufferGeometry, m?: Matrix4) {
    const n = g.index ? g.toNonIndexed() : g.clone();
    for (const name of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(name)) n.deleteAttribute(name);
    n.clearGroups();
    if (m) n.applyMatrix4(m);
    const list = this.geos.get(mat) ?? [];
    list.push(n);
    this.geos.set(mat, list);
  }

  /** Caixa por intervalos (mm). Ignora intervalos vazios. */
  box(mat: Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
    if (x1 - x0 <= 0 || y1 - y0 <= 0 || z1 - z0 <= 0) return;
    const g = new BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.add(mat, g);
  }

  /** Cilindro centrado em `c`, ao longo de `axis`. */
  cyl(mat: Material, axis: Axis, c: Vec3, r: number, len: number, seg = 24) {
    const g = new CylinderGeometry(r, r, len, seg);
    this.add(mat, g, orient(axis, c));
  }

  build() {
    const group = new Group();
    const [sx, sy, sz] = this.size;
    const merge = (geos: Map<Material, BufferGeometry[]>): Merged => {
      const out: Merged = new Map();
      for (const [mat, list] of geos) {
        const g = mergeGeometries(list, false)!;
        for (const l of list) l.dispose();
        g.translate(-sx / 2, -sy / 2, -sz / 2);
        g.computeBoundingBox();
        out.set(mat, g);
      }
      return out;
    };
    const meshes = (merged: Merged, into: Group) => {
      for (const [mat, g] of merged) {
        const mesh = new Mesh(g, mat);
        // O vidro não "tampa" nada: já é transparente.
        if (mat === mats().glass) mesh.raycast = () => {};
        into.add(mesh);
      }
    };
    if (!this.sections.size) meshes(merge(this.geos), group);
    const subs = new Map<string, Group>();
    for (const [name, geos] of this.sections) {
      let merged = this.hits.get(name);
      const key = this.keys.get(name);
      if (!merged) {
        merged = merge(geos);
        if (key) {
          for (const g of merged.values()) g.userData.cached = true;
          sectionCache.set(key, merged);
          if (sectionCache.size > SECTION_CACHE_MAX) {
            const [old, evicted] = sectionCache.entries().next().value!;
            sectionCache.delete(old);
            // Se ainda estiver em uso, a cena só sobe a geometria de novo no próximo quadro.
            for (const g of evicted.values()) g.dispose();
          }
        }
      }
      const section = name.split(':')[0];
      let sub = subs.get(section);
      if (!sub) {
        subs.set(section, sub = new Group());
        sub.userData.section = section;
        group.add(sub);
      }
      meshes(merged, sub);
    }
    for (const e of this.extras) { e.geometry.translate(-sx / 2, -sy / 2, -sz / 2); e.userData.extra = true; group.add(e); }
    return group;
  }
}

/** Matriz que leva o eixo y de uma geometria (cilindros) ou z (ventoinhas) para `axis`, centrada em `c`. */
function orient(axis: Axis, c: Vec3, from: 'y' | 'z' = 'y') {
  const r = new Matrix4();
  if (from === 'y') { if (axis === 'x') r.makeRotationZ(-Math.PI / 2); else if (axis === 'z') r.makeRotationX(Math.PI / 2); }
  else { if (axis === 'x') r.makeRotationY(Math.PI / 2); else if (axis === 'y') r.makeRotationX(-Math.PI / 2); }
  return new Matrix4().makeTranslation(c[0], c[1], c[2]).multiply(r);
}

/* ---------- chapas com furos ---------- */

const rect = (u0: number, v0: number, u1: number, v1: number) => {
  const p = new Path();
  p.moveTo(u0, v0); p.lineTo(u1, v0); p.lineTo(u1, v1); p.lineTo(u0, v1); p.closePath();
  return p;
};
const circle = (u: number, v: number, r: number) => { const p = new Path(); p.absarc(u, v, r, 0, Math.PI * 2, true); return p; };

const plates = new Map<string, BufferGeometry>();
/**
 * Chapa cara de triangular (centenas de furos) guardada pela chave dos dados que a definem: trocar de peça
 * remonta o gabinete inteiro, mas a traseira com a colmeia só é triangulada de novo se o gabinete mudar.
 * `Kit.add` copia a geometria, então a guardada nunca é alterada nem descartada.
 */
function cachedPlate(key: string, make: () => BufferGeometry) {
  let g = plates.get(key);
  if (!g) {
    if (plates.size >= 8) plates.delete(plates.keys().next().value!);
    plates.set(key, g = make());
  }
  return g;
}

/** Chapa retangular (u0..u1 × v0..v1) com furos, espessura `depth` no eixo z do shape. */
function plate(u0: number, v0: number, u1: number, v1: number, holes: Path[], depth: number, curveSegments = 12) {
  const sh = new Shape();
  sh.moveTo(u0, v0); sh.lineTo(u1, v0); sh.lineTo(u1, v1); sh.lineTo(u0, v1); sh.closePath();
  sh.holes.push(...holes);
  return new ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments });
}

/** Grade hexagonal de furos (ventilação) num círculo; `keep` filtra furos que bateriam em outro recorte. */
function hexGrid(cu: number, cv: number, radius: number, r: number, pitch: number, keep: (u: number, v: number) => boolean = () => true) {
  const out: Path[] = [], dv = pitch * Math.sqrt(3) / 2, n = Math.ceil(radius / dv);
  for (let j = -n; j <= n; j++) for (let i = -n - 1; i <= n + 1; i++) {
    const u = cu + i * pitch + (j % 2 ? pitch / 2 : 0), v = cv + j * dv;
    if (Math.hypot(u - cu, v - cv) <= radius - r && keep(u, v)) out.push(circle(u, v, r));
  }
  return out;
}

/** Shape no plano (u = z, v = y), extrudado de x = x0 para dentro (x diminui). */
const onX = (x0: number) => new Matrix4().set(0, 0, -1, x0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
/** Shape no plano (u = x, v = z), extrudado de y = y0 para baixo (y diminui). */
const onY = (y0: number) => new Matrix4().set(1, 0, 0, 0, 0, 0, -1, y0, 0, 1, 0, 0, 0, 0, 0, 1);
/** Shape no plano (u = x, v = y), extrudado de z = z0 para frente (z aumenta). */
const onZ = (z0: number) => new Matrix4().makeTranslation(0, 0, z0);

/* ---------- ventoinha ---------- */

interface FanGeo { frame: BufferGeometry; hub: BufferGeometry; cap: BufferGeometry; blades: BufferGeometry; ring: BufferGeometry; struts?: BufferGeometry }
const fanCache = new Map<string, FanGeo>();

/** Ventoinha de diâmetro `d` e espessura `t`, eixo z, centrada na origem. `round`: moldura redonda (GPU). */
function fanGeo(d: number, t: number, round: boolean): FanGeo {
  const key = `${d}|${t}|${round}`;
  let f = fanCache.get(key);
  if (f) return f;
  const outer = new Shape();
  if (round) outer.absarc(0, 0, d / 2, 0, Math.PI * 2, false);
  else { outer.moveTo(-d / 2, -d / 2); outer.lineTo(d / 2, -d / 2); outer.lineTo(d / 2, d / 2); outer.lineTo(-d / 2, d / 2); outer.closePath(); }
  outer.holes.push(circle(0, 0, d * (round ? 0.455 : 0.47)));
  // Furos dos parafusos nos cantos da moldura quadrada.
  if (!round) for (const sx of [-1, 1]) for (const sy of [-1, 1]) outer.holes.push(circle(sx * d * 0.43, sy * d * 0.43, d * 0.022));
  const frame = new ExtrudeGeometry(outer, { depth: t, bevelEnabled: false, curveSegments: 24 });
  frame.translate(0, 0, -t / 2);
  const hub = new CylinderGeometry(d * 0.16, d * 0.16, t * 0.8, 28).rotateX(Math.PI / 2);
  const cap = new CylinderGeometry(d * 0.1, d * 0.1, 0.3, 24).rotateX(Math.PI / 2).translate(0, 0, -t * 0.4 - 0.15);
  // Pás curvas (foice); a inclinação é limitada para caber na espessura da moldura.
  const r0 = d * 0.15, r1 = d * 0.43, w = d * 0.2;
  const bs = new Shape();
  bs.moveTo(r0, -w * 0.3);
  bs.quadraticCurveTo((r0 + r1) / 2, -w * 0.55, r1, -w * 0.15);
  bs.quadraticCurveTo(r1 + d * 0.01, w * 0.2, r1 - d * 0.03, w * 0.5);
  bs.quadraticCurveTo((r0 + r1) * 0.45, w * 0.35, r0, w * 0.3);
  bs.closePath();
  const pitch = Math.min(0.5, Math.asin(Math.min(1, Math.max(0, (0.4 * t - 0.6) / (0.55 * w)))));
  const blades = mergeGeometries(Array.from({ length: 9 }, (_, i) => {
    const b = new ExtrudeGeometry(bs, { depth: 1.2, bevelEnabled: false, curveSegments: 6 });
    b.translate(0, 0, -0.6);
    b.rotateX(pitch);
    b.rotateZ((i / 9) * Math.PI * 2);
    return b;    // ExtrudeGeometry já é não indexada
  }))!;
  const ringShape = new Shape();
  ringShape.absarc(0, 0, d * 0.47, 0, Math.PI * 2, false);
  ringShape.holes.push(circle(0, 0, d * 0.44));
  const ring = new ExtrudeGeometry(ringShape, { depth: 0.8, bevelEnabled: false, curveSegments: 24 });
  ring.translate(0, 0, t / 2 - 0.8);
  // Hastes do motor (atrás das pás), só nas ventoinhas de gabinete/cooler.
  const struts = round ? undefined : mergeGeometries([0, 1, 2].map(i => {
    const b = new BoxGeometry(d * 0.32, 2.4, 1.6);
    b.translate(d * 0.31, 0, t / 2 - 0.8);
    b.rotateZ(Math.PI / 2 + (i / 3) * Math.PI * 2);
    return b.toNonIndexed();
  }))!;
  fanCache.set(key, f = { frame, hub, cap, blades, ring, struts });
  return f;
}

function fan(kit: Kit, d: number, t: number, c: Vec3, axis: Axis, opts: { round?: boolean; rgb?: boolean } = {}) {
  const f = fanGeo(d, t, !!opts.round);
  const m = mats();
  const mat = orient(axis, c, 'z');
  kit.add(opts.round ? m.shroud : m.black, f.frame, mat);
  if (f.struts) kit.add(m.black, f.struts, mat);
  kit.add(m.blade, f.blades, mat);
  kit.add(m.plastic, f.hub, mat);
  kit.add(m.label, f.cap, mat);
  if (opts.rgb) kit.add(m.rgb, f.ring, mat);
}

/* ---------- espelho de I/O da placa-mãe ---------- */

/** Espelho com a serigrafia (canvas a 4 px/mm) desenhada nas mesmas posições das portas 3D. */
function ioPlateMat(io: IoLayout) {
  return canvasMat(`io:${JSON.stringify(io)}`, IO_W * 4, IO_H * 4, '#2a2c30', g => {
    g.strokeStyle = 'rgba(255,255,255,.05)';
    for (let y = 0; y < IO_H * 4; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(IO_W * 4, y); g.stroke(); }
    g.fillStyle = '#060607';
    for (const { kind, a, b } of io.ports) {
      const [w, h] = PORT_SIZE[kind];
      if (kind === 'sma' || kind === 'btn' || kind === 'audio' || kind === 'ps2') { g.beginPath(); g.arc(a * 4, b * 4, (w / 2 + 0.6) * 4, 0, Math.PI * 2); g.fill(); }
      else g.fillRect((a - w / 2 - 0.4) * 4, (b - h / 2 - 0.4) * 4, (w + 0.8) * 4, (h + 0.8) * 4);
    }
    g.fillStyle = '#d7d9dc'; g.font = '700 15px Roboto, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const { text, a, b } of io.labels) g.fillText(text, a * 4, b * 4);
    g.fillStyle = '#e90313'; g.fillRect(0, IO_H * 4 - 12, IO_W * 4, 12);
  });
}

function ioShield(k: Kit, L: number, [z0, y0, z1, y1]: readonly [number, number, number, number], io: IoLayout) {
  const m = mats();
  // Espelho: caixa com textura (a face +x mostra a serigrafia; nela o "u" corre para -z).
  k.add(ioPlateMat(io), boxGeo(L - 2.4, L - 1.6, y0, y1, z0, z1));
  const x0 = L - 1.6, x1 = L - 0.4;
  /** Moldura metálica de uma porta retangular (4 paredes finas). */
  const rim = (z: number, y: number, w: number, h: number, mat: Material = m.metal) => {
    k.box(mat, x0, x1, y - h / 2, y - h / 2 + 0.5, z - w / 2, z + w / 2);
    k.box(mat, x0, x1, y + h / 2 - 0.5, y + h / 2, z - w / 2, z + w / 2);
    k.box(mat, x0, x1, y - h / 2 + 0.5, y + h / 2 - 0.5, z - w / 2, z - w / 2 + 0.5);
    k.box(mat, x0, x1, y - h / 2 + 0.5, y + h / 2 - 0.5, z + w / 2 - 0.5, z + w / 2);
  };
  for (const { kind, a, b, color } of io.ports) {
    const z = z1 - a, y = y1 - b;
    const [w, h] = PORT_SIZE[kind];
    switch (kind) {
      case 'usb2': case 'usb5': case 'usb10': {
        rim(z, y, w, h);
        // Cor da lingueta pelo padrão: preta (2.0), azul (5 Gbps), vermelha (10 Gbps).
        const tongue = kind === 'usb2' ? m.black : kind === 'usb5' ? m.usb : m.accent;
        k.box(tongue, x0, x1 - 0.5, y - h / 2 + 0.6, y - 0.2, z - w / 2 + 1.2, z + w / 2 - 1.2);
        break;
      }
      case 'usbc': rim(z, y, w, h); k.box(m.black, x0, x1 - 0.6, y - h / 2 + 1.4, y + h / 2 - 1.4, z - 0.4, z + 0.4); break;
      case 'hdmi': case 'dp': rim(z, y, w, h); k.box(m.black, x0, x1 - 0.6, y - 1, y + 0.6, z - w / 2 + 2, z + w / 2 - 2); break;
      case 'rj45':
        k.box(m.plastic, x0, x1, y - h / 2, y + h / 2, z - w / 2, z - w / 2 + 1.5);
        k.box(m.plastic, x0, x1, y - h / 2, y + h / 2, z + w / 2 - 1.5, z + w / 2);
        k.box(m.plastic, x0, x1, y + h / 2 - 1.5, y + h / 2, z - w / 2 + 1.5, z + w / 2 - 1.5);
        k.box(m.plastic, x0, x1, y - h / 2, y - h / 2 + 3, z - w / 2 + 1.5, z + w / 2 - 1.5);
        k.box(m.ledGreen, x1 - 0.2, x1, y + h / 2 - 1.3, y + h / 2 - 0.3, z - w / 2 + 0.3, z - w / 2 + 1.2);
        k.box(m.ledAmber, x1 - 0.2, x1, y + h / 2 - 1.3, y + h / 2 - 0.3, z + w / 2 - 1.2, z + w / 2 - 0.3);
        for (let i = 0; i < 8; i++) k.box(m.gold, x0, x0 + 0.4, y + 2, y + 4.5, z - 5 + i * 1.3, z - 4.5 + i * 1.3);
        break;
      case 'sma':
        k.cyl(m.gold, 'x', [L - 1, y, z], 3.5, 1.2, 6);
        k.cyl(m.gold, 'x', [L - 0.7, y, z], 2.2, 1.4, 16);
        k.cyl(m.hole, 'x', [L - 0.4, y, z], 0.9, 0.2, 10);
        break;
      case 'btn': k.cyl(m.plastic, 'x', [L - 1, y, z], 2.5, 1.2, 18); k.cyl(m.latch, 'x', [L - 0.5, y, z], 1.8, 0.2, 18); break;
      case 'ps2':
        k.cyl(m.metal, 'x', [L - 1, y, z], 4.75, 1.2, 24);
        k.cyl(jackMat('#7b3fb5'), 'x', [L - 0.7, y, z], 3.6, 1.4, 24);
        k.cyl(m.hole, 'x', [L - 0.4, y, z], 1.2, 0.2, 10);
        break;
      case 'audio':
        k.cyl(jackMat(color ?? '#3ddc5a'), 'x', [L - 1.1, y, z], 3.3, 1, 18);
        k.cyl(m.hole, 'x', [L - 0.55, y, z], 1.8, 0.1, 14);
        break;
      case 'spdif':
        k.box(m.black, x0, x1 - 0.2, y - 3.3, y + 3.3, z - 3.3, z + 3.3);
        k.box(m.accent, x1 - 0.2, x1, y - 1, y + 1, z - 1, z + 1);
        break;
    }
  }
}

const jacks = new Map<string, MeshStandardMaterial>();
/** Plástico colorido dos conectores de áudio e PS/2. */
const jackMat = (color: string) => jacks.get(color) ?? (jacks.set(color, std(color, 0.5, 0.05)), jacks.get(color)!);

/* ---------- soquetes ---------- */

/** Contorno fechado (lista de pontos) como Shape. */
function outline(pts: number[][]) {
  const sh = new Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) sh.lineTo(x, y);
  sh.closePath();
  return sh;
}

/** Tampa do AM5 (40 × 40): braços nos cantos e no meio de cada lado, recortes entre eles. */
const AM5_IHS = [[2, 2], [8, 2], [8, 6], [14, 6], [14, 2], [26, 2], [26, 6], [32, 6], [32, 2], [38, 2], [38, 8], [34, 8], [34, 14], [38, 14],
  [38, 26], [34, 26], [34, 32], [38, 32], [38, 38], [32, 38], [32, 34], [26, 34], [26, 38], [14, 38], [14, 34], [8, 34], [8, 38], [2, 38],
  [2, 32], [6, 32], [6, 26], [2, 26], [2, 14], [6, 14], [6, 8], [2, 8]];

/** Soquete na placa-mãe (z < 0 = em direção ao vidro), centrado em (sx, sy). */
function socket(k: Kit, sock: SocketKind, sx: number, sy: number) {
  const m = mats();
  if (sock === 'lga1700') {
    // LGA1700: corpo retangular, placa de pressão metálica com janela, alavanca e furação 75 × 75 mm.
    k.box(m.plastic, sx - 21, sx + 21, sy - 26, sy + 26, -1, 0);
    for (const [x0, x1, y0, y1] of [[-23, 23, 21, 29], [-23, 23, -29, -21], [-23, -17, -21, 21], [17, 23, -21, 21]])
      k.box(m.metal, sx + x0, sx + x1, sy + y0, sy + y1, -3, 0);
    k.cyl(m.metal, 'y', [sx + 25.5, sy, -1.5], 1, 56, 8);
    k.box(m.metal, sx + 24, sx + 27, sy + 26, sy + 32, -3, 0);
    for (const dx of [-37.5, 37.5]) for (const dy of [-37.5, 37.5]) k.cyl(m.metal, 'z', [sx + dx, sy + dy, -0.2], 3, 0.4, 16);
    return;
  }
  if (sock === 'am4') {
    // AM4 (PGA): soquete de plástico bege com os furos dos pinos e a alavanca ZIF ao lado.
    k.add(am4Socket(), boxGeo(sx - 24, sx + 24, sy - 24, sy + 24, -1.5, 0));
    k.cyl(m.metal, 'y', [sx + 26, sy, -1.5], 1, 46, 8);
    k.box(m.metal, sx + 25, sx + 28, sy + 22, sy + 25, -6, 0);
  } else {
    // AM5 (LGA): corpo escuro e placa de pressão metálica quadrada com alavanca.
    k.box(m.plastic, sx - 22, sx + 22, sy - 22, sy + 22, -1, 0);
    for (const [x0, x1, y0, y1] of [[-24, 24, 18, 24], [-24, 24, -24, -18], [-24, -18, -18, 18], [18, 24, -18, 18]])
      k.box(m.metal, sx + x0, sx + x1, sy + y0, sy + y1, -3, 0);
    k.cyl(m.metal, 'y', [sx + 26, sy, -1.5], 1, 48, 8);
    k.box(m.metal, sx + 25, sx + 28, sy + 22, sy + 25, -3, 0);
  }
  // AM4/AM5: suporte de retenção de plástico preto em cima e embaixo, com o gancho no meio (onde prende o cooler).
  for (const dir of [-1, 1]) {
    const y0 = sy + dir * 26, y1 = sy + dir * 32;
    k.box(m.plastic, sx - 36, sx + 36, Math.min(y0, y1), Math.max(y0, y1), -5, 0);
    k.box(m.plastic, sx - 6, sx + 6, Math.min(y0, y1), Math.max(y0, y1), -6, -5);
    for (const dx of [-30, 30]) k.cyl(m.metal, 'z', [sx + dx, (y0 + y1) / 2, -5.1], 1.8, 0.2, 12);
  }
}

/** Plástico bege do soquete AM4 com a grade de furos dos pinos. */
const am4Socket = () => canvasMat('am4', 192, 192, '#e2dac4', g => {
  g.fillStyle = '#9b927c';
  for (let y = 12; y < 180; y += 5) for (let x = 12; x < 180; x += 5) if (Math.abs(x - 96) > 18 || Math.abs(y - 96) > 18) g.fillRect(x, y, 2, 2);
  g.fillStyle = '#c9a227'; g.beginPath(); g.moveTo(6, 6); g.lineTo(20, 6); g.lineTo(6, 20); g.fill();
});

/* ---------- peças ---------- */

export function buildModel(model: Model, size: Vec3): Group {
  const kit = new Kit(size);
  BUILDERS[model.type](kit, size, model as never);
  return kit.build();
}

/** Etiqueta com linhas de texto. `flip`: gira 180° (face de cima de uma caixa tem o "v" invertido). */
const label = (key: string, lines: [string, number][], bg = '#e9eaec', fg = '#1b1c1f', flip = false) => canvasMat(key, 512, 160, bg, g => {
  if (flip) { g.translate(512, 160); g.rotate(Math.PI); }
  g.fillStyle = '#e90313'; g.fillRect(0, 0, 18, 160);
  g.fillStyle = fg; g.textBaseline = 'middle';
  let y = 160 / (lines.length + 1);
  for (const [text, size] of lines) { g.font = `800 ${size}px Roboto, Arial, sans-serif`; g.fillText(text, 40, y, 450); y += 160 / (lines.length + 1); }
});

type Builder<T extends Model['type']> = (k: Kit, s: Vec3, m: Extract<Model, { type: T }>) => void;
const BUILDERS: { [T in Model['type']]: Builder<T> } = {
  case(k, [L, H, W], c) {
    const m = mats(), e = 5;
    // Cada seção declara os dados de que depende: trocar de peça só reconstrói as seções que mudaram (ex.: cabos).
    const bundle = (pts: Vec3[], r: number) => k.add(m.rubber, new TubeGeometry(new CatmullRomCurve3(pts.map(v => new Vector3(...v)), false, 'centripetal'), 40, r, 8, false));
    // Quadro: 12 arestas.
    k.cached('frame', [], () => {
      for (const y of [0, H - e]) for (const z of [0, W - e]) k.box(m.frame, 0, L, y, y + e, z, z + e);
      for (const x of [0, L - e]) for (const z of [0, W - e]) k.box(m.frame, x, x + e, e, H - e, z, z + e);
      for (const x of [0, L - e]) for (const y of [0, H - e]) k.box(m.frame, x, x + e, y, y + e, e, W - e);
    });
    k.cached('floor', [c.psu], () => {
      k.box(m.inner, e, L - e, 0, 2, e, W - e);
      // Filtro de poeira sob a entrada da fonte e os pés de borracha onde ela apoia.
      const [, , fz0, fz1] = c.psu;
      k.box(m.mesh, L - 3 - 175, L - 3 - 8, 2, 2.3, fz0 + 12, fz1 - 12);
      for (const x of [L - 3 - 22, L - 3 - 128]) for (const z of [fz0 + 8, fz1 - 8]) k.box(m.rubber, x - 6, x + 6, 2, 4, z - 6, z + 6);
    });

    // Gaiola de discos na frente da fonte: a parede de trás dela é o limite de comprimento da fonte.
    // Lateral do lado do vidro vazada (aparecem as 2 bandejas de HD), tampa em cima (onde vai o SSD de 2,5").
    k.cached('cage', [c.cage], () => {
      const [gx0, gx1, gy0, gy1, gz0, gz1] = c.cage;
      k.box(m.inner, gx0, gx1, gy1 - 1.5, gy1, gz0, gz1);
      k.box(m.inner, gx1 - 1.5, gx1, gy0, gy1 - 1.5, gz0, gz1);
      k.box(m.inner, gx0, gx1 - 1.5, gy0, gy1 - 1.5, gz1 - 1.5, gz1);
      k.add(m.inner, plate(gx0, gy0, gx1 - 1.5, gy1 - 1.5, [rect(gx0 + 8, gy0 + 6, gx1 - 12, gy1 - 8)], 1.5), onZ(gz0));
      for (const [y0, y1] of [[gy0 + 3, gy0 + 24], [gy0 + 27, gy1 - 4]]) {
        k.box(m.plastic, gx0 + 3, gx1 - 3, y0, y1, gz0 + 4, gz1 - 4);                       // bandeja
        k.box(m.black, gx0 + 0.5, gx0 + 3, y0 + 4, y1 - 4, gz0 + 20, gz1 - 20);            // puxador
        k.box(m.accent, gx0, gx0 + 0.5, y0 + 8, y1 - 8, gz0 + 30, gz0 + 40);
      }
    });

    // Bandeja: recorte atrás do processador, passa-cabos com borracha (24 pinos e de baixo) e rasgo do cabo EPS.
    k.cached('tray', [c.cpu, c.tray, c.grommets, c.epsHole, c.standoffs, c.zm, c.psu], () => {
      const [cx, cy] = c.cpu, t0 = c.tray, t1 = c.tray + 3;
      k.add(m.inner, plate(e, e, L - e, H - e, [rect(cx - 62, cy - 58, cx + 62, cy + 58), ...c.grommets.map(g => rect(...g)), rect(...c.epsHole)], 3), onZ(t0));
      for (const [a, b, c2, d2] of [...c.grommets, c.epsHole]) {
        // Borracha com fenda no meio (no rasgo horizontal do EPS a fenda é horizontal).
        if (c2 - a < d2 - b) { k.box(m.grommet, a, (a + c2) / 2 - 0.8, b, d2, t0 + 0.4, t1 - 0.4); k.box(m.grommet, (a + c2) / 2 + 0.8, c2, b, d2, t0 + 0.4, t1 - 0.4); }
        else { k.box(m.grommet, a, c2, b, (b + d2) / 2 - 0.8, t0 + 0.4, t1 - 0.4); k.box(m.grommet, a, c2, (b + d2) / 2 + 0.8, d2, t0 + 0.4, t1 - 0.4); }
      }
      // Espaçadores de latão entre a bandeja e a placa-mãe.
      for (const [x, y] of c.standoffs) k.cyl(m.gold, 'z', [x, y, (c.zm + 3 + t0) / 2], 2.6, t0 - c.zm - 3, 6);
      // Feixes de cabos atrás da bandeja (aparecem pelos recortes e girando para trás): da fonte até os passa-cabos.
      const zb = t1 + 9;
      const fromPsu: Vec3 = [L - 60, c.psu[1] - 20, zb];
      if (c.grommets[0]) { const [a, b, c2, d2] = c.grommets[0]; bundle([fromPsu, [L - 80, (b + d2) / 2 - 60, zb], [(a + c2) / 2 + 20, (b + d2) / 2, zb], [(a + c2) / 2, (b + d2) / 2, t1]], 6); }
      { const [a, , c2, d2] = c.epsHole; bundle([[L - 70, c.psu[1] - 20, zb + 4], [L - 70, d2 - 40, zb + 4], [(a + c2) / 2, d2 - 7, zb + 4], [(a + c2) / 2, d2 - 7, t1]], 3.5); }
    });

    // Tampa de trás (fecha o espaço dos cabos).
    k.cached('back', [c.back], () => {
      k.box(m.inner, e, L - e, e, H - e, c.back, W);
    });

    // Cabos da fonte conectados (24 pinos, EPS do processador e PCIe da placa de vídeo), trançados em preto.
    k.cached('cables', [c.cables], () => {
      const cable = (pts: Vec3[], n: number, r: number, axis: 0 | 1) => {
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * r * 2.1;
          bundle(pts.map(([x, y, z]) => [x + (axis === 0 ? off : 0), y + (axis === 1 ? off : 0), z] as Vec3), r);
        }
      };
      if (c.cables.atx24) cable(c.cables.atx24, 4, 3.2, 1);
      if (c.cables.eps) cable(c.cables.eps, 2, 3.2, 0);
      if (c.cables.pcie) cable(c.cables.pcie, 3, 3, 0);
    });

    // Topo com tela e o painel frontal de I/O (botão com anel iluminado, USB e áudio).
    k.cached('roof', [], () => {
      k.box(m.mesh, e, L - e, H - 2, H - 0.5, e, W - e);
      k.cyl(m.rgb, 'y', [22, H - 0.35, W / 2 - 34], 7.5, 0.3, 28);
      k.cyl(m.metal, 'y', [22, H - 0.25, W / 2 - 34], 6, 0.5, 28);
      for (const z of [W / 2 - 14, W / 2 - 2]) k.box(m.usb, 16, 29, H - 0.5, H, z - 3, z + 3);
      k.box(m.black, 16, 25, H - 0.5, H, W / 2 + 8, W / 2 + 16);
      k.cyl(m.black, 'y', [22, H - 0.25, W / 2 + 26], 3, 0.5, 16);
    });

    // Vidro temperado com borda preta serigrafada.
    k.cached('glass', [], () => {
      const bw = 10;
      k.box(m.glass, e + bw, L - e - bw, e + bw, H - e - bw, 0, 3);
      k.box(m.black, e, L - e, e, e + bw, 0, 3); k.box(m.black, e, L - e, H - e - bw, H - e, 0, 3);
      k.box(m.black, e, e + bw, e + bw, H - e - bw, 0, 3); k.box(m.black, L - e - bw, L - e, e + bw, H - e - bw, 0, 3);
    });

    // Traseira: chapa rebaixada 0,6 mm dentro do quadro, com os furos (I/O, slots, grade da ventoinha, fonte).
    const slot = (i: number) => [c.zm - 116, c.slotTop - (i + 1) * 20 + 3, c.zm - 10, c.slotTop - i * 20 - 3] as const;
    k.cached('rear', [c.ioBox, c.zm, c.slotTop, c.psu, c.slots, c.rearMount, c.rear, c.io, c.rearFan], () => {
      const io = c.ioBox;
      const [py0, py1, pz0, pz1] = c.psu;
      const face = L - 0.6;
      const rearKey = JSON.stringify([e, W, H, io, c.psu, c.slots, c.slotTop, c.zm, c.rearMount, c.rear]);
      k.add(m.inner, cachedPlate(rearKey, () => {
        const holes = [rect(...io), rect(pz0 + 4, py0 + 3, pz1 - 4, py1 - 3)];
        for (let i = 0; i < c.slots; i++) holes.push(rect(...slot(i)));
        if (c.rearMount) {
          const v = (c.rearMount[0] + c.rearMount[1]) / 2, u = c.rear.z, r = c.rear.mm * 0.475;
          // Colmeia fina (furos menores que um dedo, como nos gabinetes reais) + furos dos parafusos da ventoinha
          // (105 mm na de 120, 82,5 mm na de 92). A ventoinha fica ao lado do I/O, sem sobrepor.
          holes.push(...hexGrid(u, v, r, 2.3, 5.8));
          const sp = c.rear.mm === 120 ? 52.5 : 41.25;
          for (const du of [-sp, sp]) for (const dv of [-sp, sp]) holes.push(circle(u + du, v + dv, 2.2));
          // Rasgos verticais do lado do vidro, ao lado da ventoinha.
          const su = u - r - 9;
          if (su - 3 > e + 4) for (let j = -2; j <= 2; j++) holes.push(rect(su - 2.5, v + j * 22 - 9, su + 2.5, v + j * 22 + 9));
        }
        // Fileira de rasgos de ventilação ao lado dos slots.
        const vz = c.zm - 116 - 14;
        if (vz - 4 > e + 4) for (let i = 0; i < c.slots * 2 - 1; i++) {
          const v = c.slotTop - 6 - i * 10;
          if (v - 3 > e + 3) holes.push(rect(vz - 3, v - 3.5, vz + 3, v + 3.5));
        }
        return plate(e, e, W - e, H - e, holes, 2.4, 6);   // curveSegments 6: furos sextavados
      }), onX(face));
      k.box(m.metal, L - 0.6, L - 0.3, c.slotTop - c.slots * 20, c.slotTop, c.zm - 9, c.zm - 1);
      for (let i = 0; i < c.slots; i++) {
        const vc = c.slotTop - i * 20 - 10;
        k.cyl(m.metal, 'x', [L - 0.15, vc, c.zm - 5], 2.8, 0.3, 16);
        k.box(m.hole, L - 0.02, L, vc - 0.4, vc + 0.4, c.zm - 7, c.zm - 3);   // fenda do parafuso
      }
      // Espelho do I/O com as portas (só com placa-mãe escolhida).
      if (c.io) ioShield(k, L, io, c.io);
      if (c.rearFan) fan(k, c.rear.mm, 25, [L - 3 - 12.5 - 2, (c.rearFan[0] + c.rearFan[1]) / 2, c.rear.z], 'x', { rgb: true });
    });
    // Slots: tampas livres com rasgos (as de cima ficam abertas para o suporte da placa de vídeo), trava com
    // um parafuso por slot. Mudam com a largura da placa de vídeo: bloco separado, o resto da traseira fica no cache.
    k.cached('rear:slots', [c.zm, c.slotTop, c.slots, c.gpuSlots], () => {
      // Todas as tampas são iguais: uma chapa centrada em v = 0, deslocada para cada slot.
      const [u0, v0, u1, v1] = slot(0), h = (v1 - v0) / 2;
      const cover = cachedPlate(JSON.stringify(['cover', u0, u1, h]), () =>
        plate(u0 - 2, -h - 1.5, u1 + 2, h + 1.5, [0, 1, 2, 3].map(j => rect(u0 + 10 + j * 19, -2.2, u0 + 24 + j * 19, 2.2)), 1, 4));
      for (let i = c.gpuSlots; i < c.slots; i++) {
        const [, a, , b] = slot(i);
        k.add(m.metal, cover, onX(L - 3.2).multiply(new Matrix4().makeTranslation(0, (a + b) / 2, 0)));
      }
    });
    k.cached('front', [c.frontFans], () => {   // frente com tela e ventoinhas
      k.box(m.mesh, 0, 2, e, H - e, e, W - e);
      for (const y of c.frontFans) fan(k, 120, 25, [2 + 12.5 + 1, y, W / 2], 'x', { rgb: true });
    });
  },

  mobo(k, [w, h], b) {
    const m = mats();
    k.box(m.board, 0, w, 0, h, 0, 3);
    const [sx, sy] = b.socket;
    socket(k, b.sock, sx, sy);
    // VRMs: dissipadores com aletas, bobinas na frente.
    k.box(m.alu, sx - 40, sx + 42, sy + 38, sy + 60, -9, 0);
    for (let x = sx - 38; x < sx + 40; x += 6) k.box(m.alu, x, x + 3, sy + 38, sy + 60, -15, -9);
    k.box(m.alu, sx + 42, sx + 62, sy - 40, sy + 60, -9, 0);
    for (let y = sy - 38; y < sy + 37; y += 6) k.box(m.alu, sx + 42, sx + 62, y, y + 3, -15, -9);
    for (let x = sx - 34; x <= sx + 34; x += 11) k.box(m.choke, x - 4, x + 4, sy + 33.5, sy + 37.8, -6, 0);
    for (let y = sy - 34; y <= sy + 28; y += 11) k.box(m.choke, sx + 37.5, sx + 41.8, y - 4, y + 4, -6, 0);
    // Tampa do painel traseiro.
    k.box(m.black, w - 20, w, sy - 50, h - 5, -22, 0);
    k.box(m.accent, w - 19, w - 1, sy - 30, sy - 26, -22.6, -22);
    // Slots de memória com travas.
    for (const x of b.dimmX) {
      k.box(m.plastic, x - 3, x + 3, sy + 5 - 68, sy + 5 + 68, -7, 0);
      k.box(m.latch, x - 3, x + 3, sy + 5 + 68, sy + 5 + 74, -9, 0);
    }
    // Conector EPS (8 pinos do processador) na borda de cima, conector de ventoinha e furos de fixação.
    k.box(m.plastic, sx - 55, sx - 40, h - 14, h - 4, -11, 0);
    k.box(m.latch, sx - 12, sx - 2, h - 10, h - 4, -5, 0);
    for (const [x, y] of [[6, 6], [6, h - 6], [w - 6, 6], [w / 2, h - 6]]) k.cyl(m.metal, 'z', [x, y, -0.2], 3.5, 0.4, 16);
    // PCIe: x16 reforçado (com a fenda) + slots extras onde couber.
    k.box(m.metal, w - 137, w - 48, b.pcieY - 7, b.pcieY - 1, -4.5, 0);
    k.box(m.hole, w - 135, w - 50, b.pcieY - 4.6, b.pcieY - 3.4, -4.8, -4.5);
    k.box(m.latch, w - 52, w - 46, b.pcieY - 8, b.pcieY, -5, 0);
    for (const dy of [40, 80]) if (b.pcieY - dy - 7 > 6) k.box(m.plastic, w - 137, w - (dy === 40 ? 112 : 48), b.pcieY - dy - 7, b.pcieY - dy - 1, -4, 0);
    // Chipset, bateria e capacitores (fora da ITX), SATA e 24 pinos na borda da frente.
    if (b.pcieY - 70 > 4) {
      k.box(m.alu, w - 45, w - 8, b.pcieY - 70, b.pcieY - 30, -4, 0);
      k.box(m.accent, w - 43, w - 10, b.pcieY - 52, b.pcieY - 48, -4.4, -4);
      k.cyl(m.metal, 'z', [w - 62, b.pcieY - 50, -1.5], 10, 3, 28);
    }
    if (b.atx24) {
      k.box(m.plastic, 6, 20, sy - 30, sy + 30, -14, 0);
      for (let i = 0; i < 4; i++) k.box(m.black, 2, 12, 14 + i * 9, 21 + i * 9, -4.5, 0);
      for (let y = sy - 40; y <= sy + 40; y += 10) k.cyl(m.cap, 'z', [27, y, -4], 2.5, 8, 14);
    }
  },

  cpu(k, [w, h], c) {
    const m = mats();
    // Substrato (z 4..6, encostado na placa-mãe), triângulo de orientação e a tampa (IHS) no formato de cada soquete.
    k.box(c.sock === 'lga1700' ? m.pcbDark : m.pcb, 0, w, 0, h, 4, 6);
    k.box(m.gold, 0.6, 2, 0.6, 2, 3.8, 4);
    if (c.sock === 'am5') {
      // AM5: tampa "polvo", com recortes nas bordas onde aparecem os capacitores.
      k.add(m.metal, new ExtrudeGeometry(outline(AM5_IHS), { depth: 3.5, bevelEnabled: false }), onZ(0.5));
      for (const [x, y] of [[11, 3.5], [29, 3.5], [11, 36.5], [29, 36.5], [3.5, 11], [3.5, 29], [36.5, 11], [36.5, 29]]) k.box(m.gold, x - 1.5, x + 1.5, y - 0.8, y + 0.8, 3.6, 4);
      k.add(ihsMat(c.label), boxGeo(8, 32, 8, 32, 0, 0.5));
    } else if (c.sock === 'lga1700') {
      // LGA1700: retangular (lado comprido na vertical), com um recorte no meio de cada lado comprido.
      k.add(m.metal, new ExtrudeGeometry(outline([[2.25, 3], [35.25, 3], [35.25, 18.5], [33.25, 18.5], [33.25, 26.5], [35.25, 26.5], [35.25, 42],
        [2.25, 42], [2.25, 26.5], [4.25, 26.5], [4.25, 18.5], [2.25, 18.5]]), { depth: 3.5, bevelEnabled: false }), onZ(0.5));
      k.add(ihsMat(c.label), boxGeo(7, 30.5, 8, 37, 0, 0.5));
    } else {
      // AM4: tampa quadrada lisa (os pinos ficam embaixo, no próprio processador).
      k.box(m.metal, 2, 38, 2, 38, 0.5, 4);
      k.add(ihsMat(c.label), boxGeo(4, 36, 4, 36, 0, 0.5));
    }
  },

  air(k, [sx, sy, h], c) {
    const m = mats();
    const [cx, cy] = c.cpu;
    if (c.low) {
      // Cooler baixo (92 mm): aletas sob uma ventoinha deitada.
      const n = Math.floor(sx / 3);
      for (let i = 0; i <= n; i++) { const x = (sx - 0.6) * i / n; k.box(m.fin, x, x + 0.6, 0, sy, 14, h - 8); }
      k.box(m.copper, cx - 20, cx + 20, cy - 20, cy + 20, h - 8, h);
      for (const dy of [-14, 0, 14]) k.cyl(m.copper, 'x', [sx / 2, cy + dy, h - 10], 3, sx - 4, 12);
      fan(k, Math.min(c.fanMm, sx, sy), 14, [sx / 2, sy / 2, 7], 'z', { rgb: true });
      return;
    }
    const d = Math.min(c.fanMm, sy - 2, h - 32);
    const zc = (h - 30) / 2;
    // Torre simples: ventoinha na frente e o bloco de aletas (50 mm) atrás; dupla: ventoinha no meio dos dois blocos.
    const stacks: [number, number][] = c.dual ? [[0, (sx - 25) / 2], [(sx + 25) / 2, sx]] : [[25, sx]];
    for (const [x0, x1] of stacks) {
      for (let z = 2; z <= h - 32; z += 2.4) k.box(m.fin, x0, x1, 0, sy, z, z + 0.5);
      k.box(m.black, x0, x1, 0, sy, 0.4, 2);                   // tampa de cima
      k.box(m.accent, x0 + 4, x1 - 4, sy * 0.16 - 2, sy * 0.16 + 2, 0, 0.4);
      // Heatpipes em zigue-zague, com a ponta aparecendo na tampa.
      const xs = [x0 + (x1 - x0) * 0.25, x0 + (x1 - x0) * 0.5, x0 + (x1 - x0) * 0.75];
      xs.forEach((x, i) => {
        const y = sy / 2 + (i % 2 ? 9 : -9);
        k.cyl(m.copper, 'z', [x, y, (2 + h - 8) / 2], 3, h - 10, 12);
        k.cyl(m.copper, 'z', [x, y, 0.2], 3.6, 0.4, 14);
      });
    }
    const fx = c.dual ? sx / 2 : 12.5;
    fan(k, d, 25, [fx, sy / 2, zc], 'x', { rgb: true });
    // Presilhas de arame da ventoinha.
    for (const sz of [-1, 1]) k.cyl(m.metal, 'y', [fx, sy / 2, zc + sz * (d / 2 - 2)], 0.8, d * 0.9, 6);
    k.box(m.copper, cx - 20, cx + 20, cy - 20, cy + 20, h - 8, h);   // base sobre o processador
    k.box(m.black, 3, sx - 3, cy - 5, cy + 5, h - 10, h - 6);         // barra de fixação
  },

  pump(k, [sx, sy, sz], p) {
    const m = mats();
    k.cyl(m.black, 'z', [sx / 2, sy / 2, (8 + sz) / 2], sx / 2, sz - 8, 32);
    k.cyl(m.plastic, 'z', [sx / 2, sy / 2, 4.5], sx / 2 - 2, 7, 32);
    const ringAt = (r0: number, r1: number, z: number, depth: number, mat: Material) => {
      const ring = new Shape();
      ring.absarc(0, 0, r1, 0, Math.PI * 2, false);
      ring.holes.push(circle(0, 0, r0));
      k.add(mat, new ExtrudeGeometry(ring, { depth, bevelEnabled: false, curveSegments: 28 }), new Matrix4().makeTranslation(sx / 2, sy / 2, z));
    };
    ringAt(sx / 2 - 6, sx / 2 - 2, 0, 1, m.rgb);
    k.cyl(m.pcbDark, 'z', [sx / 2, sy / 2, 0.75], sx / 2 - 7, 0.5, 28);
    // Efeito "espelho infinito": anéis menores e mais fracos.
    ringAt(sx / 2 - 13.2, sx / 2 - 12, 0.3, 0.2, m.rgbDim);
    ringAt(sx / 2 - 19, sx / 2 - 18, 0.3, 0.2, m.rgbDim);
    for (const pts of p.tubes) {
      const curve = new CatmullRomCurve3(pts.map(v => new Vector3(...v)), false, 'centripetal');
      k.extras.push(new Mesh(new TubeGeometry(curve, 48, 5, 10, false), m.rubber));
      // Conexão metálica onde a mangueira sai da bomba.
      const [x, y, z] = pts[0];
      k.extras.push(new Mesh(new CylinderGeometry(6.5, 6.5, 9, 18).translate(x, y + 2, z), m.metal));
    }
  },

  radiator(k, size, r) {
    const m = mats();
    // Coordenadas canônicas: u = comprimento, v = espessura, w = largura.
    const [U, V, Wd] = r.axis === 'y' ? [size[0], size[1], size[2]] : [size[1], size[0], size[2]];
    const map = (u0: number, u1: number, v0: number, v1: number, w0: number, w1: number) =>
      r.axis === 'y' ? [u0, u1, v0, v1, w0, w1] as const : [v0, v1, u0, u1, w0, w1] as const;
    const box = (mat: Material, ...a: [number, number, number, number, number, number]) => k.box(mat, ...map(...a));
    const thick = V >= 45;
    const fanT = thick ? 25 : V - 4, coreT = V - fanT;
    const [cv0, cv1, fv0] = r.inward === 1 ? [0, coreT, coreT] : [fanT, V, 0];
    box(m.black, 0, 14, cv0, cv1, 0, Wd);
    box(m.black, U - 14, U, cv0, cv1, 0, Wd);
    box(m.alu, 14, U - 14, cv0, cv1, 0, 6);
    box(m.alu, 14, U - 14, cv0, cv1, Wd - 6, Wd);
    for (let u = 15; u < U - 15; u += 3) box(m.fin, u, u + 0.5, cv0, cv1, 6, Wd - 6);
    // Tubos achatados entre as aletas (atravessam o radiador de tanque a tanque).
    for (let w = 14; w < Wd - 10; w += 9) box(m.alu, 14, U - 14, cv0 + coreT * 0.2, cv1 - coreT * 0.2, w, w + 1.6);
    const d = Math.min(120, Wd), step = (U - 28) / r.fans;
    for (let i = 0; i < r.fans; i++) {
      const u = 14 + step * (i + 0.5), v = fv0 + fanT / 2;
      const c: Vec3 = r.axis === 'y' ? [u, v, Wd / 2] : [v, u, Wd / 2];
      fan(k, Math.min(d, step - 2), fanT, c, r.axis, { rgb: true });
    }
  },

  ram(k, [, sy, h], r) {
    const m = mats();
    k.box(m.pcb, 2.9, 4.1, 0, sy, 4, h);
    const top = r.rgb ? 6 : 2.5;
    // Dissipador em dois lados, etiqueta no lado de fora e topo com recortes (ou difusor RGB em segmentos).
    k.box(m.ramShell, 0.3, 2.8, 1, sy - 1, top, h - 4);
    k.box(m.ramShell, 4.2, 7, 1, sy - 1, top, h - 4);
    // Na face -x o "u" da textura corre em z (estreito) e o "v" em y (comprido): texto desenhado na vertical.
    k.add(canvasMat('ram', 128, 512, '#1b1c1f', g => {
      g.fillStyle = '#e90313'; g.fillRect(0, 0, 128, 10);
      g.translate(64, 256); g.rotate(-Math.PI / 2);
      g.fillStyle = '#f2f2f2'; g.font = '800 70px Roboto, Arial, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText('EXEMPLO', 0, 0, 470);
    }), boxGeo(0, 0.3, sy * 0.2, sy * 0.8, top + 4, h - 10));
    if (r.rgb) {
      const seg = 8, len = (sy - 4) / seg;
      for (let i = 0; i < seg; i++) k.box(m.diffuser, 0.4, 6.6, 2 + i * len + 0.4, 2 + (i + 1) * len - 0.4, 0, top);
      k.box(m.black, 0.6, 6.4, 2, sy - 2, 0.5, top);
    } else {
      for (let y = 3; y < sy - 6; y += 8) k.box(m.black, 0, 7, y, y + 5, 0, top);
      k.box(m.black, 0, 7, 3, sy - 3, 1.2, top);
    }
  },

  gpu(k, [len, t, dz], g) {
    const m = mats();
    const body = len - 3;
    // Suporte PCIe com as saídas de vídeo (3 DisplayPort + HDMI) e grade de ventilação.
    k.add(m.metal, plate(2, 0, dz, t, [rect(dz - 30, t * 0.55, dz - 6, t * 0.9), rect(dz - 60, t * 0.55, dz - 36, t * 0.9)], 1.5), onX(len - 0.5));
    for (const [z, y] of [[dz - 20, t * 0.3], [dz - 44, t * 0.3], [dz - 68, t * 0.3], [dz - 92, t * 0.3]]) k.box(m.hole, len - 0.5, len, y - 3, y + 3, z - 8, z + 8);
    // Backplate com rasgos de ventilação (deixa ver a placa por baixo).
    const vents: Path[] = [];
    for (let x = body * 0.55; x < body - 18; x += 9) for (const z0 of [20, 55]) vents.push(rect(x, z0, x + 4, z0 + 26));
    k.add(m.alu, plate(0, 6, body, dz, vents, 2.5), onY(t));
    k.box(m.pcbDark, 0, body, t - 5, t - 2.5, 8, dz - 3);
    // Carenagem: paredes e tampas; dentro, a pilha de aletas que aparece pelos furos das ventoinhas.
    k.box(m.shroud, 0, body, 9, t - 5, 6, 9);
    k.box(m.shroud, 0, body, 9, t - 5, dz - 3, dz);
    k.box(m.shroud, 0, 3, 9, t - 5, 9, dz - 3);
    k.box(m.shroud, body - 3, body, 9, t - 5, 9, dz - 3);
    for (let x = 4; x < body - 4; x += 2.4) k.box(m.fin, x, x + 0.4, 9.5, t - 5.5, 10, dz - 4);
    k.add(gpuSide(), boxGeo(body * 0.04, body * 0.96, 11, t - 7, 5, 6));       // painel do lado do vidro
    // Conector de energia com os furos dos pinos.
    const cx0 = body * 0.62;
    k.box(m.plastic, cx0, cx0 + 22, t - 13, t - 5, 0.4, 6);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) k.box(m.hole, cx0 + 2 + i * 3.3, cx0 + 4.4 + i * 3.3, t - 12 + j * 3.6, t - 9.6 + j * 3.6, 0, 0.4);
    // Tampa de baixo com furos para as ventoinhas.
    const n = g.fans, step = body / n, d = Math.min(98, dz - 22, step - 8);
    const fanHoles = Array.from({ length: n }, (_, i) => circle(step * (i + 0.5), (dz - 6) / 2, d / 2 + 1));
    k.add(m.shroud, plate(0, 0, body, dz - 6, fanHoles, 3, 24),
      new Matrix4().makeTranslation(0, 9, 6).multiply(new Matrix4().makeRotationX(Math.PI / 2)));
    for (let i = 0; i < n; i++) fan(k, d, 8, [step * (i + 0.5), 4, 6 + (dz - 6) / 2], 'y', { round: true });
  },

  m2(k, _s, s) {
    const m = mats();
    k.box(m.pcbDark, 4, 80, 0, 22, 2.6, 4);
    k.box(m.gold, 0, 4, 2, 20, 2.6, 4);
    k.box(m.alu, 5, 78, 0.5, 21.5, 0.4, 2.6);
    k.add(label(`m2:${s.label}`, [['EXEMPLO NVMe', 52], [s.label, 46]]), boxGeo(9, 62, 2, 20, 0, 0.4));
    k.box(m.accent, 64, 75, 9.5, 12.5, 0, 0.4);
  },

  sata(k, [sx, sy, sz], s) {
    const m = mats();
    k.box(m.alu, 0.5, sx, 0, sy - 0.3, 0, sz);
    k.box(m.black, 0, 0.5, 1.5, sy - 1.5, 12, 44);             // conector SATA
    k.add(label(`sata:${s.label}`, [['EXEMPLO SSD', 50], [`${s.label} · SATA III`, 38]], '#d9dbde', '#1b1c1f', true), boxGeo(8, sx - 8, sy - 0.3, sy, 8, sz - 8));
  },

  psu(k, [len, h, dz], p) {
    const m = mats();
    k.box(m.black, 1, len - 3, 0, h, 1, dz);
    k.add(psuLabel(p.watts), boxGeo(len * 0.12, len * 0.88, 14, h - 14, 0, 1));
    // Conectores modulares na face da frente.
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) k.box(m.plastic, 0, 1, 16 + j * 30, 36 + j * 30, 18 + i * 40, 46 + i * 40);
    // Traseira (aparece pelo furo do gabinete): grade sextavada, tomada IEC, chave liga/desliga e 4 parafusos.
    const [su0, sv0, su1, sv1] = [dz - 44, h - 36, dz - 12, h - 12];      // tomada (u = z, v = y)
    const [wu0, wv0, wu1, wv1] = [dz - 37, 10, dz - 19, 28];             // chave
    const grid = hexGrid(dz / 2 - 20, h / 2, Math.min(h - 14, dz - 64) / 2, 2.6, 6.6);
    k.add(m.grille, plate(0, 0, dz, h, [rect(su0, sv0, su1, sv1), rect(wu0, wv0, wu1, wv1), ...grid], 1.2, 6), onX(len - 0.4));
    k.box(m.hole, len - 3.5, len - 1.6, 0.5, h - 0.5, 1, dz - 0.5);
    // Tomada: moldura com cantos chanfrados (aproximados) e 3 pinos.
    const fr = (u0: number, v0: number, u1: number, v1: number, t: number, mat: Material) => {
      k.box(mat, len - 1.6, len - 0.4, v0, v0 + t, u0, u1); k.box(mat, len - 1.6, len - 0.4, v1 - t, v1, u0, u1);
      k.box(mat, len - 1.6, len - 0.4, v0 + t, v1 - t, u0, u0 + t); k.box(mat, len - 1.6, len - 0.4, v0 + t, v1 - t, u1 - t, u1);
    };
    fr(su0, sv0, su1, sv1, 3, m.plastic);
    k.box(m.plastic, len - 1.6, len - 0.5, sv1 - 7, sv1 - 3, su0 + 3, su0 + 7);
    k.box(m.plastic, len - 1.6, len - 0.5, sv1 - 7, sv1 - 3, su1 - 7, su1 - 3);
    for (const [u, v] of [[(su0 + su1) / 2 - 7, sv0 + 11], [(su0 + su1) / 2 + 7, sv0 + 11], [(su0 + su1) / 2, sv0 + 5]])
      k.box(m.metal, len - 3, len - 1.2, v - 2, v + 2, u - 0.8, u + 0.8);
    // Chave basculante preta com "I" e "O".
    fr(wu0, wv0, wu1, wv1, 2, m.plastic);
    k.box(m.black, len - 1.6, len - 0.6, wv0 + 2, wv1 - 2, wu0 + 2, wu1 - 2);
    k.box(m.label, len - 0.6, len - 0.5, wv1 - 6.5, wv1 - 4, (wu0 + wu1) / 2 - 0.5, (wu0 + wu1) / 2 + 0.5);
    k.cyl(m.label, 'x', [len - 0.55, wv0 + 5.2, (wu0 + wu1) / 2], 1.3, 0.1, 12);
    for (const [u, v] of [[6, 6], [dz - 6, 6], [6, h - 6], [dz - 6, h - 6]]) k.cyl(m.metal, 'x', [len - 0.2, v, u], 2.6, 0.4, 16);
  },
};

function boxGeo(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  const g = new BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

/* ---------- iluminação ---------- */

/** Luz de estúdio + reflexos (RoomEnvironment, sem baixar HDR). Usada pela cena e pelos renders. */
export function studio(scene: Scene, renderer: WebGLRenderer) {
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  scene.add(new HemisphereLight(0xffffff, 0x2a2a2a, 0.9));
  const key = new DirectionalLight(0xffffff, 1.6);
  key.position.set(-600, 900, -900);
  const rim = new DirectionalLight(0xffe0e0, 0.6);
  rim.position.set(800, 300, 700);
  scene.add(key, rim);
  pmrem.dispose();
  return () => env.dispose();
}

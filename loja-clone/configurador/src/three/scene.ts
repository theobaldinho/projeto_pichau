/*
 * Renderização Three.js do layout (carregada sob demanda). Só desenha: o estado vem de buildLayout().
 * Renderiza sob demanda (sem loop contínuo), pausa fora da tela e sem animação com reduced motion.
 * Desempenho: shaders compilados antes do primeiro quadro (sem travar a página), resolução que cai em degraus
 * se o aparelho não acompanha o movimento, e os raios de oclusão/rótulos no máximo a cada CHECK_MS.
 */
import {
  BoxGeometry, BufferGeometry, CanvasTexture, Raycaster, Spherical, Color, EdgesGeometry, Float32BufferAttribute,
  Group, LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, PerspectiveCamera, RepeatWrapping,
  SRGBColorSpace, Scene, Vector3, WebGLRenderer, type Material, type Object3D,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Slot } from '../core/types';
import type { Box, Layout } from './layout';
import { buildModel, depthOnlyMaterial, setLook, studio } from './models';
import { FOCUS_DIR, focusDistance, occluders } from './occlusion';

const UNIT = new BoxGeometry(1, 1, 1);
const UNIT_EDGES = new EdgesGeometry(UNIT);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** Opacidade das peças que ficam na frente da peça em foco. */
const OCCLUDER_ALPHA = 0.22;
/** Intervalo mínimo (ms) entre os testes de raio (quem tampa a peça em foco, rótulos escondidos) durante movimento. */
const CHECK_MS = 100;
/** Idem durante animação automática (voo da câmera, encaixe): o estado final é calculado de qualquer jeito. */
const CHECK_ANIM_MS = 250;
/** Quadro em movimento mais lento que isso (ms) conta como lento; vários seguidos baixam a resolução. */
const SLOW_FRAME_MS = 24;
/** Parado por este tempo (ms): aplica a resolução nova (fora do gesto). */
const SETTLE_MS = 180;

export type View = 'geral' | 'vidro' | 'frente' | 'traseira' | 'topo';
/** De onde a câmera olha em cada vista (gabinete: frente em x = 0, vidro em z = 0, topo em y). */
const VIEWS: Record<Exclude<View, 'geral'>, [number, number, number]> = {
  vidro: [0, 0.18, -1], frente: [-1, 0.15, -0.2], traseira: [1, 0.15, 0.2], topo: [-0.05, 1, -0.35],
};

interface Tween { start: number; dur: number; ease: (t: number) => number; step: (k: number) => void; done?: () => void }

export interface SceneOptions { animate: boolean }

export class PcScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(35, 1, 10, 20000);
  private controls: OrbitControls;
  private root = new Group();
  private meshes = new Map<string, Object3D>();
  private dimLines = new Map<string, { line: LineSegments; label: HTMLElement; mid: Vector3; part: string }>();
  private labelRay = new Raycaster();
  private materials = new Map<string, Material>();
  private tweens: Tween[] = [];
  private frame = 0;
  private active = true;
  private layout?: Layout;
  private ro: ResizeObserver;
  private disposeEnv: () => void;
  /** Última peça escolhida: o que estiver entre a câmera e ela fica transparente. */
  private focusSlot?: Slot;
  private occlusionDirty = false;
  private lastOcclusion = -Infinity;
  private lastLabels = -Infinity;
  private checkTimer = 0;
  /** Shaders prontos: antes disso não desenha (o primeiro quadro não trava a página compilando). */
  private compiled = false;
  /** Resolve quando o primeiro quadro pode ser desenhado. */
  readonly ready: Promise<void>;
  private markReady!: () => void;
  /** Variantes transparentes compiladas de antemão (mantidas vivas: descartar o material descarta o programa). */
  private warm: Material[] = [];
  /** Malhas de aquecimento: desenhadas uma vez (sem área na tela) e retiradas. */
  private warmGroup?: Group;
  /** Resolução: começa cheia (até 2×) e cai em degraus em aparelho lento; vale para a sessão. */
  private readonly dprSteps = [...new Set([Math.min(devicePixelRatio || 1, 2), 1.5, 1, 0.75].filter(d => d <= Math.min(devicePixelRatio || 1, 2)))];
  private dprStep = 0;
  private slowFrames = 0;
  /** Último quadro em movimento (para medir o ritmo só entre quadros seguidos). */
  private lastMotion = -Infinity;
  private settleTimer = 0;
  /** Usuário arrastando a prévia. */
  private dragging = false;

  constructor(private canvas: HTMLCanvasElement, private overlay: HTMLElement, private opts: SceneOptions) {
    this.ready = new Promise(r => (this.markReady = r));
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    // Checar erro de shader lê o log do driver de forma síncrona (trava a página a cada programa novo).
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV;
    this.renderer.setPixelRatio(this.dprSteps[0]);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.disposeEnv = studio(this.scene, this.renderer);
    this.scene.add(this.root);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = opts.animate;
    this.controls.dampingFactor = 0.12;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.55;   // mais lento que o padrão: dá para girar com precisão
    // Sem zoom pela roda/pinça: não sequestra a rolagem da página; a câmera foca sozinha a peça escolhida.
    this.controls.enableZoom = false;
    // Gira 360° (por trás aparece a traseira com os furos; painéis e placa-mãe na frente da peça em foco
    // ficam transparentes), mas sem passar muito abaixo do piso.
    this.controls.minPolarAngle = 0.15;
    this.controls.maxPolarAngle = Math.PI * 0.6;
    this.controls.addEventListener('change', () => { this.occlusionDirty = true; this.invalidate(); });
    this.controls.addEventListener('start', () => { this.dragging = true; });
    this.controls.addEventListener('end', () => { this.dragging = false; });
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  /** Visível na tela? Fora dela não renderiza. */
  setActive(on: boolean) {
    this.active = on;
    if (on) this.invalidate();
  }

  update(layout: Layout, focus?: Slot) {
    const first = !this.layout;
    const prevSize = this.layout?.caseSize;
    this.layout = layout;
    const [L, H, W] = layout.caseSize;
    // Centro do gabinete na origem da cena.
    this.root.position.set(-L / 2, -H / 2, -W / 2);

    const seen = new Set<string>();
    const inserted: Box[] = [];
    // Com o gabinete detalhado, as placas simples (piso, bandeja, traseira) ficam só para a vista 2D.
    const detailedCase = layout.boxes.some(b => b.kind === 'shell' && b.model);
    for (const b of layout.boxes) {
      if (detailedCase && b.kind === 'shell' && !b.model) continue;
      seen.add(b.key);
      let obj = this.meshes.get(b.key);
      // A sobra fica 2 mm maior que a região para aparecer por cima da peça (sem z-fighting).
      const grow = b.kind === 'excess' ? 2 : 0;
      // Modelo detalhado é construído no tamanho real (escala 1); a caixa simples é um cubo unitário escalado.
      const target = { pos: new Vector3(...b.pos), size: b.model ? new Vector3(1, 1, 1) : new Vector3(...b.size).addScalar(grow) };
      // Modelo reconstruído se mudou o tamanho ou os dados (ex.: escolher a placa-mãe põe o espelho de I/O no gabinete).
      if (obj && b.model && (!sameSize(obj.userData.size, b.size) || obj.userData.modelKey !== JSON.stringify(b.model))) { this.removeObj(b.key, obj); obj = undefined; }
      if (!obj) {
        obj = this.createMesh(b);
        this.meshes.set(b.key, obj);
        this.root.add(obj);
        obj.position.copy(target.pos);
        obj.scale.copy(target.size);
        if (!first && (b.kind === 'part' || b.kind === 'excess' || b.kind === 'limit')) inserted.push(b);
      } else {
        this.setMaterial(obj, b);
        this.moveTo(obj, target.pos, target.size);
      }
    }
    for (const [key, obj] of this.meshes) {
      if (!seen.has(key)) this.removeObj(key, obj);
    }
    this.animateInsert(inserted);
    this.updateDims(layout);

    if (first || (prevSize && prevSize.some((v, i) => v !== layout.caseSize[i]) && !focus)) this.frameAll(!first);
    else if (focus) this.focusOn(focus);
    this.occlusionDirty = true;
    if (first) this.compile();
    this.invalidate();
  }

  /** Compila os shaders em paralelo (KHR_parallel_shader_compile) antes do primeiro quadro; com folga de 4 s se o driver não responder. */
  private compile() {
    const done = () => {
      if (this.compiled) return;
      this.compiled = true;
      this.markReady();
      this.invalidate();
      const idle = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 300));
      idle(() => this.warmFades());
    };
    this.renderer.compileAsync(this.scene, this.camera).then(done, done);
    setTimeout(done, 4000);
  }

  /**
   * Peça que tampa a peça em foco fica transparente: material transparente é outro programa de shader
   * (e outro estado de mistura, que alguns drivers só preparam no primeiro desenho).
   * Compila essas variantes (e o passe só de profundidade) e as desenha uma vez com a página parada,
   * não no meio da troca de peça.
   */
  private warmFades() {
    if (!this.compiled || this.warm.length) return;
    const g = new Group();
    const seen = new Set<Material>();
    this.root.traverse(o => {
      const m = (o as Mesh).material as Material | undefined;
      if (!(o as Mesh).isMesh || !m || Array.isArray(m) || m.transparent || seen.has(m)) return;
      seen.add(m);
      const c = m.clone();
      c.transparent = true;
      c.depthWrite = false;
      this.warm.push(c);
      g.add(new Mesh(UNIT, c));
    });
    g.add(new Mesh(UNIT, depthOnlyMaterial()));
    // Escala ~0 e sem descarte por frustum: a chamada de desenho acontece, mas não pinta nenhum pixel.
    g.scale.setScalar(1e-6);
    g.traverse(o => { o.frustumCulled = false; o.raycast = () => {}; });
    this.renderer.compileAsync(g, this.camera, this.scene).catch(() => {}).then(() => {
      if (!this.warm.length) return;   // descartada no meio
      this.warmGroup = g;
      this.scene.add(g);
      this.invalidate();
    });
  }

  /** Volta a câmera para a vista geral. */
  frameAll(animated = true) {
    if (!this.layout) return;
    this.focusSlot = undefined;
    this.occlusionDirty = true;
    const [L, H, W] = this.layout.caseSize;
    // Enquadra a esfera envolvente do gabinete no menor campo de visão (prévia em pé no celular corta menos).
    const r = Math.hypot(L, H, W) / 2, fov = (this.camera.fov * Math.PI) / 180;
    const halfFov = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect)) / 2;
    const d = (r / Math.sin(halfFov)) * 1.08;
    this.flyTo(new Vector3(0, 0, 0), new Vector3(-0.45, 0.32, -0.85).normalize().multiplyScalar(d).add(new Vector3(0, 0, -W / 4)), animated);
  }

  /** Vistas prontas, enquadrando o gabinete inteiro. */
  setView(view: View) {
    if (!this.layout) return;
    if (view === 'geral') return this.frameAll();
    this.focusSlot = undefined;
    this.occlusionDirty = true;
    const [L, H, W] = this.layout.caseSize;
    const dir = new Vector3(...VIEWS[view]).normalize();
    // Distância para a esfera envolvente caber no campo de visão (com folga).
    const r = Math.hypot(L, H, W) / 2, fov = (this.camera.fov * Math.PI) / 180;
    const halfFov = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect)) / 2;
    const d = (r / Math.sin(halfFov)) * 1.02;
    this.flyTo(new Vector3(0, 0, 0), dir.multiplyScalar(d));
  }

  /** Aproxima (< 1) ou afasta (> 1) a câmera do alvo, com limites. */
  zoomBy(factor: number) {
    const off = this.camera.position.clone().sub(this.controls.target);
    const d = Math.min(4000, Math.max(120, off.length() * factor));
    this.camera.position.copy(this.controls.target).add(off.setLength(d));
    this.controls.update();
    this.invalidate();
  }

  /** Gira em volta do alvo (radianos), respeitando os limites de inclinação. Usado pelo teclado. */
  orbit(dAzimuth: number, dPolar: number) {
    const off = this.camera.position.clone().sub(this.controls.target);
    const sph = new Spherical().setFromVector3(off);
    sph.theta += dAzimuth;
    sph.phi = Math.min(this.controls.maxPolarAngle, Math.max(this.controls.minPolarAngle, sph.phi + dPolar));
    this.camera.position.copy(this.controls.target).add(new Vector3().setFromSpherical(sph));
    this.controls.update();
    this.invalidate();
  }

  /** Zoom pela roda/pinça: só em tela cheia (na página, a roda continua rolando a página). */
  setWheelZoom(on: boolean) {
    this.controls.enableZoom = on;
    this.controls.minDistance = 120;
    this.controls.maxDistance = 4000;
  }

  private focusOn(slot: Slot) {
    const f = this.layout?.focus[slot];
    if (!f) return this.frameAll();
    const [L, H, W] = this.layout!.caseSize;
    const center = new Vector3(f.pos[0] - L / 2, f.pos[1] - H / 2, f.pos[2] - W / 2);
    this.focusSlot = slot;
    this.occlusionDirty = true;
    const dir = f.dir ? new Vector3(...f.dir).normalize() : FOCUS_DIR.clone();
    // A câmera fica sempre fora do gabinete (com folga), por mais perto que a peça peça.
    const half = new Vector3(L / 2 + 40, H / 2 + 40, W / 2 + 40);
    let exit = Infinity;
    for (const a of [0, 1, 2] as const) {
      const dc = dir.getComponent(a), c = center.getComponent(a), hv = half.getComponent(a);
      if (Math.abs(dc) > 1e-6) exit = Math.min(exit, ((dc > 0 ? hv : -hv) - c) / dc);
    }
    this.flyTo(center, center.clone().addScaledVector(dir, Math.max(focusDistance(f.size), exit)));
  }

  private flyTo(target: Vector3, pos: Vector3, animated = true) {
    if (!this.opts.animate || !animated) {
      this.controls.target.copy(target);
      this.camera.position.copy(pos);
      this.controls.update();
      return this.invalidate();
    }
    const t0 = this.controls.target.clone(), p0 = this.camera.position.clone();
    this.tween(650, easeInOut, k => {
      this.controls.target.lerpVectors(t0, target, k);
      this.camera.position.lerpVectors(p0, pos, k);
    });
  }

  private moveTo(obj: Object3D, pos: Vector3, size: Vector3) {
    if (obj.position.equals(pos) && obj.scale.equals(size)) return;
    if (!this.opts.animate) { obj.position.copy(pos); obj.scale.copy(size); return; }
    const p0 = obj.position.clone(), s0 = obj.scale.clone();
    this.tween(350, easeOut, k => { obj.position.lerpVectors(p0, pos, k); obj.scale.lerpVectors(s0, size, k); this.occlusionDirty = true; });
  }

  /** Peça nova entra pelo painel lateral; se não cabe, trava e "tranca" antes de mostrar a sobra vermelha. */
  private animateInsert(boxes: Box[]) {
    if (!this.opts.animate || !boxes.length) return;
    const parts = boxes.filter(b => b.kind === 'part');
    const extras = boxes.filter(b => b.kind !== 'part');
    const bad = parts.some(b => b.conflict);
    for (const b of extras) this.meshes.get(b.key)!.visible = false;
    for (const b of parts) {
      const obj = this.meshes.get(b.key)!;
      const end = obj.position.clone();
      const start = end.clone().add(new Vector3(0, 60, -320));
      obj.position.copy(start);
      this.tween(420, easeOut, k => { obj.position.lerpVectors(start, end, k); this.occlusionDirty = true; }, () => {
        if (!b.conflict) return;
        // Tranco: bate no limite e volta.
        const axis = b.slot === 'cooler' ? 2 : 0;
        this.tween(260, t => t, k => {
          const p = end.clone();
          p.setComponent(axis, end.getComponent(axis) + Math.sin(k * Math.PI * 5) * 6 * (1 - k));
          obj.position.copy(p);
        });
      });
    }
    setTimeout(() => {
      for (const b of extras) { const m = this.meshes.get(b.key); if (m) m.visible = true; }
      this.updateDims(this.layout!);
      this.invalidate();
    }, bad ? 700 : 420);
    if (extras.length) for (const [, d] of this.dimLines) { d.line.visible = false; d.label.hidden = true; }
  }

  private updateDims(layout: Layout) {
    const keys = new Set(layout.dims.map(d => d.key));
    for (const [key, d] of this.dimLines) {
      if (!keys.has(key)) { this.root.remove(d.line); d.label.remove(); this.dimLines.delete(key); }
    }
    for (const d of layout.dims) {
      let entry = this.dimLines.get(d.key);
      if (!entry) {
        const geo = new BufferGeometry();
        const line = new LineSegments(geo, new LineBasicMaterial({ color: 0xff6b6b, depthTest: false }));
        line.renderOrder = 10;
        const label = document.createElement('div');
        label.className = 'dim';
        this.overlay.append(label);
        entry = { line, label, mid: new Vector3(), part: d.key.replace(/:dim$/, '') };
        this.root.add(line);
        this.dimLines.set(d.key, entry);
      }
      const [a, b] = [new Vector3(...d.from), new Vector3(...d.to)];
      // Linha da cota com "tiques" nas pontas.
      const tick = new Vector3(0, 10, 0);
      const pts = [a, b, a.clone().sub(tick), a.clone().add(tick), b.clone().sub(tick), b.clone().add(tick)];
      entry.line.geometry.setAttribute('position', new Float32BufferAttribute(pts.flatMap(p => p.toArray()), 3));
      // Rótulo colado na parte que sobra (e não no meio da cota, onde pode cair em cima de outra peça).
      entry.mid.set(...d.at);
      entry.label.textContent = d.label;
      const meshVisible = layout.boxes.some(x => x.kind === 'excess' && this.meshes.get(x.key)?.visible);
      entry.line.visible = meshVisible;
      entry.label.hidden = !meshVisible;
    }
  }

  private removeObj(key: string, obj: Object3D) {
    this.root.remove(obj);
    this.meshes.delete(key);
    // Geometria em cache (seções do gabinete) é reaproveitada pelo próximo modelo: não descarta.
    if (obj.userData.model) obj.traverse(o => {
      if (!(o as Mesh).isMesh) return;
      const g = (o as Mesh).geometry;
      if (!g.userData.cached) g.dispose();
      o.userData.fade?.dispose();
    });
  }

  private createMesh(b: Box): Object3D {
    if (b.model) {
      const g = buildModel(b.model, b.size);
      g.userData = { kind: b.kind, slot: b.slot, model: true, size: [...b.size], modelKey: JSON.stringify(b.model) };
      setLook(g, !!b.conflict);
      return g;
    }
    const mesh = new Mesh(UNIT, this.material(b));
    if (b.kind !== 'limit') {
      const edges = new LineSegments(UNIT_EDGES, this.edgeMaterial(b));
      mesh.add(edges);
    }
    mesh.userData.kind = b.kind;
    return mesh;
  }

  private setMaterial(obj: Object3D, b: Box) {
    // Só reaplica se o conflito mudou (senão desfaria a transparência dos painéis do gabinete).
    if (obj.userData.model) { if (obj.userData.conflict !== !!b.conflict) setLook(obj as Group, !!b.conflict, obj.userData.alpha ?? 1); return; }
    const mesh = obj as Mesh;
    mesh.material = this.material(b);
    const edges = mesh.children[0] as LineSegments | undefined;
    if (edges) edges.material = this.edgeMaterial(b);
  }

  private material(b: Box): Material {
    const key = `${b.kind}|${b.color}|${b.conflict ? 1 : 0}`;
    let m = this.materials.get(key);
    if (m) return m;
    if (b.kind === 'shell' || b.kind === 'ghost') {
      m = new MeshStandardMaterial({ color: b.color, transparent: true, opacity: b.kind === 'ghost' ? 0.05 : 0.14, depthWrite: false, roughness: 0.9 });
    } else if (b.kind === 'excess') {
      m = new MeshStandardMaterial({ color: b.color, map: hatch(), transparent: true, opacity: 0.85, emissive: new Color(b.color), emissiveIntensity: 0.35, depthWrite: false });
    } else if (b.kind === 'limit') {
      m = new MeshStandardMaterial({ color: b.color, transparent: true, opacity: 0.45, emissive: new Color(b.color), emissiveIntensity: 0.6, depthWrite: false });
    } else {
      const c = new Color(b.color);
      m = new MeshStandardMaterial({
        color: b.conflict ? c.lerp(new Color('#e5484d'), 0.3) : c, roughness: 0.55, metalness: 0.25,
        emissive: b.conflict ? new Color('#5a0c10') : new Color(0x000000), emissiveIntensity: b.conflict ? 0.4 : 0,
      });
    }
    this.materials.set(key, m);
    return m;
  }

  private edgeMaterial(b: Box): Material {
    const key = `edge|${b.kind}|${b.conflict ? 1 : 0}`;
    let m = this.materials.get(key);
    if (!m) {
      const color = b.kind === 'excess' || b.conflict ? 0xff8a8a : b.kind === 'part' ? 0x111111 : 0xbdbdbd;
      const opacity = b.kind === 'ghost' ? 0.25 : b.kind === 'shell' ? 0.6 : 0.8;
      m = new LineBasicMaterial({ color, transparent: true, opacity });
      this.materials.set(key, m);
    }
    return m;
  }

  /** Deixa transparente o que tampa a peça em foco (e volta ao normal o que deixou de tampar). */
  private updateOcclusion() {
    this.occlusionDirty = false;
    const targets: Object3D[] = [], others: Object3D[] = [];
    for (const obj of this.meshes.values()) {
      if (!obj.userData.model) continue;
      // Gabinete: cada painel (frente, topo, traseira…) apaga sozinho quando a câmera gira para trás dele.
      if (obj.userData.slot === 'case') { if (this.focusSlot) others.push(...obj.children.filter(c => c.userData.section !== 'glass')); continue; }
      if (obj.userData.kind !== 'part') continue;
      if (obj.userData.slot === this.focusSlot) targets.push(obj);
      else others.push(obj);
    }
    const all = [...targets, ...others];
    for (const obj of this.meshes.values()) if (obj.userData.slot === 'case' && obj.userData.model) all.push(...obj.children);
    this.root.updateMatrixWorld();
    const hit = this.focusSlot ? occluders(this.camera.position, targets, others) : new Set<Object3D>();
    for (const o of new Set(all)) this.fade(o, hit.has(o) ? OCCLUDER_ALPHA : 1);
  }

  private fade(obj: Object3D, to: number) {
    if ((obj.userData.fadeTo ?? 1) === to) return;
    obj.userData.fadeTo = to;
    // Só o fade mais recente de cada peça vale (a câmera pode girar no meio de um fade).
    const token = obj.userData.fadeToken = (obj.userData.fadeToken ?? 0) + 1;
    const from = obj.userData.alpha ?? 1;
    const apply = (a: number) => setLook(obj as Group, !!obj.userData.conflict, a);
    if (!this.opts.animate) return apply(to);
    this.tween(200, easeOut, k => { if (obj.userData.fadeToken === token) apply(from + (to - from) * k); });
  }

  private tween(dur: number, ease: Tween['ease'], step: Tween['step'], done?: () => void) {
    this.tweens.push({ start: performance.now(), dur, ease, step, done });
    this.invalidate();
  }

  invalidate() {
    if (!this.frame) this.frame = requestAnimationFrame(t => this.tick(t));
  }

  private tick(now: number) {
    this.frame = 0;
    for (const tw of [...this.tweens]) {
      const k = Math.min(1, (now - tw.start) / tw.dur);
      tw.step(tw.ease(k));
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.done?.(); }
    }
    const damping = this.controls.update();
    // Câmera ou peças se mexendo mudam quem tampa a peça em foco (marcado pelo evento `change` e pelos tweens).
    // Raios contra os triângulos custam caro: no máximo a cada CHECK_MS; o último estado sempre é calculado.
    if (this.occlusionDirty) {
      const every = this.tweens.length ? CHECK_ANIM_MS : CHECK_MS;
      if (now - this.lastOcclusion >= every) { this.lastOcclusion = now; this.updateOcclusion(); }
      else this.checkLater(every - (now - this.lastOcclusion));
    }
    if (this.active && this.compiled) {
      this.setDpr(now, this.dragging || damping || this.tweens.length > 0);
      this.renderer.render(this.scene, this.camera);
      if (this.warmGroup) { this.scene.remove(this.warmGroup); this.warmGroup = undefined; }
      this.canvas.dataset.calls = String(this.renderer.info.render.calls);   // para testes de desempenho
      this.placeLabels(now);
    }
    if (this.tweens.length || damping) this.invalidate();
  }

  /** Testes adiados pelo intervalo mínimo: um quadro a mais quando o tempo passar. */
  private checkLater(ms: number) {
    if (this.checkTimer) return;
    this.checkTimer = window.setTimeout(() => { this.checkTimer = 0; this.invalidate(); }, ms);
  }

  /**
   * Resolução adaptativa: vários quadros lentos seguidos em movimento (arrasto, amortecimento, animação) descem um
   * degrau. A troca só acontece com a prévia parada: mudar o tamanho do canvas espera a GPU terminar a fila e o
   * apaga, então é feita logo antes de desenhar e nunca no meio de um gesto.
   */
  private setDpr(now: number, moving: boolean) {
    const dpr = this.dprSteps[this.dprStep];
    if (moving) {
      const dt = now - this.lastMotion;
      this.lastMotion = now;
      // Só conta o ritmo entre quadros em movimento seguidos (o primeiro depois de parado não diz nada).
      if (dt < 1000) this.slowFrames = dt > SLOW_FRAME_MS ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
      if (this.slowFrames >= 8 && this.dprStep < this.dprSteps.length - 1) {
        this.dprStep++;
        this.slowFrames = 0;
        // Aparelho lento: sem inércia ao soltar (a cauda do amortecimento seria uma fila de quadros caros).
        this.controls.enableDamping = false;
      }
      // Degrau novo pendente: um quadro extra quando parar, para aplicá-lo.
      clearTimeout(this.settleTimer);
      if (this.renderer.getPixelRatio() !== this.dprSteps[this.dprStep]) this.settleTimer = window.setTimeout(() => this.invalidate(), SETTLE_MS);
      return;
    }
    this.lastMotion = -Infinity;
    if (this.renderer.getPixelRatio() !== dpr) this.renderer.setPixelRatio(dpr);
  }

  private placeLabels(now: number) {
    if (!this.dimLines.size) return;
    const { clientWidth: w, clientHeight: h } = this.canvas;
    // Rótulo escondido atrás de algo opaco: raio a cada CHECK_MS (a posição acompanha todo quadro).
    const check = now - this.lastLabels >= CHECK_MS;
    if (check) this.lastLabels = now;
    else this.checkLater(CHECK_MS - (now - this.lastLabels));
    for (const [, d] of this.dimLines) {
      if (d.label.hidden) continue;
      const world = d.mid.clone().add(this.root.position);
      const p = world.clone().project(this.camera);
      d.label.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px) translate(-50%, -50%)`;
      // Escondido atrás de algo opaco (ex.: olhando o gabinete por trás) o rótulo some, em vez de "atravessar" a peça.
      if (check) d.label.style.visibility = this.labelBlocked(world, d.part) ? 'hidden' : 'visible';
    }
  }

  /** Há algo opaco entre a câmera e o ponto? Ignora a própria peça, as sobras, o vidro e o que está transparente. */
  private labelBlocked(point: Vector3, part: string) {
    const cam = this.camera.position, dir = point.clone().sub(cam), dist = dir.length();
    this.labelRay.set(cam, dir.normalize());
    this.labelRay.far = dist - 2;
    const objs = [...this.meshes].filter(([key, o]) => !key.startsWith(part) && o.visible && o.userData.kind !== 'excess' && o.userData.kind !== 'limit').map(([, o]) => o);
    return this.labelRay.intersectObjects(objs, true).some(hit => {
      const mat = (hit.object as Mesh).material as MeshStandardMaterial;
      if ((mat.transparent && mat.opacity < 0.6) || (mat as unknown as { colorWrite?: boolean }).colorWrite === false) return false;
      // Do gabinete, só esconde o rótulo o que fecha o fundo (bandeja, tampa, traseira): frente, topo e quadro não,
      // senão a cota de uma GPU que passa da frente sumiria justo onde ela bate.
      let o: Object3D | null = hit.object, section: string | undefined;
      while (o && !section) { section = o.userData.section; o = o.parent; }
      return !section || ['back', 'tray', 'rear'].includes(section);
    });
  }

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.checkTimer);
    clearTimeout(this.settleTimer);
    for (const m of this.warm) m.dispose();
    this.warm = [];
    this.markReady();   // quem espera o primeiro quadro não fica pendurado
    this.ro.disconnect();
    this.controls.dispose();
    for (const m of this.materials.values()) m.dispose();
    for (const [key, obj] of this.meshes) this.removeObj(key, obj);
    this.disposeEnv();
    for (const [, d] of this.dimLines) { d.line.geometry.dispose(); d.label.remove(); }
    this.renderer.dispose();
  }
}

const sameSize = (a: number[] | undefined, b: number[]) => !!a && a.every((v, i) => Math.abs(v - b[i]) < 0.01);

let hatchTex: CanvasTexture | undefined;
/** Textura hachurada (listras diagonais) para a parte que sobra. */
function hatch(): CanvasTexture {
  if (hatchTex) return hatchTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e5484d';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 7;
  for (let i = -64; i < 128; i += 22) { g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); }
  hatchTex = new CanvasTexture(c);
  hatchTex.wrapS = hatchTex.wrapT = RepeatWrapping;
  hatchTex.repeat.set(2, 2);
  hatchTex.colorSpace = SRGBColorSpace;
  return hatchTex;
}


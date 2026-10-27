/*
 * <mp-pc-viewer>: prévia ilustrativa da montagem. 3D (Three.js, carregado só quando aparece na tela)
 * ou 2D (SVG da vista lateral, mesmo layout) em aparelho sem WebGL/fraco ou por escolha do usuário.
 */
import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import type { Evaluation, Slot } from '../core';
import { buildLayout, type Layout } from '../three/layout';
import { sideView } from './side-view';
import type { PcScene, View } from '../three/scene';
import { rearIoList } from './specs';
import { tokens } from './styles';

type Mode = '3d' | '2d';
const PREF_KEY = 'mp-viewer-mode';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const VIEW_LABEL: Record<View, string> = { geral: 'Geral', vidro: 'Lateral', frente: 'Frente', traseira: 'Traseira', topo: 'Topo' };
const ICON_FULL = html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`;
const ICON_EXIT_FULL = html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`;

function canWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function defaultMode(): Mode {
  try {
    const saved = localStorage.getItem(PREF_KEY);
    if (saved === '2d' || saved === '3d') return saved === '3d' && !canWebGL() ? '2d' : saved;
  } catch { /* storage indisponível */ }
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  const weak = nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 2;
  return !weak && canWebGL() ? '3d' : '2d';
}

export class PcViewer extends LitElement {
  static properties = {
    evaluation: { attribute: false },
    focusPart: { attribute: false },
    _mode: { state: true },
    _loading: { state: true },
    _full: { state: true },
    _view: { state: true },
    _said: { state: true },
  };

  declare evaluation?: Evaluation;
  /** Slot recém-escolhido; `n` muda a cada escolha para refocar mesmo no mesmo slot. */
  declare focusPart?: { slot: Slot; n: number };
  declare _mode: Mode;
  declare _loading: boolean;
  /** Tela cheia (API do navegador ou, sem ela, painel fixo cobrindo a página). */
  declare _full: boolean;
  declare _view?: View;
  /** Anúncio para leitor de tela (vista atual). */
  declare _said: string;

  private scene?: PcScene;
  private loadingScene?: Promise<void>;
  private io?: IntersectionObserver;
  private visible = false;
  private layout?: Layout;

  constructor() {
    super();
    this._mode = defaultMode();
    this._loading = false;
    this._full = false;
    this._said = '';
  }

  /** Elemento em tela cheia visto da raiz deste componente (o `document` só enxerga o host do shadow DOM). */
  private get isFsElement() {
    const root = this.getRootNode() as Document | ShadowRoot;
    return (root.fullscreenElement ?? null) === this;
  }

  private onFsChange = () => {
    const on = this.isFsElement;
    if (!on && this._full && !this.classList.contains('fallback')) this.setFull(false);
  };

  private onEscFallback = (e: KeyboardEvent) => { if (e.key === 'Escape' && this._full) this.setFull(false); };

  private async setFull(on: boolean) {
    this._full = on;
    this.scene?.setWheelZoom(on);
    if (on) {
      if (this.requestFullscreen && document.fullscreenEnabled) {
        try { await this.requestFullscreen(); this.classList.remove('fallback'); } catch { this.classList.add('fallback'); }
      } else this.classList.add('fallback');
      // Esc fecha também no painel fixo (sem a API) e quando o navegador entrega a tecla à página.
      document.addEventListener('keydown', this.onEscFallback);
      this._said = 'Tela cheia. Role para aproximar; Esc para sair.';
    } else {
      document.removeEventListener('keydown', this.onEscFallback);
      if (this.isFsElement) await document.exitFullscreen().catch(() => {});
      this.classList.remove('fallback');
      this._said = 'Saiu da tela cheia.';
    }
  }

  private view(v: View) {
    this._view = v;
    this.scene?.setView(v);
    this._said = `Vista ${VIEW_LABEL[v].toLowerCase()}.`;
  }

  /** Teclado na prévia 3D: setas giram, + e − aproximam, 0 a 4 escolhem a vista. */
  private onKey(e: KeyboardEvent) {
    const sc = this.scene;
    if (!sc) return;
    const step = Math.PI / 15;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => sc.orbit(-step, 0), ArrowRight: () => sc.orbit(step, 0),
      ArrowUp: () => sc.orbit(0, -step / 2), ArrowDown: () => sc.orbit(0, step / 2),
      '+': () => sc.zoomBy(0.85), '=': () => sc.zoomBy(0.85), '-': () => sc.zoomBy(1.18),
      '0': () => this.view('geral'), '1': () => this.view('vidro'), '2': () => this.view('frente'), '3': () => this.view('traseira'), '4': () => this.view('topo'),
    };
    const fn = keys[e.key];
    if (!fn) return;
    e.preventDefault();
    if (e.key.startsWith('Arrow')) this._view = undefined;
    fn();
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('fullscreenchange', this.onFsChange);
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.scene?.setActive(this.visible);
      if (this.visible && this._mode === '3d') this.ensureScene();
    });
    this.io.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('fullscreenchange', this.onFsChange);
    document.removeEventListener('keydown', this.onEscFallback);
    this.io?.disconnect();
    this.scene?.dispose();
    this.scene = undefined;
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('evaluation') && this.evaluation) this.layout = buildLayout(this.evaluation);
  }

  protected updated(changed: PropertyValues<this>) {
    if (changed.has('_mode')) {
      if (this._mode === '3d' && this.visible) this.ensureScene();
      if (this._mode === '2d') { this.scene?.dispose(); this.scene = undefined; this.loadingScene = undefined; }
    }
    if (this.scene && this.layout && (changed.has('evaluation') || changed.has('focusPart'))) {
      const prev = changed.get('focusPart') as PcViewer['focusPart'];
      this.scene.update(this.layout, this.focusPart && this.focusPart.n !== prev?.n ? this.focusPart.slot : undefined);
    }
  }

  private ensureScene() {
    if (this.scene || this.loadingScene) return;
    this._loading = true;
    this.loadingScene = import('../three/scene').then(({ PcScene }) => {
      if (this._mode !== '3d') return;
      const canvas = this.renderRoot.querySelector('canvas')!;
      const overlay = this.renderRoot.querySelector<HTMLElement>('.overlay')!;
      try {
        this.scene = new PcScene(canvas, overlay, { animate: !reducedMotion() });
        this.scene.setWheelZoom(this._full);
        if (this.layout) this.scene.update(this.layout);
        this.scene.setActive(this.visible);
      } catch (err) {
        console.warn('[monte-seu-pc] 3D indisponível, usando 2D', err);
        this._mode = '2d';
      }
    }).catch(err => {
      console.warn('[monte-seu-pc] falha ao carregar o 3D, usando 2D', err);
      this._mode = '2d';
    }).finally(() => { this._loading = false; });
  }

  private setMode(m: Mode) {
    this._mode = m;
    try { localStorage.setItem(PREF_KEY, m); } catch { /* ok */ }
  }

  render() {
    const l = this.layout;
    const ev = this.evaluation;
    const count = ev ? Object.keys(ev.selected).length : 0;
    const misfits = ev?.issues.filter(i => i.severity === 'nofit') ?? [];
    const label = `Prévia ilustrativa da montagem com ${count} ${count === 1 ? 'peça' : 'peças'}${misfits.length ? `. ${misfits.length} conflito(s) de encaixe, em vermelho` : ''}.`;
    const is3d = this._mode === '3d';
    const ports = ev?.selected.mobo?.rearIo ? rearIoList(ev.selected.mobo.rearIo) : null;
    return html`<div class="wrap">
      <div class="head">
        <h3>Prévia da montagem <span class="tag">ilustrativa</span></h3>
        <div class="acts">
          <button @click=${() => this.setFull(!this._full)} aria-pressed=${this._full ? 'true' : 'false'}
            aria-label=${this._full ? 'Sair da tela cheia' : 'Abrir a prévia em tela cheia'} title=${this._full ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}>${this._full ? ICON_EXIT_FULL : ICON_FULL}</button>
          <button @click=${() => this.setMode(is3d ? '2d' : '3d')} aria-label=${is3d ? 'Mudar para vista 2D' : 'Mudar para vista 3D'}>${is3d ? '2D' : '3D'}</button>
        </div>
      </div>
      <div class="stage">
        ${is3d
          ? html`<canvas tabindex="0" role="application" aria-roledescription="prévia 3D"
              aria-label=${`${label} Setas giram, + e − aproximam, 0 a 4 escolhem a vista.`}
              aria-describedby=${ports ? 'ports' : nothing} @keydown=${this.onKey}></canvas>
            <div class="overlay"></div>
            ${this._loading ? html`<p class="hint center">Carregando 3D…</p>` : nothing}
`
          : html`<div class="svgwrap" role="img" aria-label=${label}>${l ? sideView(l) : nothing}</div>`}
        ${l?.ghostCase ? html`<p class="hint corner">Gabinete genérico: escolha um gabinete</p>` : nothing}
      </div>
      ${is3d ? html`${this.scene ? html`<div class="tools" role="toolbar" aria-label="Vistas e zoom">
              ${(['geral', 'vidro', 'frente', 'traseira', 'topo'] as View[]).map((v, i) => html`
                <button aria-pressed=${this._view === v ? 'true' : 'false'} @click=${() => this.view(v)} title=${`${VIEW_LABEL[v]} (tecla ${i})`}>${VIEW_LABEL[v]}</button>`)}
              <span class="sep" aria-hidden="true"></span>
              <button @click=${() => this.scene?.zoomBy(1.18)} aria-label="Afastar" title="Afastar (−)">−</button>
              <button @click=${() => this.scene?.zoomBy(0.85)} aria-label="Aproximar" title="Aproximar (+)">+</button>
            </div>` : nothing}` : nothing}
      ${misfits.length
        ? html`<p class="note bad">Em vermelho: peça que não cabe no gabinete. A parte hachurada é o que sobra.</p>`
        : html`<p class="note">${is3d ? 'Arraste ou use as setas para girar. O que fica na frente da última peça escolhida aparece transparente.' : 'Modelos genéricos nas medidas de cada peça.'}</p>`}
      ${ports ? html`<details class="ports"><summary>Portas traseiras da placa-mãe</summary><ul id="ports">${ports.map(t => html`<li>${t}</li>`)}</ul></details>` : nothing}
      <div class="sr-only" aria-live="polite">${this._said}</div></div>`;
  }

  static styles = [tokens, css`
    :host { display: block; background: var(--mp-surface); border: 1px solid var(--mp-line); border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    h3 { margin: 0; font-size: 15px; display: flex; align-items: center; gap: 8px; }
    .tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--mp-muted); border: 1px solid var(--mp-border); border-radius: 4px; padding: 2px 5px; }
    .acts { display: flex; gap: 6px; }
    .acts button { min-width: 44px; height: 36px; border-radius: 4px; border: 1px solid var(--mp-border); background: var(--mp-pop); cursor: pointer; font-size: 13px; font-weight: 700; }
    .acts button:hover { background: var(--mp-hover); }
    .stage { position: relative; height: var(--mp-viewer-h, 260px); border-radius: 6px; overflow: hidden;
      background: radial-gradient(120% 90% at 50% 30%, var(--stage-a, #3b3b3b) 0%, var(--stage-b, #262626) 100%); }
    canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
    canvas:focus-visible { outline: 3px solid var(--mp-focus); outline-offset: -3px; }
    .svgwrap { width: 100%; height: 100%; }
    /* Vistas e zoom: embaixo da prévia (não cobrem o PC). */
    .tools { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 6px; }
    .tools button { min-height: 32px; min-width: 32px; padding: 0 8px; border-radius: 4px; border: 1px solid var(--mp-border);
      background: var(--mp-pop); color: var(--mp-text); font-size: 12px; font-weight: 700; cursor: pointer; }
    .tools button:hover { background: var(--mp-hover); }
    .tools button[aria-pressed=true] { background: var(--mp-accent); border-color: var(--mp-accent); color: #fff; }
    .tools .sep { flex: 1; }
    .ports { margin-top: 8px; font-size: 13px; }
    .ports summary { cursor: pointer; font-weight: 700; min-height: 32px; display: flex; align-items: center; }
    .ports ul { margin: 4px 0 0; padding-left: 18px; columns: 2; column-gap: 18px; }
    .ports li { margin: 2px 0; }
    /* Tela cheia: API do navegador (:fullscreen) ou painel fixo (.fallback). */
    /* !important: o site (ou o painel do celular) pode posicionar o host por fora; em tela cheia vale esta. */
    :host(:fullscreen), :host(.fallback) { margin: 0 !important; border-radius: 0 !important; padding: 14px !important; background: var(--mp-surface); box-shadow: none !important; }
    :host(.fallback) { position: fixed !important; inset: 0 !important; z-index: 2147483000 !important; overflow: auto; }
    :host(:fullscreen) .wrap, :host(.fallback) .wrap { display: flex; flex-direction: column; height: 100%; }
    :host(:fullscreen) .stage, :host(.fallback) .stage { flex: 1; height: auto; min-height: 320px; }
    :host(:fullscreen) .tools button, :host(.fallback) .tools button { min-height: 40px; min-width: 40px; font-size: 13px; }
    canvas:active { cursor: grabbing; }
    .overlay { position: absolute; inset: 0; pointer-events: none; }
    .overlay .dim { position: absolute; left: 0; top: 0; background: #e5484d; color: #fff; font-size: 12px; font-weight: 700;
      padding: 3px 7px; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0, 0, 0, .4); }
    svg { width: 100%; height: 100%; display: block; }
    svg { color: var(--mp-muted); }
    svg .shell.ghost { stroke: var(--mp-muted); stroke-width: 3; stroke-dasharray: 10 8; opacity: .6; }
    svg .dimline { stroke: #ff8a8a; stroke-width: 3; }
    svg .dimtext { fill: #fff; font-size: 17px; font-weight: 700; paint-order: stroke; stroke: #7a1015; stroke-width: 5px; }
    .hint { position: absolute; margin: 0; font-size: 12px; color: var(--mp-muted); }
    .hint.center { inset: 0; display: grid; place-items: center; }
    .hint.corner { left: 10px; top: 8px; }
    .note { margin: 8px 0 0; font-size: 12px; color: var(--mp-muted); }
    .note.bad { color: var(--mp-danger-text); }
  `];
}

if (!customElements.get('mp-pc-viewer')) customElements.define('mp-pc-viewer', PcViewer);

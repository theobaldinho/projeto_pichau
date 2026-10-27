/*
 * <mp-picker-dialog>: janela "Selecionar Componente" (modal), no lugar do antigo select de cada card.
 * Etapas no topo (1 - Processador … PRÓXIMO), filtros à esquerda (faixas, listas, seleções e caixas),
 * busca + ordenação, lista paginada com "+" para adicionar e total no rodapé.
 * Usa <dialog>.showModal(): foco preso na janela, Esc fecha e o resto da página fica inerte.
 * Eventos: mp-pick { slot, id } · mp-remove { slot } · mp-dialog-close { slot }.
 */
import { LitElement, css, html, nothing } from 'lit';
import {
  SLOTS, applyFilters, brl, choices, facetCounts, filtersFor, isActive, rangeBounds, sortOptions,
  type Evaluation, type FilterDef, type FilterState, type FilterValue, type Option, type Slot, type SortKey,
} from '../core';
import {
  ICON_ARROW, ICON_BOLT_SM, ICON_CHEVRON, ICON_FILTER, ICON_FIRST, ICON_INFO, ICON_KEYBOARD, ICON_LAST, ICON_NEXT, ICON_NO,
  ICON_OK, ICON_PLUS, ICON_PREV, ICON_RESET, ICON_SEARCH, ICON_TICK, ICON_X,
} from './icons';
import { STATUS_LABEL, rowChips } from './specs';
import { tokens } from './styles';

type Range = Extract<FilterDef, { kind: 'range' }>;
const PAGE = 8;
const SORTS: [SortKey, string][] = [['rel', 'Relevância'], ['price-asc', 'Menor preço'], ['price-desc', 'Maior preço'], ['name', 'Nome (A–Z)']];

export class PickerDialog extends LitElement {
  static properties = {
    evaluation: { attribute: false },
    _step: { state: true },
    _open: { state: true },
    _filters: { state: true },
    _query: { state: true },
    _sort: { state: true },
    _page: { state: true },
    _keys: { state: true },
    _showFilters: { state: true },
    _msg: { state: true },
  };

  declare evaluation?: Evaluation;
  declare _step: Slot;
  declare _open: boolean;
  /** Filtros, busca e ordem de cada etapa (voltar a uma etapa mantém o que estava). */
  declare _filters: Partial<Record<Slot, FilterState>>;
  declare _query: Partial<Record<Slot, string>>;
  declare _sort: Partial<Record<Slot, SortKey>>;
  declare _page: number;
  declare _keys: boolean;
  declare _showFilters: boolean;
  declare _msg: string;

  constructor() {
    super();
    this._step = 'cpu';
    this._open = false;
    this._filters = {};
    this._query = {};
    this._sort = {};
    this._page = 1;
    this._keys = false;
    this._showFilters = false;
    this._msg = '';
  }

  private get _dlg() { return this.renderRoot.querySelector('dialog'); }

  open(slot: Slot, { onlyFits = false } = {}) {
    this._step = slot;
    this._page = 1;
    if (onlyFits) this._set('fits', true);
    this._open = true;
    this.updateComplete.then(() => {
      const d = this._dlg;
      if (d && !d.open) d.showModal();
      this.renderRoot.querySelector<HTMLInputElement>('.search input')?.focus();
    });
  }

  close() { this._dlg?.close(); }

  private _onClose() {
    this._open = false;
    this._keys = false;
    this.dispatchEvent(new CustomEvent('mp-dialog-close', { detail: { slot: this._step }, bubbles: true, composed: true }));
  }

  private _go(slot: Slot) {
    this._step = slot;
    this._page = 1;
    this._showFilters = false;
    this.updateComplete.then(() => {
      this.renderRoot.querySelector('.steps [aria-current=step]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
      this.renderRoot.querySelector('.main')?.scrollTo({ top: 0 });
    });
  }

  private _move(d: 1 | -1) {
    const i = SLOTS.findIndex(s => s.slot === this._step) + d;
    if (i >= SLOTS.length) return this.close();
    if (i >= 0) this._go(SLOTS[i].slot);
  }

  private get _state(): FilterState { return this._filters[this._step] ?? {}; }

  private _set(key: string, v: FilterValue | undefined) {
    const next = { ...this._state };
    if (v === undefined || v === '' || v === false || (Array.isArray(v) && !v.length)) delete next[key];
    else next[key] = v;
    this._filters = { ...this._filters, [this._step]: next };
    this._page = 1;
  }

  private _reset() {
    this._filters = { ...this._filters, [this._step]: {} };
    this._query = { ...this._query, [this._step]: '' };
    this._page = 1;
  }

  private _pick(o: Option) {
    if (o.status === 'incompatible') return;
    this.dispatchEvent(new CustomEvent('mp-pick', { detail: { slot: this._step, id: o.part.id }, bubbles: true, composed: true }));
    this._msg = `${o.part.name} adicionado.`;
  }

  private _remove(o: Option) {
    this.dispatchEvent(new CustomEvent('mp-remove', { detail: { slot: this._step }, bubbles: true, composed: true }));
    this._msg = `${o.part.name} removido.`;
  }

  /** Atalhos: S = busca · Alt+→/← = etapa seguinte/anterior (Esc fecha, pelo próprio <dialog>). */
  private _onKey(e: KeyboardEvent) {
    const t = e.composedPath()[0] as HTMLElement;
    const typing = t instanceof HTMLInputElement && !['checkbox', 'range'].includes(t.type) || t instanceof HTMLSelectElement;
    if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); this._move(e.key === 'ArrowRight' ? 1 : -1); return; }
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      this.renderRoot.querySelector<HTMLInputElement>('.search input')?.focus();
    }
  }

  /* ---------- filtros ---------- */

  private _label(d: FilterDef, bounds?: [number, number]) {
    const on = isActive(d, this._state[d.key], bounds);
    return html`<div class="flabel"><span id="f-${d.key}">${d.label}${d.kind === 'range' ? html` <span class="unit">(${d.unit})</span>` : nothing}</span>
      <button class="freset" ?disabled=${!on} aria-label="Restaurar ${d.label} ao padrão" @click=${() => this._set(d.key, undefined)}>${ICON_RESET}</button></div>`;
  }

  private _range(d: Range, opts: Option[]) {
    const [min, max] = rangeBounds(opts, d);
    const cur = this._state[d.key] as [number, number] | undefined;
    const [lo, hi] = cur ?? [min, max];
    const pct = (v: number) => ((v - min) / (max - min)) * 100;
    const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / d.step) * d.step));
    const put = (a: number, b: number) => {
      const x = +clamp(Math.min(a, b)).toFixed(4), y = +clamp(Math.max(a, b)).toFixed(4);
      this._set(d.key, x <= min && y >= max ? undefined : [x, y]);
    };
    const val = (e: Event) => +(e.target as HTMLInputElement).value;
    return html`<div class="filter slider">
      ${this._label(d, [min, max])}
      <div class="sl"><div class="bar"><i style="left:${pct(lo)}%;width:${pct(hi) - pct(lo)}%"></i></div>
        <input type="range" min=${min} max=${max} step=${d.step} .value=${String(lo)} aria-label="${d.label} mínimo" style="z-index:${lo > max - (max - min) / 10 ? 4 : 3}"
          @input=${(e: Event) => put(Math.min(val(e), hi), hi)}>
        <input type="range" min=${min} max=${max} step=${d.step} .value=${String(hi)} aria-label="${d.label} máximo"
          @input=${(e: Event) => put(lo, Math.max(val(e), lo))}></div>
      <div class="nums">
        <label class="num"><input type="number" min=${min} max=${max} step=${d.step} .value=${String(lo)} aria-label="${d.label} mínimo"
          @change=${(e: Event) => put(val(e), hi)}><span aria-hidden="true">${d.unit}</span></label>
        <label class="num"><input type="number" min=${min} max=${max} step=${d.step} .value=${String(hi)} aria-label="${d.label} máximo"
          @change=${(e: Event) => put(lo, val(e))}><span aria-hidden="true">${d.unit}</span></label>
      </div></div>`;
  }

  private _checks(d: FilterDef, opts: Option[], defs: FilterDef[], q: string) {
    const counts = facetCounts(opts, defs, this._state, d, q);
    const sel = (this._state[d.key] as string[] | undefined) ?? [];
    return html`<fieldset class="filter checks"><legend>${d.label}</legend>
      ${choices(opts, d).map(v => html`<label class="chk"><input type="checkbox" .checked=${sel.includes(v)}
        @change=${(e: Event) => this._set(d.key, (e.target as HTMLInputElement).checked ? [...sel, v] : sel.filter(x => x !== v))}>
        <span>${v}</span><small>(${counts.get(v) ?? 0})</small></label>`)}</fieldset>`;
  }

  private _select(d: Extract<FilterDef, { kind: 'select' }>, opts: Option[], defs: FilterDef[], q: string) {
    const counts = facetCounts(opts, defs, this._state, d, q);
    const v = (this._state[d.key] as string | undefined) ?? '';
    return html`<div class="filter sel">
      ${this._label(d)}
      <div class="dd"><select aria-labelledby="f-${d.key}" @change=${(e: Event) => this._set(d.key, (e.target as HTMLSelectElement).value)}>
        <option value="" ?selected=${!v}>${d.any ?? 'Todas'}</option>
        ${choices(opts, d).map(c => html`<option value=${c} ?selected=${c === v}>${c} (${counts.get(c) ?? 0})</option>`)}
      </select>${ICON_CHEVRON}</div></div>`;
  }

  private _filtersPanel(opts: Option[], defs: FilterDef[], q: string, found: number) {
    const ranges = defs.filter((d): d is Range => d.kind === 'range');
    const lists = defs.filter(d => d.kind === 'checks' || d.kind === 'select');
    const bools = defs.filter(d => d.kind === 'bool');
    const active = defs.filter(d => isActive(d, this._state[d.key], d.kind === 'range' ? rangeBounds(opts, d) : undefined)).length + (q ? 1 : 0);
    return html`<aside class="filters ${this._showFilters ? 'on' : ''}" id="dlg-filters" aria-label="Filtros">
      <div class="fgroup">${ranges.map(d => this._range(d, opts))}</div>
      <div class="fgroup pair">${lists.map(d => d.kind === 'checks' ? this._checks(d, opts, defs, q) : this._select(d as Extract<FilterDef, { kind: 'select' }>, opts, defs, q))}</div>
      <fieldset class="fgroup bools"><legend class="sr-only">Outras opções</legend>
        ${bools.map(d => html`<label class="chk"><input type="checkbox" .checked=${this._state[d.key] === true}
          @change=${(e: Event) => this._set(d.key, (e.target as HTMLInputElement).checked)}><span>${d.label}</span></label>`)}</fieldset>
      ${active ? html`<button class="resetall" @click=${this._reset}>${ICON_RESET} Redefinir filtros (${active})</button>` : nothing}
      <div class="fdone"><button @click=${this._closeFilters}>Ver ${found === 1 ? '1 produto' : `${found} produtos`}</button></div>
    </aside>`;
  }

  /** Celular: fecha o painel de filtros e devolve o foco ao botão "Filtros". */
  private _closeFilters = () => {
    this._showFilters = false;
    this.updateComplete.then(() => this.renderRoot.querySelector<HTMLButtonElement>('.ftoggle')?.focus());
  };

  /* ---------- lista ---------- */

  private _row(o: Option, selected: boolean) {
    const p = o.part;
    const reason = o.reasons.find(r => r.severity === o.status)?.message;
    const ic = { ok: ICON_OK, no: ICON_NO, bolt: ICON_BOLT_SM };
    return html`<li class="prod ${o.status} ${selected ? 'sel' : ''}">
      <div class="pimg">${p.image ? html`<img src=${p.image} alt="" width="120" height="120" loading="lazy" decoding="async">` : html`<div class="ph"></div>`}</div>
      <div class="info">
        <h3 class="pname">${p.name}</h3>
        <div class="tags">${rowChips(p).map(c => html`<span class="tag ${c.ic ?? ''}">${c.ic ? ic[c.ic] : nothing}${c.t}</span>`)}</div>
        ${o.status !== 'ok' ? html`<p class="why ${o.status}"><span class="badge ${o.status}">${STATUS_LABEL[o.status]}</span> ${reason ?? ''}</p>` : nothing}
      </div>
      <div class="pr">
        ${p.listPrice && p.listPrice > p.pricePix ? html`<s aria-label="Preço anterior ${brl(p.listPrice)}">${brl(p.listPrice)}</s>` : nothing}
        <b class="price">${brl(p.pricePix)}</b><small>no PIX com 15% desconto</small>
      </div>
      <div class="act">
        ${selected
          ? html`<span class="cur">${ICON_TICK}Selecionado</span><button class="rm" @click=${() => this._remove(o)} aria-label="Remover ${p.name}">Remover</button>`
          : html`<button class="addp" ?disabled=${o.status === 'incompatible'} @click=${() => this._pick(o)}
              aria-label=${o.status === 'incompatible' ? `${p.name}: incompatível com a montagem` : `Adicionar ${p.name}`}>${ICON_PLUS}</button>`}
      </div>
    </li>`;
  }

  private _pager(pages: number) {
    if (pages <= 1) return nothing;
    const cur = this._page, go = (n: number) => { this._page = Math.min(pages, Math.max(1, n)); this.renderRoot.querySelector('.main')?.scrollTo({ top: 0 }); };
    const nums = [...new Set([1, cur - 1, cur, cur + 1, pages].filter(n => n >= 1 && n <= pages))].sort((a, b) => a - b);
    const items: (number | '…')[] = [];
    nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) items.push('…'); items.push(n); });
    return html`<nav class="pager" aria-label="Páginas">
      <button ?disabled=${cur === 1} aria-label="Primeira página" @click=${() => go(1)}>${ICON_FIRST}</button>
      <button ?disabled=${cur === 1} aria-label="Página anterior" @click=${() => go(cur - 1)}>${ICON_PREV}</button>
      ${items.map(n => n === '…' ? html`<span aria-hidden="true">…</span>` : html`<button class=${n === cur ? 'on' : ''} aria-current=${n === cur ? 'page' : nothing} aria-label="Página ${n}" @click=${() => go(n)}>${n}</button>`)}
      <button ?disabled=${cur === pages} aria-label="Próxima página" @click=${() => go(cur + 1)}>${ICON_NEXT}</button>
      <button ?disabled=${cur === pages} aria-label="Última página" @click=${() => go(pages)}>${ICON_LAST}</button>
    </nav>`;
  }

  render() {
    // Um só <dialog> (o conteúdo só existe aberto): showModal() e o foco de volta funcionam sobre o mesmo elemento.
    const ev = this.evaluation;
    return html`<dialog aria-labelledby="dlg-t" @close=${this._onClose} @keydown=${this._onKey}
        @click=${(e: MouseEvent) => { if (e.target === this._dlg) this.close(); }}>
      ${ev && this._open ? this._content(ev) : nothing}
      <div class="sr-only" aria-live="polite">${this._msg}</div>
    </dialog>`;
  }

  private _content(ev: Evaluation) {
    const info = SLOTS.find(s => s.slot === this._step)!;
    const { options, selected } = ev.slots[this._step];
    const defs = filtersFor(this._step);
    const q = this._query[this._step] ?? '';
    const list = sortOptions(applyFilters(options, defs, this._state, q), this._sort[this._step] ?? 'rel');
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    const page = Math.min(this._page, pages);
    const shown = list.slice((page - 1) * PAGE, page * PAGE);
    const issues = ev.issues.filter(i => i.slots.includes(this._step) && (i.code !== 'power' || this._step === 'psu'));
    const nActive = Object.keys(this._state).length;
    const idx = SLOTS.indexOf(info);
    return html`
      <div class="win">
        <header class="top">
          <h2 id="dlg-t">Selecionar Componente</h2>
          <div class="tacts">
            <button class="ico" aria-label="Atalhos de teclado" aria-expanded=${this._keys ? 'true' : 'false'} aria-controls="dlg-keys" @click=${() => (this._keys = !this._keys)}>${ICON_KEYBOARD}</button>
            <button class="ico" aria-label="Fechar" @click=${() => this.close()}>${ICON_X}</button>
          </div>
          ${this._keys ? html`<div class="keys" id="dlg-keys"><b>Atalhos de teclado</b>
            <dl><dt><kbd>S</kbd></dt><dd>Buscar produtos</dd><dt><kbd>Alt</kbd> + <kbd>→</kbd></dt><dd>Próxima etapa</dd>
            <dt><kbd>Alt</kbd> + <kbd>←</kbd></dt><dd>Etapa anterior</dd><dt><kbd>Esc</kbd></dt><dd>Fechar a janela</dd></dl></div>` : nothing}
        </header>

        <div class="stepsbar">
          <nav class="steps" aria-label="Etapas da montagem"><ol>
            ${SLOTS.map((s, i) => { const done = !!ev.slots[s.slot].selected, cur = s.slot === this._step;
              return html`<li><button class="${cur ? 'cur' : ''} ${done ? 'done' : ''}" aria-current=${cur ? 'step' : nothing}
                aria-label="${i + 1} - ${s.label}${done ? ', escolhido' : s.required ? ', obrigatório' : ''}" @click=${() => this._go(s.slot)}>
                ${done && !cur ? ICON_TICK : nothing}${i + 1} - ${s.label}</button></li>`; })}
          </ol></nav>
          <button class="next" @click=${() => this._move(1)}>${idx === SLOTS.length - 1 ? 'CONCLUIR' : 'PRÓXIMO'} ${ICON_ARROW}</button>
        </div>

        <div class="body">
          ${this._filtersPanel(options, defs, q, list.length)}
          <section class="main" aria-label=${info.label}>
            ${info.required && !selected ? html`<p class="req">${ICON_INFO}${info.label} é obrigatório</p>` : nothing}
            ${issues.map(i => html`<p class="req ${i.severity}"><span class="badge ${i.severity}">${STATUS_LABEL[i.severity]}</span>${i.message}${i.deltaMm ? ` (faltam ${i.deltaMm} mm)` : ''}</p>`)}
            <div class="tools">
              <label class="search">${ICON_SEARCH}<input type="search" placeholder="Buscar produtos... (S)" aria-label="Buscar produtos" aria-keyshortcuts="S"
                .value=${q} @input=${(e: Event) => { this._query = { ...this._query, [this._step]: (e.target as HTMLInputElement).value }; this._page = 1; }}></label>
              <label class="sort"><span>Ordenação</span><select @change=${(e: Event) => { this._sort = { ...this._sort, [this._step]: (e.target as HTMLSelectElement).value as SortKey }; }}>
                ${SORTS.map(([k, l]) => html`<option value=${k} ?selected=${(this._sort[this._step] ?? 'rel') === k}>${l}</option>`)}</select>${ICON_CHEVRON}</label>
              <button class="ftoggle" aria-controls="dlg-filters" aria-expanded=${this._showFilters ? 'true' : 'false'} @click=${() => { this._showFilters = true; this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>('.filters input, .filters select')?.focus()); }}>
                ${ICON_FILTER}Filtros${nActive ? ` (${nActive})` : ''}</button>
            </div>
            <p class="count" role="status">${list.length === 1 ? '1 produto' : `${list.length} produtos`}${list.length !== options.length ? ` de ${options.length}` : ''}</p>
            ${shown.length
              ? html`<ul class="plist">${shown.map(o => this._row(o, o.part.id === selected?.id))}</ul>`
              : html`<div class="none"><p>Nenhum produto com esses filtros.</p><button class="resetall" @click=${this._reset}>${ICON_RESET} Redefinir filtros</button></div>`}
          </section>
        </div>

        <footer class="foot">
          <b class="total">Total: ${brl(ev.totals.pix)}</b>
          ${this._pager(pages)}
        </footer>
      </div>`;
  }

  static styles = [tokens, css`
    :host { display: contents; }
    dialog { padding: 0; border: 0; background: transparent; color: var(--mp-text); max-width: none; max-height: none; width: min(1520px, 96vw); height: min(940px, 94vh); overflow: visible; }
    dialog::backdrop { background: rgba(0, 0, 0, .62); }
    .win { height: 100%; display: flex; flex-direction: column; background: var(--mp-surface); border-radius: 10px; overflow: hidden; box-shadow: 0 24px 60px rgba(0, 0, 0, .5); position: relative; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 24px; position: relative; }
    h2 { margin: 0; font-size: 22px; font-weight: 700; }
    .tacts { display: flex; gap: 6px; }
    .ico { width: 44px; height: 44px; border: 0; background: none; border-radius: 50%; display: grid; place-items: center; cursor: pointer; }
    .ico:hover { background: var(--mp-hover); }
    .keys { position: absolute; z-index: 5; right: 70px; top: 60px; background: var(--mp-pop); border: 1px solid var(--mp-border); border-radius: 8px; padding: 14px 16px; box-shadow: 0 12px 30px var(--mp-shadow); font-size: 14px; }
    .keys dl { display: grid; grid-template-columns: auto auto; gap: 8px 14px; margin: 10px 0 0; } .keys dd { margin: 0; color: var(--mp-muted); }
    kbd { display: inline-block; min-width: 22px; padding: 2px 6px; border: 1px solid var(--mp-border); border-bottom-width: 2px; border-radius: 4px; font: 12px/1.4 inherit; text-align: center; background: var(--mp-surface-2); }

    .stepsbar { display: flex; align-items: center; gap: 16px; padding: 12px 24px 14px; background: var(--mp-surface-2); border-top: 1px solid var(--mp-line); border-bottom: 1px solid var(--mp-line); }
    .steps { flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: thin; padding-bottom: 6px; }
    .steps ol { list-style: none; margin: 0; padding: 0; display: flex; gap: 4px; white-space: nowrap; }
    .steps button { display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border: 0; border-radius: 20px; background: none; font-size: 16px; font-weight: 500; cursor: pointer; }
    .steps button:hover { background: var(--mp-hover); }
    .steps button.cur { background: var(--mp-accent); color: #fff; font-weight: 700; }
    .steps button.done:not(.cur) svg { color: var(--mp-price); }
    .next { display: inline-flex; align-items: center; gap: 10px; height: 46px; padding: 0 20px; border: 0; border-radius: 4px; background: var(--mp-buy); color: #fff; font-weight: 800; font-size: 16px; cursor: pointer; flex: none; box-shadow: 0 3px 10px var(--mp-shadow); }
    .next:hover { filter: brightness(1.1); }

    .body { flex: 1; min-height: 0; display: grid; grid-template-columns: 360px minmax(0, 1fr); }
    .filters { overflow: auto; padding: 18px; border-right: 1px solid var(--mp-line); display: grid; gap: 14px; align-content: start; scrollbar-width: thin; overscroll-behavior: contain; }
    .fgroup { background: var(--mp-chip); border: 0; border-radius: 8px; padding: 16px; margin: 0; display: grid; gap: 18px; min-width: 0; }
    .fgroup.pair { grid-template-columns: 1fr 1fr; gap: 14px 12px; align-items: end; }
    .fgroup.pair .flabel { font-size: 13px; line-height: 1.25; }
    .fgroup.pair .checks { grid-column: 1 / -1; }
    .filter { min-width: 0; border: 0; margin: 0; padding: 0; }
    .flabel { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 14px; font-weight: 700; margin-bottom: 8px; min-height: 26px; }
    .unit { font-weight: 400; color: var(--mp-muted); }
    .freset { width: 26px; height: 26px; border: 0; background: none; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--mp-text); flex: none; }
    .freset:disabled { opacity: .3; cursor: default; }
    .freset:not(:disabled):hover { background: var(--mp-hover); }
    .sl { position: relative; height: 28px; }
    .sl .bar { position: absolute; left: 9px; right: 9px; top: 12px; height: 4px; border-radius: 2px; background: var(--mp-border); }
    .sl .bar i { position: absolute; top: 0; bottom: 0; background: var(--mp-accent); border-radius: 2px; }
    .sl input[type=range] { position: absolute; inset: 0; width: 100%; margin: 0; background: none; pointer-events: none; -webkit-appearance: none; appearance: none; height: 28px; }
    .sl input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; pointer-events: auto; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 3px solid var(--mp-accent); cursor: pointer; }
    .sl input[type=range]::-moz-range-thumb { pointer-events: auto; width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 3px solid var(--mp-accent); cursor: pointer; }
    .sl input[type=range]::-moz-range-track { background: none; }
    .sl input[type=range]:focus-visible { outline: none; }
    .sl input[type=range]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px var(--mp-focus); }
    .nums { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
    .num { display: flex; align-items: center; border: 1px solid var(--mp-border); border-radius: 4px; background: var(--mp-surface); padding-right: 8px; }
    .num input { width: 100%; min-width: 0; height: 36px; border: 0; background: none; color: var(--mp-text); padding: 0 8px; font: inherit; font-size: 14px; }
    .num span { font-size: 12px; color: var(--mp-muted); }
    .num:focus-within { outline: 2px solid var(--mp-focus); outline-offset: 1px; }
    .num input:focus-visible { outline: none; }
    legend { font-size: 14px; font-weight: 700; padding: 0; margin-bottom: 8px; }
    .chk { display: flex; align-items: center; gap: 10px; min-height: 36px; font-size: 15px; cursor: pointer; }
    .chk input { width: 20px; height: 20px; margin: 0; accent-color: var(--mp-accent); flex: none; }
    .chk small { margin-left: auto; color: var(--mp-muted); font-size: 13px; }
    .bools { gap: 2px; }
    .dd, .sort { position: relative; display: flex; align-items: center; }
    .dd select, .sort select { width: 100%; height: 40px; -webkit-appearance: none; appearance: none; border: 1px solid var(--mp-border); border-radius: 4px; background: var(--mp-surface); color: var(--mp-text); padding: 0 30px 0 10px; font: inherit; font-size: 14px; cursor: pointer; text-overflow: ellipsis; }
    .dd svg, .sort > svg { position: absolute; right: 8px; pointer-events: none; color: var(--mp-muted); }
    .resetall { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; border: 1px solid var(--mp-border); border-radius: 4px; background: none; cursor: pointer; font-weight: 700; }
    .resetall:hover { background: var(--mp-hover); }
    .fdone { display: none; }

    .main { overflow: auto; padding: 18px 22px; scrollbar-width: thin; overscroll-behavior: contain; min-width: 0; }
    .req { display: flex; align-items: center; gap: 12px; margin: 0 0 14px; padding: 18px 20px; border-radius: 6px; background: #170b0c; color: #ff8f93; font-size: 18px; font-weight: 700; }
    .req svg { color: #ff5a5f; flex: none; width: 24px; height: 24px; }
    .req.warning { color: #ffd27a; font-size: 15px; } .req.nofit, .req.power, .req.incompatible { font-size: 15px; }
    .req .badge { flex: none; }
    .tools { display: flex; gap: 12px; align-items: end; margin-bottom: 6px; }
    .search { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; height: 50px; padding: 0 16px; border: 1px solid var(--mp-border); border-radius: 4px; background: var(--mp-surface-2); color: var(--mp-muted); }
    .search:focus-within { outline: 2px solid var(--mp-focus); outline-offset: 1px; }
    .search input { flex: 1; min-width: 0; height: 100%; border: 0; background: none; color: var(--mp-text); font: inherit; font-size: 17px; }
    .search input:focus-visible { outline: none; }
    .sort { width: 230px; flex: none; flex-direction: column; align-items: stretch; }
    .sort span { font-size: 12px; color: var(--mp-muted); margin-bottom: 2px; }
    .sort select { height: 50px; font-size: 16px; background: var(--mp-surface-2); }
    .sort > svg { bottom: 15px; }
    .ftoggle { display: none; }
    .count { font-size: 13px; color: var(--mp-muted); margin: 6px 0 10px; }
    .plist { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    .prod { display: grid; grid-template-columns: 120px minmax(0, 1fr) auto auto; gap: 18px; align-items: center; padding: 16px 18px; border: 1px solid var(--mp-line); border-radius: 8px; background: var(--mp-surface-2); }
    .prod.sel { border-color: var(--mp-price); box-shadow: inset 0 0 0 1px var(--mp-price); }
    .prod.nofit, .prod.power { border-color: var(--mp-danger); }
    .prod.incompatible .pimg, .prod.incompatible .pname, .prod.incompatible .pr { opacity: .55; }
    .pimg { width: 120px; height: 120px; background: #fff; border-radius: 4px; display: grid; place-items: center; overflow: hidden; }
    .pimg img { width: 100%; height: 100%; object-fit: contain; }
    .pimg .ph { width: 100%; height: 100%; }
    .pname { margin: 0 0 10px; font-size: 16px; font-weight: 400; line-height: 1.45; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 4px; background: var(--mp-chip); color: var(--mp-text); font-size: 13px; font-weight: 500; }
    .tag.ok svg { color: var(--mp-text); } .tag.no svg { color: var(--mp-muted); }
    .why { margin: 10px 0 0; font-size: 13px; color: var(--mp-muted); }
    .why.nofit, .why.power { color: var(--mp-danger-text); } .why.warning { color: var(--mp-warn-text); }
    .pr { display: flex; flex-direction: column; align-items: flex-end; text-align: right; min-width: 150px; }
    .pr s { font-size: 12px; color: var(--mp-muted); }
    .pr .price { font-size: 26px; line-height: 1.15; }
    .pr small { font-size: 12px; color: var(--mp-muted); }
    .act { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .addp { width: 50px; height: 50px; border: 0; border-radius: 4px; background: #12a33a; color: #fff; display: grid; place-items: center; cursor: pointer; box-shadow: 0 2px 8px var(--mp-shadow); }
    .addp:hover { filter: brightness(1.1); }
    .addp:disabled { background: var(--mp-hover); color: var(--mp-muted); cursor: not-allowed; box-shadow: none; filter: none; }
    .cur { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 700; color: var(--mp-price); }
    .rm { min-height: 36px; padding: 0 12px; border: 1px solid var(--mp-border); border-radius: 4px; background: none; color: var(--mp-danger-text); font-size: 13px; cursor: pointer; }
    .none { text-align: center; padding: 40px 10px; color: var(--mp-muted); }

    .foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 24px; border-top: 1px solid var(--mp-line); background: var(--mp-surface-2); }
    .total { color: var(--mp-price); font-size: 24px; font-weight: 800; }
    .pager { display: flex; align-items: center; gap: 4px; }
    .pager button { min-width: 44px; height: 44px; border: 0; border-radius: 50%; background: none; font-size: 16px; cursor: pointer; display: grid; place-items: center; }
    .pager button:hover:not(:disabled) { background: var(--mp-hover); }
    .pager button.on { background: #12a33a; color: #fff; font-weight: 700; }
    .pager button:disabled { opacity: .35; cursor: default; }

    @media (prefers-reduced-motion: no-preference) {
      dialog[open] .win { animation: rise .2s cubic-bezier(.2, .8, .2, 1); }
      @keyframes rise { from { opacity: 0; transform: translateY(12px) scale(.985); } }
    }
    @media (max-width: 900px) {
      dialog { width: 100vw; height: 100dvh; }
      .win { border-radius: 0; }
      .top { padding: 8px 12px 8px 16px; } h2 { font-size: 18px; }
      .stepsbar { padding: 8px 12px; gap: 10px; }
      .steps button { font-size: 14px; height: 36px; padding: 0 12px; }
      .next { height: 42px; padding: 0 14px; font-size: 14px; }
      .body { grid-template-columns: minmax(0, 1fr); position: relative; }
      .filters { display: none; }
      .filters.on { display: grid; position: absolute; inset: 0; z-index: 4; background: var(--mp-surface); border: 0; padding-bottom: 0; }
      .fdone { display: block; position: sticky; bottom: 0; padding: 10px 0 14px; background: var(--mp-surface); }
      .fdone button { width: 100%; height: 48px; border: 0; border-radius: 4px; background: var(--mp-buy); color: #fff; font-weight: 800; font-size: 16px; cursor: pointer; }
      .ftoggle { display: inline-flex; align-items: center; gap: 8px; height: 50px; padding: 0 14px; border: 1px solid var(--mp-border); border-radius: 4px; background: var(--mp-surface-2); font-weight: 700; cursor: pointer; }
      .main { padding: 12px; }
      .tools { flex-wrap: wrap; }
      .search { flex-basis: 100%; }
      .sort { flex: 1; width: auto; }
      .req { font-size: 15px; padding: 14px; }
      .prod { grid-template-columns: 84px minmax(0, 1fr) auto; gap: 10px 12px; padding: 12px; align-items: start; }
      .pimg { width: 84px; height: 84px; grid-row: span 2; }
      .info { grid-column: 2 / 4; }
      .pr { grid-column: 2; align-items: flex-start; text-align: left; min-width: 0; }
      .pr .price { font-size: 21px; }
      .act { grid-column: 3; grid-row: 2; }
      .pname { font-size: 14px; }
      .foot { padding: 8px 12px; flex-wrap: wrap; }
      .total { font-size: 18px; }
      .pager button { min-width: 40px; height: 40px; }
    }
    @media (max-width: 560px) { .keys { right: 10px; left: 10px; } .fgroup.pair { grid-template-columns: 1fr; } }
  `];
}

if (!customElements.get('mp-picker-dialog')) customElements.define('mp-picker-dialog', PickerDialog);

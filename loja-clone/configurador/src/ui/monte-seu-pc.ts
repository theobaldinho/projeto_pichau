/*
 * <monte-seu-pc catalog="catalog.json">: configurador completo, independente de framework.
 * Eventos (bubbles + composed): build-change → Evaluation · add-to-cart → { build, parts, totals }.
 * Slot nomeado "notice": conteúdo do site exibido acima da lista (ex.: aviso de montagem).
 */
import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import {
  SLOTS, brl, buildStatus, buildFromUrl, evaluate, isBlocking, slotLabel, urlWithBuild, validateCatalog,
  type Build, type Catalog, type Evaluation, type Issue, type Part, type Slot,
} from '../core';
import { ICON_ALERT, ICON_BOLT, ICON_CHECK, ICON_SHARE } from './icons';
import type { PartPicker } from './part-picker';
import './part-picker';
import type { PickerDialog } from './picker-dialog';
import './picker-dialog';
import './pc-viewer';
import { STATUS_LABEL, alternativesLabel } from './specs';
import { tokens } from './styles';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class MonteSeuPc extends LitElement {
  static properties = {
    catalog: { type: String },
    catalogData: { attribute: false },
    syncUrl: { type: Boolean, attribute: 'sync-url' },
    _eval: { state: true },
    _error: { state: true },
    _msg: { state: true },
    _copied: { state: true },
    _focus: { state: true },
    _sheet: { state: true },
  };

  /** URL do catálogo JSON. */
  declare catalog?: string;
  /** Alternativa à URL: o site hospedeiro entrega o catálogo já carregado. */
  declare catalogData?: Catalog;
  /** Mantém a build na query string (?b=…) para compartilhar e recarregar. */
  declare syncUrl: boolean;
  declare _eval?: Evaluation;
  declare _error?: string;
  declare _msg: string;
  declare _copied: string;
  /** Último slot escolhido, para o 3D focar a peça. */
  declare _focus?: { slot: Slot; n: number };
  /** Prévia aberta como painel no celular. */
  declare _sheet: boolean;

  private _cat?: Catalog;

  constructor() {
    super();
    this.syncUrl = true;
    this._msg = '';
    this._copied = '';
    this._sheet = false;
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('catalogData') && this.catalogData) this._useCatalog(this.catalogData);
    else if (changed.has('catalog') && this.catalog && !this.catalogData) this._load(this.catalog);
  }

  private async _load(url: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Imagens do catálogo são relativas ao próprio JSON (funciona em qualquer pasta/CDN).
      const data: Catalog = await res.json();
      const base = new URL(url, location.href);
      for (const p of data.parts ?? []) if (typeof p.image === 'string') p.image = new URL(p.image, base).href;
      this._useCatalog(data);
    } catch (err) {
      console.error('[monte-seu-pc] falha ao carregar catálogo', err);
      this._error = 'Não foi possível carregar as peças. Tente recarregar a página.';
    }
  }

  private _useCatalog(data: Catalog) {
    const errors = validateCatalog(data);
    if (errors.length) {
      console.error('[monte-seu-pc] catálogo inválido', errors);
      this._error = 'O catálogo de peças está com problemas. Tente novamente mais tarde.';
      return;
    }
    this._cat = data;
    this._set(this.syncUrl ? buildFromUrl(new URL(location.href), data) : {});
  }

  /** Estado atual (útil para o site hospedeiro e para o 3D). */
  get evaluation() { return this._eval; }

  /** Define a build inteira (ex.: restaurar de um carrinho salvo). */
  setBuild(build: Build) { this._set(build); }

  private _set(build: Build) {
    if (!this._cat) return;
    this._eval = evaluate(this._cat, build);
    if (this.syncUrl) history.replaceState(history.state, '', urlWithBuild(new URL(location.href), this._eval.build));
    this.dispatchEvent(new CustomEvent('build-change', { detail: this._eval, bubbles: true, composed: true }));
  }

  private _pick(slot: Slot, id: string) {
    this._set({ ...this._eval!.build, [slot]: id });
    this._focus = { slot, n: (this._focus?.n ?? 0) + 1 };
    const ev = this._eval!;
    const part = ev.selected[slot] as Part | undefined;
    const problem = ev.issues.find(i => isBlocking(i) && i.slots.includes(slot));
    this._msg = `${slotLabel(slot)}: ${part?.name ?? ''}. Total ${brl(ev.totals.pix)} no PIX.${problem ? ` Atenção: ${problem.message}.` : ''}`;
  }

  private _remove(slot: Slot) {
    const build = { ...this._eval!.build };
    delete build[slot];
    this._set(build);
    this._msg = `${slotLabel(slot)} removido. Total ${brl(this._eval!.totals.pix)} no PIX.`;
  }

  /** Abre a janela "Selecionar Componente" na etapa do slot (os atalhos dos conflitos já abrem com "só o que é compatível"). */
  private _openPicker(slot: Slot, onlyFits = false) {
    this.renderRoot.querySelector<PickerDialog>('mp-picker-dialog')?.open(slot, { onlyFits });
  }

  private _openAlternatives(slot: Slot) { this._openPicker(slot, true); }

  /** Janela fechada: foco no card da etapa em que ela estava. */
  private _pickerClosed(slot: Slot) {
    this.renderRoot.querySelector<PartPicker>(`mp-part-picker[data-slot="${slot}"]`)?.focusTrigger();
  }

  private _buy() {
    const ev = this._eval!;
    if (!ev.canBuy) {
      this._msg = `Não é possível comprar ainda. ${ev.blockers.join('. ')}.`;
      return;
    }
    const parts = SLOTS.map(s => ev.selected[s.slot]).filter(Boolean) as Part[];
    this.dispatchEvent(new CustomEvent('add-to-cart', { detail: { build: ev.build, parts, totals: ev.totals }, bubbles: true, composed: true }));
  }

  private async _share() {
    const url = urlWithBuild(new URL(location.href), this._eval!.build).href;
    try {
      await navigator.clipboard.writeText(url);
      this._copied = 'Link da configuração copiado.';
    } catch {
      this._copied = 'Não foi possível copiar. Use o endereço da barra do navegador.';
    }
    setTimeout(() => (this._copied = ''), 3000);
  }

  protected updated(changed: PropertyValues<this>) {
    const prev = changed.get('_eval') as Evaluation | undefined;
    if (prev && prev.totals.pix !== this._eval?.totals.pix && !reducedMotion()) {
      this.renderRoot.querySelectorAll('.big, .mtotal').forEach(el =>
        el.animate([{ transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }));
    }
  }

  /** Problemas mostrados em cada slot; o de energia só aparece na fonte. */
  private _slotIssues(slot: Slot): Issue[] {
    return this._eval!.issues.filter(i => i.slots.includes(slot) && (i.code !== 'power' || slot === 'psu'));
  }

  private _power() {
    const { power: p, selected } = this._eval!;
    if (!selected.cpu && !selected.gpu && !selected.psu) {
      return html`<p class="muted">Escolha processador e placa de vídeo para estimar o consumo.</p>`;
    }
    const levelText = { ok: 'Folga adequada', warn: 'Pouca folga: considere uma fonte maior', block: 'Fonte insuficiente: bloqueia a compra', none: '' }[p.level];
    return html`
      <p>Consumo estimado: <b>${p.needW}W</b> · Recomendado: <b>${p.recommendedW}W ou mais</b></p>
      ${p.psuW ? html`
        <p>Fonte escolhida: <b>${p.psuW}W</b> (${p.loadPct}% de carga)</p>
        <div class="bar ${p.level}" role="meter" aria-label="Carga da fonte" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.min(100, p.loadPct ?? 0)}>
          <i style="transform:scaleX(${Math.min(1, (p.loadPct ?? 0) / 100)})"></i></div>
        <p class="lvl ${p.level}">${levelText}</p>` : html`<p class="muted">Escolha uma fonte para comparar.</p>`}
      ${p.suggestion && p.suggestion.id !== selected.psu?.id ? html`
        <button class="alt" @click=${() => this._pick('psu', p.suggestion!.id)}>Trocar por ${p.suggestion.name} (${brl(p.suggestion.pricePix)})</button>` : nothing}`;
  }

  /** Motivos de bloqueio resumidos; os detalhes de cada conflito ficam no quadro abaixo. */
  private _blockers() {
    const ev = this._eval!;
    if (ev.canBuy) {
      const st = buildStatus(ev);
      // Aviso não impede a compra, mas não dá para chamar de "tudo certo" sem dizer que ele existe.
      return st.warnings
        ? html`<p id="blk" class="ready warn">Completa e compatível, com ${st.warnings === 1 ? '1 aviso' : `${st.warnings} avisos`} abaixo (não impede a compra).</p>`
        : html`<p id="blk" class="ready">Configuração completa e compatível.</p>`;
    }
    const n = ev.issues.filter(isBlocking).length;
    const items = [
      ...(ev.missingRequired.length ? [`Falta escolher: ${ev.missingRequired.map(slotLabel).join(', ')}`] : []),
      ...(n ? [`Resolva ${n === 1 ? '1 conflito' : `${n} conflitos`} abaixo para comprar`] : []),
    ];
    return html`<ul id="blk" class="blockers">${items.map(b => html`<li>${b}</li>`)}</ul>`;
  }

  private _conflicts() {
    const list = this._eval!.issues;
    if (!list.length) return nothing;
    return html`<div class="box conflicts">
      <h3>Conflitos e avisos</h3>
      <ul>${list.map(i => html`<li class=${i.severity}>
        <p><span class="badge ${i.severity}">${STATUS_LABEL[i.severity]}</span> ${i.message}${i.deltaMm ? html` <b>(faltam ${i.deltaMm} mm)</b>` : nothing}</p>
        ${isBlocking(i) ? html`<div class="acts">${(i.code === 'power' ? (['psu'] as Slot[]) : i.slots).map(s =>
          html`<button class="alt" @click=${() => this._openAlternatives(s)}>${alternativesLabel(s, i.severity)}</button>`)}</div>` : nothing}
      </li>`)}</ul>
    </div>`;
  }

  render() {
    if (this._error) return html`<p class="error" role="alert">${this._error}</p>`;
    const ev = this._eval;
    if (!ev) return html`<p class="muted" role="status">Carregando peças…</p>`;
    const { totals: t, doneCount: done, requiredCount: req } = ev;
    // A primeira peça obrigatória que falta ganha o destaque "X é obrigatório".
    const nextMissing = SLOTS.find(s => s.required && !ev.slots[s.slot].selected)?.slot;
    const st = buildStatus(ev);
    const icon = st.level === 'ready' ? ICON_CHECK : ICON_ALERT;
    return html`
      <div class="layout">
        <section class="config" aria-labelledby="h-cfg">
          <h2 id="h-cfg">Configuração</h2>
          <slot name="notice"></slot>
          <div class="list" @mp-open=${(e: CustomEvent) => this._openPicker(e.detail.slot, e.detail.onlyFits)} @mp-remove=${(e: CustomEvent) => this._remove(e.detail.slot)}>
            ${SLOTS.map(s => html`<mp-part-picker data-slot=${s.slot} .slotId=${s.slot} .label=${s.label} ?required=${s.required} ?highlight=${s.slot === nextMissing}
              .options=${ev.slots[s.slot].options} .selected=${ev.slots[s.slot].selected} .issues=${this._slotIssues(s.slot)}></mp-part-picker>`)}
          </div>
        </section>

        <aside class="sum" aria-labelledby="h-sum">
          <div class="sh">
            <h2 id="h-sum">Resumo</h2>
            <button class="icon" @click=${this._share} aria-label="Copiar link desta configuração" title="Copiar link desta configuração">${ICON_SHARE}</button>
          </div>
          <p class="copied" role="status">${this._copied}</p>
          <mp-pc-viewer id="viewer" class=${this._sheet ? 'viewer sheet' : 'viewer'} .evaluation=${ev} .focusPart=${this._focus}></mp-pc-viewer>
          <div class="box totals">
            <div class="big price">${brl(t.pix)}</div>
            <div class="lbl">No PIX com 15% de desconto</div>
            <div class="ou"><span>ou</span></div>
            <div class="card-total">${brl(t.card)}</div>
            <div class="lbl">Em até ${t.installments}x de <b>${brl(t.installment)}</b> sem juros no cartão</div>
          </div>
          <button class="buy" aria-disabled=${ev.canBuy ? 'false' : 'true'} aria-describedby="blk" @click=${this._buy}>COMPRAR</button>
          ${this._blockers()}
          ${this._conflicts()}
          <div class="box">
            <h3><span class="st ${st.level}">${icon}</span>Status do Build</h3>
            <p class="st-title ${st.level}">${st.title}</p>
            <div class="row"><span>${done} de ${req} componentes obrigatórios</span>
              <b class="st ${st.level}">${st.conflicts ? `${st.conflicts} ${st.conflicts === 1 ? 'conflito' : 'conflitos'}` : st.warnings ? `${st.warnings} ${st.warnings === 1 ? 'aviso' : 'avisos'}` : `${Math.round((done / req) * 100)}%`}</b></div>
            <div class="bar ${st.level === 'ready' ? 'ok' : st.level === 'blocked' ? 'block' : st.level === 'warning' ? 'warn' : 'prog'}" role="progressbar" aria-label="Componentes obrigatórios escolhidos"
              aria-valuemin="0" aria-valuemax=${req} aria-valuenow=${done} aria-valuetext=${`${done} de ${req}. ${st.title}`}><i style="transform:scaleX(${done / req})"></i></div>
          </div>
          <div class="box power"><h3>${ICON_BOLT}Consumo de Energia</h3>${this._power()}</div>
        </aside>
      </div>

      <div class="mbar">
        <div><span class="mtotal price">${brl(t.pix)}</span><small class="st ${st.level}">no PIX · ${st.summary}</small></div>
        <button class="see" aria-controls="viewer" aria-expanded=${this._sheet ? 'true' : 'false'} @click=${() => (this._sheet = !this._sheet)}>
          ${this._sheet ? 'Fechar' : 'Ver PC'}</button>
        <button class="buy" aria-disabled=${ev.canBuy ? 'false' : 'true'} aria-describedby="blk" @click=${this._buy}>COMPRAR</button>
      </div>
      <mp-picker-dialog .evaluation=${ev} @mp-pick=${(e: CustomEvent) => this._pick(e.detail.slot, e.detail.id)}
        @mp-remove=${(e: CustomEvent) => this._remove(e.detail.slot)} @mp-dialog-close=${(e: CustomEvent) => this._pickerClosed(e.detail.slot)}></mp-picker-dialog>
      <div class="sr-only" aria-live="polite">${this._msg}</div>`;
  }

  static styles = [tokens, css`
    :host { display: block; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 395px; gap: 24px; align-items: start; }
    h2 { font-size: 22px; font-weight: 700; margin: 0 0 16px; }
    h3 { display: flex; align-items: center; gap: 10px; font-size: 16px; margin: 0 0 14px; }
    p { margin: 0 0 8px; font-size: 13px; line-height: 1.45; }
    .list { background: var(--mp-surface); border-radius: var(--mp-radius); padding: 14px; display: grid; gap: 14px; }
    .sh { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .sh h2 { margin: 0; }
    .icon { width: 44px; height: 44px; display: grid; place-items: center; background: none; border: 0; border-radius: 50%; cursor: pointer; }
    .icon:hover { background: var(--mp-hover); }
    .copied { min-height: 18px; font-size: 12px; color: var(--mp-muted); margin: 0 0 6px; }
    .box { background: var(--mp-surface); border: 1px solid var(--mp-line); border-radius: 8px; padding: 18px 20px; margin-bottom: 16px; }
    .totals { text-align: center; padding: 22px; }
    .big { font-size: 30px; display: inline-block; }
    .lbl { font-size: 12px; margin: 6px 0 12px; }
    .totals .lbl:last-child { margin-bottom: 0; }
    .ou { display: flex; align-items: center; gap: 12px; font-size: 11px; color: #222; margin: 4px 0 10px; }
    .ou::before, .ou::after { content: ""; flex: 1; height: 1px; background: var(--mp-border); }
    .ou span { width: 28px; height: 28px; border-radius: 50%; background: #ddd; display: grid; place-items: center; }
    .card-total { font-size: 18px; font-weight: 700; }
    .buy { width: 100%; height: 48px; border: 0; border-radius: 4px; background: var(--mp-buy); color: #fff; font-weight: 700; font-size: 16px; cursor: pointer; }
    .buy[aria-disabled=true] { background: var(--mp-hover); color: var(--mp-muted); cursor: not-allowed; }
    .blockers { list-style: none; margin: 10px 0 16px; padding: 0; font-size: 13px; color: var(--mp-danger-text); display: grid; gap: 4px; }
    .blockers li::before { content: "• "; }
    .ready { color: var(--mp-price); margin: 10px 0 16px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; }
    .ok { color: var(--mp-price); }
    .pend { color: var(--mp-accent); display: grid; }
    .st { display: inline-grid; } h3 .st { display: grid; }
    .st.ready { color: var(--mp-price); } .st.warning { color: var(--mp-warn-text); } .st.blocked, .st.incomplete { color: var(--mp-danger-text); }
    .mbar small.st.ready { color: var(--mp-muted); }
    .st-title { font-weight: 700; margin: -6px 0 8px; }
    .st-title.ready { color: var(--mp-price); } .st-title.warning { color: var(--mp-warn-text); } .st-title.blocked, .st-title.incomplete { color: var(--mp-danger-text); }
    .ready.warn { color: var(--mp-warn-text); }
    h3 .ok { display: grid; }
    .bar { height: 6px; background: var(--mp-chip); border-radius: 3px; margin: 8px 0; overflow: hidden; }
    .bar i { display: block; height: 100%; background: var(--mp-accent); transform-origin: left; }
    .bar.ok i { background: var(--mp-price); }
    .bar.warn i { background: var(--mp-warn); }
    .bar.block i { background: var(--mp-danger); }
    .lvl { font-weight: 700; }
    .lvl.ok { color: var(--mp-price); } .lvl.warn { color: var(--mp-warn-text); } .lvl.block { color: var(--mp-danger-text); }
    .muted { color: var(--mp-muted); }
    .alt { background: none; border: 1px solid var(--mp-border); border-radius: 4px; padding: 8px 12px; min-height: 44px; font-size: 13px; cursor: pointer; text-align: left; width: 100%; margin-top: 6px; }
    .alt:hover { border-color: var(--mp-muted); background: var(--mp-hover); }
    .conflicts ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
    .conflicts li.nofit p, .conflicts li.power p, .conflicts li.incompatible p { color: var(--mp-danger-text); }
    .conflicts li.warning p { color: var(--mp-warn-text); }
    .acts { display: grid; gap: 6px; }
    .error { background: rgba(229, 72, 77, .18); border-radius: 4px; padding: 14px; }
    .mbar { display: none; }
    @media (min-width: 901px) and (min-height: 640px) {
      .sum { position: sticky; top: 20px; max-height: calc(100svh - 40px); overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; }
    }
    @media (prefers-reduced-motion: no-preference) {
      .bar i { transition: transform .35s cubic-bezier(.2, .8, .2, 1), background-color .2s; }
      .buy, .alt, .icon { transition: background-color .15s, border-color .15s, transform .1s; }
      .buy:active, .alt:active { transform: scale(.98); }
    }
    @media (max-width: 900px) {
      :host { padding-bottom: 84px; }
      .layout { grid-template-columns: minmax(0, 1fr); }
      .mbar { display: flex; position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; gap: 12px; align-items: center; justify-content: space-between;
        padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: var(--mp-pop); border-top: 1px solid var(--mp-line); box-shadow: 0 -6px 18px var(--mp-shadow); }
      .mbar > div { display: flex; flex-direction: column; }
      .mtotal { font-size: 20px; display: inline-block; }
      .mbar small { font-size: 12px; color: var(--mp-muted); }
      .mbar .buy { width: auto; padding: 0 22px; }
      .mbar .see { margin-left: auto; height: 48px; padding: 0 14px; border-radius: 4px; border: 1px solid var(--mp-border); background: var(--mp-surface); font-weight: 700; cursor: pointer; }
      .viewer { display: none; }
      .viewer.sheet { display: block; position: fixed; z-index: 31; left: 8px; right: 8px; bottom: calc(76px + env(safe-area-inset-bottom));
        margin: 0; --mp-viewer-h: min(46vh, 360px); box-shadow: 0 -8px 28px var(--mp-shadow); }
    }
    @media (max-width: 560px) { .list { padding: 8px; gap: 10px; } }
  `];
}

if (!customElements.get('monte-seu-pc')) customElements.define('monte-seu-pc', MonteSeuPc);

/*
 * <mp-part-picker>: o card de um slot (peça escolhida, status e conflitos).
 * A escolha em si acontece na janela <mp-picker-dialog>: o card só pede para abri-la (evento mp-open).
 */
import { LitElement, css, html, nothing } from 'lit';
import { brl, type Issue, type Option, type Part, type Slot } from '../core';
import { ICON_CHEVRON, ICON_INFO, ICON_PLUS, ICON_PLUS_RING, SLOT_ICON } from './icons';
import { STATUS_LABEL, specChips } from './specs';
import { tokens } from './styles';

let uid = 0;

export class PartPicker extends LitElement {
  static properties = {
    slotId: { attribute: false },
    label: { attribute: false },
    required: { type: Boolean },
    options: { attribute: false },
    selected: { attribute: false },
    issues: { attribute: false },
    highlight: { type: Boolean },
  };

  declare slotId: Slot;
  declare label: string;
  declare required: boolean;
  declare options: Option[];
  declare selected?: Part;
  /** Problemas do build que envolvem este slot (para destacar a peça escolhida). */
  declare issues: Issue[];
  /** Próxima peça obrigatória que falta: borda vermelha e aviso "X é obrigatório". */
  declare highlight: boolean;

  private readonly _id = `mp${++uid}`;

  constructor() {
    super();
    this.label = '';
    this.required = false;
    this.options = [];
    this.issues = [];
    this.highlight = false;
  }

  /** Pede a janela de escolha deste slot; `onlyFits` já abre com "só o que é compatível". */
  show({ onlyFits = false } = {}) {
    this.dispatchEvent(new CustomEvent('mp-open', { detail: { slot: this.slotId, onlyFits }, bubbles: true, composed: true }));
  }

  /** Foco de volta no card (ao fechar a janela). */
  focusTrigger() { this.renderRoot.querySelector<HTMLButtonElement>('.trigger')?.focus(); }

  private _remove() {
    this.dispatchEvent(new CustomEvent('mp-remove', { detail: { slot: this.slotId }, bubbles: true, composed: true }));
    this.updateComplete.then(() => this.focusTrigger());
  }

  private _thumb(p: Part, size: number) {
    return p.image
      ? html`<img src=${p.image} alt="" width=${size} height=${size} loading="lazy" decoding="async">`
      : html`<div class="ph" style="width:${size}px;height:${size}px"></div>`;
  }

  render() {
    const sel = this.selected;
    const worst = this.issues.find(i => i.severity !== 'warning') ?? this.issues[0];
    const sub = sel ? '1 peça selecionada' : this.required ? 'Nenhuma peça selecionada' : 'Opcional · nenhuma peça selecionada';
    const missing = this.highlight && this.required && !sel;
    const open = () => this.show();
    return html`
      <div class="card ${worst ? worst.severity : ''} ${missing ? 'missing' : ''}">
        <div class="head">
          <span class="ic">${SLOT_ICON[this.slotId]}</span>
          <div class="ttl"><h3 id="${this._id}-l">${this.label}</h3><small>${sub}</small></div>
          ${sel ? nothing : html`<!-- Atalho visual: o botão acessível é a área tracejada abaixo (um só ponto de Tab por peça). -->
            <button class="add" tabindex="-1" aria-hidden="true" @click=${open}>${ICON_PLUS}</button>`}
        </div>
        <div class="row">
          <button class="trigger ${sel ? 'has' : 'empty'}" aria-haspopup="dialog"
              aria-labelledby="${this._id}-l ${this._id}-v" @click=${open}>
            <span id="${this._id}-v" class="val">
              ${sel
                ? html`${this._thumb(sel, 72)}
                    <span class="body"><span class="name">${sel.name}</span>
                      <span class="chips">${specChips(sel).map(c => html`<span class="chip">${c}</span>`)}</span></span>
                    <span class="price">${brl(sel.pricePix)}</span>`
                : html`<span class="plus">${ICON_PLUS_RING}</span>
                    <span class="name">Nenhum item selecionado</span>
                    <small>Clique para adicionar este componente ${this.required ? 'obrigatório' : 'opcional'} · ${this.options.length} opções</small>`}
            </span>
            ${sel ? html`<span class="chev">${ICON_CHEVRON}</span>` : nothing}
          </button>
          ${sel ? html`<button class="rm" @click=${this._remove} aria-label="Remover ${this.label}">Remover</button>` : nothing}
        </div>
        ${missing ? html`<p class="req">${ICON_INFO}${this.label} é obrigatório</p>` : nothing}
        ${this.issues.length
          ? html`<ul class="issues">${this.issues.map(i => html`<li class=${i.severity}>
              <span class="badge ${i.severity}">${STATUS_LABEL[i.severity]}</span>${i.message}${i.deltaMm ? html` <b>(faltam ${i.deltaMm} mm)</b>` : nothing}</li>`)}</ul>`
          : nothing}
      </div>`;
  }

  static styles = [tokens, css`
    :host { display: block; position: relative; }
    .card { background: var(--mp-surface-2); border-radius: 8px; padding: 18px 18px 18px 20px; border: 1px solid var(--mp-line); }
    .card.nofit, .card.power, .card.incompatible { border-color: var(--mp-danger); }
    /* Próxima obrigatória que falta: faixa vermelha à esquerda e fundo levemente avermelhado. */
    .card.missing { border-left: 3px solid var(--mp-danger); padding-left: 18px; background: linear-gradient(rgba(229, 72, 77, .07), rgba(229, 72, 77, .07)), var(--mp-surface-2); }
    .head { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
    .ttl { flex: 1; min-width: 0; }
    .add { width: 40px; height: 40px; border-radius: 50%; border: 0; background: #12a33a; color: #fff; display: grid; place-items: center; cursor: pointer; flex: none; box-shadow: 0 2px 8px var(--mp-shadow); }
    .add:hover { filter: brightness(1.1); }
    .ic { color: var(--mp-accent); display: grid; }
    h3 { margin: 0 0 2px; font-size: 17px; font-weight: 700; }
    .head small { font-size: 14px; color: var(--mp-muted); }
    .row { display: flex; gap: 8px; align-items: stretch; }
    .trigger { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer;
      background: transparent; border: 1px solid var(--mp-border); border-radius: var(--mp-radius); padding: 10px 12px; min-height: 64px; }
    /* Vazio: área grande tracejada, centralizada, como "Nenhum item selecionado / Clique para adicionar". */
    .trigger.empty { border: 2px dashed var(--mp-border); border-radius: 8px; min-height: 180px; justify-content: center; padding: 24px 16px; background: rgba(0, 0, 0, .06); }
    .trigger.empty .val { flex-direction: column; justify-content: center; text-align: center; gap: 10px; }
    .trigger.empty .name { font-size: 16px; font-weight: 700; color: var(--mp-muted); }
    .trigger.empty small { font-size: 13px; color: var(--mp-muted); }
    .trigger:hover { border-color: var(--mp-muted); }
    .trigger.empty:hover { background: rgba(255, 255, 255, .03); }
    .trigger.empty:hover .plus { color: var(--mp-text); }
    .card.nofit .trigger.has, .card.power .trigger.has { border-color: var(--mp-danger); background: rgba(229, 72, 77, .08); }
    .val { flex: 1; min-width: 0; display: flex; align-items: center; gap: 14px; }
    .body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .name { font-size: 14px; line-height: 1.3; }
    .body small { font-size: 12px; color: var(--mp-muted); }
    .plus { color: var(--mp-muted); display: grid; flex: none; }
    /* Aviso fixo escuro (igual nos dois temas): texto branco sobre quase preto. */
    .req { display: flex; align-items: center; gap: 10px; margin: 16px 0 0; padding: 16px 18px; border-radius: 4px; background: #170b0c; color: #fff; font-size: 14px; }
    .req svg { color: #ff5a5f; flex: none; }
    .chev { color: var(--mp-muted); display: grid; }
    .rm { background: none; border: 1px solid var(--mp-border); border-radius: var(--mp-radius); color: var(--mp-danger-text); cursor: pointer; padding: 0 12px; min-width: 44px; font-size: 13px; }
    .issues { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 6px; font-size: 13px; }
    .issues li { line-height: 1.5; }
    .issues .badge { margin-right: 8px; }
    .issues li.nofit, .issues li.power, .issues li.incompatible { color: var(--mp-danger-text); }
    .issues li.warning { color: var(--mp-warn-text); }
    img { border-radius: 4px; object-fit: cover; flex: none; }
    @media (prefers-reduced-motion: no-preference) {
      .trigger { transition: border-color .15s, background-color .15s; }
    }
    @media (max-width: 560px) {
      .card { padding: 14px 12px; }
      .row { flex-direction: column; }
      .rm { align-self: flex-end; min-height: 44px; }
      .trigger.empty { min-height: 150px; }
      .trigger.has .val { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 6px 12px; align-items: start; }
      .val > .ph, .val > img { grid-row: span 2; width: 56px !important; height: 56px !important; }
      .val > .price { grid-column: 2; }
    }
  `];
}

if (!customElements.get('mp-part-picker')) customElements.define('mp-part-picker', PartPicker);

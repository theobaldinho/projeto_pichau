/* Ícones por slot (os mesmos da versão anterior de monte-seu-pc.html) e utilitários. */
import { html, svg, type SVGTemplateResult, type TemplateResult } from 'lit';
import type { Slot } from '../core';

const ico = (paths: SVGTemplateResult) =>
  html`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${paths}</svg>`;

export const SLOT_ICON: Record<Slot, TemplateResult> = {
  cpu: ico(svg`<rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>`),
  cooler: ico(svg`<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/>`),
  mobo: ico(svg`<rect x="3" y="3" width="18" height="18" rx="1"/><rect x="7" y="7" width="5" height="5"/><path d="M15 7h2M15 10h2M7 16h10"/>`),
  ram: ico(svg`<rect x="2" y="7" width="20" height="9" rx="1"/><path d="M6 16v3M10 16v3M14 16v3M18 16v3M6 10v3M10 10v3M14 10v3M18 10v3"/>`),
  gpu: ico(svg`<rect x="2" y="6" width="20" height="11" rx="1"/><circle cx="9" cy="11.5" r="3"/><circle cx="16" cy="11.5" r="3"/><path d="M5 17v3"/>`),
  storage: ico(svg`<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4"/>`),
  case: ico(svg`<rect x="6" y="2" width="12" height="20" rx="1"/><circle cx="12" cy="15" r="3"/><path d="M9 6h6"/>`),
  psu: ico(svg`<rect x="2" y="5" width="20" height="14" rx="1"/><circle cx="9" cy="12" r="4"/><path d="M16 9h3M16 12h3M16 15h3"/>`),
  extras: ico(svg`<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>`),
};

export const ICON_CHECK = html`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const ICON_ALERT = html`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 7v6M12 16v1" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`;
export const ICON_BOLT = html`<svg viewBox="0 0 24 24" width="20" height="22" fill="#ffb020" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>`;
export const ICON_SHARE = html`<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" stroke="currentColor" stroke-width="2"/></svg>`;
export const ICON_CHEVRON = html`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
export const ICON_PLUS = html`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
export const ICON_PLUS_RING = html`<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="24" cy="24" r="20"/><path d="M24 15v18M15 24h18"/></svg>`;
export const ICON_INFO = html`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/></svg>`;
const line = (d: string, size = 20, sw = 2) => html`<svg viewBox="0 0 24 24" width=${size} height=${size} fill="none" stroke="currentColor" stroke-width=${sw} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${d}/></svg>`;
export const ICON_X = line('M6 6l12 12M18 6 6 18', 24, 2.4);
export const ICON_KEYBOARD = html`<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm2 3v2h2V9H5Zm3 0v2h2V9H8Zm3 0v2h2V9h-2Zm3 0v2h2V9h-2Zm3 0v2h2V9h-2ZM5 12v2h2v-2H5Zm3 0v2h2v-2H8Zm3 0v2h2v-2h-2Zm3 0v2h2v-2h-2Zm3 0v2h2v-2h-2ZM7 15v1.5h10V15H7Z"/></svg>`;
export const ICON_SEARCH = line('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4.3-4.3', 22, 2.2);
export const ICON_ARROW = line('M5 12h14m-6-6 6 6-6 6', 20, 2.4);
export const ICON_TICK = line('m5 12.5 4.2 4.2L19 7', 18, 2.6);
export const ICON_RESET = line('M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5', 13, 2);
export const ICON_FIRST = line('M6 6v12M18 6l-6 6 6 6', 18, 2.2);
export const ICON_PREV = line('m15 6-6 6 6 6', 18, 2.2);
export const ICON_NEXT = line('m9 6 6 6-6 6', 18, 2.2);
export const ICON_LAST = line('M18 6v12M6 6l6 6-6 6', 18, 2.2);
export const ICON_FILTER = line('M3 5h18l-7 8v6l-4 1v-7L3 5Z', 18, 2);
export const ICON_OK = html`<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="var(--mp-chip, #2f2f2f)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const ICON_NO = html`<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m8.5 8.5 7 7m0-7-7 7" fill="none" stroke="var(--mp-chip, #2f2f2f)" stroke-width="2.4" stroke-linecap="round"/></svg>`;
export const ICON_BOLT_SM = html`<svg viewBox="0 0 24 24" width="14" height="16" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>`;

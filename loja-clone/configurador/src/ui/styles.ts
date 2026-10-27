/*
 * Tokens: herdam as variáveis do site hospedeiro quando existem (--red, --box, --txt, --mut, --field, --edge, --line,
 * --hover, --chip, --panel, --price, --danger-txt, --warn-txt, --focus, --shadow, --stage-a/b). Tema claro = o site troca essas variáveis.
 */
import { css } from 'lit';

export const tokens = css`
  :host {
    --mp-accent: var(--red, #e90313);
    --mp-text: var(--txt, #fff);
    --mp-muted: var(--mut, #c8c8c8);
    --mp-surface: var(--box, #3a3a3a);
    --mp-surface-2: var(--field, #454545);
    --mp-border: var(--edge, #5d5d5d);
    --mp-line: var(--line, #444);
    --mp-hover: var(--hover, #3d3d3d);
    --mp-pop: var(--panel, #2f2f2f);
    --mp-chip: var(--chip, #2f2f2f);
    --mp-shadow: var(--shadow, rgba(0, 0, 0, .5));
    --mp-price: var(--price, #3ddc5a);        /* verde de texto com contraste AA sobre as superfícies */
    --mp-buy: #087a23;            /* fundo do COMPRAR (branco sobre ele: 5,5:1) */
    --mp-danger: #e5484d;         /* bordas e fundos de conflito */
    --mp-danger-text: var(--danger-txt, #ffa3a3);
    --mp-warn: #ffc94d;           /* fundo (barra, selo) */
    --mp-warn-text: var(--warn-txt, #ffc94d);
    --mp-focus: var(--focus, #fff);
    --mp-radius: 6px;
    color: var(--mp-text);
    font-family: inherit;
  }
  *, *::before, *::after { box-sizing: border-box; }
  button { font: inherit; color: inherit; }
  :focus-visible { outline: 2px solid var(--mp-focus); outline-offset: 2px; }
  .ph {
    background: repeating-linear-gradient(45deg, var(--ph-1, #4d4d4d) 0 10px, var(--ph-2, #474747) 10px 20px);
    outline: 1px dashed var(--ph-o, #6a6a6a); outline-offset: -1px; border-radius: 4px; flex: none;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .chip { font-size: 11px; line-height: 1; padding: 4px 6px; border-radius: 4px; background: var(--mp-chip); color: var(--mp-muted); }
  .price { color: var(--mp-price); font-weight: 700; white-space: nowrap; }
  .badge { font-size: 11px; font-weight: 700; padding: 3px 7px; border-radius: 4px; white-space: nowrap; }
  .badge.incompatible { background: #5a5a5a; color: #fff; }
  .badge.nofit, .badge.power { background: var(--mp-danger); color: #fff; }
  .badge.warning { background: var(--mp-warn); color: #1a1a1a; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

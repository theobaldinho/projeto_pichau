import type { Totals } from './types';

/** Desconto do PIX sobre o preço no cartão (mesma regra de assets/common.js). */
export const PIX_DISCOUNT = 0.15;
export const MAX_INSTALLMENTS = 12;

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como "R$ 1.234,56" (com espaço não separável). */
export const brl = (cents: number): string => fmt.format(cents / 100);

export const cardFromPix = (pix: number): number => Math.round(pix / (1 - PIX_DISCOUNT));

export function totals(pix: number): Totals {
  const card = cardFromPix(pix);
  const installments = card > 0 ? MAX_INSTALLMENTS : 1;
  return { pix, card, installments, installment: Math.round(card / installments) };
}

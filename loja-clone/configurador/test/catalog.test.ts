/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { SLOTS, validateCatalog } from '../src/core';
import { catalog } from './helpers';

describe('catálogo', () => {
  it('é válido', () => expect(validateCatalog(catalog)).toEqual([]));

  it('tem opções em todos os slots', () => {
    for (const { slot } of SLOTS) expect(catalog.parts.some(p => p.slot === slot), slot).toBe(true);
  });

  it('toda imagem aponta para um arquivo que existe (relativo ao catálogo)', () => {
    const files = new Set(Object.keys(import.meta.glob('../data/img/*')).map(f => f.replace('../data/', '')));
    for (const p of catalog.parts) if (p.image) expect(files.has(p.image), `${p.id}: ${p.image}`).toBe(true);
    expect(catalog.parts.filter(p => p.slot !== 'extras' && !p.image).map(p => p.id)).toEqual([]);
  });

  it('acusa erros de formato', () => {
    const errors = validateCatalog({ parts: [
      { id: 'x', slot: 'gpu', name: 'GPU', pricePix: 10.5 },
      { id: 'x', slot: 'nada', name: 'Y', pricePix: 1 },
    ] });
    expect(errors).toContain('parts[0] (x): pricePix deve ser inteiro em centavos');
    expect(errors).toContain('parts[0] (x): campo "lengthMm" deve ser number');
    expect(errors).toContain('parts[1] (x): id duplicado');
    expect(errors).toContain('parts[1] (x): slot desconhecido "nada"');
    expect(validateCatalog({})).toEqual(['catálogo sem lista "parts"']);
  });
});

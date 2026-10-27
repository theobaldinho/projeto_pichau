import { describe, expect, it } from 'vitest';
import { SLOTS, applyFilters, choices, evaluate, facetCounts, filtersFor, isActive, rangeBounds, sortOptions, type FilterDef } from '../src/core';
import { buildOf, catalog } from './helpers';

const opts = (slot: Parameters<typeof filtersFor>[0], ...ids: string[]) => evaluate(catalog, buildOf(...ids)).slots[slot].options;
const def = (slot: Parameters<typeof filtersFor>[0], key: string) => filtersFor(slot).find(d => d.key === key)!;
const ids = (l: { part: { id: string } }[]) => l.map(o => o.part.id);
const idset = (l: { part: { id: string } }[]) => ids(l).sort();

describe('filtros da janela de peças', () => {
  it('todo slot tem preço, "só o que é compatível", oferta e outlet; chaves únicas', () => {
    for (const { slot } of SLOTS) {
      const keys = filtersFor(slot).map(d => d.key);
      expect(keys, slot).toEqual(expect.arrayContaining(['price', 'fits', 'sale', 'outlet']));
      expect(new Set(keys).size, slot).toBe(keys.length);
    }
  });

  it('processador: os filtros pedidos, na ordem', () => {
    expect(filtersFor('cpu').map(d => d.label)).toEqual(['Preço', 'Potência', 'Potência de clock', 'Frequência de RAM', 'Fabricante',
      'Tipo de processador', 'Geração', 'Soquete', 'Versão da DDR', 'Condição', 'RAM máxima', 'Número de núcleos', 'Threads',
      'VGA Integrado', 'Overclock habilitado', 'Cooler embutido', 'Só o que é compatível', 'Em oferta', 'Em outlet']);
  });

  it('faixa: limites vêm dos dados e filtram pelo valor', () => {
    const o = opts('cpu');
    const tdp = def('cpu', 'tdp') as Extract<FilterDef, { kind: 'range' }>;
    expect(rangeBounds(o, tdp)).toEqual([65, 253]);
    expect(idset(applyFilters(o, filtersFor('cpu'), { tdp: [60, 70] }))).toEqual(['cpu-r5-am4', 'cpu-r5-am5']);
    expect(isActive(tdp, [65, 253], [65, 253])).toBe(false);
    expect(isActive(tdp, [65, 200], [65, 253])).toBe(true);
  });

  it('lista com contagem: Fabricante AMD/Intel, contando com os outros filtros', () => {
    const o = opts('cpu'), defs = filtersFor('cpu'), maker = def('cpu', 'maker');
    expect(choices(o, maker)).toEqual(['AMD', 'Intel']);
    expect(Object.fromEntries(facetCounts(o, defs, {}, maker))).toEqual({ AMD: 5, Intel: 2 });
    expect(Object.fromEntries(facetCounts(o, defs, { igpu: true }, maker))).toEqual({ AMD: 3, Intel: 1 });
    expect(idset(applyFilters(o, defs, { maker: ['Intel'] }))).toEqual(['cpu-c5-1700', 'cpu-c7-1700']);
  });

  it('seleção com vários valores por peça (DDR, soquete do cooler)', () => {
    expect(idset(applyFilters(opts('cpu'), filtersFor('cpu'), { ddr: 'DDR4' }))).toEqual(['cpu-c5-1700', 'cpu-c7-1700', 'cpu-r5-am4', 'cpu-r7-am4']);
    expect(ids(applyFilters(opts('cooler'), filtersFor('cooler'), { socket: 'AM5' }))).not.toContain('cooler-air-lp');
  });

  it('"Sim" antes de "Não" e números pela ordem numérica', () => {
    expect(choices(opts('mobo'), def('mobo', 'vrm'))).toEqual(['Sim', 'Não']);
    expect(choices(opts('cpu'), def('cpu', 'cores'))).toEqual(['6', '8', '16', '20']);
  });

  it('"só o que é compatível" usa o status da build atual', () => {
    const o = opts('mobo', 'cpu-r5-am5');
    expect(idset(applyFilters(o, filtersFor('mobo'), { fits: true }))).toEqual(['mobo-b650i', 'mobo-b650m', 'mobo-x670e']);
  });

  it('busca sem acento e ordenação', () => {
    const o = opts('ram');
    expect(ids(applyFilters(o, filtersFor('ram'), {}, 'memoria 64'))).toEqual(['ram-64-ddr5-4x']);
    expect(ids(sortOptions(o, 'price-asc'))[0]).toBe('ram-16-ddr4');
    expect(ids(sortOptions(opts('mobo', 'cpu-r5-am5'), 'rel')).slice(-1)).not.toContain('mobo-b650m');
  });
});

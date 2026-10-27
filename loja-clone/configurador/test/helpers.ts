import data from '../data/catalog.json';
import { resolve, type Build, type Catalog, type Psu, type Selected, type Slot } from '../src/core';

export const catalog = data as unknown as Catalog;
export const psus = catalog.parts.filter((p): p is Psu => p.slot === 'psu');

/** Monta um build a partir de ids do catálogo. */
export function buildOf(...ids: string[]): Build {
  const b: Build = {};
  for (const id of ids) {
    const p = catalog.parts.find(x => x.id === id);
    if (!p) throw new Error(`id desconhecido no teste: ${id}`);
    b[p.slot as Slot] = id;
  }
  return b;
}

export const sel = (...ids: string[]): Selected => resolve(catalog, buildOf(...ids));

/* Build ⇄ texto de URL. Só leva ids de peças: nenhum dado pessoal. */
import { SLOTS, type Build, type Catalog, type Slot } from './types';

export const SHARE_PARAM = 'b';

export function encodeBuild(build: Build): string {
  return SLOTS.filter(s => build[s.slot]).map(s => `${s.slot}:${build[s.slot]}`).join(',');
}

/** Ignora slots desconhecidos e ids que não existem no catálogo. */
export function decodeBuild(text: string, catalog: Catalog): Build {
  const build: Build = {};
  for (const pair of text.split(',')) {
    const [slot, id] = pair.split(':') as [Slot, string];
    if (catalog.parts.some(p => p.id === id && p.slot === slot)) build[slot] = id;
  }
  return build;
}

export function buildFromUrl(url: URL, catalog: Catalog): Build {
  const text = url.searchParams.get(SHARE_PARAM);
  return text ? decodeBuild(text, catalog) : {};
}

export function urlWithBuild(url: URL, build: Build): URL {
  const next = new URL(url);
  const text = encodeBuild(build);
  if (text) next.searchParams.set(SHARE_PARAM, text);
  else next.searchParams.delete(SHARE_PARAM);
  return next;
}

/*
 * Filtros da janela "Selecionar Componente", por slot (sem DOM, testável).
 * Faixa (slider + números), lista de marcar (com contagem), seleção única ("Todas") e caixa sim/não.
 * Campo ausente na peça: a peça só sai da lista quando aquele filtro está em uso.
 */
import { FORM_FACTOR_LABEL } from './rules';
import type { Option, OptionStatus, PartOf, Slot } from './types';

type Get<T> = (o: Option) => T | undefined;
export type FilterDef =
  | { kind: 'range'; key: string; label: string; unit: string; step: number; get: Get<number> }
  | { kind: 'checks'; key: string; label: string; get: Get<string | string[]> }
  | { kind: 'select'; key: string; label: string; any?: string; get: Get<string | string[]> }
  | { kind: 'bool'; key: string; label: string; get: Get<boolean> };

/** Faixa: [mín, máx] · lista: valores marcados · seleção: valor ('' = todas) · sim/não: true. Ausente = filtro sem uso. */
export type FilterValue = [number, number] | string[] | string | boolean;
export type FilterState = Record<string, FilterValue>;
export type SortKey = 'rel' | 'price-asc' | 'price-desc' | 'name';

const as = <S extends Slot>(f: (p: PartOf<S>) => unknown) => (o: Option) => f(o.part as PartOf<S>);
const yn = (v: boolean | undefined) => (v === undefined ? undefined : v ? 'Sim' : 'Não');
const num = (v: number) => v.toLocaleString('pt-BR');
const gbLabel = (v: number) => (v >= 1000 ? `${num(v / 1000)} TB` : `${v} GB`);

const GEN: Record<string, string> = {
  zen3: 'Ryzen 5000 (Zen 3)', zen4: 'Ryzen 7000 (Zen 4)', zen5: 'Ryzen 9000 (Zen 5)',
  intel12: 'Core 12ª geração', intel13: 'Core 13ª geração', intel14: 'Core 14ª geração',
};
const CONNECTOR: Record<string, string> = { '8pin': '8 pinos (PCIe)', '12V-2x6': '12V-2x6 (16 pinos)' };

const price: FilterDef = { kind: 'range', key: 'price', label: 'Preço', unit: 'R$', step: 1, get: o => o.part.pricePix / 100 };
const brand: FilterDef = { kind: 'select', key: 'brand', label: 'Marca', get: o => o.part.brand };
/** Sempre no fim: "só o que serve" (o antigo atalho dos conflitos), oferta e outlet. */
const COMMON_BOOLS: FilterDef[] = [
  { kind: 'bool', key: 'fits', label: 'Só o que é compatível', get: o => o.status === 'ok' || o.status === 'warning' },
  { kind: 'bool', key: 'sale', label: 'Em oferta', get: o => !!o.part.onSale },
  { kind: 'bool', key: 'outlet', label: 'Em outlet', get: o => !!o.part.outlet },
];

const DEFS: Record<Slot, FilterDef[]> = {
  cpu: [
    price,
    { kind: 'range', key: 'tdp', label: 'Potência', unit: 'W', step: 1, get: as<'cpu'>(p => p.tdpW) as Get<number> },
    { kind: 'range', key: 'clock', label: 'Potência de clock', unit: 'GHz', step: 0.1, get: as<'cpu'>(p => p.boostGhz) as Get<number> },
    { kind: 'range', key: 'ramMhz', label: 'Frequência de RAM', unit: 'MHz', step: 50, get: as<'cpu'>(p => p.ramMhz) as Get<number> },
    { kind: 'checks', key: 'maker', label: 'Fabricante', get: as<'cpu'>(p => (p.socket.startsWith('AM') ? 'AMD' : 'Intel')) as Get<string> },
    { kind: 'select', key: 'series', label: 'Tipo de processador', get: as<'cpu'>(p => p.series) as Get<string> },
    { kind: 'select', key: 'gen', label: 'Geração', get: as<'cpu'>(p => GEN[p.generation] ?? p.generation) as Get<string> },
    { kind: 'select', key: 'socket', label: 'Soquete', get: as<'cpu'>(p => p.socket) as Get<string> },
    { kind: 'select', key: 'ddr', label: 'Versão da DDR', get: as<'cpu'>(p => p.memTypes) as Get<string[]> },
    { kind: 'select', key: 'cond', label: 'Condição', get: o => (o.part.outlet ? 'Openbox' : 'Novo') },
    { kind: 'select', key: 'maxRam', label: 'RAM máxima', any: 'Qualquer', get: as<'cpu'>(p => (p.maxRamGb ? `${p.maxRamGb} GB` : undefined)) as Get<string> },
    { kind: 'select', key: 'cores', label: 'Número de núcleos', get: as<'cpu'>(p => p.cores?.toString()) as Get<string> },
    { kind: 'select', key: 'threads', label: 'Threads', get: as<'cpu'>(p => p.threads?.toString()) as Get<string> },
    { kind: 'bool', key: 'igpu', label: 'VGA Integrado', get: as<'cpu'>(p => p.igpu) as Get<boolean> },
    { kind: 'bool', key: 'oc', label: 'Overclock habilitado', get: as<'cpu'>(p => p.overclock) as Get<boolean> },
    { kind: 'bool', key: 'stock', label: 'Cooler embutido', get: as<'cpu'>(p => p.coolerIncluded) as Get<boolean> },
  ],
  cooler: [
    price,
    { kind: 'range', key: 'tdp', label: 'Potência', unit: 'W', step: 5, get: as<'cooler'>(p => p.tdpRatingW) as Get<number> },
    { kind: 'range', key: 'size', label: 'Tamanho do radiador / altura', unit: 'mm', step: 5, get: as<'cooler'>(p => p.radiatorMm ?? p.heightMm) as Get<number> },
    { kind: 'range', key: 'cfm', label: 'Fluxo de ar', unit: 'CFM', step: 1, get: as<'cooler'>(p => p.airflowCfm) as Get<number> },
    { kind: 'range', key: 'press', label: 'Pressão estática', unit: 'mmH₂O', step: 0.5, get: as<'cooler'>(p => p.pressureMmH2O) as Get<number> },
    { kind: 'range', key: 'noise', label: 'Nível de ruído', unit: 'dBA', step: 1, get: as<'cooler'>(p => p.noiseDba) as Get<number> },
    { kind: 'range', key: 'rpm', label: 'Rotação', unit: 'RPM', step: 50, get: as<'cooler'>(p => p.maxRpm) as Get<number> },
    brand,
    { kind: 'select', key: 'fan', label: 'Tamanho', get: as<'cooler'>(p => (p.fanMm ? `${p.fanMm} mm` : undefined)) as Get<string> },
    { kind: 'select', key: 'fans', label: 'Ventoinhas inclusas', get: as<'cooler'>(p => p.fans?.toString()) as Get<string> },
    { kind: 'select', key: 'type', label: 'Tipo', get: as<'cooler'>(p => p.kind === 'aio' ? 'Water cooler' : (p.heightMm ?? 0) < 70 ? 'Low profile' : (p.fans ?? 1) > 1 ? 'Torre dupla' : 'Torre') as Get<string> },
    { kind: 'select', key: 'cooling', label: 'Refrigeração', get: as<'cooler'>(p => (p.kind === 'aio' ? 'Líquida' : 'Ar')) as Get<string> },
    { kind: 'select', key: 'socket', label: 'Soquete suportado', get: as<'cooler'>(p => p.sockets) as Get<string[]> },
    { kind: 'select', key: 'color', label: 'Cor', get: as<'cooler'>(p => p.color) as Get<string> },
  ],
  mobo: [
    price, brand,
    { kind: 'select', key: 'slots', label: 'Slots de memória', get: as<'mobo'>(p => p.memSlots.toString()) as Get<string> },
    { kind: 'select', key: 'chipset', label: 'Chipset', get: as<'mobo'>(p => p.chipset) as Get<string> },
    { kind: 'select', key: 'ff', label: 'Tamanho', get: as<'mobo'>(p => FORM_FACTOR_LABEL[p.formFactor]) as Get<string> },
    { kind: 'select', key: 'socket', label: 'Soquete', get: as<'mobo'>(p => p.socket) as Get<string> },
    { kind: 'select', key: 'mem', label: 'Memória', get: as<'mobo'>(p => p.memType) as Get<string> },
    { kind: 'select', key: 'vrm', label: 'Dissipador do VRM', get: as<'mobo'>(p => yn(p.vrmHeatsink)) as Get<string> },
    { kind: 'select', key: 'sata', label: 'Tem interface Sata III', get: as<'mobo'>(p => (p.sataPorts === undefined ? undefined : yn(p.sataPorts > 0))) as Get<string> },
    { kind: 'select', key: 'm2', label: 'Tem interface SSD M.2', get: as<'mobo'>(p => yn(p.m2Slots > 0)) as Get<string> },
    { kind: 'select', key: 'maxRam', label: 'RAM máxima', any: 'Qualquer', get: as<'mobo'>(p => (p.maxRamGb ? `${p.maxRamGb} GB` : undefined)) as Get<string> },
    { kind: 'select', key: 'pcie', label: 'Versão de PCIe', get: as<'mobo'>(p => (p.pcieGen ? `PCIe ${p.pcieGen}.0` : undefined)) as Get<string> },
    { kind: 'select', key: 'wifi', label: 'Wi-Fi', get: as<'mobo'>(p => yn(p.rearIo?.wifi)) as Get<string> },
  ],
  ram: [
    price,
    { kind: 'range', key: 'mhz', label: 'Frequência', unit: 'MHz', step: 100, get: as<'ram'>(p => p.mhz) as Get<number> },
    { kind: 'range', key: 'cl', label: 'Latência', unit: 'CL', step: 1, get: as<'ram'>(p => p.cl) as Get<number> },
    brand,
    { kind: 'select', key: 'type', label: 'Tipo', get: as<'ram'>(p => p.memType) as Get<string> },
    { kind: 'select', key: 'cap', label: 'Capacidade', get: as<'ram'>(p => `${p.capacityGb} GB`) as Get<string> },
    { kind: 'select', key: 'mods', label: 'Módulos', get: as<'ram'>(p => `${p.modules} pentes`) as Get<string> },
    { kind: 'bool', key: 'rgb', label: 'RGB', get: as<'ram'>(p => p.rgb) as Get<boolean> },
  ],
  gpu: [
    price,
    { kind: 'range', key: 'len', label: 'Comprimento', unit: 'mm', step: 5, get: as<'gpu'>(p => p.lengthMm) as Get<number> },
    { kind: 'range', key: 'tbp', label: 'Consumo', unit: 'W', step: 10, get: as<'gpu'>(p => p.tbpW) as Get<number> },
    brand,
    { kind: 'select', key: 'vram', label: 'Memória de vídeo', get: as<'gpu'>(p => (p.vramGb ? `${p.vramGb} GB` : undefined)) as Get<string> },
    { kind: 'select', key: 'width', label: 'Largura', get: as<'gpu'>(p => `${num(p.slotWidth)} slots`) as Get<string> },
    { kind: 'select', key: 'conn', label: 'Conector de energia', get: as<'gpu'>(p => p.powerConnectors.map(c => CONNECTOR[c] ?? c)) as Get<string[]> },
  ],
  storage: [
    price,
    { kind: 'range', key: 'read', label: 'Leitura', unit: 'MB/s', step: 50, get: as<'storage'>(p => p.readMbps) as Get<number> },
    brand,
    { kind: 'select', key: 'iface', label: 'Interface', get: as<'storage'>(p => (p.interface === 'm2' ? 'M.2 NVMe' : 'SATA III')) as Get<string> },
    { kind: 'select', key: 'cap', label: 'Capacidade', get: as<'storage'>(p => gbLabel(p.capacityGb)) as Get<string> },
    { kind: 'select', key: 'form', label: 'Formato', get: as<'storage'>(p => (p.interface === 'm2' ? 'M.2 2280' : '2,5 polegadas')) as Get<string> },
  ],
  case: [
    price,
    { kind: 'range', key: 'gpu', label: 'Placa de vídeo até', unit: 'mm', step: 5, get: as<'case'>(p => p.maxGpuLengthMm) as Get<number> },
    { kind: 'range', key: 'cooler', label: 'Altura do cooler até', unit: 'mm', step: 5, get: as<'case'>(p => p.maxCoolerHeightMm) as Get<number> },
    { kind: 'range', key: 'psu', label: 'Fonte até', unit: 'mm', step: 5, get: as<'case'>(p => p.maxPsuLengthMm) as Get<number> },
    brand,
    { kind: 'select', key: 'tower', label: 'Tamanho', get: as<'case'>(p => (p.formFactors.includes('eatx') ? 'Full-Tower' : p.formFactors.includes('atx') ? 'Mid-Tower' : p.formFactors.includes('matx') ? 'Micro-ATX' : 'Mini-ITX')) as Get<string> },
    { kind: 'select', key: 'ff', label: 'Placa-mãe suportada', get: as<'case'>(p => p.formFactors.map(f => FORM_FACTOR_LABEL[f])) as Get<string[]> },
    { kind: 'select', key: 'fans', label: 'Ventoinhas inclusas', get: as<'case'>(p => p.fansIncluded?.toString()) as Get<string> },
    { kind: 'select', key: 'rad', label: 'Radiador na frente', get: as<'case'>(p => (p.radiatorMounts.front.length ? `até ${Math.max(...p.radiatorMounts.front)} mm` : 'Não suporta')) as Get<string> },
    { kind: 'select', key: 'color', label: 'Cor', get: as<'case'>(p => p.color) as Get<string> },
    { kind: 'bool', key: 'glass', label: 'Lateral de vidro', get: as<'case'>(p => p.glass) as Get<boolean> },
  ],
  psu: [
    price,
    { kind: 'range', key: 'watt', label: 'Potência', unit: 'W', step: 50, get: as<'psu'>(p => p.wattage) as Get<number> },
    { kind: 'range', key: 'len', label: 'Comprimento', unit: 'mm', step: 5, get: as<'psu'>(p => p.lengthMm) as Get<number> },
    brand,
    { kind: 'select', key: 'eff', label: 'Certificação', get: as<'psu'>(p => (p.efficiency ? `80 Plus ${p.efficiency}` : undefined)) as Get<string> },
    { kind: 'select', key: 'mod', label: 'Modular', get: as<'psu'>(p => p.modular) as Get<string> },
    { kind: 'bool', key: 'atx31', label: 'Conector 12V-2x6 (ATX 3.1)', get: as<'psu'>(p => p.connectors.includes('12V-2x6')) as Get<boolean> },
  ],
  extras: [price, brand],
};

/** Filtros do slot, na ordem de exibição (faixas, listas e seleções, caixas). */
export function filtersFor(slot: Slot): FilterDef[] {
  return [...DEFS[slot], ...COMMON_BOOLS];
}

const values = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Limites da faixa nos dados (arredondados ao passo); sem variação, abre um passo para o slider não travar. */
export function rangeBounds(options: Option[], def: Extract<FilterDef, { kind: 'range' }>): [number, number] {
  const vs = options.map(def.get).filter((v): v is number => v !== undefined);
  if (!vs.length) return [0, def.step];
  const r = (v: number) => Math.round(v / def.step) * def.step;
  // +/- 1e-9: 4,1 / 0,1 dá 40,999… em ponto flutuante.
  let lo = r(Math.floor(Math.min(...vs) / def.step + 1e-9) * def.step), hi = r(Math.ceil(Math.max(...vs) / def.step - 1e-9) * def.step);
  if (hi <= lo) hi = lo + def.step;
  return [+lo.toFixed(4), +hi.toFixed(4)];
}

/** Valores possíveis de uma lista/seleção, em ordem natural (números pelo valor). */
export function choices(options: Option[], def: FilterDef): string[] {
  const set = new Set(options.flatMap(o => values(def.get(o) as string | string[] | undefined)));
  const n = (v: string) => (v === 'Sim' ? -2 : v === 'Não' ? -1 : parseFloat(v.replace(/^\D*(?=\d)/, '')));
  return [...set].sort((a, b) => (n(a) - n(b)) || a.localeCompare(b, 'pt-BR', { numeric: true }));
}

function pass(o: Option, def: FilterDef, v: FilterValue | undefined): boolean {
  if (v === undefined || v === '' || v === false || (Array.isArray(v) && !v.length)) return true;
  switch (def.kind) {
    case 'range': { const x = def.get(o); const [lo, hi] = v as [number, number]; return x !== undefined && x >= lo - 1e-9 && x <= hi + 1e-9; }
    case 'checks': return values(def.get(o)).some(x => (v as string[]).includes(x));
    case 'select': return values(def.get(o)).includes(v as string);
    case 'bool': return def.get(o) === true;
  }
}

/** Filtro em uso? (faixa diferente dos limites, algo marcado ou escolhido). */
export function isActive(def: FilterDef, v: FilterValue | undefined, bounds?: [number, number]): boolean {
  if (v === undefined || v === '' || v === false) return false;
  if (def.kind === 'range' && bounds) return (v as number[])[0] > bounds[0] || (v as number[])[1] < bounds[1];
  return !Array.isArray(v) || v.length > 0;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function applyFilters(options: Option[], defs: FilterDef[], state: FilterState, query = '', skip?: string): Option[] {
  // Busca por palavras soltas, sem acento: "memoria 64" acha "Memória Exemplo 64GB".
  const words = norm(query).split(/\s+/).filter(Boolean);
  return options.filter(o => words.every(w => norm(o.part.name).includes(w)) && defs.every(d => d.key === skip || pass(o, d, state[d.key])));
}

/** Quantas peças ficariam com cada valor, considerando os outros filtros (contagem ao lado da opção). */
export function facetCounts(options: Option[], defs: FilterDef[], state: FilterState, def: FilterDef, query = ''): Map<string, number> {
  const base = applyFilters(options, defs, state, query, def.key);
  const out = new Map<string, number>();
  for (const o of base) for (const v of values(def.get(o) as string | string[] | undefined)) out.set(v, (out.get(v) ?? 0) + 1);
  return out;
}

const RANK: Record<OptionStatus, number> = { ok: 0, warning: 1, nofit: 2, power: 2, incompatible: 3 };

/** Relevância: o que serve primeiro, na ordem do catálogo. */
export function sortOptions(list: Option[], key: SortKey): Option[] {
  const by: Record<SortKey, (a: Option, b: Option) => number> = {
    rel: (a, b) => RANK[a.status] - RANK[b.status],
    'price-asc': (a, b) => a.part.pricePix - b.part.pricePix,
    'price-desc': (a, b) => b.part.pricePix - a.part.pricePix,
    name: (a, b) => a.part.name.localeCompare(b.part.name, 'pt-BR'),
  };
  return [...list].sort(by[key]);
}


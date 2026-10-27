/* Validação do catálogo: usada nos testes e ao carregar um catálogo externo (feed, API). */
import { SLOTS, type Catalog, type Slot } from './types';

type Kind = 'string' | 'number' | 'string[]' | 'number[]' | 'object';

const FIELDS: Record<Slot, Record<string, Kind>> = {
  cpu: { socket: 'string', tdpW: 'number', memTypes: 'string[]', generation: 'string' },
  mobo: { socket: 'string', formFactor: 'string', memType: 'string', memSlots: 'number', m2Slots: 'number', cpuGenerations: 'object' },
  ram: { memType: 'string', modules: 'number', capacityGb: 'number', heightMm: 'number' },
  gpu: { lengthMm: 'number', slotWidth: 'number', tbpW: 'number', powerConnectors: 'string[]' },
  cooler: { kind: 'string', sockets: 'string[]', tdpRatingW: 'number' },
  case: { formFactors: 'string[]', maxGpuLengthMm: 'number', expansionSlots: 'number', maxCoolerHeightMm: 'number', radiatorMounts: 'object', maxPsuLengthMm: 'number' },
  psu: { wattage: 'number', lengthMm: 'number', connectors: 'string[]' },
  storage: { interface: 'string', capacityGb: 'number' },
  extras: {},
};

function is(v: unknown, k: Kind): boolean {
  if (k === 'string[]') return Array.isArray(v) && v.every(x => typeof x === 'string');
  if (k === 'number[]') return Array.isArray(v) && v.every(x => typeof x === 'number');
  if (k === 'object') return typeof v === 'object' && v !== null && !Array.isArray(v);
  return typeof v === k && (k !== 'number' || Number.isFinite(v));
}

const REAR_IO: Record<string, 'number' | 'boolean'> = {
  usb2: 'number', usb5: 'number', usb10: 'number', usbc: 'number', hdmi: 'number', dp: 'number', lanGbps: 'number', audio: 'number',
  wifi: 'boolean', spdif: 'boolean', ps2: 'boolean', biosFlashback: 'boolean', clearCmos: 'boolean',
};

/** Lista de erros legíveis; vazia = catálogo válido. */
export function validateCatalog(data: unknown): string[] {
  const errors: string[] = [];
  const parts = (data as Catalog)?.parts;
  if (!Array.isArray(parts)) return ['catálogo sem lista "parts"'];
  const slots = new Set(SLOTS.map(s => s.slot));
  const ids = new Set<string>();
  parts.forEach((p, i) => {
    const at = `parts[${i}]${p?.id ? ` (${p.id})` : ''}`;
    if (typeof p?.id !== 'string' || !p.id) return void errors.push(`${at}: id ausente`);
    if (ids.has(p.id)) errors.push(`${at}: id duplicado`);
    ids.add(p.id);
    if (!slots.has(p.slot)) return void errors.push(`${at}: slot desconhecido "${p.slot}"`);
    if (typeof p.name !== 'string' || !p.name) errors.push(`${at}: name ausente`);
    if (!Number.isInteger(p.pricePix) || p.pricePix <= 0) errors.push(`${at}: pricePix deve ser inteiro em centavos`);
    if (p.image !== undefined && (typeof p.image !== 'string' || !p.image)) errors.push(`${at}: image deve ser uma URL (texto)`);
    for (const [field, kind] of Object.entries(FIELDS[p.slot])) {
      if (!is((p as unknown as Record<string, unknown>)[field], kind)) errors.push(`${at}: campo "${field}" deve ser ${kind}`);
    }
    if (p.slot === 'mobo' && p.rearIo !== undefined) {
      for (const [field, kind] of Object.entries(REAR_IO)) {
        const v = (p.rearIo as unknown as Record<string, unknown>)?.[field];
        if (typeof v !== kind || (kind === 'number' && !((v as number) >= 0))) errors.push(`${at}: rearIo.${field} deve ser ${kind === 'number' ? 'número ≥ 0' : 'true/false'}`);
      }
    }
    if (p.slot === 'cooler') {
      if (p.kind === 'air' && !is(p.heightMm, 'number')) errors.push(`${at}: cooler a ar precisa de heightMm`);
      if (p.kind === 'aio' && !is(p.radiatorMm, 'number')) errors.push(`${at}: water cooler precisa de radiatorMm`);
    }
    if (p.slot === 'case') {
      for (const pos of ['front', 'top', 'rear'] as const) {
        if (!is(p.radiatorMounts?.[pos], 'number[]')) errors.push(`${at}: radiatorMounts.${pos} deve ser number[]`);
      }
    }
  });
  return errors;
}

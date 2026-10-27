/* Encaixe físico: a peça funciona, mas não cabe no gabinete escolhido. */
import type { Case, Issue, RadiatorSize, Selected } from './types';

export type RadiatorPosition = 'top' | 'front' | 'rear';

const num = (n: number) => n.toLocaleString('pt-BR');

/** Onde o radiador seria montado: topo primeiro (não rouba espaço da GPU), depois frente, depois traseira. */
export function radiatorPlacement(cs: Case, size: RadiatorSize): RadiatorPosition | null {
  for (const pos of ['top', 'front', 'rear'] as const) if (cs.radiatorMounts[pos].includes(size)) return pos;
  return null;
}

export function fitIssues(s: Selected): Issue[] {
  const cs = s.case;
  if (!cs) return [];
  const out: Issue[] = [];
  const { gpu, cooler, psu } = s;
  const nofit = (code: string, slots: Issue['slots'], message: string, deltaMm?: number) =>
    out.push({ code, severity: 'nofit', slots, message, ...(deltaMm ? { deltaMm } : {}) });

  let rad: RadiatorPosition | null | undefined;
  if (cooler?.kind === 'aio' && cooler.radiatorMm) {
    rad = radiatorPlacement(cs, cooler.radiatorMm);
    if (!rad) nofit('radiator', ['cooler', 'case'], `O gabinete não tem suporte para radiador de ${cooler.radiatorMm} mm`);
  }
  if (cooler?.kind === 'air' && cooler.heightMm && cooler.heightMm > cs.maxCoolerHeightMm) {
    nofit('cooler-height', ['cooler', 'case'],
      `O cooler tem ${cooler.heightMm} mm de altura e o gabinete aceita até ${cs.maxCoolerHeightMm} mm`,
      cooler.heightMm - cs.maxCoolerHeightMm);
  }
  if (gpu) {
    const front = rad === 'front';
    const max = front ? cs.maxGpuLengthFrontRadMm ?? cs.maxGpuLengthMm : cs.maxGpuLengthMm;
    if (gpu.lengthMm > max) {
      nofit('gpu-length', front ? ['gpu', 'case', 'cooler'] : ['gpu', 'case'],
        `A placa de vídeo tem ${gpu.lengthMm} mm e o gabinete aceita até ${max} mm${front ? ' com o radiador na frente' : ''}`,
        gpu.lengthMm - max);
    }
    if (gpu.slotWidth > cs.expansionSlots) {
      nofit('gpu-slots', ['gpu', 'case'], `A placa de vídeo ocupa ${num(gpu.slotWidth)} slots e o gabinete tem ${cs.expansionSlots}`);
    }
  }
  if (psu && psu.lengthMm > cs.maxPsuLengthMm) {
    nofit('psu-length', ['psu', 'case'],
      `A fonte tem ${psu.lengthMm} mm e o gabinete aceita até ${cs.maxPsuLengthMm} mm`,
      psu.lengthMm - cs.maxPsuLengthMm);
  }
  return out;
}

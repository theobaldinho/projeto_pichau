/* Compatibilidade lógica/elétrica: quando falha, a peça não funciona com a outra. */
import type { FormFactor, Issue, Selected } from './types';

export const FORM_FACTOR_LABEL: Record<FormFactor, string> = { itx: 'Mini-ITX', matx: 'Micro-ATX', atx: 'ATX', eatx: 'E-ATX' };

export function compatIssues(s: Selected): Issue[] {
  const out: Issue[] = [];
  const { cpu, mobo, ram, cooler, gpu, psu, storage, case: cs } = s;
  const bad = (code: string, slots: Issue['slots'], message: string) => out.push({ code, severity: 'incompatible', slots, message });
  const warn = (code: string, slots: Issue['slots'], message: string) => out.push({ code, severity: 'warning', slots, message });

  if (cpu && mobo) {
    if (cpu.socket !== mobo.socket) bad('socket', ['mobo', 'cpu'], `Socket diferente: processador ${cpu.socket}, placa-mãe ${mobo.socket}`);
    else {
      const gen = mobo.cpuGenerations[cpu.generation];
      if (!gen) bad('chipset', ['mobo', 'cpu'], 'O chipset da placa-mãe não suporta este processador');
      else if (gen === 'bios') warn('bios', ['mobo', 'cpu'], 'A placa-mãe pode precisar de atualização de BIOS para este processador');
    }
  }
  if (ram && mobo) {
    if (ram.memType !== mobo.memType) bad('mem-type', ['ram', 'mobo'], `A placa-mãe usa ${mobo.memType} e a memória é ${ram.memType}`);
    else if (ram.modules > mobo.memSlots) bad('mem-slots', ['ram', 'mobo'], `A memória tem ${ram.modules} pentes e a placa-mãe só ${mobo.memSlots} slots`);
  }
  if (ram && cpu && !cpu.memTypes.includes(ram.memType)) bad('cpu-mem', ['ram', 'cpu'], `O processador não suporta memória ${ram.memType}`);
  if (mobo && cs && !cs.formFactors.includes(mobo.formFactor)) {
    bad('form-factor', ['case', 'mobo'], `O gabinete não aceita placa-mãe ${FORM_FACTOR_LABEL[mobo.formFactor]}`);
  }
  if (cooler) {
    // O socket vem do processador ou, se ainda não escolhido, da placa-mãe.
    const socket = cpu?.socket ?? mobo?.socket;
    if (socket && !cooler.sockets.includes(socket)) {
      bad('cooler-socket', ['cooler', cpu ? 'cpu' : 'mobo'], `O cooler não é compatível com o socket ${socket}`);
    } else if (cpu && cooler.tdpRatingW < cpu.tdpW) {
      warn('cooler-tdp', ['cooler', 'cpu'], `O cooler dissipa até ${cooler.tdpRatingW}W e o processador chega a ${cpu.tdpW}W`);
    }
  }
  if (gpu && psu) {
    const missing = gpu.powerConnectors.filter(c => !psu.connectors.includes(c));
    if (missing.length) bad('gpu-connector', ['psu', 'gpu'], `A placa de vídeo usa conector ${missing.join(', ')} e a fonte não tem`);
  }
  if (storage && mobo && storage.interface === 'm2' && mobo.m2Slots === 0) {
    bad('m2-slot', ['storage', 'mobo'], 'A placa-mãe não tem slot M.2');
  }
  return out;
}

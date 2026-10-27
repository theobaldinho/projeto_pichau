/* Resumo curto de specs por peça (chips) e rótulos de status. */
import { FORM_FACTOR_LABEL, type OptionStatus, type Part, type RearIo, type Severity, type Slot } from '../core';

const n = (v: number) => v.toLocaleString('pt-BR');
const gb = (v: number) => (v >= 1000 ? `${n(v / 1000)}TB` : `${v}GB`);

export function specChips(p: Part): string[] {
  switch (p.slot) {
    case 'cpu': return [p.socket, p.memTypes.join('/'), `${p.tdpW}W`];
    case 'mobo': {
      const io = p.rearIo;
      const usb = io ? io.usb2 + io.usb5 + io.usb10 + io.usbc : 0;
      return [p.socket, FORM_FACTOR_LABEL[p.formFactor], p.memType, ...(io ? [`${usb} USB traseiras`, ...(io.wifi ? ['Wi-Fi'] : [])] : [])];
    }
    case 'ram': return [p.memType, `${p.capacityGb}GB`, `${p.modules} pentes`];
    case 'gpu': return [`${p.lengthMm} mm`, `${n(p.slotWidth)} slots`, `${p.tbpW}W`];
    case 'cooler': return p.kind === 'aio'
      ? [`Radiador ${p.radiatorMm} mm`, `até ${p.tdpRatingW}W`]
      : [`${p.heightMm} mm de altura`, `até ${p.tdpRatingW}W`];
    case 'case': return [p.formFactors.map(f => FORM_FACTOR_LABEL[f]).join(', '), `GPU até ${p.maxGpuLengthMm} mm`, `Cooler até ${p.maxCoolerHeightMm} mm`];
    case 'psu': return [`${p.wattage}W`, p.connectors.join(' + ')];
    case 'storage': return [p.interface === 'm2' ? 'M.2 NVMe' : 'SATA', gb(p.capacityGb)];
    default: return [];
  }
}

/** Chips da lista da janela (com ícone: ok, não, energia), no estilo das lojas: "✓ VGA Integrado", "⚡ 180W". */
export type RowChip = { t: string; ic?: 'ok' | 'no' | 'bolt' };
export function rowChips(p: Part): RowChip[] {
  const plain = (xs: string[]) => xs.map(t => ({ t }));
  switch (p.slot) {
    case 'cpu': return [
      ...(p.igpu === undefined ? [] : [p.igpu ? { t: 'VGA Integrado', ic: 'ok' as const } : { t: 'Sem VGA integrado', ic: 'no' as const }]),
      ...(p.coolerIncluded ? [{ t: 'Cooler Incluído', ic: 'ok' as const }] : []),
      ...(p.overclock ? [{ t: 'Overclock', ic: 'ok' as const }] : []),
      ...plain([p.socket, p.memTypes.join('/')]),
      ...(p.cores ? plain([`${p.cores} núcleos / ${p.threads} threads`]) : []),
      { t: `${p.tdpW}W`, ic: 'bolt' }];
    case 'gpu': return [...plain(specChips(p).slice(0, 2)), ...(p.vramGb ? plain([`${p.vramGb} GB`]) : []), { t: `${p.tbpW}W`, ic: 'bolt' }];
    case 'psu': return [{ t: `${p.wattage}W`, ic: 'bolt' }, ...plain([...(p.efficiency ? [`80 Plus ${p.efficiency}`] : []), p.connectors.join(' + ')])];
    case 'ram': return [...plain(specChips(p)), ...(p.mhz ? plain([`${p.mhz} MHz`]) : []), ...(p.rgb ? [{ t: 'RGB', ic: 'ok' as const }] : [])];
    case 'case': return [...plain(specChips(p)), ...(p.glass ? [{ t: 'Lateral de vidro', ic: 'ok' as const }] : [])];
    default: return plain(specChips(p));
  }
}

export const STATUS_LABEL: Record<Exclude<OptionStatus, 'ok'>, string> = {
  incompatible: 'Incompatível',
  nofit: 'Não cabe',
  power: 'Fonte insuficiente',
  warning: 'Atenção',
};

const COMPAT_ALT: Record<Slot, string> = {
  cpu: 'Ver processadores compatíveis',
  cooler: 'Ver coolers compatíveis',
  mobo: 'Ver placas-mãe compatíveis',
  ram: 'Ver memórias compatíveis',
  gpu: 'Ver placas de vídeo compatíveis',
  storage: 'Ver armazenamento compatível',
  case: 'Ver gabinetes compatíveis',
  psu: 'Ver fontes compatíveis',
  extras: 'Ver extras',
};
const FIT_ALT: Partial<Record<Slot, string>> = {
  cooler: 'Ver coolers que cabem',
  gpu: 'Ver placas de vídeo que cabem',
  case: 'Ver gabinetes onde cabe',
  psu: 'Ver fontes que cabem',
};

/** Texto do atalho "ver alternativas" de um conflito, conforme o tipo. */
export function alternativesLabel(slot: Slot, severity: Severity): string {
  if (severity === 'power') return 'Ver fontes que atendem';
  return (severity === 'nofit' && FIT_ALT[slot]) || COMPAT_ALT[slot];
}

/** Portas do painel traseiro em texto (o mesmo que o 3D desenha), de cima para baixo. */
export function rearIoList(io: RearIo): string[] {
  const n = (k: number, one: string) => (k ? [`${k}× ${one}`] : []);
  return [
    ...(io.biosFlashback ? ['Botão de BIOS Flashback'] : []), ...(io.clearCmos ? ['Botão Clear CMOS'] : []),
    ...(io.wifi ? ['2 conectores de antena Wi-Fi'] : []), ...(io.ps2 ? ['1× PS/2 (teclado/mouse)'] : []),
    ...n(io.hdmi, 'HDMI'), ...n(io.dp, 'DisplayPort'),
    ...n(io.usb2, 'USB 2.0 (preta)'), ...n(io.usb5, 'USB 5 Gbps (azul)'), ...n(io.usb10, 'USB 10 Gbps (vermelha)'), ...n(io.usbc, 'USB-C'),
    `Rede ${String(io.lanGbps).replace('.', ',')} Gbps (RJ45)`,
    `${io.audio} conectores de áudio P2${io.spdif ? ' + saída óptica' : ''}`,
  ];
}

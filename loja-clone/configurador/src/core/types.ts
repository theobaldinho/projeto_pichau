/* Modelo de dados do configurador. Medidas em mm, potência em W, preços em centavos. */

export type Slot = 'cpu' | 'cooler' | 'mobo' | 'ram' | 'gpu' | 'storage' | 'case' | 'psu' | 'extras';

export interface SlotInfo { slot: Slot; label: string; required: boolean }

/** Ordem de exibição; `required` define o que é obrigatório para comprar. */
export const SLOTS: readonly SlotInfo[] = [
  { slot: 'cpu', label: 'Processador', required: true },
  { slot: 'cooler', label: 'Cooler Processador', required: true },
  { slot: 'mobo', label: 'Placa Mãe', required: true },
  { slot: 'ram', label: 'Memória RAM', required: true },
  { slot: 'gpu', label: 'Placa de Vídeo', required: true },
  { slot: 'storage', label: 'HD & SSD', required: true },
  { slot: 'case', label: 'Gabinete', required: true },
  { slot: 'psu', label: 'Fonte de Alimentação', required: true },
  { slot: 'extras', label: 'Periféricos, Acessórios e Extras', required: false },
];

export type MemType = 'DDR4' | 'DDR5';
export type FormFactor = 'itx' | 'matx' | 'atx' | 'eatx';
export type PowerConnector = '8pin' | '12V-2x6';
export type RadiatorSize = 120 | 240 | 280 | 360;

interface Base<S extends Slot> {
  id: string;
  slot: S;
  name: string;
  brand: string;
  /** Preço à vista no PIX, em centavos. */
  pricePix: number;
  image?: string;
  ean?: string;
  mpn?: string;
  /** Preço "de" (centavos), riscado ao lado do preço PIX. */
  listPrice?: number;
  /** Filtros "Em oferta" e "Em outlet". */
  onSale?: boolean;
  outlet?: boolean;
}

export interface Cpu extends Base<'cpu'> {
  socket: string; tdpW: number; memTypes: MemType[]; generation: string;
  /** Specs só para filtros e chips (opcionais: catálogos externos podem não ter). */
  cores?: number; threads?: number; boostGhz?: number; ramMhz?: number; maxRamGb?: number;
  igpu?: boolean; overclock?: boolean; coolerIncluded?: boolean; series?: string;
}
export interface Mobo extends Base<'mobo'> {
  socket: string; formFactor: FormFactor; memType: MemType; memSlots: number; m2Slots: number;
  /** Gerações de CPU suportadas: 'ok' de fábrica, 'bios' exige atualização. Ausente = não suporta. */
  cpuGenerations: Record<string, 'ok' | 'bios'>;
  /** Portas do painel traseiro (aparecem no 3D, no espelho de I/O). */
  rearIo?: RearIo;
  chipset?: string; vrmHeatsink?: boolean; sataPorts?: number; maxRamGb?: number; pcieGen?: number;
}
/** Painel traseiro da placa-mãe. USB-A por velocidade: 2.0, 5 Gbps (3.2 Gen 1) e 10 Gbps (3.2 Gen 2). */
export interface RearIo {
  usb2: number; usb5: number; usb10: number; usbc: number;
  hdmi: number; dp: number;
  /** Velocidade da rede em Gbps (1 ou 2,5). */
  lanGbps: number;
  wifi: boolean;
  /** Conectores de áudio P2 (3 ou 5) e saída óptica. */
  audio: 3 | 5; spdif: boolean;
  ps2: boolean; biosFlashback: boolean; clearCmos: boolean;
}
export interface Ram extends Base<'ram'> { memType: MemType; modules: number; capacityGb: number; heightMm: number; mhz?: number; cl?: number; rgb?: boolean }
export interface Gpu extends Base<'gpu'> { lengthMm: number; slotWidth: number; tbpW: number; powerConnectors: PowerConnector[]; vramGb?: number }
export interface Cooler extends Base<'cooler'> {
  kind: 'air' | 'aio'; sockets: string[]; tdpRatingW: number;
  heightMm?: number;
  radiatorMm?: RadiatorSize;
  fanMm?: number; fans?: number; airflowCfm?: number; pressureMmH2O?: number; noiseDba?: number; maxRpm?: number; color?: string;
}
export interface Case extends Base<'case'> {
  formFactors: FormFactor[];
  maxGpuLengthMm: number;
  /** Limite da GPU quando há radiador na frente. Ausente = igual a maxGpuLengthMm. */
  maxGpuLengthFrontRadMm?: number;
  expansionSlots: number;
  maxCoolerHeightMm: number;
  radiatorMounts: { front: RadiatorSize[]; top: RadiatorSize[]; rear: RadiatorSize[] };
  maxPsuLengthMm: number;
  fansIncluded?: number; color?: string; glass?: boolean;
}
export interface Psu extends Base<'psu'> { wattage: number; lengthMm: number; connectors: PowerConnector[]; efficiency?: string; modular?: 'Não' | 'Semi' | 'Total' }
export interface Storage extends Base<'storage'> { interface: 'm2' | 'sata'; capacityGb: number; readMbps?: number }
export interface Extra extends Base<'extras'> {}

export type Part = Cpu | Mobo | Ram | Gpu | Cooler | Case | Psu | Storage | Extra;
export type PartOf<S extends Slot> = Extract<Part, { slot: S }>;

export interface Catalog { version: number; parts: Part[] }

/** Build = id da peça escolhida por slot. */
export type Build = Partial<Record<Slot, string>>;
export type Selected = { [S in Slot]?: PartOf<S> };

/**
 * incompatible: não funciona junto → opção desabilitada.
 * nofit: funciona, mas não cabe fisicamente → selecionável, bloqueia compra.
 * power: fonte insuficiente (> 85% de carga) → selecionável, bloqueia compra.
 * warning: alerta sem bloqueio.
 */
export type Severity = 'incompatible' | 'nofit' | 'power' | 'warning';

export interface Issue {
  code: string;
  severity: Severity;
  slots: Slot[];
  message: string;
  /** Quanto falta, em mm, nos conflitos de encaixe por medida. */
  deltaMm?: number;
}

export type OptionStatus = 'ok' | Severity;

export interface Option { part: Part; status: OptionStatus; reasons: Issue[] }

export interface PowerReport {
  needW: number;
  recommendedW: number;
  psuW?: number;
  loadPct?: number;
  level: 'none' | 'ok' | 'warn' | 'block';
  suggestion?: Psu;
}

export interface Totals { pix: number; card: number; installments: number; installment: number }

export interface Evaluation {
  build: Build;
  selected: Selected;
  slots: Record<Slot, { selected?: Part; options: Option[] }>;
  issues: Issue[];
  power: PowerReport;
  totals: Totals;
  missingRequired: Slot[];
  requiredCount: number;
  doneCount: number;
  /** Motivos que impedem a compra, legíveis. */
  blockers: string[];
  canBuy: boolean;
}

export const BLOCKING: readonly Severity[] = ['incompatible', 'nofit', 'power'];

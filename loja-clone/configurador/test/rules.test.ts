import { describe, expect, it } from 'vitest';
import { compatIssues } from '../src/core';
import { sel } from './helpers';

const codes = (...ids: string[]) => compatIssues(sel(...ids)).map(i => `${i.severity}:${i.code}`);

describe('compatibilidade', () => {
  it('build AM5 DDR5 coerente não tem problemas', () => {
    expect(codes('cpu-r5-am5', 'mobo-x670e', 'ram-32-ddr5', 'cooler-air-155', 'case-mid', 'gpu-12gb-305', 'psu-750', 'ssd-1tb-nvme')).toEqual([]);
  });
  it('socket diferente entre processador e placa-mãe', () => {
    const [i] = compatIssues(sel('cpu-r5-am5', 'mobo-z790'));
    expect(i).toMatchObject({ code: 'socket', severity: 'incompatible', slots: ['mobo', 'cpu'] });
    expect(i.message).toContain('AM5');
    expect(i.message).toContain('LGA1700');
  });
  it('placa-mãe que exige BIOS gera só aviso', () => {
    expect(codes('cpu-r7-am5', 'mobo-b650m')).toEqual(['warning:bios']);
    expect(codes('cpu-r5-am5', 'mobo-b650m')).toEqual([]);
  });
  it('tipo de memória diferente da placa-mãe', () => {
    expect(codes('mobo-b660m-ddr4', 'ram-16-ddr5')).toEqual(['incompatible:mem-type']);
  });
  it('mais pentes do que slots', () => {
    expect(codes('mobo-b650i', 'ram-64-ddr5-4x')).toEqual(['incompatible:mem-slots']);
  });
  it('processador AM5 não aceita DDR4, mesmo sem placa-mãe', () => {
    expect(codes('cpu-r5-am5', 'ram-16-ddr4')).toEqual(['incompatible:cpu-mem']);
    expect(codes('cpu-c5-1700', 'ram-16-ddr4')).toEqual([]);
  });
  it('formato da placa-mãe que o gabinete não aceita', () => {
    expect(codes('mobo-x670e', 'case-itx')).toEqual(['incompatible:form-factor']);
    expect(codes('mobo-b650i', 'case-itx')).toEqual([]);
  });
  it('cooler sem suporte ao socket, pelo processador ou pela placa-mãe', () => {
    expect(codes('cooler-air-lp', 'cpu-r5-am5')).toEqual(['incompatible:cooler-socket']);
    expect(codes('cooler-air-lp', 'mobo-x670e')).toEqual(['incompatible:cooler-socket']);
  });
  it('cooler fraco para o processador gera aviso', () => {
    expect(codes('cooler-air-155', 'cpu-c7-1700')).toEqual(['warning:cooler-tdp']);
  });
  it('fonte sem o conector da placa de vídeo', () => {
    const [i] = compatIssues(sel('gpu-16gb-340', 'psu-850'));
    expect(i).toMatchObject({ code: 'gpu-connector', severity: 'incompatible' });
    expect(i.message).toContain('12V-2x6');
  });
});

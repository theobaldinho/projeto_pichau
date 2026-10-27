import { describe, expect, it } from 'vitest';
import { fitIssues, radiatorPlacement, type Case } from '../src/core';
import { catalog, sel } from './helpers';

const find = (code: string, ...ids: string[]) => fitIssues(sel(...ids)).find(i => i.code === code);

describe('encaixe no gabinete', () => {
  it('sem gabinete não há o que medir', () => {
    expect(fitIssues(sel('gpu-24gb-357', 'cooler-air-165'))).toEqual([]);
  });
  it('placa de vídeo de 340 mm no ITX de 320 mm: faltam 20 mm', () => {
    expect(find('gpu-length', 'gpu-16gb-340', 'case-itx')).toMatchObject({ severity: 'nofit', slots: ['gpu', 'case'], deltaMm: 20 });
    expect(find('gpu-length', 'gpu-16gb-340', 'case-mid')).toBeUndefined();
  });
  it('radiador na frente reduz o espaço da placa de vídeo', () => {
    // Mid-tower aceita 360 mm, mas com radiador de 360 na frente só 335 mm.
    const i = find('gpu-length', 'gpu-24gb-357', 'case-mid', 'cooler-aio-360');
    expect(i).toMatchObject({ deltaMm: 22, slots: ['gpu', 'case', 'cooler'] });
    expect(i?.message).toContain('radiador na frente');
    // Com radiador de 240 vai para o topo e não atrapalha.
    expect(find('gpu-length', 'gpu-24gb-357', 'case-mid', 'cooler-aio-240')).toBeUndefined();
  });
  it('placa de vídeo mais grossa que os slots do gabinete', () => {
    expect(find('gpu-slots', 'gpu-16gb-340', 'case-itx')?.message).toContain('3,5 slots');
    expect(find('gpu-slots', 'gpu-12gb-305', 'case-itx')).toBeUndefined();
  });
  it('cooler a ar mais alto que o gabinete', () => {
    expect(find('cooler-height', 'cooler-air-165', 'case-itx')).toMatchObject({ deltaMm: 10 });
    expect(find('cooler-height', 'cooler-air-155', 'case-itx')).toBeUndefined();
  });
  it('radiador sem suporte no gabinete', () => {
    expect(find('radiator', 'cooler-aio-360', 'case-itx')).toMatchObject({ severity: 'nofit' });
    expect(find('radiator', 'cooler-aio-240', 'case-itx')).toBeUndefined();
  });
  it('fonte mais comprida que o espaço', () => {
    expect(find('psu-length', 'psu-1000', 'case-itx')).toMatchObject({ deltaMm: 20 });
  });
  it('prefere o topo para o radiador', () => {
    const mid = catalog.parts.find(p => p.id === 'case-mid') as Case;
    expect(radiatorPlacement(mid, 240)).toBe('top');
    expect(radiatorPlacement(mid, 360)).toBe('front');
    expect(radiatorPlacement(mid, 120)).toBe('rear');
  });
});

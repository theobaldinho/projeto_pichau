import { describe, expect, it } from 'vitest';
import { buildStatus, evaluate } from '../src/core';
import { buildOf, catalog } from './helpers';

const OK = ['cpu-r5-am5', 'cooler-air-155', 'mobo-x670e', 'ram-32-ddr5', 'gpu-12gb-305', 'ssd-1tb-nvme', 'case-mid', 'psu-750'];

describe('evaluate', () => {
  it('build vazio: nada escolhido, compra bloqueada', () => {
    const e = evaluate(catalog, {});
    expect(e.requiredCount).toBe(8);
    expect(e.doneCount).toBe(0);
    expect(e.canBuy).toBe(false);
    expect(e.blockers[0]).toMatch(/^Falta escolher: Processador/);
    expect(e.totals).toEqual({ pix: 0, card: 0, installments: 1, installment: 0 });
  });

  it('build completo e coerente pode ser comprado', () => {
    const e = evaluate(catalog, buildOf(...OK));
    expect(e.issues).toEqual([]);
    expect(e.canBuy).toBe(true);
    expect(e.doneCount).toBe(8);
    expect(e.totals.pix).toBe(114990 + 12990 + 219990 + 79990 + 349990 + 49990 + 49990 + 59990);
    expect(e.totals.card).toBe(Math.round(e.totals.pix / 0.85));
    expect(e.totals.installments).toBe(12);
  });

  it('extras são opcionais e entram no total', () => {
    const e = evaluate(catalog, buildOf(...OK, 'ext-mouse'));
    expect(e.canBuy).toBe(true);
    expect(e.totals.pix).toBe(evaluate(catalog, buildOf(...OK)).totals.pix + 9990);
  });

  it('peça que não cabe bloqueia a compra', () => {
    const e = evaluate(catalog, buildOf(...OK.filter(id => id !== 'case-mid' && id !== 'mobo-x670e'), 'mobo-b650i', 'case-itx', 'gpu-16gb-340', 'psu-1000'));
    expect(e.canBuy).toBe(false);
    expect(e.issues.map(i => i.code)).toEqual(expect.arrayContaining(['gpu-length', 'gpu-slots', 'psu-length']));
  });

  it('opções incompatíveis aparecem marcadas com o motivo, nos dois sentidos', () => {
    const byCpu = evaluate(catalog, buildOf('cpu-r5-am5'));
    const z790 = byCpu.slots.mobo.options.find(o => o.part.id === 'mobo-z790')!;
    expect(z790.status).toBe('incompatible');
    expect(z790.reasons[0].message).toContain('Socket');
    expect(byCpu.slots.ram.options.find(o => o.part.id === 'ram-16-ddr4')!.status).toBe('incompatible');

    const byMobo = evaluate(catalog, buildOf('mobo-z790'));
    expect(byMobo.slots.cpu.options.find(o => o.part.id === 'cpu-r5-am5')!.status).toBe('incompatible');
    expect(byMobo.slots.cpu.options.find(o => o.part.id === 'cpu-c5-1700')!.status).toBe('ok');
  });

  it('opções que não cabem continuam selecionáveis (nofit), não desabilitadas', () => {
    const e = evaluate(catalog, buildOf('case-itx'));
    const gpus = Object.fromEntries(e.slots.gpu.options.map(o => [o.part.id, o.status]));
    expect(gpus).toMatchObject({ 'gpu-8gb-240': 'ok', 'gpu-16gb-340': 'nofit' });
  });

  it('placa de vídeo que estoura a fonte escolhida é marcada', () => {
    const e = evaluate(catalog, buildOf('cpu-r9-am5', 'psu-550'));
    expect(e.slots.gpu.options.find(o => o.part.id === 'gpu-8gb-240')!.status).not.toBe('power');
    expect(e.slots.gpu.options.find(o => o.part.id === 'gpu-24gb-357')!.status).toBe('incompatible'); // falta 12V-2x6
    expect(e.slots.gpu.options.find(o => o.part.id === 'gpu-16gb-285')!.status).toBe('power');
  });

  it('opções vêm ordenadas por preço e ids inválidos no build são ignorados', () => {
    const e = evaluate(catalog, { cpu: 'nao-existe', gpu: 'cpu-r5-am5' });
    expect(e.selected).toEqual({});
    const prices = e.slots.gpu.options.map(o => o.part.pricePix);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});

describe('culpa e estado do build', () => {
  it('opção não é marcada "não cabe" por conflito que já existia; se piora, vira aviso com quanto piora', () => {
    // GPU de 357 mm já não cabe no ITX (aceita 320). O AIO 240 na frente baixa o limite para 290: piora 30 mm.
    const e = evaluate(catalog, buildOf('gpu-24gb-357', 'case-itx'));
    const aio = e.slots.cooler.options.find(o => o.part.id === 'cooler-aio-240')!;
    expect(aio.status).toBe('warning');
    expect(aio.reasons[0]).toMatchObject({ severity: 'warning', deltaMm: 30 });
    // GPU de 305 mm cabe no ITX; com o radiador na frente (290) deixa de caber: aí o culpado é o cooler.
    const e2 = evaluate(catalog, buildOf('gpu-12gb-305', 'case-itx'));
    expect(e2.slots.cooler.options.find(o => o.part.id === 'cooler-aio-240')!.status).toBe('nofit');
  });

  it('estado segue o pior caso: conflito > aviso > pronto', () => {
    const full = ['cpu-r5-am5', 'cooler-air-155', 'mobo-x670e', 'ram-32-ddr5', 'gpu-12gb-305', 'ssd-1tb-nvme', 'psu-750'];
    expect(buildStatus(evaluate(catalog, buildOf(...full, 'case-mid')))).toMatchObject({ level: 'ready', conflicts: 0, warnings: 0 });
    const bad = buildStatus(evaluate(catalog, buildOf(...full.map(id => id === 'gpu-12gb-305' ? 'gpu-24gb-357' : id), 'case-itx')));
    expect(bad.level).toBe('blocked');
    expect(bad.summary).toMatch(/8\/8 peças · \d+ conflitos?/);
    const warn = buildStatus(evaluate(catalog, buildOf('cpu-c5-1700', 'cooler-air-lp', 'mobo-b660m-ddr4', 'ram-16-ddr4', 'gpu-8gb-240', 'ssd-2tb-nvme', 'case-matx', 'psu-550')));
    expect(warn).toMatchObject({ level: 'warning', conflicts: 0, warnings: 1, title: 'Completa, com avisos' });
    expect(buildStatus(evaluate(catalog, buildOf('cpu-r5-am5'))).level).toBe('incomplete');
  });
});

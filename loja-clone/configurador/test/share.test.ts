import { describe, expect, it } from 'vitest';
import { buildFromUrl, decodeBuild, encodeBuild, urlWithBuild } from '../src/core';
import { buildOf, catalog } from './helpers';

describe('compartilhar', () => {
  it('ida e volta preserva o build, na ordem dos slots', () => {
    const b = buildOf('gpu-8gb-240', 'cpu-r5-am5');
    expect(encodeBuild(b)).toBe('cpu:cpu-r5-am5,gpu:gpu-8gb-240');
    expect(decodeBuild(encodeBuild(b), catalog)).toEqual(b);
  });
  it('descarta ids desconhecidos ou no slot errado', () => {
    expect(decodeBuild('cpu:gpu-8gb-240,gpu:xyz,foo:bar,cpu-r5-am5', catalog)).toEqual({});
  });
  it('lê e escreve na URL sem mexer nos outros parâmetros', () => {
    const url = urlWithBuild(new URL('https://loja.exemplo/monte-seu-pc.html?utm=x'), buildOf('cpu-r5-am5'));
    expect(url.searchParams.get('utm')).toBe('x');
    expect(buildFromUrl(url, catalog)).toEqual({ cpu: 'cpu-r5-am5' });
    expect(urlWithBuild(url, {}).searchParams.has('b')).toBe(false);
  });
});

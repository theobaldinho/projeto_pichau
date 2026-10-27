/*
 * Gera as miniaturas das peças (data/img/<id>.webp) e as fotos dos PCs montados (../assets/img/pcs/pc-N.webp)
 * renderizando os modelos 3D num Chromium headless (WebGL por software). Atualiza `image` no catálogo.
 * Uso: npm run thumbs  (precisa de um Chromium do Playwright instalado: npx playwright install chromium)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const server = await createServer({ root, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const url = server.resolvedUrls.local[0] + 'thumbs.html';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', e => { throw e; });
  await page.goto(url);
  await page.waitForFunction(() => 'renderParts' in window, null, { timeout: 30000 });
  // Fonte da etiqueta da fonte (canvas) carregada antes de desenhar.
  await page.evaluate(() => document.fonts.ready);
  const parts = await page.evaluate(() => window.renderParts());
  const pcs = await page.evaluate(() => window.renderPcs());

  const save = (file, dataUrl) => writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  const imgDir = resolve(root, 'data/img'), pcDir = resolve(root, '../assets/img/pcs');
  mkdirSync(imgDir, { recursive: true });
  mkdirSync(pcDir, { recursive: true });
  for (const [id, d] of Object.entries(parts)) save(resolve(imgDir, `${id}.webp`), d);
  pcs.forEach(({ img }, i) => save(resolve(pcDir, `pc-${i + 1}.webp`), img));
  // Dados dos PCs prontos para a loja (script comum, sem fetch: os cards são montados na hora).
  const data = pcs.map(p => ({ ...p.data, img: `assets/img/pcs/${p.data.id}.webp` }));
  writeFileSync(resolve(root, '../assets/pcs-data.js'),
    `/* Gerado por \`npm run thumbs\` (configurador): PCs prontos = builds validadas do catálogo. Não editar à mão. */\nwindow.LX_PCS=${JSON.stringify(data)};\n`);

  // Edição por linha para manter o formato do catálogo (uma peça por linha).
  const catPath = resolve(root, 'data/catalog.json');
  const text = readFileSync(catPath, 'utf8').split('\n').map(line => {
    const id = line.match(/"id": "([^"]+)"/)?.[1];
    if (!id || !parts[id] || line.includes('"image"')) return line;
    return line.replace(/ \}(,?)$/, `, "image": "img/${id}.webp" }$1`);
  });
  writeFileSync(catPath, text.join('\n'));
  console.log(`${Object.keys(parts).length} miniaturas, ${pcs.length} PCs`);
} finally {
  await browser.close();
  await server.close();
}


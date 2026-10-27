import { defineConfig } from 'vitest/config';
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve(import.meta.dirname, '../assets/configurador');

export default defineConfig({
  publicDir: false,
  build: {
    outDir: out,
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'monte-seu-pc.js',
    },
  },
  plugins: [{
    name: 'copy-catalog',
    closeBundle() {
      mkdirSync(out, { recursive: true });
      copyFileSync(resolve(import.meta.dirname, 'data/catalog.json'), resolve(out, 'catalog.json'));
      const img = resolve(import.meta.dirname, 'data/img');
      if (existsSync(img)) cpSync(img, resolve(out, 'img'), { recursive: true });
    },
  }],
  test: { include: ['test/**/*.test.ts'] },
});

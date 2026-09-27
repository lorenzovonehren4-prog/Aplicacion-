// Une las partes de src/ en un único HTML autocontenido: combi-rush.html
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../src/', import.meta.url);
const out = ['head.html', 'three.html', 'game.html'].map(f => readFileSync(new URL(f, dir), 'utf8').replace(/\n$/, '')).join('\n') + '\n';
writeFileSync(new URL('../combi-rush.html', import.meta.url), out);
console.log('combi-rush.html', (out.length / 1024).toFixed(0) + ' KB');

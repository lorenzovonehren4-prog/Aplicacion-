// Arma dist/sazon-tycoon-itch.zip con lo justo para subir a itch.io (index.html en la raíz).
// Uso: node tools/empaquetar-itch.mjs   (no necesita instalar nada)
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const INCLUDE = ['index.html', 'src', 'vendor'];

function listFiles(p) {
  const st = statSync(p);
  if (st.isFile()) return [p];
  return readdirSync(p).sort().flatMap(n => listFiles(join(p, n)));
}

const CRC_TABLE = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ -1) >>> 0; }

const files = INCLUDE.flatMap(p => listFiles(join(ROOT, p)));
const locals = [], centrals = []; let offset = 0;
for (const f of files) {
  const name = Buffer.from(relative(ROOT, f).split(sep).join('/'));
  const data = readFileSync(f), comp = deflateRawSync(data, { level: 9 }), crc = crc32(data);
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8);
  head.writeUInt16LE(0, 10); head.writeUInt16LE(0x21, 12); head.writeUInt32LE(crc, 14);
  head.writeUInt32LE(comp.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(name.length, 26);
  locals.push(head, name, comp);
  const cen = Buffer.alloc(46);
  cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(8, 10);
  cen.writeUInt16LE(0, 12); cen.writeUInt16LE(0x21, 14); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(comp.length, 20); cen.writeUInt32LE(data.length, 24);
  cen.writeUInt16LE(name.length, 28); cen.writeUInt32LE(offset, 42);
  centrals.push(cen, name);
  offset += 30 + name.length + comp.length;
}
const cdir = Buffer.concat(centrals), end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(cdir.length, 12); end.writeUInt32LE(offset, 16);
mkdirSync(join(ROOT, 'dist'), { recursive: true });
const out = join(ROOT, 'dist', 'sazon-tycoon-itch.zip');
writeFileSync(out, Buffer.concat([...locals, cdir, end]));
console.log('Listo: ' + relative(ROOT, out) + ' (' + files.length + ' archivos, ' + Math.round(statSync(out).size / 1024) + ' KB)');

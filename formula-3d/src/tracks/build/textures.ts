/**
 * Texturas procedurales del circuito (canvas 2D, sin imágenes externas):
 * asfalto, pasto, grava, pianos, muros con publicidad ficticia, barreras de
 * neumáticos, alambrado, público, ventanas de edificios, agua y tablero de
 * cuadros de la línea de meta.
 */

import {
  CanvasTexture,
  LinearSRGBColorSpace,
  NoColorSpace,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { Random } from '../../core/utils/random';

const FONT = '"Titillium Web", "Segoe UI", system-ui, sans-serif';

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  const ctx = element.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear un contexto 2D para las texturas del circuito.');
  return [element, ctx];
}

function finish(element: HTMLCanvasElement, anisotropy: number, color = true, repeat = true): CanvasTexture {
  const texture = new CanvasTexture(element);
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  texture.anisotropy = anisotropy;
  if (repeat) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  }
  texture.needsUpdate = true;
  return texture;
}

/** Ruido de píxeles sobre un color base (`amount` en niveles de 0–255). */
function speckle(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number, rng: Random): void {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rng.next() - 0.5) * amount;
    data[i] = Math.max(0, Math.min(255, (data[i] ?? 0) + n));
    data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] ?? 0) + n));
    data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] ?? 0) + n));
  }
  ctx.putImageData(image, 0, 0);
}

/** Manchas suaves (variación de tono a escala media). */
function blotches(ctx: CanvasRenderingContext2D, size: number, count: number, color: string, alpha: number, rng: Random): void {
  for (let i = 0; i < count; i++) {
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    const r = rng.range(size * 0.04, size * 0.16);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha * rng.range(0.4, 1);
    ctx.fillStyle = gradient;
    // Se dibuja también desplazada para que la textura repita sin costuras.
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
  }
  ctx.globalAlpha = 1;
}

export interface AsphaltTextures {
  map: Texture;
  bump: Texture;
}

/** Asfalto: grano fino, áridos claros y oscuros, manchas; con mapa de relieve. */
export function createAsphalt(anisotropy: number): AsphaltTextures {
  const S = 512;
  const rng = new Random(11);
  const [color, ctx] = canvas(S, S);
  ctx.fillStyle = '#3b3c3f';
  ctx.fillRect(0, 0, S, S);
  blotches(ctx, S, 26, '#2c2d30', 0.35, rng);
  blotches(ctx, S, 18, '#4a4b4e', 0.25, rng);
  // Áridos: puntitos claros y oscuros.
  for (let i = 0; i < 9000; i++) {
    const light = rng.next() < 0.45;
    ctx.fillStyle = light ? `rgba(160,160,165,${rng.range(0.15, 0.45)})` : `rgba(10,10,12,${rng.range(0.2, 0.5)})`;
    const r = rng.range(0.4, 1.4);
    ctx.fillRect(rng.range(0, S), rng.range(0, S), r, r);
  }
  speckle(ctx, S, S, 22, rng);

  const [bump, btx] = canvas(S, S);
  btx.fillStyle = '#808080';
  btx.fillRect(0, 0, S, S);
  speckle(btx, S, S, 90, rng);
  return { map: finish(color, anisotropy), bump: finish(bump, anisotropy, false) };
}

/** Pasto: hojas finas y variación de verde. */
export function createGrass(anisotropy: number): Texture {
  const S = 512;
  const rng = new Random(23);
  const [element, ctx] = canvas(S, S);
  ctx.fillStyle = '#4b7a31';
  ctx.fillRect(0, 0, S, S);
  blotches(ctx, S, 30, '#3a6526', 0.45, rng);
  blotches(ctx, S, 20, '#5f8c3a', 0.35, rng);
  for (let i = 0; i < 14000; i++) {
    const shade = rng.range(0, 1);
    ctx.strokeStyle = shade < 0.5 ? `rgba(40,80,25,${rng.range(0.2, 0.6)})` : `rgba(120,160,70,${rng.range(0.15, 0.45)})`;
    ctx.lineWidth = rng.range(0.6, 1.2);
    const x = rng.range(0, S);
    const y = rng.range(0, S);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rng.range(-1.5, 1.5), y - rng.range(2, 5));
    ctx.stroke();
  }
  speckle(ctx, S, S, 14, rng);
  return finish(element, anisotropy);
}

/** Grava: piedritas beige de varios tonos. */
export function createGravel(anisotropy: number): Texture {
  const S = 512;
  const rng = new Random(37);
  const [element, ctx] = canvas(S, S);
  ctx.fillStyle = '#b8a07a';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 16000; i++) {
    const tone = rng.range(120, 225);
    ctx.fillStyle = `rgb(${tone},${tone * 0.9},${tone * 0.72})`;
    const r = rng.range(0.8, 2.6);
    ctx.beginPath();
    ctx.ellipse(rng.range(0, S), rng.range(0, S), r, r * rng.range(0.6, 1), rng.range(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }
  speckle(ctx, S, S, 18, rng);
  return finish(element, anisotropy);
}

/** Piano: franjas rojas y blancas (una repetición = un rojo + un blanco). */
export function createKerb(anisotropy: number): Texture {
  const [element, ctx] = canvas(64, 256);
  ctx.fillStyle = '#d6202a';
  ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = '#f2f2ee';
  ctx.fillRect(0, 128, 64, 128);
  // Sombra del borde elevado.
  const edge = ctx.createLinearGradient(0, 0, 64, 0);
  edge.addColorStop(0, 'rgba(0,0,0,0.18)');
  edge.addColorStop(0.2, 'rgba(0,0,0,0)');
  edge.addColorStop(0.8, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, 64, 256);
  speckle(ctx, 64, 256, 16, new Random(5));
  return finish(element, anisotropy);
}

/** Marcas ficticias para la publicidad del circuito. */
const SPONSORS: ReadonlyArray<{ text: string; bg: string; fg: string }> = [
  { text: 'NOVAFUEL', bg: '#0f3d91', fg: '#ffd21f' },
  { text: 'KRONOS', bg: '#111317', fg: '#f2f2f0' },
  { text: 'AEROLUX', bg: '#e8e8e4', fg: '#c8102e' },
  { text: 'VELTRA', bg: '#f4c20d', fg: '#111317' },
  { text: 'ÁPICE GP', bg: '#c8102e', fg: '#ffffff' },
  { text: 'TERRA MOBILE', bg: '#1b7f4b', fg: '#ffffff' },
  { text: 'LUMEN', bg: '#4b1f8f', fg: '#ffffff' },
  { text: 'PACIFICO AIR', bg: '#0b8fb3', fg: '#ffffff' },
];

/** Muro de hormigón con carteles de patrocinadores (U = alto, V = a lo largo). */
export function createWall(anisotropy: number): Texture {
  const W = 128;
  const H = 2048;
  const rng = new Random(41);
  const [element, ctx] = canvas(W, H);
  // Hormigón.
  ctx.fillStyle = '#9c9d9a';
  ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, 26, rng);
  // Carteles (ocupan la franja alta del muro).
  const panel = H / SPONSORS.length;
  SPONSORS.forEach((sponsor, i) => {
    const y = i * panel;
    ctx.fillStyle = sponsor.bg;
    ctx.fillRect(W * 0.18, y + 6, W * 0.8, panel - 12);
    ctx.save();
    ctx.translate(W * 0.58, y + panel / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = sponsor.fg;
    ctx.font = `italic 900 ${Math.round(W * 0.42)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sponsor.text, 0, 0, panel - 30);
    ctx.restore();
  });
  // Suciedad en la base.
  const dirt = ctx.createLinearGradient(0, 0, W * 0.25, 0);
  dirt.addColorStop(0, 'rgba(40,36,30,0.55)');
  dirt.addColorStop(1, 'rgba(40,36,30,0)');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, 0, W * 0.25, H);
  return finish(element, anisotropy);
}

/** Alambrado (malla romboidal) con transparencia. */
export function createFence(anisotropy: number): Texture {
  const S = 64;
  const [element, ctx] = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(200,205,210,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, S / 2);
  ctx.lineTo(S / 2, 0);
  ctx.lineTo(S, S / 2);
  ctx.lineTo(S / 2, S);
  ctx.closePath();
  ctx.stroke();
  const texture = finish(element, anisotropy);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Silueta de espectador (se tiñe con el color de cada instancia). */
export function createSpectator(anisotropy: number): Texture {
  const [element, ctx] = canvas(32, 64);
  ctx.clearRect(0, 0, 32, 64);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(16, 12, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, 64);
  ctx.quadraticCurveTo(4, 22, 16, 22);
  ctx.quadraticCurveTo(28, 22, 28, 64);
  ctx.fill();
  return finish(element, anisotropy, true, false);
}

/** Fachada con ventanas para los rascacielos del fondo. */
export function createWindows(anisotropy: number): Texture {
  const W = 64;
  const H = 256;
  const rng = new Random(59);
  const [element, ctx] = canvas(W, H);
  ctx.fillStyle = '#4c5866';
  ctx.fillRect(0, 0, W, H);
  for (let y = 2; y < H; y += 8) {
    for (let x = 2; x < W; x += 8) {
      const lit = rng.next();
      ctx.fillStyle = lit < 0.2 ? '#aebfcf' : lit < 0.6 ? '#6f8193' : '#34404d';
      ctx.fillRect(x, y, 5, 5);
    }
  }
  return finish(element, anisotropy);
}

/** Cuadros blancos y negros (línea de meta). */
export function createChecker(anisotropy: number): Texture {
  const [element, ctx] = canvas(64, 16);
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 4; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#f4f4f0' : '#111113';
      ctx.fillRect(x * 4, y * 4, 4, 4);
    }
  }
  const texture = finish(element, anisotropy);
  texture.magFilter = NearestFilter; // bordes nítidos
  return texture;
}

/** Mapa de normales de ondas suaves para el lago (tileable). */
export function createWaterNormals(anisotropy: number): Texture {
  const S = 256;
  const rng = new Random(71);
  // Altura: suma de ondas senoidales con frecuencias enteras (repite sin costura).
  const waves = Array.from({ length: 10 }, () => ({
    fx: rng.int(1, 6) * (rng.next() < 0.5 ? -1 : 1),
    fy: rng.int(1, 6),
    phase: rng.range(0, Math.PI * 2),
    amp: rng.range(0.4, 1),
  }));
  const height = (x: number, y: number): number => {
    let h = 0;
    for (const w of waves) h += w.amp * Math.sin(((w.fx * x + w.fy * y) / S) * Math.PI * 2 + w.phase);
    return h;
  };
  const [element, ctx] = canvas(S, S);
  const image = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = height(x + 1, y) - height(x - 1, y);
      const dy = height(x, y + 1) - height(x, y - 1);
      const nx = -dx * 0.35;
      const ny = -dy * 0.35;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * S + x) * 4;
      image.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      image.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      image.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = finish(element, anisotropy, false);
  texture.colorSpace = LinearSRGBColorSpace;
  return texture;
}

/** Cartel de distancia a la curva (150 / 100 / 50). */
export function createDistanceBoards(anisotropy: number): Texture {
  const [element, ctx] = canvas(384, 128);
  ['150', '100', '50'].forEach((label, i) => {
    const x = i * 128;
    ctx.fillStyle = '#f4f4f0';
    ctx.fillRect(x + 4, 4, 120, 120);
    ctx.strokeStyle = '#111317';
    ctx.lineWidth = 6;
    ctx.strokeRect(x + 10, 10, 108, 108);
    ctx.fillStyle = '#111317';
    ctx.font = `900 ${label.length > 2 ? 54 : 70}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 64, 68);
  });
  return finish(element, anisotropy, true, false);
}

/**
 * Texturas procedurales del circuito (canvas 2D, sin imágenes externas):
 * asfalto, pasto, grava, pianos, muros con publicidad ficticia, barreras de
 * neumáticos, alambrado, público, ventanas de edificios, agua y tablero de
 * cuadros de la línea de meta.
 *
 * Calidad de muestreo (que no se vean pixeladas ni borrosas):
 * - Todas llevan mipmaps y filtrado trilineal (`LinearMipmapLinearFilter`):
 *   de lejos se usa una versión reducida y promediada, sin parpadeo ni moiré.
 * - Filtrado anisotrópico (8× o 16× según la calidad, ver
 *   `core/render/quality.ts`): el asfalto visto en ángulo rasante sigue nítido.
 * - Las superficies grandes (asfalto, pasto, grava, pianos, muros) se generan
 *   a 1024 px por repetición en todos los niveles gráficos. Son procedurales (canvas), así que no hay archivos ni
 *   compresión con pérdida: se suben a la GPU tal cual (RGBA de 8 bits).
 */

import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
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
  // Se leen y escriben los píxeles varias veces (ruido, piedritas, hojas): con
  // `willReadFrequently` el lienzo vive en memoria y esas lecturas son rápidas.
  const ctx = element.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo crear un contexto 2D para las texturas del circuito.');
  return [element, ctx];
}

function finish(element: HTMLCanvasElement, anisotropy: number, color = true, repeat = true): CanvasTexture {
  const texture = new CanvasTexture(element);
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  if (repeat) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  }
  texture.needsUpdate = true;
  return texture;
}

/**
 * Imagen en memoria para pintar píxel a píxel: miles de piedritas o hojas con
 * llamadas de dibujo del canvas tardaban segundos (la grava, ~8 s en equipos
 * lentos); escribiendo los píxeles directo tarda milisegundos. Los bordes dan
 * la vuelta, así la textura repite sin costuras.
 */
class Pixels {
  readonly image: ImageData;
  private readonly data: Uint8ClampedArray;
  private readonly width: number;
  private readonly height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.image = ctx.getImageData(0, 0, width, height);
    this.data = this.image.data;
    this.width = width;
    this.height = height;
  }

  /** Mezcla el color (0–255) con opacidad `alpha` (0–1) en el píxel (x, y). */
  blend(x: number, y: number, r: number, g: number, b: number, alpha: number): void {
    const px = ((Math.floor(x) % this.width) + this.width) % this.width;
    const py = ((Math.floor(y) % this.height) + this.height) % this.height;
    const i = (py * this.width + px) * 4;
    const d = this.data;
    d[i] = (d[i] ?? 0) + (r - (d[i] ?? 0)) * alpha;
    d[i + 1] = (d[i + 1] ?? 0) + (g - (d[i + 1] ?? 0)) * alpha;
    d[i + 2] = (d[i + 2] ?? 0) + (b - (d[i + 2] ?? 0)) * alpha;
  }
}

/**
 * Las texturas generadas se guardan (el dibujo, no la textura de la GPU): la
 * segunda carrera no las vuelve a pintar.
 */
const generated = new Map<string, HTMLCanvasElement[]>();

function remember(key: string, paint: () => HTMLCanvasElement[]): HTMLCanvasElement[] {
  let canvases = generated.get(key);
  if (!canvases) {
    canvases = paint();
    generated.set(key, canvases);
  }
  return canvases;
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

/**
 * Tamaño de la textura de las superficies grandes (px por repetición): el
 * circuito se arma siempre en calidad alta, en cualquier nivel gráfico.
 */
export const SURFACE_TEXTURE_SIZE = 1024;

/**
 * Asfalto: grano fino, áridos claros y oscuros, manchas; con mapa de relieve.
 * @param size px por repetición (512 o 1024): los áridos mantienen su tamaño real
 */
export function createAsphalt(anisotropy: number, size = 512): AsphaltTextures {
  const [color, bump] = remember(`asfalto:${size}`, () => {
    const S = size;
    const k = S / 512;
    const rng = new Random(11);
    const [colorCanvas, ctx] = canvas(S, S);
    ctx.fillStyle = '#3b3c3f';
    ctx.fillRect(0, 0, S, S);
    blotches(ctx, S, 26, '#2c2d30', 0.35, rng);
    blotches(ctx, S, 18, '#4a4b4e', 0.25, rng);
    // Áridos: puntitos claros y oscuros.
    const pixels = new Pixels(ctx, S, S);
    for (let i = 0; i < 9000 * k * k; i++) {
      const light = rng.next() < 0.45;
      const alpha = light ? rng.range(0.15, 0.45) : rng.range(0.2, 0.5);
      const side = Math.max(1, Math.round(rng.range(0.4, 1.4) * k));
      const x = rng.range(0, S);
      const y = rng.range(0, S);
      for (let dy = 0; dy < side; dy++) {
        for (let dx = 0; dx < side; dx++) {
          if (light) pixels.blend(x + dx, y + dy, 160, 160, 165, alpha);
          else pixels.blend(x + dx, y + dy, 10, 10, 12, alpha);
        }
      }
    }
    ctx.putImageData(pixels.image, 0, 0);
    speckle(ctx, S, S, 22, rng);

    const [bumpCanvas, btx] = canvas(S, S);
    btx.fillStyle = '#808080';
    btx.fillRect(0, 0, S, S);
    speckle(btx, S, S, 90, rng);
    return [colorCanvas, bumpCanvas];
  });
  if (!color || !bump) throw new Error('No se pudo pintar el asfalto.');
  return { map: finish(color, anisotropy), bump: finish(bump, anisotropy, false) };
}

/** Pasto: hojas finas y variación de verde. */
export function createGrass(anisotropy: number, size = 512): Texture {
  const [element] = remember(`pasto:${size}`, () => {
    const S = size;
    const k = S / 512;
    const rng = new Random(23);
    const [grass, ctx] = canvas(S, S);
    ctx.fillStyle = '#4b7a31';
    ctx.fillRect(0, 0, S, S);
    blotches(ctx, S, 30, '#3a6526', 0.45, rng);
    blotches(ctx, S, 20, '#5f8c3a', 0.35, rng);
    // Hojas: trazos cortos casi verticales, oscuros o claros.
    const pixels = new Pixels(ctx, S, S);
    for (let i = 0; i < 14000 * k * k; i++) {
      const dark = rng.range(0, 1) < 0.5;
      const alpha = dark ? rng.range(0.2, 0.6) : rng.range(0.15, 0.45);
      const wide = rng.range(0.6, 1.2) * k > 1.3;
      const x = rng.range(0, S);
      const y = rng.range(0, S);
      const lean = rng.range(-1.5, 1.5) * k;
      const length = rng.range(2, 5) * k;
      const steps = Math.ceil(length * 1.4);
      for (let t = 0; t <= steps; t++) {
        const f = t / steps;
        const px = x + lean * f;
        const py = y - length * f;
        if (dark) pixels.blend(px, py, 40, 80, 25, alpha);
        else pixels.blend(px, py, 120, 160, 70, alpha);
        if (wide) {
          if (dark) pixels.blend(px + 1, py, 40, 80, 25, alpha * 0.6);
          else pixels.blend(px + 1, py, 120, 160, 70, alpha * 0.6);
        }
      }
    }
    ctx.putImageData(pixels.image, 0, 0);
    speckle(ctx, S, S, 14, rng);
    return [grass];
  });
  if (!element) throw new Error('No se pudo pintar el pasto.');
  return finish(element, anisotropy);
}

/** Grava: piedritas beige de varios tonos, con luz de arriba a la izquierda. */
export function createGravel(anisotropy: number, size = 512): Texture {
  const [element] = remember(`grava:${size}`, () => {
    const S = size;
    const k = S / 512;
    const rng = new Random(37);
    const [gravel, ctx] = canvas(S, S);
    ctx.fillStyle = '#b8a07a';
    ctx.fillRect(0, 0, S, S);
    const pixels = new Pixels(ctx, S, S);
    for (let i = 0; i < 16000 * k * k; i++) {
      const tone = rng.range(120, 225);
      const r = rng.range(0.8, 2.6) * k;
      const flat = rng.range(0.6, 1);
      const angle = rng.range(0, Math.PI);
      const cx = rng.range(0, S);
      const cy = rng.range(0, S);
      const c = Math.cos(angle);
      const sn = Math.sin(angle);
      const reach = Math.ceil(r) + 1;
      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
          // Elipse girada: u a lo largo, v a lo ancho.
          const u = (dx * c + dy * sn) / r;
          const v = (-dx * sn + dy * c) / (r * flat);
          const q = u * u + v * v;
          if (q > 1) continue;
          // Cara iluminada arriba a la izquierda, borde más oscuro y apenas suavizado.
          const shade = (1 - 0.2 * ((dx + dy) / (r * 1.41))) * (q > 0.7 ? 0.86 : 1);
          const alpha = q > 0.85 ? (1 - q) / 0.15 : 1;
          pixels.blend(cx + dx, cy + dy, tone * shade, tone * 0.9 * shade, tone * 0.72 * shade, alpha);
        }
      }
    }
    ctx.putImageData(pixels.image, 0, 0);
    speckle(ctx, S, S, 18, rng);
    return [gravel];
  });
  if (!element) throw new Error('No se pudo pintar la grava.');
  return finish(element, anisotropy);
}

/** Piano: franjas rojas y blancas (una repetición = un rojo + un blanco). */
export function createKerb(anisotropy: number, size = 512): Texture {
  const W = 64 * (size / 512) * 2;
  const H = W * 4;
  const [element, ctx] = canvas(W, H);
  ctx.fillStyle = '#d6202a';
  ctx.fillRect(0, 0, W, H / 2);
  ctx.fillStyle = '#f2f2ee';
  ctx.fillRect(0, H / 2, W, H / 2);
  // Sombra del borde elevado.
  const edge = ctx.createLinearGradient(0, 0, W, 0);
  edge.addColorStop(0, 'rgba(0,0,0,0.18)');
  edge.addColorStop(0.2, 'rgba(0,0,0,0)');
  edge.addColorStop(0.8, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, 16, new Random(5));
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
export function createWall(anisotropy: number, size = 512): Texture {
  const W = 128 * (size / 512);
  const H = 2048 * (size / 512);
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
    ctx.fillRect(W * 0.18, y + 6 * (W / 128), W * 0.8, panel - 12 * (W / 128));
    ctx.save();
    ctx.translate(W * 0.58, y + panel / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = sponsor.fg;
    ctx.font = `italic 900 ${Math.round(W * 0.42)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sponsor.text, 0, 0, panel - 30 * (W / 128));
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

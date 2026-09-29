/**
 * Texturas procedurales del monoplaza, dibujadas en canvas 2D: livery, número,
 * logos, fibra de carbono, flanco del neumático, tapa de llanta y casco.
 * No hay imágenes externas: todo se genera al crear el auto.
 */

import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace } from 'three';
import type { LiveryConfig, RimsLook } from './livery';

const DISPLAY_FONT = '"Titillium Web", "Segoe UI", system-ui, sans-serif';
const NUMBER_FONT = '"Orbitron", "Titillium Web", system-ui, sans-serif';

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear un contexto 2D para las texturas del auto.');
  return [canvas, ctx];
}

function toTexture(canvas: HTMLCanvasElement, anisotropy: number, srgb = true): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  if (srgb) texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** Aclara (amount > 0) u oscurece (amount < 0) un color. */
export function shade(hex: string, amount: number): string {
  const color = new Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)));
  return `#${color.getHexString()}`;
}

/** Posición vertical en el canvas para una `v` de la superficie (0 abajo … 0.5 arriba … 1 abajo). */
function rowFor(v: number, height: number): number {
  // Las CanvasTexture se voltean en Y: v = 0 es el borde inferior del canvas.
  return (1 - v) * height;
}

/**
 * Livery de la carrocería (mapeada sobre las superficies loft).
 * Eje X del canvas = a lo largo del auto; eje Y = alrededor de la sección.
 */
export function createLiveryTexture(livery: LiveryConfig, anisotropy: number): CanvasTexture {
  const W = 1024;
  const H = 512;
  const [canvas, ctx] = makeCanvas(W, H);

  // Base: color principal con un degradado sutil de claro arriba a oscuro a los lados.
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, shade(livery.primary, -0.12));
  base.addColorStop(0.5, shade(livery.primary, 0.03));
  base.addColorStop(1, shade(livery.primary, -0.12));
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Parte baja en color secundario. El límite sube hacia atrás en cuña, a ambos
  // lados: `boundary(x)` da la v del límite en el lado derecho (el izquierdo es 1 − v).
  const boundary = (x: number): number => (x < 0.35 ? 0.27 : 0.27 + ((x - 0.35) / 0.65) * 0.09);
  const steps = 32;
  ctx.fillStyle = livery.secondary;
  for (const side of ['right', 'left'] as const) {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      const v = side === 'right' ? boundary(x) : 1 - boundary(x);
      ctx.lineTo(x * W, rowFor(v, H));
    }
    // Se cierra por el borde del canvas que corresponde a la panza del auto.
    const edge = side === 'right' ? H : 0;
    ctx.lineTo(W, edge);
    ctx.lineTo(0, edge);
    ctx.closePath();
    ctx.fill();
  }

  drawPattern(ctx, livery, W, H);

  // Filetes de acento sobre el límite.
  ctx.strokeStyle = livery.accent;
  ctx.lineWidth = 5;
  for (const side of ['right', 'left'] as const) {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = i / steps;
      const v = side === 'right' ? boundary(x) + 0.012 : 1 - boundary(x) - 0.012;
      ctx.lineTo(x * W, rowFor(v, H));
    }
    ctx.stroke();
  }

  // Franja central sobre el morro y la cubierta del motor (el patrón de franjas trae las suyas).
  if (livery.pattern !== 'stripes') {
    const stripe = ctx.createLinearGradient(0, 0, W, 0);
    stripe.addColorStop(0, livery.accent);
    stripe.addColorStop(0.45, livery.accent);
    stripe.addColorStop(0.7, `${livery.accent}00`);
    ctx.fillStyle = stripe;
    ctx.fillRect(0, rowFor(0.515, H), W, rowFor(0.485, H) - rowFor(0.515, H));
  }

  // Carbono visible: el tejido asoma bajo la pintura.
  if (livery.finish === 'carbon') drawWeave(ctx, W, H, 0.38);

  return toTexture(canvas, anisotropy);
}

/**
 * Decoración del patrón sobre la parte alta (encima del color de base y
 * debajo de los filetes). X = del morro (0) a la cola (1); v 0,5 = arriba.
 */
function drawPattern(ctx: CanvasRenderingContext2D, livery: LiveryConfig, W: number, H: number): void {
  const { secondary, accent } = livery;
  switch (livery.pattern ?? 'solid') {
    case 'solid':
      return;
    case 'stripes':
      // Dos franjas paralelas a lo largo del lomo, con filete de acento.
      for (const center of [0.462, 0.538]) {
        ctx.fillStyle = secondary;
        ctx.fillRect(0, rowFor(center + 0.022, H), W, rowFor(center - 0.022, H) - rowFor(center + 0.022, H));
        ctx.fillStyle = accent;
        ctx.fillRect(0, rowFor(center + 0.026, H), W, 3);
        ctx.fillRect(0, rowFor(center - 0.022, H), W, 3);
      }
      return;
    case 'split': {
      // La mitad trasera en el color secundario, cortada en diagonal.
      ctx.fillStyle = secondary;
      ctx.beginPath();
      ctx.moveTo(W * 0.42, 0);
      ctx.lineTo(W, 0);
      ctx.lineTo(W, H);
      ctx.lineTo(W * 0.42, H);
      ctx.lineTo(W * 0.56, H * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(W * 0.42, 0);
      ctx.lineTo(W * 0.56, H * 0.5);
      ctx.lineTo(W * 0.42, H);
      ctx.stroke();
      return;
    }
    case 'chevron':
      // Flechas que apuntan hacia adelante en los costados y el lomo.
      ctx.lineJoin = 'miter';
      for (let x = 0.3; x < 1; x += 0.11) {
        for (const [color, width] of [
          [accent, 30],
          [secondary, 18],
        ] as const) {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(W * (x + 0.06), rowFor(0.2, H));
          ctx.lineTo(W * x, rowFor(0.5, H));
          ctx.lineTo(W * (x + 0.06), rowFor(0.8, H));
          ctx.stroke();
        }
      }
      return;
    case 'gradient': {
      // Del principal (morro) al secundario (cola), con un velo del acento en el medio.
      const fade = ctx.createLinearGradient(0, 0, W, 0);
      fade.addColorStop(0, `${secondary}00`);
      fade.addColorStop(0.35, `${secondary}00`);
      fade.addColorStop(1, secondary);
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createLinearGradient(0, 0, W, 0);
      glow.addColorStop(0.3, `${accent}00`);
      glow.addColorStop(0.55, `${accent}66`);
      glow.addColorStop(0.8, `${accent}00`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, rowFor(0.75, H), W, rowFor(0.25, H) - rowFor(0.75, H));
      return;
    }
    case 'geometric': {
      // Triángulos en los costados, iguales siempre (generador fijo).
      let seed = 7;
      const random = (): number => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let i = 0; i < 26; i++) {
        const x = 0.15 + random() * 0.8;
        const v = 0.28 + random() * 0.44;
        const size = 0.03 + random() * 0.05;
        ctx.fillStyle = i % 3 === 0 ? accent : secondary;
        ctx.beginPath();
        ctx.moveTo(W * x, rowFor(v + size * 2, H));
        ctx.lineTo(W * (x + size), rowFor(v - size * 2, H));
        ctx.lineTo(W * (x - size), rowFor(v - size * 2, H));
        ctx.closePath();
        ctx.fill();
      }
      return;
    }
  }
}

/** Tejido de fibra de carbono semitransparente sobre lo ya pintado. */
function drawWeave(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number): void {
  const cell = 8;
  ctx.globalAlpha = alpha;
  for (let y = 0; y < H; y += cell) {
    for (let x = 0; x < W; x += cell) {
      const odd = ((x + y) / cell) % 2 === 0;
      ctx.fillStyle = odd ? '#000000' : '#3a3d44';
      ctx.fillRect(x, y, cell, cell / 2);
      ctx.fillStyle = odd ? '#3a3d44' : '#000000';
      ctx.fillRect(x, y + cell / 2, cell, cell / 2);
    }
  }
  ctx.globalAlpha = 1;
}

/** Número del auto con contorno (fondo transparente). */
export function createNumberTexture(livery: LiveryConfig, anisotropy: number): CanvasTexture {
  const S = 256;
  const [canvas, ctx] = makeCanvas(S, S);
  const text = String(livery.number);
  ctx.font = `900 ${text.length > 1 ? 150 : 190}px ${NUMBER_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 18;
  ctx.strokeStyle = livery.secondary;
  ctx.strokeText(text, S / 2, S / 2 + 8);
  ctx.fillStyle = livery.accent;
  ctx.fillText(text, S / 2, S / 2 + 8);
  return toTexture(canvas, anisotropy);
}

/** Logo de texto (equipo o patrocinador ficticio) en cursiva deportiva. */
export function createWordmarkTexture(
  text: string,
  color: string,
  anisotropy: number,
  options: { outline?: string; background?: string; stripe?: string; scale?: number } = {},
): CanvasTexture {
  const W = 512;
  const H = 128;
  const [canvas, ctx] = makeCanvas(W, H);
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, W, H);
  }
  if (options.stripe) {
    // Franja superior en diagonal (placas de alerón).
    ctx.fillStyle = options.stripe;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, H * 0.22);
    ctx.lineTo(0, H * 0.34);
    ctx.closePath();
    ctx.fill();
  }
  ctx.font = `italic 900 ${Math.round(92 * (options.scale ?? 1))}px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (options.outline) {
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = options.outline;
    ctx.strokeText(text, W / 2, H / 2 + 4);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, H / 2 + 4);
  return toTexture(canvas, anisotropy);
}

/** Tejido de carbono sarga 2×2, visible con reflejos. Se repite (RepeatWrapping). */
export function createCarbonTexture(anisotropy: number): CanvasTexture {
  const S = 256;
  const cells = 16;
  const cell = S / cells;
  const [canvas, ctx] = makeCanvas(S, S);
  ctx.fillStyle = '#121316';
  ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      // Sarga: el patrón se corre una celda por fila, en bloques de 2.
      const horizontal = Math.floor((x + y) / 2) % 2 === 0;
      const g = horizontal
        ? ctx.createLinearGradient(x * cell, y * cell, x * cell, (y + 1) * cell)
        : ctx.createLinearGradient(x * cell, y * cell, (x + 1) * cell, y * cell);
      g.addColorStop(0, horizontal ? '#1c1e23' : '#101114');
      g.addColorStop(0.5, horizontal ? '#2b2e35' : '#1a1c21');
      g.addColorStop(1, horizontal ? '#1a1c20' : '#0e0f12');
      ctx.fillStyle = g;
      ctx.fillRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
    }
  }
  const texture = toTexture(canvas, anisotropy);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

/** Radios (fracción entre llanta y rodadura) donde van la franja y el texto del flanco. */
const STRIPE_FROM = 0.62;
const STRIPE_TO = 0.72;
const TEXT_FROM = 0.14;
const TEXT_TO = 0.56;

/** Filas del perfil (ver `buildTireProfilePoints` en CarModel): índice → posición en el flanco. */
export const TIRE_SIDEWALL_POINTS = 14;
export const TIRE_PROFILE_POINTS = 8 + TIRE_SIDEWALL_POINTS;

/**
 * Textura del neumático: X = vuelta completa; Y = recorrido del perfil
 * (del talón interior, por la banda, hasta el talón exterior).
 * El flanco exterior son los últimos `TIRE_SIDEWALL_POINTS` puntos.
 */
export function createTireTexture(stripeColor: string, brand: string, anisotropy: number): CanvasTexture {
  const W = 2048;
  const H = 256;
  const [canvas, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#16171a';
  ctx.fillRect(0, 0, W, H);

  // Banda de rodadura con goma un poco más clara y gastada.
  const lastIndex = TIRE_PROFILE_POINTS - 1;
  const rowOfIndex = (index: number): number => rowFor(index / lastIndex, H);
  const treadTop = rowOfIndex(7);
  const treadBottom = rowOfIndex(2);
  const tread = ctx.createLinearGradient(0, treadTop, 0, treadBottom);
  tread.addColorStop(0, '#1d1e21');
  tread.addColorStop(0.5, '#232428');
  tread.addColorStop(1, '#1d1e21');
  ctx.fillStyle = tread;
  ctx.fillRect(0, treadTop, W, treadBottom - treadTop);

  // Flanco exterior: índice 8 = borde de la banda … último = talón.
  const sidewallRow = (fraction: number): number => {
    // fraction: 0 = talón (llanta), 1 = borde de la banda.
    const index = lastIndex - fraction * (TIRE_SIDEWALL_POINTS - 1);
    return rowOfIndex(index);
  };

  // Las filas crecen hacia el talón: se ordena cada banda de arriba hacia abajo.
  const band = (from: number, to: number): { top: number; height: number; center: number } => {
    const a = sidewallRow(from);
    const b = sidewallRow(to);
    return { top: Math.min(a, b), height: Math.abs(b - a), center: (a + b) / 2 };
  };

  const stripe = band(STRIPE_FROM, STRIPE_TO);
  ctx.fillStyle = stripeColor;
  ctx.fillRect(0, stripe.top, W, stripe.height);

  // Marca ficticia repetida dos veces por vuelta, estirada a lo largo del flanco.
  const text = band(TEXT_FROM, TEXT_TO);
  ctx.fillStyle = '#e9e9e6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 900 ${Math.round(text.height * 1.05)}px ${DISPLAY_FONT}`;
  for (const x of [0.25, 0.75]) {
    ctx.save();
    ctx.translate(W * x, text.center);
    ctx.scale(2.2, 1);
    ctx.fillText(brand, 0, 0);
    ctx.restore();
  }
  ctx.font = `700 ${Math.round(text.height * 0.45)}px ${DISPLAY_FONT}`;
  ctx.fillStyle = shade(stripeColor, 0.1);
  for (const x of [0, 0.5, 1]) ctx.fillText('● ● ●', W * x, text.center);

  const texture = toTexture(canvas, anisotropy);
  texture.wrapS = RepeatWrapping;
  return texture;
}

/** Tapa aerodinámica de la llanta: disco metálico con rayos marcados (así se ve girar). */
export function createWheelCoverTexture(accent: string, anisotropy: number): CanvasTexture {
  const S = 512;
  const [canvas, ctx] = makeCanvas(S, S);
  const c = S / 2;
  const disc = ctx.createRadialGradient(c * 0.8, c * 0.7, 10, c, c, c);
  disc.addColorStop(0, '#50545c');
  disc.addColorStop(0.6, '#2c2f35');
  disc.addColorStop(1, '#1b1c20');
  ctx.fillStyle = disc;
  ctx.fillRect(0, 0, S, S);

  // Rayos insinuados bajo la tapa.
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 10;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 60, c + Math.sin(a) * 60);
    ctx.lineTo(c + Math.cos(a + 0.2) * (c - 20), c + Math.sin(a + 0.2) * (c - 20));
    ctx.stroke();
  }
  // Aro de color y tuerca central.
  ctx.strokeStyle = accent;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(c, c, c - 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#0d0e10';
  ctx.beginPath();
  ctx.arc(c, c, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(c, c, 32, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(canvas, anisotropy);
}

/** Llanta a la vista (sin tapa): rayos del color de la llanta sobre el fondo oscuro, aro y tuerca. */
export function createRimTexture(rims: RimsLook, anisotropy: number): CanvasTexture {
  if (rims.cover) return createWheelCoverTexture(rims.accent, anisotropy);
  const S = 512;
  const [canvas, ctx] = makeCanvas(S, S);
  const c = S / 2;
  ctx.fillStyle = '#08090b';
  ctx.fillRect(0, 0, S, S);
  // Interior de la llanta: barril oscuro con un brillo.
  const barrel = ctx.createRadialGradient(c * 0.85, c * 0.8, 20, c, c, c);
  barrel.addColorStop(0, '#26292f');
  barrel.addColorStop(1, '#0b0c0f');
  ctx.fillStyle = barrel;
  ctx.beginPath();
  ctx.arc(c, c, c - 30, 0, Math.PI * 2);
  ctx.fill();
  // Rayos: más finos cuantos más son, con un filo claro.
  const width = Math.max(14, 150 / rims.spokes);
  for (let i = 0; i < rims.spokes; i++) {
    const a = (i / rims.spokes) * Math.PI * 2;
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(a);
    const spoke = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    spoke.addColorStop(0, shade(rims.color, -0.18));
    spoke.addColorStop(0.5, shade(rims.color, 0.12));
    spoke.addColorStop(1, shade(rims.color, -0.22));
    ctx.fillStyle = spoke;
    ctx.beginPath();
    ctx.moveTo(-width * 0.7, 40);
    ctx.lineTo(width * 0.7, 40);
    ctx.lineTo(width * 0.45, c - 34);
    ctx.lineTo(-width * 0.45, c - 34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Aro exterior y tuerca central.
  ctx.strokeStyle = rims.color;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(c, c, c - 36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = rims.accent;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(c, c, c - 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = shade(rims.color, -0.1);
  ctx.beginPath();
  ctx.arc(c, c, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rims.accent;
  ctx.beginPath();
  ctx.arc(c, c, 30, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(canvas, anisotropy);
}

/** Casco: mapeo equirrectangular sobre una esfera (X = vuelta, Y = de arriba a abajo). */
export function createHelmetTexture(livery: LiveryConfig, anisotropy: number): CanvasTexture {
  const W = 512;
  const H = 256;
  const [canvas, ctx] = makeCanvas(W, H);
  const look = livery.helmet;
  if (!look || look.design === 'team') {
    // De fábrica: blanco con los colores del auto.
    ctx.fillStyle = '#f4f4f2';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = livery.primary;
    ctx.fillRect(0, 0, W, H * 0.3);
    ctx.beginPath();
    ctx.moveTo(0, H * 0.3);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H * 0.36 + Math.sin((x / W) * Math.PI * 4) * 10);
    ctx.lineTo(W, H * 0.3);
    ctx.closePath();
    ctx.fillStyle = livery.secondary;
    ctx.fill();
    ctx.fillStyle = livery.primary;
    ctx.fillRect(0, H * 0.72, W, H * 0.28);
    ctx.fillStyle = livery.accent;
    ctx.fillRect(0, H * 0.7, W, 6);
    return toTexture(canvas, anisotropy);
  }
  const [base, second, third] = look.colors;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  switch (look.design) {
    case 'stripe':
      ctx.fillStyle = second;
      ctx.fillRect(0, H * 0.3, W, H * 0.12);
      ctx.fillStyle = third;
      ctx.fillRect(0, H * 0.44, W, 5);
      break;
    case 'gold':
      ctx.fillStyle = second;
      ctx.fillRect(0, H * 0.28, W, H * 0.1);
      ctx.fillStyle = third;
      ctx.fillRect(0, H * 0.4, W, 6);
      break;
    case 'split':
      ctx.fillStyle = second;
      ctx.fillRect(W * 0.5, 0, W * 0.5, H);
      ctx.fillStyle = third;
      ctx.fillRect(W * 0.5 - 4, 0, 8, H);
      ctx.fillRect(0, 0, 8, H);
      break;
    case 'flame':
      for (const [color, top] of [
        [second, 0.35],
        [third, 0.5],
      ] as const) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 16) ctx.lineTo(x, H * top + Math.abs(Math.sin((x / W) * Math.PI * 10)) * H * 0.18);
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'stars': {
      let seed = 11;
      const random = (): number => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = i % 4 === 0 ? third : second;
        ctx.beginPath();
        ctx.arc(random() * W, random() * H * 0.85, 1.5 + random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'circuit':
      ctx.strokeStyle = second;
      ctx.lineWidth = 4;
      for (let i = 0; i < 12; i++) {
        const y = H * (0.15 + (i % 6) * 0.12);
        const x = (i * 97) % W;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 60, y);
        ctx.lineTo(x + 80, y + 20);
        ctx.lineTo(x + 150, y + 20);
        ctx.stroke();
        ctx.fillStyle = third;
        ctx.beginPath();
        ctx.arc(x + 150, y + 20, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }
  return toTexture(canvas, anisotropy);
}

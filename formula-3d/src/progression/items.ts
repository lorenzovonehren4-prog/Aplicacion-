/**
 * Catálogo de ítems que se ganan jugando (pase de temporada). Todos los
 * nombres son inventados. Cada ítem trae los datos con los que se dibuja su
 * vista previa (`ui/components/ItemPreview.ts`) y, desde la Fase 7, con los que
 * el garaje lo aplica al auto.
 *
 * Rarezas: Común (gris), Raro (azul), Épico (violeta), Legendario (dorado).
 */

export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_INFO: Readonly<Record<Rarity, { label: string; color: string }>> = {
  common: { label: 'Común', color: '#a3acb8' },
  rare: { label: 'Raro', color: '#3d8bff' },
  epic: { label: 'Épico', color: '#a65cff' },
  legendary: { label: 'Legendario', color: '#f5c542' },
};

export type ItemKind = 'paint' | 'material' | 'rims' | 'wing' | 'helmet' | 'avatar' | 'title' | 'celebration';

export const KIND_INFO: Readonly<Record<ItemKind, { label: string; use: string }>> = {
  paint: { label: 'Pintura', use: 'Se aplica al monoplaza en el Garaje.' },
  material: { label: 'Material', use: 'Acabado de la carrocería; se elige en el Garaje.' },
  rims: { label: 'Llantas', use: 'Se montan en el Garaje.' },
  wing: { label: 'Alerón', use: 'Forma del alerón trasero; se cambia en el Garaje.' },
  helmet: { label: 'Casco', use: 'Diseño del casco; se elige en el Garaje.' },
  avatar: { label: 'Avatar', use: 'Se muestra en tu tarjeta de piloto.' },
  title: { label: 'Título', use: 'Aparece bajo tu nombre en la tarjeta de piloto.' },
  celebration: { label: 'Celebración', use: 'Cómo festejas en el podio.' },
};

export type PaintPattern = 'solid' | 'stripes' | 'split' | 'chevron' | 'gradient' | 'geometric';
export type Finish = 'gloss' | 'matte' | 'metallic' | 'carbon' | 'chrome' | 'pearl';
export type WingShape = 'standard' | 'spoon' | 'twin' | 'swan' | 'blade';
export type HelmetDesign = 'stripe' | 'flame' | 'split' | 'stars' | 'circuit' | 'gold';
export type AvatarGlyph = 'initials' | 'visor' | 'bolt' | 'crown' | 'checker' | 'wing' | 'comet' | 'flame';
export type CelebrationStyle = 'confetti' | 'champagne' | 'fireworks';

interface BaseItem {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
}

export type Item = BaseItem &
  (
    | { kind: 'paint'; colors: readonly [string, string, string]; pattern: PaintPattern }
    | { kind: 'material'; finish: Finish }
    | { kind: 'rims'; spokes: number; color: string; accent: string }
    | { kind: 'wing'; shape: WingShape }
    | { kind: 'helmet'; colors: readonly [string, string, string]; design: HelmetDesign }
    | { kind: 'avatar'; glyph: AvatarGlyph; colors: readonly [string, string] }
    | { kind: 'title'; text: string }
    | { kind: 'celebration'; style: CelebrationStyle }
  );

/** Ítems que todos tienen desde el principio. */
const STARTER_ITEMS: readonly Item[] = [
  { id: 'title-rookie', kind: 'title', name: 'Novato del paddock', text: 'Novato del paddock', rarity: 'common', description: 'Todos empiezan en algún lado.' },
  { id: 'avatar-initials', kind: 'avatar', name: 'Iniciales', glyph: 'initials', colors: ['#c8102e', '#ffffff'], rarity: 'common', description: 'La inicial de tu nombre en el color del equipo.' },
];

/** Recompensas de la temporada 1, del nivel 1 al 50 del pase. */
const SEASON_ONE_ITEMS: readonly Item[] = [
  { id: 'title-karting', kind: 'title', name: 'Promesa del karting', text: 'Promesa del karting', rarity: 'common', description: 'Tus primeros pasos ya se notan en el cronómetro.' },
  { id: 'paint-crimson', kind: 'paint', name: 'Carmesí de fábrica', colors: ['#b3122b', '#f4f4f4', '#141414'], pattern: 'solid', rarity: 'common', description: 'Rojo profundo con detalles blancos. Un clásico que nunca falla.' },
  { id: 'avatar-visor', kind: 'avatar', name: 'Visera', glyph: 'visor', colors: ['#1d2533', '#ff2a3c'], rarity: 'common', description: 'Tu casco, visto de frente, listo para largar.' },
  { id: 'rims-fine', kind: 'rims', name: 'Radios finos', spokes: 10, color: '#c9ced6', accent: '#2b2f36', rarity: 'common', description: 'Diez radios delgados en plata satinada.' },
  { id: 'helmet-flame', kind: 'helmet', name: 'Llamarada', colors: ['#141414', '#ff6a00', '#ffd23f'], design: 'flame', rarity: 'epic', description: 'Llamas naranjas que suben desde la visera.' },
  { id: 'material-matte', kind: 'material', name: 'Mate satinado', finish: 'matte', rarity: 'common', description: 'Sin brillo: la pintura se ve más sólida y moderna.' },
  { id: 'paint-arctic', kind: 'paint', name: 'Ártico', colors: ['#eef3f8', '#1f6fd1', '#0b1a33'], pattern: 'stripes', rarity: 'rare', description: 'Blanco hielo con dos franjas azul glaciar.' },
  { id: 'title-apex', kind: 'title', name: 'Cazador de ápices', text: 'Cazador de ápices', rarity: 'rare', description: 'Para quien pisa cada vértice de la curva.' },
  { id: 'rims-turbine', kind: 'rims', name: 'Turbina', spokes: 16, color: '#2b2f36', accent: '#ff2a3c', rarity: 'rare', description: 'Aletas curvas como las de una turbina, con aro rojo.' },
  { id: 'paint-nebula', kind: 'paint', name: 'Nebulosa', colors: ['#3b0a73', '#00d1ff', '#ff4fd8'], pattern: 'gradient', rarity: 'legendary', description: 'Un degradado de violeta a cian con destellos rosados.' },
  { id: 'avatar-bolt', kind: 'avatar', name: 'Relámpago', glyph: 'bolt', colors: ['#10151f', '#ffd23f'], rarity: 'common', description: 'Rápido y sin aviso.' },
  { id: 'wing-spoon', kind: 'wing', name: 'Cuchara', shape: 'spoon', rarity: 'rare', description: 'Plano curvo de baja carga, pensado para rectas largas.' },
  { id: 'paint-lime', kind: 'paint', name: 'Lima ácida', colors: ['#b6f000', '#101010', '#ffffff'], pattern: 'split', rarity: 'common', description: 'Verde lima y negro partidos a lo largo.' },
  { id: 'title-late-braker', kind: 'title', name: 'Frenada tardía', text: 'Frenada tardía', rarity: 'common', description: 'Siempre un metro más allá que el resto.' },
  { id: 'material-metallic', kind: 'material', name: 'Metalizado', finish: 'metallic', rarity: 'epic', description: 'Partículas metálicas que brillan al sol.' },
  { id: 'helmet-split', kind: 'helmet', name: 'Dos mitades', colors: ['#f4f4f4', '#1f6fd1', '#141414'], design: 'split', rarity: 'common', description: 'Blanco y azul divididos por la mitad.' },
  { id: 'avatar-crown', kind: 'avatar', name: 'Corona', glyph: 'crown', colors: ['#2a1654', '#f5c542'], rarity: 'rare', description: 'Para quien manda en la pista.' },
  { id: 'rims-gold', kind: 'rims', name: 'Llanta dorada', spokes: 7, color: '#d4a93c', accent: '#1a1a1a', rarity: 'rare', description: 'Siete radios anchos bañados en oro.' },
  { id: 'paint-racing-green', kind: 'paint', name: 'Verde carreras', colors: ['#0f4d2e', '#e8c547', '#0a0a0a'], pattern: 'stripes', rarity: 'common', description: 'Verde oscuro de la vieja escuela, con franjas doradas.' },
  { id: 'celebration-confetti', kind: 'celebration', name: 'Lluvia de confeti', style: 'confetti', rarity: 'legendary', description: 'Una tormenta de papelitos con los colores de tu equipo.' },
  { id: 'title-overtaker', kind: 'title', name: 'Rey del adelantamiento', text: 'Rey del adelantamiento', rarity: 'rare', description: 'Nadie está seguro delante tuyo.' },
  { id: 'paint-sunset', kind: 'paint', name: 'Ocaso', colors: ['#ff7a1a', '#6b1d8f', '#ffd6a0'], pattern: 'chevron', rarity: 'rare', description: 'Naranja y violeta en flechas, como el cielo al caer el sol.' },
  { id: 'avatar-checker', kind: 'avatar', name: 'Bandera a cuadros', glyph: 'checker', colors: ['#0d0d0d', '#f4f4f4'], rarity: 'common', description: 'La que todos quieren ver primero.' },
  { id: 'wing-twin', kind: 'wing', name: 'Doble plano', shape: 'twin', rarity: 'rare', description: 'Dos elementos bien separados: más carga para las curvas lentas.' },
  { id: 'helmet-stars', kind: 'helmet', name: 'Constelación', colors: ['#0b1433', '#ffffff', '#6fb6ff'], design: 'stars', rarity: 'epic', description: 'Azul noche salpicado de estrellas.' },
  { id: 'rims-carbon', kind: 'rims', name: 'Aro de carbono', spokes: 5, color: '#1a1a1a', accent: '#4b4f57', rarity: 'rare', description: 'Cinco radios de fibra de carbono a la vista.' },
  { id: 'paint-midnight', kind: 'paint', name: 'Medianoche', colors: ['#0c1024', '#3a4a7a', '#c0c8e0'], pattern: 'solid', rarity: 'common', description: 'Azul casi negro, discreto y elegante.' },
  { id: 'title-line-keeper', kind: 'title', name: 'Guardián de la trazada', text: 'Guardián de la trazada', rarity: 'common', description: 'La línea ideal es tu segunda casa.' },
  { id: 'material-carbon', kind: 'material', name: 'Carbono visible', finish: 'carbon', rarity: 'rare', description: 'El tejido de fibra de carbono asoma bajo el barniz.' },
  { id: 'paint-inferno', kind: 'paint', name: 'Infierno', colors: ['#d81e05', '#ff9f1c', '#1a0a00'], pattern: 'chevron', rarity: 'legendary', description: 'Rojo, naranja y negro en flechas que parecen arder.' },
  { id: 'avatar-wing', kind: 'avatar', name: 'Ala', glyph: 'wing', colors: ['#10151f', '#6fe3ff'], rarity: 'common', description: 'Carga aerodinámica hecha emblema.' },
  { id: 'celebration-champagne', kind: 'celebration', name: 'Ducha de champán', style: 'champagne', rarity: 'rare', description: 'La botella, bien agitada, apunta a los demás del podio.' },
  { id: 'rims-neon', kind: 'rims', name: 'Neón', spokes: 12, color: '#141414', accent: '#39ff88', rarity: 'rare', description: 'Negro con un aro verde que parece encendido.' },
  { id: 'paint-steel', kind: 'paint', name: 'Acero', colors: ['#8a939e', '#1c1f24', '#e2e6ea'], pattern: 'geometric', rarity: 'common', description: 'Grises de taller en bloques geométricos.' },
  { id: 'wing-swan', kind: 'wing', name: 'Cuello de cisne', shape: 'swan', rarity: 'epic', description: 'Soportes que cuelgan desde arriba: el plano trabaja limpio.' },
  { id: 'title-top-speed', kind: 'title', name: 'Velocidad punta', text: 'Velocidad punta', rarity: 'common', description: 'Tu lugar favorito es el final de la recta.' },
  { id: 'helmet-circuit', kind: 'helmet', name: 'Circuito impreso', colors: ['#0e2a1f', '#39ff88', '#d7ffe9'], design: 'circuit', rarity: 'rare', description: 'Pistas verdes como en una placa electrónica.' },
  { id: 'avatar-comet', kind: 'avatar', name: 'Cometa', glyph: 'comet', colors: ['#0b1433', '#ff9f1c'], rarity: 'rare', description: 'Una estela que se ve de lejos.' },
  { id: 'paint-aurora', kind: 'paint', name: 'Aurora', colors: ['#06303a', '#29f0b4', '#9d6bff'], pattern: 'gradient', rarity: 'rare', description: 'Verde y violeta que se mezclan como una aurora austral.' },
  { id: 'material-pearl', kind: 'material', name: 'Perlado iridiscente', finish: 'pearl', rarity: 'legendary', description: 'Cambia de tono según desde dónde lo mires.' },
  { id: 'title-legend-hunter', kind: 'title', name: 'Cazaleyendas', text: 'Cazaleyendas', rarity: 'rare', description: 'Ganaste a los mejores en su propio juego.' },
  { id: 'rims-retro', kind: 'rims', name: 'Retro de cinco', spokes: 5, color: '#e9e4d8', accent: '#b3122b', rarity: 'common', description: 'Cinco radios color marfil, como en los setenta.' },
  { id: 'paint-cobalt', kind: 'paint', name: 'Cobalto', colors: ['#1747c2', '#f4f4f4', '#ff2a3c'], pattern: 'split', rarity: 'common', description: 'Azul intenso y blanco, con un toque rojo.' },
  { id: 'avatar-flame', kind: 'avatar', name: 'Llama eterna', glyph: 'flame', colors: ['#1a0a00', '#ff6a00'], rarity: 'rare', description: 'Nunca se apaga.' },
  { id: 'celebration-fireworks', kind: 'celebration', name: 'Fuegos artificiales', style: 'fireworks', rarity: 'epic', description: 'El cielo del circuito se llena de luces cuando ganas.' },
  { id: 'helmet-gold', kind: 'helmet', name: 'Casco de oro', colors: ['#d4a93c', '#1a1a1a', '#fff3c4'], design: 'gold', rarity: 'rare', description: 'Dorado con una franja negra: sólo para campeones.' },
  { id: 'paint-venom', kind: 'paint', name: 'Veneno', colors: ['#0d0d0d', '#39ff88', '#1e5c3a'], pattern: 'geometric', rarity: 'rare', description: 'Negro con cortes verde tóxico.' },
  { id: 'title-unstoppable', kind: 'title', name: 'Imparable', text: 'Imparable', rarity: 'rare', description: 'Cincuenta niveles y contando.' },
  { id: 'wing-blade', kind: 'wing', name: 'Hoja afilada', shape: 'blade', rarity: 'rare', description: 'Un plano fino y recto, con placas laterales en punta.' },
  { id: 'paint-apex-gold', kind: 'paint', name: 'Ápice dorado', colors: ['#d4a93c', '#0d0d0d', '#fff3c4'], pattern: 'stripes', rarity: 'legendary', description: 'Oro y negro: la librea de quien completó la temporada.' },
];

export const ITEMS: readonly Item[] = [...STARTER_ITEMS, ...SEASON_ONE_ITEMS];

const byId = new Map(ITEMS.map((item) => [item.id, item]));

export function getItem(id: string): Item | undefined {
  return byId.get(id);
}

export function isItemId(id: string): boolean {
  return byId.has(id);
}

/** Ids de los ítems con los que empieza cualquier piloto. */
export const STARTER_ITEM_IDS: readonly string[] = STARTER_ITEMS.map((item) => item.id);

/** Recompensas de la temporada 1 en orden de nivel del pase (índice 0 = nivel 1). */
export const SEASON_ONE_REWARDS: readonly string[] = SEASON_ONE_ITEMS.map((item) => item.id);

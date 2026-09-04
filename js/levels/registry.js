/**
 * levels/registry.js — Catálogo de niveles.
 *
 * Lee `data/levels-meta.json` (título, tipo, dificultad, umbral de tiempo) y
 * carga cada módulo de nivel bajo demanda mediante import dinámico, derivando
 * la ruta del identificador: nivel 7 → `./level-07.js`.
 *
 * Consecuencia buscada: añadir el nivel 31 no requiere editar este archivo.
 */

import { pad2 } from '../utils/math.js';

let catalog = null;
const moduleCache = new Map();

/**
 * Carga el catálogo. Se llama una vez al arrancar, antes del router.
 * @returns {Promise<{ totalLevels:number, levels:object[] }>}
 */
export async function loadCatalog() {
  if (catalog) return catalog;

  try {
    // La ruta se resuelve aquí y no en el ámbito del módulo: en la compilación
    // a un solo archivo no hay import.meta.url, y esta línea nunca llega a
    // ejecutarse porque el catálogo ya viene sembrado.
    const metaUrl = new URL('../../data/levels-meta.json', import.meta.url);
    const response = await fetch(metaUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    catalog = normalizeCatalog(data);
  } catch (err) {
    console.warn('[registry] no se pudo leer levels-meta.json, se usa un catálogo mínimo:', err);
    catalog = fallbackCatalog();
  }

  return catalog;
}

export const getCatalog = () => catalog ?? fallbackCatalog();

export const getTotalLevels = () => getCatalog().totalLevels;

export const getAllLevelMeta = () => getCatalog().levels;

/** Metadatos de un nivel, o null si el id no existe. */
export function getLevelMeta(levelId) {
  const id = Number(levelId);
  return getCatalog().levels.find((level) => level.id === id) ?? null;
}

export const isImplemented = (levelId) => Boolean(getLevelMeta(levelId)?.implemented);

/**
 * Importa el módulo de un nivel y devuelve su clase.
 * @param {number} levelId
 * @returns {Promise<typeof import('./level-base.js').LevelBase>}
 */
export async function loadLevelClass(levelId) {
  const id = Number(levelId);
  if (moduleCache.has(id)) return moduleCache.get(id);

  const promise = import(`./level-${pad2(id)}.js`)
    .then((mod) => {
      const LevelClass = mod.default ?? mod[`Level${pad2(id)}`];
      if (typeof LevelClass !== 'function') {
        throw new Error(`level-${pad2(id)}.js no exporta por defecto una clase de nivel`);
      }
      return LevelClass;
    })
    .catch((err) => {
      // No cachear el fallo: un nivel añadido en caliente debe poder cargarse.
      moduleCache.delete(id);
      throw err;
    });

  moduleCache.set(id, promise);
  return promise;
}

/* --------------------------------------------------------------------------
   Semillas para la compilación en un solo archivo
   -------------------------------------------------------------------------- */

/**
 * El juego también se reparte como un único HTML que se abre con doble clic.
 * Ahí no hay servidor: ni el fetch del catálogo ni el import dinámico de los
 * niveles llegan a ninguna parte. El empaquetador incrusta ambas cosas y las
 * deja aquí antes de arrancar, de forma que el resto del código sigue pidiendo
 * los niveles igual y no se entera de por dónde vinieron.
 */
export function seedCatalog(data) {
  catalog = normalizeCatalog(data);
}

/** @param {number} levelId @param {Function} LevelClass */
export function seedLevelClass(levelId, LevelClass) {
  moduleCache.set(Number(levelId), Promise.resolve(LevelClass));
}

/* --------------------------------------------------------------------------
   Normalización
   -------------------------------------------------------------------------- */

function normalizeCatalog(data) {
  const levels = (Array.isArray(data?.levels) ? data.levels : [])
    .map((level) => ({
      id: Number(level.id),
      title: String(level.title ?? `Nivel ${level.id}`),
      type: String(level.type ?? 'generico'),
      difficulty: Number(level.difficulty) || 1,
      timeThreshold: Number(level.timeThreshold) || 120,
      timeLimit: level.timeLimit == null ? null : Number(level.timeLimit),
      implemented: level.implemented === true,
    }))
    .filter((level) => Number.isInteger(level.id) && level.id > 0)
    .sort((a, b) => a.id - b.id);

  return {
    totalLevels: Number(data?.totalLevels) || levels.length || 30,
    levels,
  };
}

/**
 * Catálogo de emergencia: 30 niveles sin título. Sólo entra en juego si el
 * JSON no se puede leer (por ejemplo al abrir index.html con file://).
 */
function fallbackCatalog() {
  const levels = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    title: `Nivel ${i + 1}`,
    type: 'generico',
    difficulty: 1,
    timeThreshold: 120,
    timeLimit: null,
    implemented: i === 0,
  }));
  return { totalLevels: 30, levels };
}

/**
 * systems/validation.js — Verificación de soluciones.
 *
 * El núcleo NO sabe resolver ningún puzzle: cada nivel implementa su propio
 * `validate(solution)`. Este módulo sólo aporta comparadores comunes para que
 * los niveles no reimplementen lo mismo treinta veces, y envuelve la llamada
 * para que una excepción en un nivel no tumbe la pantalla.
 */

/**
 * Ejecuta `validate` de un nivel de forma segura.
 * @returns {boolean}
 */
export function runValidation(level, solution) {
  try {
    return level.validate(solution) === true;
  } catch (err) {
    console.error(`[validation] nivel ${level?.levelId} lanzó al validar:`, err);
    return false;
  }
}

/* --------------------------------------------------------------------------
   Comparadores reutilizables
   -------------------------------------------------------------------------- */

/** Normaliza texto: sin acentos, sin espacios extra, en minúsculas. */
export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    // Marcas diacríticas combinantes: escapadas a propósito, para que el
    // archivo no dependa de caracteres invisibles en el código fuente.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** Igualdad de texto tolerante (acentos, mayúsculas, espacios). */
export const textEquals = (input, expected) =>
  normalizeText(input) === normalizeText(expected);

/** Igualdad de texto ignorando además todos los espacios internos. */
export const codeEquals = (input, expected) =>
  normalizeText(input).replace(/\s/g, '') === normalizeText(expected).replace(/\s/g, '');

/** Igualdad numérica tolerante a espacios y ceros a la izquierda. */
export function numberEquals(input, expected) {
  const a = Number(String(input ?? '').trim());
  const b = Number(expected);
  return Number.isFinite(a) && Number.isFinite(b) && a === b;
}

/** Comparación de secuencias en orden estricto. */
export const sequenceEquals = (input, expected) =>
  Array.isArray(input) && Array.isArray(expected)
  && input.length === expected.length
  && input.every((v, i) => String(v) === String(expected[i]));

/** Comparación de conjuntos (mismo contenido, orden irrelevante). */
export function setEquals(input, expected) {
  if (!Array.isArray(input) || !Array.isArray(expected)) return false;
  if (input.length !== expected.length) return false;
  const a = [...input].map(String).sort();
  const b = [...expected].map(String).sort();
  return a.every((v, i) => v === b[i]);
}

/** Comparación de emparejamientos { clave: valor }. */
export function mappingEquals(input, expected) {
  if (!input || !expected || typeof input !== 'object') return false;
  const keys = Object.keys(expected);
  if (Object.keys(input).length !== keys.length) return false;
  return keys.every((key) => String(input[key]) === String(expected[key]));
}

/** El input está entre las opciones aceptadas (comparación de texto tolerante). */
export const oneOf = (input, options = []) =>
  options.some((option) => textEquals(input, option));

/**
 * Formato de números para la interfaz (convenciones de Perú: coma de miles,
 * punto decimal). Los formateadores se crean una sola vez.
 */

const LOCALE = 'es-PE';

const integerFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/** Entero con separador de miles: 12500 → "12,500". */
export function formatInteger(value: number): string {
  return integerFormat.format(Math.round(value));
}

/** Porcentaje entero a partir de una fracción: 0.85 → "85 %". */
export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)} %`;
}

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

/** Tiempo de vuelta: 83.456 → "1:23.456"; menos de un minuto → "59.120". */
export function formatLapTime(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const minutes = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  const tail = `${String(secs).padStart(minutes > 0 ? 2 : 1, '0')}.${String(ms).padStart(3, '0')}`;
  return minutes > 0 ? `${minutes}:${tail}` : tail;
}

/** Diferencia de tiempo con signo: 0.234 → "+0.234"; −1.5 → "−1.500". */
export function formatDelta(seconds: number, decimals = 3): string {
  const sign = seconds < 0 ? '−' : '+';
  return `${sign}${Math.abs(seconds).toFixed(decimals)}`;
}

/** Intervalo entre autos: 1.2345 → "+1.235"; desde un minuto → "+1:02.300". */
export function formatGap(seconds: number): string {
  return seconds >= 60 ? `+${formatLapTime(seconds)}` : `+${Math.max(0, seconds).toFixed(3)}`;
}

/**
 * Clima de la carrera: soleado, nublado o atardecer. No cambia la física (no
 * hay lluvia): cambia la luz. Cada clima convierte el entorno del circuito
 * (posición del sol, bruma) en un "aspecto" completo: cielo y nubes, color e
 * intensidad del sol, luz ambiente, niebla y exposición de la cámara.
 */

import type { Weather } from '../core/save/schema';
import type { TrackEnvironment } from './TrackDefinition';

export const WEATHER_INFO: Readonly<Record<Weather, { label: string; description: string }>> = {
  sunny: { label: 'Soleado', description: 'Cielo limpio, sombras marcadas y algunas nubes altas.' },
  cloudy: { label: 'Nublado', description: 'Cielo cubierto y luz pareja, sin sombras duras.' },
  sunset: { label: 'Atardecer', description: 'Sol bajo y dorado, sombras largas y cielo encendido.' },
};

export interface WeatherLook {
  /** Sol: azimut desde el norte y altura (grados). */
  sunAzimuth: number;
  sunElevation: number;
  sunColor: string;
  sunIntensity: number;
  /** Cielo físico. */
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  /** Nubes del cielo (0–1). */
  cloudCoverage: number;
  cloudDensity: number;
  /** Luz ambiente (cielo arriba, suelo abajo). */
  skyLight: string;
  groundLight: string;
  ambientIntensity: number;
  fogColor: string;
  fogDensity: number;
  /** Exposición de la cámara. */
  exposure: number;
}

/** Aspecto de un circuito con un clima. */
export function weatherLook(env: TrackEnvironment, weather: Weather): WeatherLook {
  const sunny: WeatherLook = {
    sunAzimuth: env.sunAzimuth,
    sunElevation: env.sunElevation,
    sunColor: '#fff4e2',
    sunIntensity: 3.2,
    turbidity: env.turbidity,
    rayleigh: 1.2,
    mieCoefficient: 0.0022,
    cloudCoverage: 0.32,
    cloudDensity: 0.45,
    skyLight: '#bcd4ff',
    groundLight: '#4a5a32',
    ambientIntensity: 0.55,
    fogColor: '#c9d6e3',
    fogDensity: env.fogDensity,
    exposure: 1,
  };
  switch (weather) {
    case 'sunny':
      return sunny;
    case 'cloudy':
      return {
        ...sunny,
        // El sol queda detrás de las nubes: luz suave y casi sin sombras.
        sunElevation: Math.max(env.sunElevation, 45),
        sunColor: '#e9edf2',
        sunIntensity: 1.1,
        turbidity: 6,
        rayleigh: 0.9,
        mieCoefficient: 0.006,
        cloudCoverage: 0.88,
        cloudDensity: 0.85,
        skyLight: '#d5dbe3',
        groundLight: '#4c5446',
        ambientIntensity: 1.25,
        fogColor: '#b9c0c8',
        fogDensity: env.fogDensity * 1.7,
        exposure: 1.05,
      };
    case 'sunset':
      return {
        ...sunny,
        // Sol bajo por el oeste del circuito.
        sunAzimuth: env.sunAzimuth + (270 - env.sunAzimuth) * 0.6,
        sunElevation: 7,
        sunColor: '#ffb066',
        sunIntensity: 2.6,
        turbidity: 6,
        rayleigh: 2.6,
        mieCoefficient: 0.008,
        cloudCoverage: 0.45,
        cloudDensity: 0.55,
        skyLight: '#ffcba4',
        groundLight: '#3b3040',
        ambientIntensity: 0.5,
        fogColor: '#d9ab90',
        fogDensity: env.fogDensity,
        exposure: 1.15,
      };
  }
}

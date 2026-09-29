/**
 * Formato de datos de un circuito. Ver PLAN.md §5.1.
 *
 * Un circuito es un archivo de datos: agregar uno = crear `tracks/data/<id>.ts`
 * y sumarlo a `tracks/registry.ts`. Todo lo demás (spline, curvas, puntos de
 * frenada, mallas, escenario) se calcula a partir de estos datos.
 *
 * Todas las posiciones a lo largo del circuito (`s`) están en metros del
 * diseño, medidos desde el primer tramo del trazado; al construirse se escalan
 * a la longitud oficial.
 */

export type Side = 'left' | 'right';

/** Superficie fuera del asfalto. */
export type RunoffKind = 'grass' | 'gravel' | 'tarmac';

/** Tramo del trazado: recta o curva de radio constante. */
export type LayoutSegment =
  | { kind: 'straight'; length: number }
  | {
      kind: 'turn';
      direction: Side;
      /** Radio de la curva (m). */
      radius: number;
      /** Ángulo girado (grados). */
      angle: number;
      /** Nombre de la curva (se muestra en la presentación del circuito). */
      name?: string;
    };

export interface TrackLayout {
  /** Punto de partida del primer tramo, en el plano (x, z). */
  start: readonly [number, number];
  /** Rumbo inicial en grados: 0 = hacia −Z (norte), 90 = hacia +X (este). */
  heading: number;
  segments: readonly LayoutSegment[];
}

export interface Grandstand {
  /** Posición a lo largo del circuito (m de diseño). */
  at: number;
  side: Side;
  /** Largo de la tribuna (m). */
  length: number;
  /** Filas de asientos. */
  rows: number;
}

export interface RunoffOverride {
  from: number;
  to: number;
  side: Side;
  kind: RunoffKind;
  /** Distancia del borde de pista al muro (m). */
  width: number;
}

export interface TrackEnvironment {
  /** Dirección del sol (grados, 0 = norte, 90 = este). */
  sunAzimuth: number;
  /** Altura del sol sobre el horizonte (grados). */
  sunElevation: number;
  /** Turbidez del cielo (2 = muy limpio, 10 = brumoso). */
  turbidity: number;
  /** Densidad de la niebla de distancia. */
  fogDensity: number;
}

export interface TrackDefinition {
  id: string;
  /** Nombre corto del circuito. */
  name: string;
  /** Nombre del Gran Premio. */
  grandPrix: string;
  city: string;
  country: string;
  /** Código ISO del país (para dibujar la bandera). */
  countryCode: string;
  /** Longitud oficial (km): el trazado se escala para medir exactamente esto. */
  lengthKm: number;
  turns: number;
  /** Récord de vuelta (piloto ficticio). */
  lapRecord: { seconds: number; driver: string; year: number };
  /** Ancho del asfalto (m). */
  width: number;
  layout: TrackLayout;
  /** Posición de la línea de meta (m de diseño). La parrilla queda detrás. */
  startLine: number;
  /** Fin de los sectores 1 y 2 (m de diseño). */
  sectors: readonly [number, number];
  /** Zona de pits (lado y tramo de la recta principal). */
  pits: { side: Side; from: number; to: number };
  drsZones: ReadonlyArray<{ detection: number; start: number; end: number }>;
  /** Escapatorias especiales; el resto se genera según las curvas. */
  runoff?: readonly RunoffOverride[];
  scenery: {
    /** Lago (polígono en coordenadas de diseño). */
    lake?: ReadonlyArray<readonly [number, number]>;
    grandstands: readonly Grandstand[];
    /** Árboles por hectárea en las zonas de parque. */
    treeDensity: number;
    /** Silueta de ciudad a lo lejos: rumbo (grados) y distancia (m). */
    skyline?: { bearing: number; distance: number; buildings: number };
    /**
     * Puentes que cruzan sobre la pista (m de diseño). `banking` = tramo del
     * viejo óvalo peraltado de hormigón (Monza), cruzando en diagonal.
     */
    bridges?: ReadonlyArray<{ at: number; kind: 'banking'; name: string }>;
  };
  environment: TrackEnvironment;
}

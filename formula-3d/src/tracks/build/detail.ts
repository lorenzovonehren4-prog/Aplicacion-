/**
 * Capa de detalle cercana para las superficies grandes (asfalto, pasto,
 * grava): cuando la cámara está encima, una textura que repite cada varios
 * metros se estira y se ve borrosa. Se vuelve a leer la misma textura a una
 * escala varias veces más fina y se usa sólo su variación (alto contraste
 * contra su propio promedio, leído de un mipmap chico), así el grano sigue
 * nítido a 1–2 m del auto. Se desvanece con la distancia: de lejos no suma
 * nada (evita el moiré) y el costo es una lectura de textura más.
 *
 * Necesita el `map` del material (usa `vMapUv`) y `vViewPosition`, que
 * `MeshStandardMaterial` ya declara.
 */

/** Declaraciones para el encabezado del sombreador de fragmentos. */
export const DETAIL_PARS = /* glsl */ `
  float detailVariation(sampler2D tex, vec2 uv) {
    // Luminancia fina contra la de un nivel de mipmap bastante más chico (su promedio local).
    vec3 fine = texture2D(tex, uv).rgb;
    vec3 coarse = texture2D(tex, uv, 4.0).rgb;
    float l = dot(fine, vec3(0.299, 0.587, 0.114));
    float m = max(1e-3, dot(coarse, vec3(0.299, 0.587, 0.114)));
    return clamp(l / m, 0.55, 1.6);
  }
`;

/**
 * Código a insertar después de `#include <map_fragment>`.
 * @param scale cuántas veces más fina que el mapa base
 * @param strength cuánto oscurece o aclara (0–1)
 */
export function detailLayer(scale: number, strength: number): string {
  return /* glsl */ `
    #ifdef USE_MAP
      // Sin "if": las lecturas con mipmaps necesitan derivadas, y dentro de
      // una rama que cambia entre píxeles vecinos quedan indefinidas.
      float detailFade = 1.0 - smoothstep(6.0, 38.0, length(vViewPosition));
      float detail = detailVariation(map, vMapUv * ${scale.toFixed(2)} + vec2(0.37, 0.61));
      diffuseColor.rgb *= mix(1.0, detail, ${strength.toFixed(2)} * detailFade);
    #endif
  `;
}

# El avión congelado — plan de producción (35 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.2 s | «¿Sabías que hay pilotos que aseguran haber visto aviones completamente detenidos en el aire?» |
| 4.2–8.3 s | «Uno de los relatos más contados sitúa el caso en Alaska, en los años 70.» |
| 8.3–11.5 s | «Un piloto comercial vio una avioneta quieta sobre un desfiladero.» |
| 11.5–14.1 s | «Al acercarse, la hélice parecía no moverse.» |
| 14.1–17.5 s | «Y entonces, según contó, desapareció en un parpadeo.» |
| 17.5–20.1 s | «No existe ningún registro oficial de ese caso.» |
| 20.1–24.5 s | «Pero sí hay una explicación para los aviones que parecen quietos: un viento en contra muy fuerte.» |
| 24.5–30.0 s | «Una avioneta lenta, contra un viento casi igual de rápido, puede quedar casi inmóvil respecto al suelo.» |
| 30.0–35.1 s | «Y una hélice vista a cierta velocidad puede parecer detenida. ¿Qué crees que vio?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h31_nubes` | travelling que pasa por detrás de un objeto en primer plano | — | iconos 🛩️ |
| 2 | `h31_alaska` | plano general que se abre | — | — |
| 3 | `h31_cabina` | la cámara pasa por detrás del personaje | piloto | iconos 🛩️ |
| 4 | `h31_nubes` | primer plano de detalle | — | iconos 🛩️ |
| 5 | `h31_cielo` | crash zoom | — | texto «DESAPARECIÓ» |
| 6 | `h31_cabina` | giro de cámara | piloto | texto «SIN REGISTROS» |
| 7 | `h31_viento` | tracking lateral | — | iconos 💨 🛩️ |
| 8 | `h31_viento` | dolly in lento | — | iconos 🛩️ |
| 9 | `h31_cielo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL AVIÓN CONGELADO. Cierre: ¿QUÉ FUE / LO QUE VIO? ☁️.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h31_nubes`: grey cloudy sky with a small single-engine propeller plane, overcast
- `h31_alaska`: snowy forested mountains and canyons of Alaska under heavy clouds
- `h31_cabina`: 1970s airliner cockpit with two seats, instruments and a window to the clouds
- `h31_cielo`: empty clear blue sky with soft clouds
- `h31_viento`: strong wind over a mountain ridge with clouds racing, dramatic sky

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Aerodinámica básica: velocidad respecto al suelo con viento en contra (FAA, manuales de vuelo)
- Efecto estroboscópico en hélices

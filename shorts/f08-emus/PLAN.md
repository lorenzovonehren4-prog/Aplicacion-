# Australia contra los emús — plan de producción (39 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.6 s | «¿Sabías que Australia organizó una operación militar contra… miles de emús?» |
| 4.6–9.9 s | «En 1932, los agricultores del oeste de Australia tenían un problema:» |
| 9.9–13.2 s | «enormes grupos de emús estaban dañando sus cultivos.» |
| 13.2–16.9 s | «El gobierno envió militares para intentar controlar la situación.» |
| 16.9–20.0 s | «Pero las aves eran rápidas y difíciles de controlar.» |
| 20.0–23.6 s | «La operación no consiguió resolver el problema como esperaban» |
| 23.6–27.2 s | «y terminó convirtiéndose en una enorme anécdota histórica.» |
| 27.2–29.9 s | «Así nació la famosa Gran Guerra del Emú.» |
| 29.9–39.0 s | «No fue una guerra oficial entre países, pero sí una operación militar real que terminó siendo recordada por su resultado tan peculiar.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `f08_outback` | tracking lateral | — | emús |
| 2 | `f08_trigo` | órbita con giro suave | granjero | — |
| 3 | `f08_granja` | crash zoom | — | emús |
| 4 | `f08_camino` | whip pan | australiano; australiano2 | — |
| 5 | `f08_llanura` | tracking lateral | australiano | emús |
| 6 | `f08_llanura` | dolly in lento | australiano; australiano2 | emús |
| 7 | `f08_granja` | primer plano de detalle | granjero | emús |
| 8 | `f08_mapa` | plano general que se abre | — | texto «THE GREAT EMU WAR»; emús |
| 9 | `f08_outback` | dolly out de cierre | australiano | emús |

Título de entrada: ¿SABÍAS QUE...? / AUSTRALIA CONTRA LOS EMÚS. Cierre: 1932 / AUSTRALIA.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `f08_outback`: australian outback landscape with red earth, dry grass and eucalyptus trees, big blue sky
- `f08_trigo`: golden wheat fields in western Australia in 1932 with a wooden fence and a farmhouse far away
- `f08_granja`: 1930s australian farm with a windmill, wooden fence, trampled wheat and a water tank
- `f08_camino`: dusty red dirt road in the australian outback with an old 1930s army truck, heat haze
- `f08_llanura`: wide open australian plain at sunset with scattered bushes and a dust cloud
- `f08_mapa`: old illustrated map of Australia on parchment with waves around it, sepia tones, no letters

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- National Museum of Australia: Emu War (Defining Moments)
- Australian Geographic: Looking back: Australia’s Emu Wars
- Britannica: Emu War

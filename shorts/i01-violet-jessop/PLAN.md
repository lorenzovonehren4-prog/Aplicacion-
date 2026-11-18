# La mujer insumergible — plan de producción (52 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–6.0 s | «¿Sabías que una mujer estuvo en tres desastres de los barcos gemelos del Titanic… y sobrevivió a todos?» |
| 6.0–10.3 s | «Se llamaba Violet Jessop, y trabajaba como camarera en barcos de lujo.» |
| 10.3–16.7 s | «En 1911 viajaba en el Olympic, el gemelo del Titanic, cuando chocó contra un buque de guerra.» |
| 16.7–21.8 s | «El Olympic no se hundió. Pero un año después, ella subió al Titanic.» |
| 21.8–28.6 s | «La noche del 15 de abril de 1912, la mandaron a un bote salvavidas. Sobrevivió.» |
| 28.6–34.8 s | «En la Primera Guerra Mundial fue enfermera en el tercer gemelo: el Britannic, convertido en barco hospital.» |
| 34.8–40.4 s | «En 1916, el Britannic chocó con una mina y se hundió en menos de una hora.» |
| 40.4–45.9 s | «Violet saltó al agua y se golpeó la cabeza. Aun así, la rescataron.» |
| 45.9–51.8 s | «La llamaron «Miss Insumergible». Siguió trabajando en el mar muchos años más.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i01_oceano` | travelling que pasa por detrás de un objeto en primer plano | enfermera | — |
| 2 | `i01_oceano` | órbita con giro suave | parisina | — |
| 3 | `i01_choque` | crash zoom | parisina | — |
| 4 | `i01_oceano` | la cámara pasa por detrás del personaje | parisina | — |
| 5 | `i01_noche` | plano general que se abre | — | iconos 🛶 |
| 6 | `i01_hospital` | tracking lateral | enfermera | — |
| 7 | `i01_hospital` | giro de cámara | enfermera | iconos 💥 |
| 8 | `i01_agua` | dolly in lento | enfermera | — |
| 9 | `i01_oceano` | dolly out de cierre | parisina | — |

Título de entrada: ¿SABÍAS QUE...? / LA MUJER INSUMERGIBLE. Cierre: MISS / INSUMERGIBLE.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i01_oceano`: a huge 1910s ocean liner with four funnels sailing on a calm sea at sunset
- `i01_choque`: two big ships colliding in a harbor, splashing water, 1911
- `i01_noche`: a giant ocean liner sinking at night in a calm black sea, lifeboats, stars
- `i01_hospital`: a white hospital ship with red crosses on a blue Mediterranean sea, 1916
- `i01_agua`: stormy sea surface with floating debris and lifeboats, grey sky

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Encyclopedia Titanica: Violet Constance Jessop
- Violet Jessop, «Titanic Survivor» (memorias, ed. 1997)

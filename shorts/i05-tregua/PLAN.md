# La tregua de navidad — plan de producción (41 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–5.9 s | «¿Sabías que en plena Primera Guerra Mundial, los enemigos dejaron de luchar… para celebrar la Navidad?» |
| 5.9–12.6 s | «Era diciembre de 1914. En las trincheras de Bélgica y Francia hacía un frío terrible.» |
| 12.6–17.9 s | «La noche del 24, soldados alemanes pusieron velas y árboles en sus trincheras.» |
| 17.9–23.1 s | «Y empezaron a cantar villancicos. Los británicos respondieron cantando.» |
| 23.1–27.1 s | «Al día siguiente, salieron a la tierra de nadie… sin armas.» |
| 27.1–31.2 s | «Se dieron la mano, e intercambiaron comida, tabaco y botones.» |
| 31.2–34.4 s | «En algunos lugares, incluso jugaron al fútbol.» |
| 34.4–38.3 s | «A los mandos no les gustó, y no volvió a ocurrir a esa escala.» |
| 38.3–41.0 s | «Por unas horas, la guerra se detuvo.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `i05_trinchera` | la cámara pasa por detrás del personaje | soldado1918 | — |
| 2 | `i05_trinchera` | plano general que se abre | — | — |
| 3 | `i05_arbol` | pan vertical ascendente | aleman | — |
| 4 | `i05_cielo` | órbita con giro suave | soldado1918; aleman | iconos 🎵 |
| 5 | `i05_tierra` | tracking lateral | soldado1918; aleman | — |
| 6 | `i05_tierra` | primer plano de detalle | soldado1918; aleman | — |
| 7 | `i05_campo` | travelling que pasa por detrás de un objeto en primer plano | soldado1918; aleman | iconos ⚽ |
| 8 | `i05_trinchera` | giro de cámara | general | — |
| 9 | `i05_cielo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / LA TREGUA DE NAVIDAD. Cierre: LA TREGUA / DE NAVIDAD · 1914.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `i05_trinchera`: muddy world war one trench at night in winter, sandbags, frost, dim lantern light
- `i05_arbol`: small christmas trees with candles placed on the edge of a world war one trench at night
- `i05_tierra`: no mans land between trenches on a frosty winter morning, barbed wire, mist
- `i05_campo`: frozen field in Flanders on a christmas morning, mist, soft sun
- `i05_cielo`: starry winter night sky over a quiet battlefield

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Imperial War Museums: The Christmas Truce
- Malcolm Brown y Shirley Seaton, «Christmas Truce» (1984)

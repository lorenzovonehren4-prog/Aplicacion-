# El fin de los zepelines — plan de producción (37 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–4.8 s | «¿Sabías que un accidente de 34 segundos acabó con la era de los zepelines?» |
| 4.8–8.7 s | «El Hindenburg era el aparato volador más grande jamás construido.» |
| 8.7–14.8 s | «El 6 de mayo de 1937 llegaba desde Alemania a Nueva Jersey, en Estados Unidos.» |
| 14.8–17.9 s | «Estaba lleno de hidrógeno, un gas muy inflamable.» |
| 17.9–23.4 s | «Al aterrizar, se incendió. En unos treinta segundos quedó envuelto en llamas.» |
| 23.4–28.0 s | «Murieron 36 personas. Pero 62 sobrevivieron.» |
| 28.0–32.1 s | «Un locutor de radio narró la tragedia en directo: «¡Oh, la humanidad!».» |
| 32.1–34.3 s | «Las imágenes dieron la vuelta al mundo.» |
| 34.3–37.3 s | «Y los viajes en zepelín nunca se recuperaron.» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `j03_fuego` | travelling que pasa por detrás de un objeto en primer plano | — | — |
| 2 | `j03_cielo` | plano general que se abre | — | — |
| 3 | `j03_aerodromo` | pan vertical ascendente | parisino; parisina | — |
| 4 | `j03_cielo` | primer plano de detalle | — | texto «HIDRÓGENO» |
| 5 | `j03_fuego` | crash zoom | parisino; parisina | — |
| 6 | `j03_aerodromo` | giro de cámara | — | texto «62 SOBREVIVIENTES» |
| 7 | `j03_radio` | la cámara pasa por detrás del personaje | periodista | iconos 🎙️ |
| 8 | `j03_radio` | órbita con giro suave | — | iconos 📰 |
| 9 | `j03_museo` | dolly out de cierre | — | — |

Título de entrada: ¿SABÍAS QUE...? / EL FIN DE LOS ZEPELINES. Cierre: HINDENBURG / 6 DE MAYO DE 1937.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `j03_cielo`: a giant silver zeppelin airship flying over the ocean at sunset, 1930s
- `j03_aerodromo`: 1930s airfield with a tall mooring mast and crowds watching, evening
- `j03_fuego`: a huge airship bursting into flames over an airfield at dusk, smoke
- `j03_radio`: 1930s radio reporter booth with a microphone and recording machine
- `j03_museo`: museum hall with a large model of a zeppelin

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- Smithsonian National Air and Space Museum: Hindenburg
- Navy Lakehurst Historical Society

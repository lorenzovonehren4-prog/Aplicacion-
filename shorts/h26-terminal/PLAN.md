# 18 años en un aeropuerto — plan de producción (46 s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
| 0.0–3.8 s | «¿Sabías que un hombre vivió 18 años dentro de un aeropuerto?» |
| 3.8–7.6 s | «Fue en la terminal 1 del aeropuerto Charles de Gaulle, en París.» |
| 7.6–15.3 s | «Se llamaba Mehran Karimi Nasseri. En 1988 llegó sin documentos: decía que se los habían robado.» |
| 15.3–19.6 s | «Francia no lo dejaba entrar, y tampoco podían enviarlo a otro país.» |
| 19.6–21.5 s | «Quedó atrapado en un limbo legal.» |
| 21.5–27.1 s | «Vivió en un banco de la terminal, rodeado de sus maletas, leyendo y escribiendo su diario.» |
| 27.1–32.8 s | «Los trabajadores le llevaban comida. Su historia inspiró la película «La terminal».» |
| 32.8–36.4 s | «En 2006 lo hospitalizaron, y salió del aeropuerto.» |
| 36.4–45.8 s | «Semanas antes de morir, en 2022, volvió a vivir allí. Murió en esa misma terminal. ¿Imaginas una vida así?» |

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
| 1 | `h26_terminal` | la cámara pasa por detrás del personaje | ingeniero | — |
| 2 | `h26_terminal` | plano general que se abre | — | texto «PARÍS» |
| 3 | `h26_aduana` | órbita con giro suave | ingeniero; guardia | — |
| 4 | `h26_aduana` | travelling que pasa por detrás de un objeto en primer plano | guardia | — |
| 5 | `h26_banco` | crash zoom | ingeniero | — |
| 6 | `h26_banco` | tracking lateral | ingeniero | iconos 🧳 📖 |
| 7 | `h26_cafe` | giro de cámara | parisina; ingeniero | iconos 🎬 |
| 8 | `h26_puerta` | dolly in lento | ingeniero | texto «18 AÑOS» |
| 9 | `h26_terminal` | dolly out de cierre | — | iconos 🛫 |

Título de entrada: ¿SABÍAS QUE...? / 18 AÑOS EN UN AEROPUERTO. Cierre: SU HOGAR ERA / LA TERMINAL 🛫.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
- `h26_terminal`: modern airport terminal interior with metal benches, shops and big windows, bright
- `h26_aduana`: airport passport control desks in the 1980s, blue light
- `h26_banco`: a red metal bench in an airport terminal with suitcases and boxes stacked next to it
- `h26_cafe`: airport cafe counter with coffee cups and croissants, warm light
- `h26_puerta`: airport boarding gate with a big window and planes at sunset

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
- BBC News: Mehran Karimi Nasseri muere en el aeropuerto de París (noviembre de 2022)
- The Guardian (2022)

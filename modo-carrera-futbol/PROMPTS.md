# Prompts para Claude Code

Pega un prompt a la vez. Espera a que Claude Code termine, prueba el juego y recién ahí pasa al siguiente.

---

## Prompt 0: Conocer el proyecto (pégalo primero)

```
Lee CLAUDE.md para entender Modo Carrera Fútbol: un simulador de carrera de futbolista en 3D con three.js, sin compilación.

Antes de cambiar nada:
1. Revisa todos los archivos de src/ y explícame en pocas líneas cómo funciona una semana del juego, desde que elijo mi plan hasta que termina el partido.
2. Levanta el juego con "npx serve ." y confirma que carga sin errores en la consola.
3. Simula desde la consola 5 carreras completas usando las funciones del motor y dime qué puntajes salen.

Después trabajaremos por etapas. Al terminar cada etapa, pruébala, dime qué cambiaste y espera mi confirmación.
```

---

## Prompt 1: Negociación de contratos y representante

```
Etapa 1: contratos más reales.
- Cuando llega una oferta, abre una escena 3D de oficina del club (escritorio, dos sillas, ventana con el estadio) con el director deportivo sentado.
- Negociación en rondas: pides sueldo, años, prima de fichaje, bono por gol y cláusula de salida. El club acepta, contraoferta o se retira según tu nivel, tu edad y cuánto te quiere.
- El representante (turbio o serio) aparece en la escena y opina antes de firmar. El turbio a veces consigue más plata pero puede meterte en líos.
- Agrega préstamos a otro club cuando juegas poco (el club dueño sigue pagando parte del sueldo).
- Muestra el historial de fichajes con el monto de cada traspaso.
```

---

## Prompt 2: Vida en 3D más completa

```
Etapa 2: la vida fuera de la cancha.
- Haz la casa más detallada en sus 4 niveles (cuarto en el barrio, depa en Miraflores, casa con jardín, mansión con piscina) y deja que el jugador camine por ella con el mouse (clic para moverse).
- Objetos interactivos en la casa: celular (abre los mensajes), cama (descansar), gimnasio (entrenar), clóset (elegir ropa), televisor (ver resumen de la jornada).
- Escena de discoteca en 3D para el plan "Salir de fiesta" (luces, pista, música) con 2 o 3 decisiones durante la noche. Solo desde los 18 años y sin contenido sexual.
- Los carros comprados deben verse con más detalle en la cochera y aparecer cuando el jugador llega al estadio.
- Agrega mascotas (perro o gato) que se pueden comprar y aparecen en la casa.
```

---

## Prompt 3: Más eventos y relaciones

```
Etapa 3: historias.
- Agrega al menos 40 eventos nuevos en EVENTS con decisiones que importen. Ideas: pelea en el vestuario, oferta de un club rival de tu ciudad, tu mamá se enferma, un periodista inventa un rumor, tu hijo quiere ser futbolista, un compañero te pide consejo, te ofrecen dar publicidad a una apuesta (debe ser siempre una mala decisión con consecuencias), fans que te reconocen en la calle.
- Relaciones con personas con nombre: tu DT, tu mejor amigo del equipo, tu rival, tu representante, tu mamá, tu pareja. Cada uno con un nivel de relación que cambie según tus decisiones.
- Cadenas de eventos: decisiones que tienen consecuencias varias semanas después.
- Un feed tipo red social con comentarios de hinchas después de cada partido.
```

---

## Prompt 4: Partidos más vivos

```
Etapa 4: partidos.
- En el estadio 3D, anima los momentos clave de tus partidos (tu gol, tu asistencia, tu atajada o despeje si eres defensa) con cámaras de televisión.
- Relato con más frases y más variadas, con apodos que la prensa te va poniendo según tu estilo.
- Clásicos contra el rival de tu ciudad, con más presión y más fama si ganas.
- Tabla de goleadores de la liga con jugadores inventados, para que el premio de goleador se gane de verdad.
- Resumen de temporada con tu mejor gol y tu mejor partido.
```

---

## Prompt 5: Final de carrera y salón de la fama

```
Etapa 5: el final.
- Ceremonia de retiro en 3D: el estadio de tu club más querido lleno, con tus trofeos en el centro del campo.
- Después del puntaje, muestra un periódico con el titular de tu carrera ("Se retira la leyenda de Comas").
- En "Mis carreras", agrega comparación lado a lado entre dos carreras y un ranking de récords: más goles, más títulos, más plata, carrera más corta, más fichajes.
- Logros permanentes entre carreras (por ejemplo "Gana el Mundial con Perú", "Juega en las 10 ligas", "Retírate en el club donde empezaste").
- Opción para exportar el resumen de una carrera como imagen para compartir.
```

---

## Prompt 6: Pulido y publicación

```
Etapa 6: lanzamiento.
- Tutorial en la primera temporada que explique los planes semanales, la forma, el cansancio y la confianza del DT.
- Menú de opciones: música, sonidos, calidad gráfica, velocidad del partido.
- Música y efectos de sonido (hinchada, silbato, gol).
- Revisa el balance simulando 50 carreras y ajusta para que el promedio de un jugador disciplinado esté entre 55 y 70, y que llegar a 90 sea difícil pero posible.
- Prepara todo para publicarlo en itch.io como juego de navegador.
```

---

# Consejos

- Una etapa a la vez. Si algo se rompe, dile exactamente qué hiciste y qué pasó.
- Usa git para guardar versiones: `git init`, luego `git add .` y `git commit -m "versión que funciona"` antes de cada etapa.
- Si quieres algo que no está aquí, pídeselo en tus palabras. Como ya leyó CLAUDE.md, sabrá dónde tocar.

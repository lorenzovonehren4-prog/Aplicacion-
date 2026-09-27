# Primer mensaje para Claude Code

Copia y pega esto la primera vez que abras Claude Code en la carpeta del proyecto:

---

Lee CLAUDE.md para entender el proyecto Sazón Tycoon (un tycoon de restaurantes peruanos en 3D hecho con three.js, sin compilación).

Antes de cambiar nada:
1. Revisa todos los archivos de src/ y explícame en pocas líneas cómo funciona el flujo de un cliente, desde que entra hasta que paga.
2. Levanta el juego con `npx serve .` y confirma que carga sin errores en la consola.

Después trabajaremos por etapas. Al terminar cada etapa, pruébala, dime qué cambiaste y espera mi confirmación antes de seguir.

Etapa 1: Mesas grupales y personal más visible
- Agrega mesas de 4 personas (se compran después de tener 6 mesas de 2) y grupos de 3 o 4 clientes.
- Los mozos deben tomar el pedido en la mesa antes de que llegue a la cocina (hoy se pide solo).
- Muestra un icono sobre cada empleado según lo que está haciendo (cocinando, llevando plato, limpiando).

Etapa 2: Nuevos tipos de restaurante
- Al llegar a 4.5 estrellas y S/ 20 000, permite abrir un segundo local en otro distrito (Miraflores, Barranco o Gamarra), cada uno con su clientela: en Miraflores pagan más pero exigen más decoración; en Gamarra son muchos y buscan precio.
- Pantalla de "Mi cadena" para cambiar de local. Cada local sigue ganando mientras no lo miras.

Etapa 3: Eventos
- Eventos aleatorios cada 2 o 3 días: partido de la selección (todos piden pollo a la brasa), crítico gastronómico de incógnito (su reseña vale por 10), apagón (hay que comprar un generador), feriado largo (el doble de clientes).
- Un aviso grande al empezar cada evento y un resultado al terminar.

Etapa 4: Pulido y lanzamiento
- Tutorial guiado en el primer día, paso a paso (llevar un plato, limpiar, cobrar, comprar una mesa, contratar un mozo).
- Opción de calidad gráfica (baja, media, alta) que ajuste sombras y resolución.
- Revisa el rendimiento en celular: meta de 50 cuadros por segundo con 40 personas en pantalla.
- Prepara el proyecto para publicarlo en itch.io (un solo zip con index.html).

---

# Consejos para trabajar con Claude Code

- Pide una etapa a la vez. Si pides todo junto, es más difícil encontrar errores.
- Si algo se ve mal, toma una captura y descríbele qué esperabas ver.
- Antes de cambios grandes, guarda una copia con git: `git init`, luego `git add .` y `git commit -m "versión que funciona"`. Así puedes volver atrás.
- Cuando te guste un cambio, pídele: "haz commit de esto con un mensaje claro".

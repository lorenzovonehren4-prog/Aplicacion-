'use strict';
// Catálogo de Anonymous Games. Para sumar un juego nuevo basta con agregarlo aquí
// (carpeta propia con su index.html y una portada en portal/img/).
// box: carátula con el logo (la arma portal/tools/caratulas.mjs a partir de la mejor imagen).
//
// progress(): lee el guardado que el propio juego deja en localStorage (mismo origen)
// para mostrar en el portal cuánto llevas. Si el juego cambia el formato, sólo hay
// que tocar esa función.

const readJSON = key => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } };

// Ápice GP guarda en IndexedDB (base 'apice-gp', almacén 'kv', clave 'save'), que es
// asíncrono: se lee una vez al abrir el portal y al salir del juego, y se guarda aquí.
// Nunca se crea la base: si no existe, se aborta la apertura (crearla vacía rompería
// el guardado del juego).
let apiceCache = null;
function loadApice(done) {
  const fin = () => { if (done) done(); };
  try { const ls = readJSON('apice-gp:save'); if (ls) apiceCache = ls; } catch (e) { /* nada */ }
  if (!window.indexedDB) return fin();
  const open = () => {
    let rq;
    try { rq = indexedDB.open('apice-gp'); } catch (e) { return fin(); }
    rq.onupgradeneeded = () => { try { rq.transaction.abort(); } catch (e) { /* nada */ } };
    rq.onerror = () => fin();
    rq.onsuccess = () => {
      const db = rq.result;
      if (!db.objectStoreNames.contains('kv')) { db.close(); return fin(); }
      try {
        const g = db.transaction('kv', 'readonly').objectStore('kv').get('save');
        g.onsuccess = () => { if (g.result && typeof g.result === 'object') apiceCache = g.result; db.close(); fin(); };
        g.onerror = () => { db.close(); fin(); };
      } catch (e) { db.close(); fin(); }
    };
  };
  if (indexedDB.databases) indexedDB.databases().then(list => { if (list.some(d => d.name === 'apice-gp')) open(); else fin(); }, () => fin());
  else fin();
}

const GAMES = [
  {
    id: 'apice-gp',
    title: 'Ápice GP',
    tagline: 'Monoplazas estilo Fórmula 1 en 3D',
    desc: 'Campeonato de monoplazas con equipos y pilotos ficticios: clasificación, carrera, paradas en boxes, DRS, radio del ingeniero, cámaras de cabina y repetición con helicóptero. Ayudas de frenado y dirección para empezar, y caja automática de 8 marchas.',
    url: 'formula-3d/apice-gp.html',
    cover: 'portal/img/apice-gp-cover.webp',
    box: 'portal/img/apice-gp-box.webp',
    alt: 'portal/img/apice-gp-alt.webp',
    hero: 'portal/img/apice-gp-hero.webp',
    color: '#ff1e3c',
    color2: '#ff8a3d',
    cats: ['carreras', 'deportes', '3d'],
    tags: ['Fórmula', 'Carreras', '3D', 'Mando'],
    badge: 'NUEVO',
    featured: true,
    controls: [
      [['↑', '↓'], 'Acelerar / frenar'],
      [['←', '→'], 'Doblar'],
      [['D'], 'DRS (en las zonas)'],
      [['C'], 'Cambiar cámara'],
      [['M'], 'Retrovisor'],
      [['R'], 'Volver a la pista'],
      [['Esc'], 'Pausa'],
    ],
    tip: 'Las teclas se cambian en Ajustes → Controles. También se juega con mando.',
    progress() {
      const s = apiceCache;
      if (!s || !s.stats) return null;
      const st = s.stats, lvl = (s.progression && s.progression.level) || 1;
      if (!st.races && lvl <= 1) return null;
      return {
        label: `Nivel ${lvl} · ${st.wins || 0} victorias`,
        pct: Math.min(1, (st.wins || 0) / 10),
        stats: [['Nivel', lvl], ['Carreras', st.races || 0], ['Victorias', st.wins || 0], ['Podios', st.podiums || 0], ['Km', Math.round(st.distanceKm || 0)]],
        flags: { wins: st.wins || 0, races: st.races || 0 },
      };
    },
  },
  {
    id: 'karting',
    title: 'Kartódromo',
    tagline: 'Karts 3D: 10 pistas, bots que pelean y 2 jugadores',
    desc: 'Carreras de karts bajo techo y al aire libre: rampas, segundos pisos y túneles. Corre contra 5 bots, gana el campeonato, pinta tu kart con acabados de oro o neón, mira la repetición con cámaras de TV y dibuja tus propias pistas.',
    url: 'karting/index.html',
    cover: 'portal/img/karting-cover.webp',
    box: 'portal/img/karting-box.webp',
    alt: 'portal/img/karting-alt.webp',
    hero: 'portal/img/karting-hero.webp',
    color: '#ff4d3d',
    color2: '#ffb020',
    cats: ['carreras', '3d', 'multi'],
    tags: ['Carreras', '3D', '2 jugadores', 'Mando'],
    badge: 'TOP',
    featured: true,
    added: '2026-10-09',
    controls: [
      [['W', '↑'], 'Acelerar'],
      [['S', '↓'], 'Frenar / reversa'],
      [['A', 'D'], 'Girar'],
      [['Espacio'], 'Freno de mano (derrape)'],
      [['C'], 'Cambiar cámara'],
      [['R'], 'Volver a la pista'],
      [['Esc'], 'Pausa'],
    ],
    tip: 'También se juega con mando. Para 2 jugadores, J2 usa las flechas y Shift derecho.',
    progress() {
      const s = readJSON('kartodromo-save-v1');
      if (!s) return null;
      let xp = s.xp || 0, lvl = 1, need = 100;
      while (xp >= need) { xp -= need; lvl++; need = 100 + (lvl - 1) * 60; }
      const st = s.stats || {};
      return {
        label: `Piloto nivel ${lvl}`,
        pct: Math.min(1, (st.wins || 0) / 10),
        stats: [['Nivel', lvl], ['Carreras', st.races || 0], ['Victorias', st.wins || 0], ['Copas', st.cups || 0], ['Monedas', s.coins || 0]],
        flags: { wins: st.wins || 0, cups: st.cups || 0, races: st.races || 0 },
      };
    },
  },
  {
    id: 'codigo-rojo',
    title: 'Código Rojo',
    tagline: 'Sé el ladrón o la policía en un barrio 3D',
    desc: 'Un barrio entero con casas, tiendas, un canal con 6 puentes, un túnel bajo el cerro, rampas, semáforos y tráfico, cerrado por paredes rojas. Escapa de 3 patrulleros o persigue al ladrón hasta llenar la barra de arresto. Cabina por dentro con relojes, nitro, derrapes que dejan marcas y 3 estrellas por misión. 14 misiones por dificultad, partida libre de día, tarde o noche, y un garaje con 6 carros.',
    url: 'codigo-rojo/index.html',
    cover: 'portal/img/codigo-rojo-cover.webp',
    box: 'portal/img/codigo-rojo-box.webp',
    alt: 'portal/img/codigo-rojo-alt.webp',
    hero: 'portal/img/codigo-rojo-hero.webp',
    color: '#ff2a3a',
    color2: '#2a6bff',
    cats: ['carreras', 'accion', '3d'],
    tags: ['Persecución', 'Policías', '3D', 'Mundo abierto'],
    badge: 'NUEVO',
    featured: true,
    added: '2026-10-11',
    controls: [
      [['↑', '↓'], 'Acelerar / frenar y reversa (W, S)'],
      [['←', '→'], 'Girar (A, D)'],
      [['Espacio'], 'Freno de mano (derrape)'],
      [['Shift'], 'Nitro (también N)'],
      [['C'], 'Cámara: atrás o cabina'],
      [['H'], 'Bocina'],
      [['R'], 'Volver a la calle'],
      [['P', 'Esc'], 'Pausa'],
    ],
    tip: 'De ladrón: los puentes y el túnel ayudan a perderlos. De policía: chócalo hasta frenarlo y quédate pegado para llenar la barra.',
    progress() {
      const s = readJSON('codigorojo_v1');
      if (!s || !s.stats || !s.stats.runs) return null;
      const done = Object.keys(s.done || {}).length, cars = (s.cars || []).length;
      return {
        label: `${done}/14 misiones · ${s.stats.wins || 0} ganadas`,
        pct: done / 14,
        stats: [['Misiones', `${done}/14`], ['Fugas', s.stats.thiefWins || 0], ['Arrestos', s.stats.copWins || 0], ['Carros', cars], ['Monedas', s.coins || 0]],
        flags: { done, thief: s.stats.thiefWins || 0, cop: s.stats.copWins || 0 },
      };
    },
  },
  {
    id: 'cornisa',
    title: 'Drive In The Serrín',
    tagline: 'Rally de montaña desde la cabina. Si te sales, pierdes',
    desc: 'Rally a fondo desde la cabina de un 4x4 por carreteras de montaña: cañón, bosque, nieve, niebla, volcán, noche y tormenta. Sigue la línea de guía (verde a fondo, roja frena), escucha al copiloto y mira el mapa GPS para las horquillas. Si te sales al abismo o chocas fuerte, pierdes. Junta monedas, mejora motor, frenos, llantas y carrocería, y abre cada montaña cumpliendo lo que pide la anterior hasta la Cima del Cóndor.',
    url: 'cornisa/index.html',
    cover: 'portal/img/cornisa-cover.webp',
    box: 'portal/img/cornisa-box.webp',
    alt: 'portal/img/cornisa-alt.webp',
    hero: 'portal/img/cornisa-hero.webp',
    color: '#ff7a2f',
    color2: '#ffc53d',
    cats: ['carreras', 'simulacion', '3d'],
    tags: ['Rally', 'Montaña', '3D', 'Cabina'],
    badge: 'NUEVO',
    featured: true,
    added: '2026-10-11',
    controls: [
      [['↑'], 'Acelerar (W)'],
      [['↓'], 'Frenar y reversa (S)'],
      [['←', '→'], 'Girar (A, D)'],
      [['C'], 'Cámara: cabina o afuera'],
      [['P', 'Esc'], 'Pausa'],
    ],
    tip: 'Frena antes de las curvas: las flechas amarillas avisan. Donde no hay baranda, el borde es el abismo.',
    progress() {
      const s = readJSON('cornisa_v1');
      if (!s || !s.stats || !s.stats.runs) return null;
      const lv = Object.values(s.lv || {});
      const done = lv.filter(l => l.done).length;
      const stars = lv.reduce((a, l) => a + (l.stars || []).filter(Boolean).length, 0);
      return {
        label: s.beat ? `¡Juego pasado! · ${stars}/24 ★` : `Montaña ${Math.min(8, done + 1)}/8 · ${stars} ★`,
        pct: s.beat ? 1 : done / 8,
        stats: [['Montañas', `${done}/8`], ['Estrellas', `${stars}/24`], ['Monedas', s.coins || 0], ['Caídas', s.stats.falls || 0]],
        flags: { done, stars, beat: s.beat ? 1 : 0 },
      };
    },
  },
  {
    id: 'combi-rush',
    title: 'Combi Rush',
    tagline: 'Maneja una combi por Lima y llena tus asientos',
    desc: 'Recoge pasajeros en los paraderos, llévalos a tiempo, esquiva huecos y conos, respeta la roja y no los hagas enojar. 16 viajes por Lima (La Punta, Túpac Amaru, Miraflores de noche y más), una flota de 4 vehículos hasta el micro de 40 pasajeros y radio con cumbia, chicha y salsa.',
    url: 'combi-rush/combi-rush.html',
    cover: 'portal/img/combi-rush-cover.webp',
    box: 'portal/img/combi-rush-box.webp',
    alt: 'portal/img/combi-rush-alt.webp',
    hero: 'portal/img/combi-rush-hero.webp',
    color: '#ff2d8a',
    color2: '#ffd23f',
    cats: ['carreras', 'simulacion', '3d'],
    tags: ['Manejo', 'Lima', '3D', 'Celular'],
    badge: 'ACTUALIZADO',
    featured: true,
    controls: [
      [['↑', '↓'], 'Acelerar y frenar (W, S)'],
      [['←', '→'], 'Cambiar de carril (A, D)'],
      [['H'], 'Bocina'],
      [['R'], 'Cambiar de emisora en la radio'],
      [['M'], 'Mapa de la ruta'],
      [['P'], 'Pausa'],
    ],
    tip: 'En las curvas la combi se abre: frena antes y gira hacia adentro.',
    progress() {
      const s = readJSON('combirush_v1');
      if (!s) return null;
      const st = s.stats || {};
      if (!st.trips && !s.money) return null;
      return {
        label: `${st.trips || 0} viajes · S/ ${Math.round(s.money || 0).toLocaleString('es-PE')}`,
        pct: Math.min(1, (st.trips || 0) / 30),
        stats: [['Viajes', st.trips || 0], ['Plata', 'S/ ' + Math.round(s.money || 0).toLocaleString('es-PE')], ['Récord a bordo', st.maxOn || 0]],
        flags: { trips: st.trips || 0 },
      };
    },
  },
  {
    id: 'fuga-urbana',
    title: 'Fuga Urbana',
    tagline: 'Derrapa, esquiva y escapa de la policía',
    desc: 'La policía te busca desde que arrancas: aguanta el mayor tiempo posible. Derrapa para cargar el turbo, agarra power-ups en la pista (nitro, plata, escudo y pintura que despista a la policía) y sobrevive a patrullas, bloqueos, clavos y helicópteros. 12 carros para ganar en el garaje.',
    url: 'fuga-urbana/index.html',
    cover: 'portal/img/fuga-urbana-cover.webp',
    box: 'portal/img/fuga-urbana-box.webp',
    alt: 'portal/img/fuga-urbana-alt.webp',
    color: '#ffb800',
    color2: '#ff3d71',
    cats: ['carreras', 'accion'],
    tags: ['Persecución', 'Acción', 'Celular'],
    badge: 'ACTUALIZADO',
    controls: [
      [['↑'], 'Avanzar'],
      [['←', '→'], 'Girar (a buena velocidad, derrapar)'],
      [['↓'], 'Frenar y reversa'],
      [['Espacio'], 'Turbo'],
      [['P'], 'Pausa'],
    ],
    tip: 'También sirven W A S D. En el celular hay botones en pantalla.',
    progress() {
      const s = readJSON('fuga-urbana-v1');
      if (!s || (!s.best && !s.xp)) return null;
      const cars = Array.isArray(s.unlocked) ? s.unlocked.length : 1;
      return {
        label: `Récord ${Math.round(s.best || 0).toLocaleString('es-PE')} · ${cars} carros`,
        pct: Math.min(1, cars / 10),
        stats: [['Récord', Math.round(s.best || 0).toLocaleString('es-PE')], ['Carros', cars], ['Monedas', s.coins || 0]],
        flags: { best: s.best || 0, cars },
      };
    },
  },
  {
    id: 'sazon',
    title: 'Sazón Tycoon',
    tagline: 'De huarique de barrio a cadena de restaurantes en Lima',
    desc: 'Atiende mesas, contrata mozos y cocineros, arma tu carta criolla de 17 platos y haz crecer tu local hasta tener varios pisos, drive-thru y delivery. Abre locales en Miraflores, Barranco y Gamarra y sobrevive a apagones, críticos de incógnito y partidos de la selección.',
    url: 'sazon-tycoon/index.html',
    cover: 'portal/img/sazon-cover.webp',
    box: 'portal/img/sazon-box.webp',
    alt: 'portal/img/sazon-alt.webp',
    hero: 'portal/img/sazon-hero.webp',
    color: '#ff7a1a',
    color2: '#ffd23f',
    cats: ['simulacion', '3d'],
    tags: ['Tycoon', 'Simulación', '3D', 'Celular'],
    badge: 'ACTUALIZADO',
    featured: true,
    added: '2026-09-20',
    controls: [
      [['W', 'A', 'S', 'D'], 'Caminar'],
      [['Clic'], 'Ir a un lugar / comprar'],
      [['Arrastrar'], 'Girar la cámara'],
      [['Rueda'], 'Acercar y alejar'],
    ],
    tip: 'En celular: toca para caminar, arrastra para girar y pellizca para hacer zoom.',
    progress() {
      const s = readJSON('sazon_tycoon_v1');
      if (!s || !s.started) return null;
      const locales = Array.isArray(s.chain) ? s.chain.length : 1;
      return {
        label: `Día ${s.day || 1} · S/ ${Math.round(s.money || 0).toLocaleString('es-PE')}`,
        pct: Math.min(1, (s.level || 1) / 20),
        stats: [['Día', s.day || 1], ['Plata', 'S/ ' + Math.round(s.money || 0).toLocaleString('es-PE')], ['Fama', s.level || 1], ['Locales', locales], ['Calificación', (s.rating || 0).toFixed(1) + ' ★']],
        flags: { day: s.day || 1, locales },
      };
    },
  },  {
    id: 'futbol',
    title: 'Modo Carrera Fútbol',
    tagline: 'Vive la carrera de un futbolista, de los 16 a los 40',
    desc: 'Empiezas en un club peruano y cada semana decides cómo entrenar, descansar o salir de fiesta. Fichajes, contratos, selección, casa, carros y familia en escenas 3D. Al retirarte recibes un puntaje de carrera del 1 al 100.',
    url: 'modo-carrera-futbol/index.html',
    cover: 'portal/img/futbol-cover.webp',
    box: 'portal/img/futbol-box.webp',
    alt: 'portal/img/futbol-alt.webp',
    color: '#22c55e',
    color2: '#facc15',
    cats: ['deportes', 'simulacion', '3d'],
    tags: ['Fútbol', 'Carrera', 'Decisiones', '3D'],
    badge: '',
    controls: [
      [['Clic'], 'Elegir cómo vivir la semana'],
      [['Clic'], 'Decidir en cada evento'],
    ],
    tip: 'Una temporada dura unos 25 minutos. Los partidos se juegan solos según tus decisiones.',
    progress() {
      const c = readJSON('mcf_save_v1'), hall = readJSON('mcf_hall_v1');
      const done = Array.isArray(hall) ? hall.length : 0;
      if (!c && !done) return null;
      const best = done ? Math.max(...hall.map(h => h.score || 0)) : 0;
      const live = c && !c.done;
      return {
        label: live ? `Temporada ${c.season || 1} · ${c.age || 16} años` : `${done} carreras · mejor ${best}`,
        pct: live ? Math.min(1, ((c.age || 16) - 16) / 24) : 1,
        stats: [...(live ? [['Temporada', c.season || 1], ['Edad', c.age || 16], ['Media', c.ovr || '—']] : []), ['Carreras', done], ['Mejor puntaje', best || '—']],
        flags: { careers: done },
      };
    },
  },
  {
    id: 'tower-defense',
    title: 'Reino en Guardia',
    tagline: 'Tower defense contra la horda zombi',
    desc: 'Construye torres, sube a tu héroe y aguanta 20 oleadas de zombis con minijefes y jefes en 4 mapas: pradera de noche, cañón con tormentas de arena, fragua volcánica y un glaciar con ventiscas que congelan torres. Misiones diarias, logros, rangos, modo infinito y desafíos.',
    url: 'tower-defense/index.html',
    cover: 'portal/img/tower-defense-cover.webp',
    box: 'portal/img/tower-defense-box.webp',
    alt: 'portal/img/tower-defense-alt.webp',
    color: '#f59e0b',
    color2: '#ef4444',
    cats: ['estrategia', 'accion'],
    tags: ['Tower defense', 'Estrategia', 'Zombis'],
    badge: 'ACTUALIZADO',
    controls: [
      [['1', '…', '9'], 'Elegir torre'],
      [['N'], 'Iniciar o adelantar oleada'],
      [['U', 'V'], 'Mejorar / vender'],
      [['H'], 'Héroe'],
      [['Q', 'W', 'E', 'R'], 'Habilidades'],
      [['F'], 'Velocidad'],
      [['Espacio'], 'Pausa'],
    ],
    tip: 'Clic derecho o Esc cancela. Llama la oleada antes de tiempo para ganar más.',
    progress() {
      const s = readJSON('reino-en-guardia-perfil-v1');
      if (!s) return null;
      const st = s.stats || {};
      const stars = Object.values(s.stars || {}).reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0);
      if (!st.games && (s.level || 1) <= 1) return null;
      return {
        label: `Nivel ${s.level || 1} · ${st.wins || 0} victorias`,
        pct: Math.min(1, (s.level || 1) / 30),
        stats: [['Nivel', s.level || 1], ['Victorias', st.wins || 0], ['Zombis', (st.kills || 0).toLocaleString('es-PE')], ['Estrellas', stars], ['Medallas', s.medals || 0]],
        flags: { wins: st.wins || 0 },
      };
    },
  },
  {
    id: 'escalada',
    title: "Don't Look Up",
    tagline: '1000 metros de escalada. No mires abajo',
    desc: 'Salta, rebota en trampolines y agárrate de apoyos que se mueven, se rompen o resbalan para subir 6 cumbres. Junta monedas para la tienda de colores, gorros y estelas, y juega con amigos por internet en salas compartidas.',
    url: 'escalada/index.html',
    cover: 'portal/img/escalada-cover.webp',
    box: 'portal/img/escalada-box.webp',
    alt: 'portal/img/escalada-alt.webp',
    color: '#38bdf8',
    color2: '#ffd700',
    cats: ['accion', 'plataformas', 'multi'],
    tags: ['Plataformas', 'Online', 'Difícil'],
    badge: '',
    controls: [
      [['←', '→'], 'Moverte (A, D)'],
      [['↑', 'Espacio'], 'Saltar (W)'],
      [['↑', '↑'], 'Doble salto en el aire'],
      [['Tab'], 'Mapa del nivel'],
    ],
    tip: 'Cada cumbre es un checkpoint. Los atajos ahorran altura pero son más difíciles.',
    progress() {
      const s = readJSON('dontlookup.v1');
      if (!s || !(s.altura > 0)) return null;
      return {
        label: s.completado ? '¡Cumbre final! · ' + Math.round(s.altura) + ' m' : `Mejor altura ${Math.round(s.altura)} m`,
        pct: Math.min(1, s.altura / 1000),
        stats: [['Mejor altura', Math.round(s.altura) + ' m'], ['Puntos', s.puntos || 0], ['Completado', s.completado ? 'Sí' : 'No']],
        flags: { done: s.completado ? 1 : 0, alt: s.altura },
      };
    },
  },
  {
    id: 'mind-escape',
    title: 'Mind Escape',
    tagline: '30 desafíos, 1 salida',
    desc: 'Acertijos, códigos ocultos, interruptores, sudokus, cables y habitaciones a oscuras. Cada nivel es un puzzle distinto y sólo hay una forma de salir. Usa las pistas si te trabas, pero cuestan estrellas.',
    url: 'mind-escape/index.html',
    cover: 'portal/img/mind-escape.svg',
    box: 'portal/img/mind-escape-box.webp',
    alt: 'portal/img/mind-escape-alt.webp',
    hero: 'portal/img/mind-escape.svg',
    color: '#00d4ff',
    color2: '#7c3aed',
    cats: ['puzzles'],
    tags: ['Puzzles', 'Lógica', 'Acertijos'],
    badge: '',
    added: '2026-09-01',
    needsServer: true,
    controls: [
      [['Clic'], 'Tocar, arrastrar y conectar'],
      [['Teclado'], 'Escribir los códigos'],
      [['Pista'], 'Ayuda progresiva (cuesta estrellas)'],
    ],
    tip: 'Las estrellas dependen del tiempo y de las pistas que uses.',
    progress() {
      const s = readJSON('mindEscape_progress');
      if (!s) return null;
      const done = (s.completedLevels || []).length;
      const stars = Object.values(s.levelData || {}).reduce((a, l) => a + (l.stars || 0), 0);
      if (!done && !s.totalPlayTime) return null;
      return {
        label: `${done}/30 niveles · ${stars}★`,
        pct: done / 30,
        stats: [['Niveles', `${done}/30`], ['Estrellas', `${stars}/90`]],
        flags: { done, stars },
      };
    },
  },
  {
    id: 'brujula-politica',
    title: 'Brújula Política',
    tagline: '60 preguntas para descubrir tu ideología',
    desc: 'Responde 60 frases sobre economía, libertad, delitos y castigos, sociedad, el mundo, el planeta y la guerra. Al final ves tu ideología entre 16 (de comunismo a anarcocapitalismo), tu lado político de extrema izquierda a extrema derecha, tus 6 ejes, una brújula y los pensadores con los que más coincides, en una tarjeta con tu nombre.',
    url: 'brujula-politica/index.html',
    cover: 'portal/img/brujula-cover.webp',
    box: 'portal/img/brujula-politica-box.webp',
    alt: 'portal/img/brujula-alt.webp',
    hero: 'portal/img/brujula-hero.webp',
    color: '#14b8a6',
    color2: '#6366f1',
    cats: ['tests'],
    tags: ['Test', 'Política', 'Ideologías'],
    badge: 'NUEVO',
    added: '2026-10-11',
    controls: [
      [['Clic'], 'Elegir qué tan de acuerdo estás'],
      [['1', '…', '5'], 'Responder con el teclado'],
      [['←'], 'Volver a la pregunta anterior'],
    ],
    tip: 'No hay respuestas buenas ni malas. Si sales a la mitad, sigues donde te quedaste.',
    progress() {
      const s = readJSON('brujula_politica_v1');
      const h = s && Array.isArray(s.history) ? s.history : [];
      const done = s && Array.isArray(s.answers) ? s.answers.filter(v => v !== null && v !== undefined).length : 0;
      if (!h.length && !done) return null;
      const last = h[h.length - 1];
      return {
        label: last ? `${last.lado} · ${last.pct}%` : `Test a la mitad · ${done}/60`,
        pct: last ? 1 : done / 60,
        stats: [['Tests', h.length], ...(last ? [['Lado', last.lado], ['Compatibilidad', last.pct + '%']] : [['Respondidas', `${done}/60`]])],
        flags: { tests: h.length },
      };
    },
  },];

// Novedades que se muestran en el inicio (la más nueva primero).
const NEWS = [
  { game: 'brujula-politica', date: '11 oct', title: 'Juego nuevo: Brújula Política', items: ['60 preguntas sobre economía, libertad, delitos y castigos, sociedad, el mundo, el planeta y la guerra', '16 ideologías y tu lado, de extrema izquierda a extrema derecha', 'Tarjeta de resultado con tu nombre, tus 6 ejes y una brújula'] },
  { game: 'codigo-rojo', date: '11 oct', title: 'Código Rojo: cabina, nitro y estrellas', items: ['Cabina por dentro con relojes, volante y mapa', 'Nitro, marcas de llantas, humo y fuego', 'Garaje en vitrina, 3 estrellas por misión y patrulleros más listos'] },
  { game: 'codigo-rojo', date: '11 oct', title: 'Código Rojo se ve como juego profesional', items: ['Carros nuevos con reflejos, faros y brillo', 'Barrio con más detalle: casas, carros estacionados, postes y nubes', 'Menú y velocímetro nuevos'] },
  { game: 'codigo-rojo', date: '11 oct', title: 'Juego nuevo: Código Rojo', items: ['Barrio 3D con puentes, túnel, rampas, semáforos y tráfico', 'Sé el ladrón contra 3 patrulleros o la policía', '14 misiones, partida libre y garaje con 6 carros'] },
  { game: 'cornisa', date: '11 oct', title: 'Juego nuevo: Drive In The Serrín', items: ['Rally desde la cabina por 8 montañas con horquillas', 'Línea de guía, copiloto y mapa GPS', 'Si te sales o chocas fuerte, pierdes (con caída o choque animado)', 'Taller de mejoras, pinturas, insignias y Ruta libre al pasarte el juego'] },
  { game: 'tower-defense', date: '10 oct', title: 'Reino en Guardia: Glaciar Maldito', items: ['Cuarto mapa entre pinos y hielo, con nieve cayendo', 'Ventiscas que congelan torres', 'Jefe nuevo: Yeti Zombi, y el desafío Deshielo'] },
  { game: 'sazon', date: '10 oct', title: 'Sazón Tycoon: carta criolla', items: ['5 platos nuevos: emoliente, suspiro, arroz con pato, rocoto relleno y parihuela', 'Evento Día de la Canción Criolla: más propina y antojo de anticuchos'] },
  { game: 'combi-rush', date: '10 oct', title: 'Combi Rush, versión 4', items: ['4 viajes nuevos: La Punta, Túpac Amaru, Noche en Miraflores y la ruta más larga', 'Combi Sprinter y Micro chosicano de 40 pasajeros', 'Radio con Cumbia Total, Chicha Andina y Salsa Brava (tecla R)'] },
  { game: 'fuga-urbana', date: '10 oct', title: 'Fuga Urbana: power-ups', items: ['Cajas en la pista: nitro, plata, escudo y pintura', 'La pintura cambia tu color y la policía pierde tu rastro', '2 carros nuevos: La Chatarra y Fantasma'] },
  { game: 'apice-gp', date: '10 oct', title: 'Ápice GP en el portal', items: ['Tu nivel y tus victorias ya aparecen en su ficha', 'Insignia nueva: Bandera a cuadros'] },
];

const CATS = [
  { id: 'todos', name: 'Todos', icon: 'grid' },
  { id: 'carreras', name: 'Carreras', icon: 'flag' },
  { id: 'accion', name: 'Acción', icon: 'bolt' },
  { id: 'simulacion', name: 'Simulación', icon: 'chef' },
  { id: 'deportes', name: 'Deportes', icon: 'trophy' },
  { id: 'estrategia', name: 'Estrategia', icon: 'shield' },
  { id: 'plataformas', name: 'Plataformas', icon: 'up' },
  { id: 'puzzles', name: 'Puzzles', icon: 'puzzle' },
  { id: 'tests', name: 'Tests', icon: 'compass' },
  { id: '3d', name: '3D', icon: 'cube' },
  { id: 'multi', name: 'Multijugador', icon: 'users' },
  { id: 'favs', name: 'Favoritos', icon: 'heart' },
];

const gameById = id => GAMES.find(g => g.id === id);

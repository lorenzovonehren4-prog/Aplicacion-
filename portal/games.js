'use strict';
// Catálogo de Anonymous Games. Para sumar un juego nuevo basta con agregarlo aquí
// (carpeta propia con su index.html y una portada en portal/img/).
//
// progress(): lee el guardado que el propio juego deja en localStorage (mismo origen)
// para mostrar en el portal cuánto llevas. Si el juego cambia el formato, sólo hay
// que tocar esa función.

const readJSON = key => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } };

const GAMES = [
  {
    id: 'karting',
    title: 'Kartódromo',
    tagline: 'Karts 3D: 10 pistas, bots que pelean y 2 jugadores',
    desc: 'Carreras de karts bajo techo y al aire libre: rampas, segundos pisos y túneles. Corre contra 5 bots, gana el campeonato, pinta tu kart con acabados de oro o neón, mira la repetición con cámaras de TV y dibuja tus propias pistas.',
    url: 'karting/index.html',
    cover: 'portal/img/karting-cover.webp',
    alt: 'portal/img/karting-alt.webp',
    hero: 'portal/img/karting-hero.webp',
    color: '#ff4d3d',
    color2: '#ffb020',
    cats: ['carreras', '3d', 'dos'],
    tags: ['Carreras', '3D', '2 jugadores', 'Mando'],
    badge: 'NUEVO',
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
    id: 'sazon',
    title: 'Sazón Tycoon',
    tagline: 'De huarique de barrio a cadena de restaurantes en Lima',
    desc: 'Atiende mesas, contrata mozos y cocineros, arma tu carta criolla y haz crecer tu local hasta tener varios pisos, drive-thru y delivery. Abre locales en Miraflores, Barranco y Gamarra y sobrevive a apagones, críticos de incógnito y partidos de la selección.',
    url: 'sazon-tycoon/index.html',
    cover: 'portal/img/sazon-cover.webp',
    alt: 'portal/img/sazon-alt.webp',
    hero: 'portal/img/sazon-hero.webp',
    color: '#ff7a1a',
    color2: '#ffd23f',
    cats: ['simulacion', '3d'],
    tags: ['Tycoon', 'Simulación', '3D', 'Celular'],
    badge: 'TOP',
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
  },
  {
    id: 'mind-escape',
    title: 'Mind Escape',
    tagline: '30 desafíos, 1 salida',
    desc: 'Acertijos, códigos ocultos, interruptores, sudokus, cables y habitaciones a oscuras. Cada nivel es un puzzle distinto y sólo hay una forma de salir. Usa las pistas si te trabas, pero cuestan estrellas.',
    url: 'mind-escape/index.html',
    cover: 'portal/img/mind-escape.svg',
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
];

// Huecos misteriosos de la cuadrícula: lo que viene.
const SOON = [
  { id: 'soon-1', title: 'Proyecto R', hint: 'Plataformas · 2027', color: '#22d3ee' },
  { id: 'soon-2', title: 'Clasificado', hint: 'Multijugador', color: '#ff3d71' },
  { id: 'soon-3', title: '???', hint: 'Pronto', color: '#a78bfa' },
  { id: 'soon-4', title: 'Archivo 404', hint: 'Terror', color: '#34d399' },
];

const CATS = [
  { id: 'todos', name: 'Todos', icon: 'grid' },
  { id: 'carreras', name: 'Carreras', icon: 'flag' },
  { id: 'simulacion', name: 'Simulación', icon: 'chef' },
  { id: 'puzzles', name: 'Puzzles', icon: 'puzzle' },
  { id: '3d', name: '3D', icon: 'cube' },
  { id: 'dos', name: '2 jugadores', icon: 'users' },
  { id: 'favs', name: 'Favoritos', icon: 'heart' },
];

const gameById = id => GAMES.find(g => g.id === id);

/* =====================================================================
 * config.js — TODOS los valores de balance del juego.
 *
 * Unidades:
 *   - Distancias y alcances en CASILLAS (se convierten a píxeles en código).
 *   - Velocidades de enemigos/proyectiles en casillas por segundo.
 *   - "rate" = ataques por segundo.
 *
 * Para añadir una torre nueva: agrega una entrada en CONFIG.towers
 * (usando un "behavior" existente) y, si necesita una mecánica nueva,
 * registra su comportamiento en towers.js (objeto BEHAVIORS).
 * ===================================================================== */
window.TD = window.TD || {};

TD.CONFIG = {
  // ---------------------------------------------------------------
  // Cuadrícula y lienzo
  // ---------------------------------------------------------------
  grid: { cols: 20, rows: 12, cell: 48 },

  // Delta time máximo por fotograma (evita saltos al cambiar de pestaña)
  maxDelta: 0.05,

  // Velocidades disponibles del juego
  speeds: [1, 1.5, 2, 3],

  // Porcentaje devuelto al vender (compra + mejoras)
  sellRatio: 0.7,

  // Nivel máximo de las torres
  maxTowerLevel: 5,

  // Coste de cada mejora = coste de la torre × factor (niveles 2..5)
  upgradeCostFactors: [0.8, 1.3, 2.1, 3.4],

  // Recompensa al terminar una oleada: base + por número de oleada
  waveBonus: { base: 20, perWave: 4 },

  // Plata extra por adelantar una oleada: base + por número de oleada.
  // Solo se puede adelantar UNA vez mientras dura la oleada en curso.
  earlyCallBonus: { base: 10, perWave: 3 },

  // Segundos de preparación entre oleadas (empieza sola al terminar la cuenta)
  prepTime: 10,
  // Plata por cada segundo de preparación que te saltes
  prepSkipBonus: 2,

  // Crecimiento de la vida de los enemigos por oleada (+10% por oleada)
  hpGrowthPerWave: 0.1,

  // Racha de bajas: eliminaciones en poco tiempo dan plata extra
  killStreak: { window: 1.2, minKills: 5, bonusPerKill: 1 },

  // Colores por categoría de torre
  categories: {
    terrestre: { name: 'Terrestres', icon: '🦶', color: '#c97b3d' },
    aerea:     { name: 'Antiaéreas', icon: '🪽', color: '#4f8fd6' },
    mixta:     { name: 'Mixtas',     icon: '⚖️', color: '#8e6fd1' },
    deteccion: { name: 'Detección',  icon: '👁️', color: '#2fb3a3' },
    apoyo:     { name: 'Apoyo',      icon: '🛡️', color: '#6fb8e8' },
    economia:  { name: 'Economía',   icon: '💰', color: '#e0b23a' }
  },

  // ---------------------------------------------------------------
  // Dificultades
  // ---------------------------------------------------------------
  difficulties: {
    aprendiz: { name: 'Aprendiz', icon: '🟢', lives: 30, money: 260, hpMul: 0.95, speedMul: 0.9,  waveBonusMul: 1.5,  scoreMul: 1.0, xpMul: 0.8, medalMul: 1 },
    guardian: { name: 'Guardián', icon: '🟡', lives: 20, money: 220, hpMul: 1.2,  speedMul: 1.0,  waveBonusMul: 1.0,  scoreMul: 1.5, xpMul: 1.0, medalMul: 2 },
    leyenda:  { name: 'Leyenda',  icon: '🔴', lives: 10, money: 200, hpMul: 1.7,  speedMul: 1.1,  waveBonusMul: 0.75, scoreMul: 2.2, xpMul: 1.5, medalMul: 3 }
  },

  // Estrellas según el porcentaje de vidas conservadas al ganar
  stars: { three: 0.85, two: 0.5 },

  // ---------------------------------------------------------------
  // Mapas. Coordenadas en casillas [columna, fila].
  // path: puntos de paso del camino terrestre (el primero y el último fuera del mapa).
  // airPath: ruta de los voladores (opcional; por defecto, línea recta).
  // blocked: casillas donde no se puede construir (decoración).
  // special: casillas con efecto (fértil / lava).
  // ---------------------------------------------------------------
  maps: [
    {
      id: 'pradera',
      name: 'Pradera del Molino',
      icon: '🌾',
      desc: 'Camino largo en S. Tierra fértil: las granjas producen +50%. Algunas oleadas llegan de noche.',
      hpMul: 1.0,
      boss: 'granjero',
      palette: { grass: '#5d9c45', grass2: '#67a84e', path: '#c9a86a', pathEdge: '#a8854a', deco: '#3f7a2e' },
      path: [[-1, 2], [3, 2], [3, 9], [8, 9], [8, 2], [13, 2], [13, 9], [17, 9], [17, 5], [20, 5]],
      airPath: [[-1, 2], [6, 6.5], [13, 6.5], [20, 5]],
      blocked: [
        { c: 10, r: 5, type: 'molino' }, { c: 10, r: 6, type: 'molino' },
        { c: 0, r: 10, type: 'arbol' }, { c: 1, r: 11, type: 'arbol' }, { c: 6, r: 0, type: 'arbol' },
        { c: 19, r: 0, type: 'arbol' }, { c: 18, r: 11, type: 'arbol' }, { c: 15, r: 0, type: 'arbol' },
        { c: 5, r: 11, type: 'cerca' }, { c: 6, r: 11, type: 'cerca' }, { c: 7, r: 11, type: 'cerca' }
      ],
      special: [
        { c: 5, r: 5, type: 'fertil' }, { c: 6, r: 5, type: 'fertil' }, { c: 5, r: 6, type: 'fertil' }, { c: 6, r: 6, type: 'fertil' },
        { c: 15, r: 6, type: 'fertil' }, { c: 15, r: 7, type: 'fertil' }, { c: 11, r: 10, type: 'fertil' }, { c: 11, r: 11, type: 'fertil' }
      ],
      // Evento: noche (alcance −25% salvo torres cubiertas por un Radar)
      event: { type: 'noche', waves: [5, 9, 14, 19], rangeMul: 0.75 }
    },
    {
      id: 'canon',
      name: 'Cañón Escarlata',
      icon: '🏜️',
      desc: 'Zigzag entre rocas: menos espacio para construir. Tormentas de arena reducen la cadencia.',
      hpMul: 1.1,
      boss: 'escorpion',
      palette: { grass: '#d9a066', grass2: '#e0ab74', path: '#f1d3a0', pathEdge: '#c89660', deco: '#9c4a2f' },
      path: [[-1, 6], [4, 6], [4, 1], [8, 1], [8, 10], [12, 10], [12, 3], [16, 3], [16, 8], [20, 8]],
      airPath: [[-1, 6], [6, 4.5], [13, 7.5], [20, 8]],
      blocked: [
        { c: 1, r: 1, type: 'roca' }, { c: 2, r: 2, type: 'roca' }, { c: 1, r: 9, type: 'roca' }, { c: 2, r: 10, type: 'cactus' },
        { c: 6, r: 4, type: 'roca' }, { c: 6, r: 7, type: 'cactus' }, { c: 10, r: 1, type: 'roca' }, { c: 10, r: 6, type: 'roca' },
        { c: 11, r: 7, type: 'cactus' }, { c: 14, r: 0, type: 'roca' }, { c: 14, r: 10, type: 'roca' }, { c: 18, r: 2, type: 'cactus' },
        { c: 18, r: 11, type: 'roca' }, { c: 14, r: 6, type: 'roca' }, { c: 0, r: 4, type: 'cactus' }, { c: 19, r: 5, type: 'roca' }
      ],
      special: [],
      // Evento: tormenta de arena (cadencia ×0.6 durante unos segundos)
      event: { type: 'tormenta', chance: 0.45, duration: 8, rateMul: 0.6 }
    },
    {
      id: 'fragua',
      name: 'Fragua Volcánica',
      icon: '🌋',
      desc: 'Curvas cerradas y ríos de lava. Las torres junto a la lava disparan +15% más rápido, pero las erupciones aturden torres.',
      hpMul: 1.15,
      boss: 'dragon',
      palette: { grass: '#3b3440', grass2: '#443c4a', path: '#6b5d59', pathEdge: '#4a3f3c', deco: '#ff6a1f' },
      path: [[-1, 1], [6, 1], [6, 5], [2, 5], [2, 10], [10, 10], [10, 3], [14, 3], [14, 8], [17, 8], [17, 2], [20, 2]],
      airPath: [[-1, 1], [5, 7], [12, 6], [20, 2]],
      blocked: [
        { c: 4, r: 3, type: 'lava' }, { c: 5, r: 3, type: 'lava' }, { c: 4, r: 7, type: 'lava' }, { c: 5, r: 7, type: 'lava' },
        { c: 6, r: 7, type: 'lava' }, { c: 7, r: 7, type: 'lava' }, { c: 12, r: 6, type: 'lava' }, { c: 12, r: 7, type: 'lava' },
        { c: 12, r: 8, type: 'lava' }, { c: 19, r: 7, type: 'lava' }, { c: 19, r: 8, type: 'lava' }, { c: 19, r: 9, type: 'lava' },
        { c: 0, r: 8, type: 'roca' }, { c: 8, r: 0, type: 'roca' }, { c: 15, r: 11, type: 'roca' }
      ],
      special: [],
      lavaRateBonus: 0.15,
      // Evento: erupción (una roca aturde una torre al azar)
      event: { type: 'erupcion', interval: 22, warning: 2, stun: 3 }
    }
  ],

  // ---------------------------------------------------------------
  // Enemigos (zombis)
  //   hp, speed (casillas/s), reward (plata), lives (vidas que quita),
  //   radius (casillas), air/hidden/armor, habilidades opcionales.
  // ---------------------------------------------------------------
  enemies: {
    zombi:          { name: 'Zombi', icon: '🧟',           hp: 26,  speed: 1.25, reward: 4,  lives: 1, radius: 0.28, color: '#7fb36a', desc: 'El clásico. Lento y torpe.' },
    corredor:       { name: 'Corredor', icon: '🏃',        hp: 20,  speed: 2.3,  reward: 5,  lives: 1, radius: 0.24, color: '#c6d86b', desc: 'Muy rápido, poca vida.' },
    mole:           { name: 'Mole', icon: '🦍',            hp: 170, speed: 0.65, reward: 14, lives: 2, radius: 0.4,  color: '#5e7d57', desc: 'Tanque enorme y lento.' },
    antidisturbios: { name: 'Antidisturbios', icon: '🛡️',  hp: 80,  speed: 1.0,  reward: 10, lives: 1, radius: 0.3,  color: '#6f8fa8', armor: 4, desc: 'Blindado: resta 4 de daño a cada golpe.' },
    mutante:        { name: 'Mutante', icon: '🧬',         hp: 75,  speed: 1.05, reward: 10, lives: 1, radius: 0.3,  color: '#b05fc4', regen: 5, desc: 'Se regenera constantemente.' },
    hinchado:       { name: 'Hinchado', icon: '🎈',        hp: 60,  speed: 0.9,  reward: 7,  lives: 1, radius: 0.36, color: '#a3b84a', splitInto: { type: 'rata', count: 3 }, desc: 'Al morir revienta en 3 ratas.' },
    rata:           { name: 'Rata', icon: '🐀',            hp: 12,  speed: 2.0,  reward: 2,  lives: 1, radius: 0.16, color: '#8d7b6a', desc: 'Pequeña; llega en enjambres.' },
    chaman:         { name: 'Chamán', icon: '🔮',          hp: 65,  speed: 1.0,  reward: 13, lives: 1, radius: 0.3,  color: '#d06c6c', healer: { radius: 1.8, hps: 7 }, desc: 'Cura a los zombis cercanos.' },
    fantasma:       { name: 'Fantasma', icon: '👻',        hp: 40,  speed: 1.4,  reward: 9,  lives: 1, radius: 0.27, color: '#cfd8e6', hidden: true, desc: 'Camuflado: solo lo ven las torres de detección o con Radar.' },
    acechador:      { name: 'Acechador', icon: '🥷',       hp: 110, speed: 1.0,  reward: 16, lives: 2, radius: 0.32, color: '#8b95a8', hidden: true, armor: 3, desc: 'Camuflado y blindado.' },
    cuervo:         { name: 'Cuervo', icon: '🐦',          hp: 28,  speed: 1.8,  reward: 6,  lives: 1, radius: 0.24, color: '#3a3a4a', air: true, desc: 'Volador rápido. Vuela en línea recta.' },
    murcielago:     { name: 'Murciélago', icon: '🦇',      hp: 26,  speed: 2.1,  reward: 8,  lives: 1, radius: 0.22, color: '#6b4f7a', air: true, hidden: true, desc: 'Volador y camuflado.' },
    buitre:         { name: 'Buitre Blindado', icon: '🦅', hp: 140, speed: 0.85, reward: 16, lives: 2, radius: 0.36, color: '#7a6a5a', air: true, armor: 3, desc: 'Volador tanque con blindaje.' },
    portador:       { name: 'Portador', icon: '🪂',        hp: 95,  speed: 0.85, reward: 14, lives: 2, radius: 0.36, color: '#9c7ab8', air: true, spawnOnDeath: { type: 'zombi', count: 4 }, desc: 'Al morir suelta 4 zombis en el camino.' },

    // --- Jefes (uno por mapa) ---
    granjero:  { name: 'Zombi Granjero Gigante', icon: '👨‍🌾', hp: 3200, speed: 0.5,  reward: 300, lives: 20, radius: 0.62, color: '#6d9a4f', armor: 2, boss: true,
                 enrage: { at: 0.5, speedMul: 1.8 }, desc: 'Jefe de la Pradera. Al quedar a media vida, embiste.' },
    escorpion: { name: 'Escorpión Mutante', icon: '🦂',      hp: 3600, speed: 0.5,  reward: 320, lives: 20, radius: 0.62, color: '#c4532e', armor: 3, boss: true,
                 summon: { type: 'corredor', count: 3, every: 6 }, cloak: { every: 9, duration: 3 }, desc: 'Jefe del Cañón. Invoca crías y se camufla por momentos.' },
    dragon:    { name: 'Dragón de Lava', icon: '🐉',         hp: 4200, speed: 0.42, reward: 350, lives: 20, radius: 0.66, color: '#e2572b', armor: 5, boss: true, air: true,
                 regen: 12, slowResist: 0.5, desc: 'Jefe de la Fragua. Volador, blindado, se regenera y resiste el frío.' }
  },

  // Oleada 10: minijefe (el jefe del mapa con esta fracción de vida)
  miniBossHpFactor: 0.3,

  // ---------------------------------------------------------------
  // Oleadas (20). Cada grupo: [tipo, cantidad, intervalo(s), retraso inicial(s)]
  // 'BOSS' = jefe del mapa; 'MINIBOSS' = jefe con vida reducida.
  // ---------------------------------------------------------------
  waves: [
    [['zombi', 10, 1.0, 0]],
    [['zombi', 12, 0.8, 0], ['corredor', 4, 1.0, 6]],
    [['zombi', 12, 0.7, 0], ['corredor', 8, 0.6, 4]],
    [['zombi', 14, 0.6, 0], ['mole', 3, 2.5, 5]],
    [['antidisturbios', 6, 1.2, 0], ['zombi', 12, 0.6, 2], ['rata', 10, 0.25, 8]],
    [['cuervo', 8, 1.0, 0], ['zombi', 16, 0.5, 2]],
    [['hinchado', 6, 1.4, 0], ['corredor', 12, 0.5, 3]],
    [['fantasma', 8, 1.0, 0], ['zombi', 20, 0.45, 1]],
    [['mutante', 8, 1.0, 0], ['chaman', 3, 2.5, 3], ['mole', 4, 2.0, 6]],
    [['MINIBOSS', 1, 1, 0], ['zombi', 20, 0.5, 2], ['cuervo', 8, 0.8, 6]],
    [['buitre', 4, 2.0, 0], ['cuervo', 12, 0.6, 2], ['antidisturbios', 8, 0.9, 4]],
    [['murcielago', 8, 0.9, 0], ['fantasma', 10, 0.7, 3], ['corredor', 15, 0.4, 5]],
    [['portador', 5, 2.0, 0], ['mole', 8, 1.5, 3], ['zombi', 20, 0.35, 5]],
    [['acechador', 6, 1.5, 0], ['chaman', 5, 1.8, 2], ['mutante', 8, 0.9, 5]],
    [['rata', 40, 0.15, 0], ['hinchado', 10, 0.9, 3], ['corredor', 15, 0.35, 8]],
    [['buitre', 8, 1.3, 0], ['murcielago', 12, 0.6, 2], ['portador', 5, 1.8, 6]],
    [['mole', 15, 1.0, 0], ['antidisturbios', 15, 0.7, 2], ['chaman', 6, 1.5, 5]],
    [['acechador', 12, 0.9, 0], ['fantasma', 20, 0.4, 2], ['murcielago', 12, 0.6, 5]],
    [['mole', 12, 0.9, 0], ['mutante', 12, 0.8, 2], ['buitre', 10, 1.0, 4], ['acechador', 10, 0.9, 6], ['portador', 6, 1.5, 8], ['rata', 40, 0.12, 10]],
    [['BOSS', 1, 1, 0], ['antidisturbios', 20, 0.6, 3], ['cuervo', 20, 0.5, 6], ['chaman', 6, 1.8, 8], ['acechador', 10, 1.0, 12]]
  ],

  // Pool para el modo Infinito (oleadas 21+). Jefe cada 10 oleadas.
  endless: {
    pool: ['zombi', 'corredor', 'mole', 'antidisturbios', 'mutante', 'hinchado', 'chaman', 'fantasma', 'acechador', 'cuervo', 'murcielago', 'buitre', 'portador'],
    groupsPerWave: 4,
    baseCount: 10,
    countPerWave: 0.8
  },

  // ---------------------------------------------------------------
  // Torres
  //   stats: valores del nivel 1.
  //   growth.mul: multiplicador por nivel; growth.add: suma por nivel.
  //   targets: { ground, air }, detect: ve camuflados.
  //   perk: habilidad que se activa en el nivel 5.
  //   unlock: nivel de perfil necesario para desbloquearla.
  // ---------------------------------------------------------------
  towers: {
    // ===== TERRESTRES =====
    escopeta: {
      name: 'Escopeta', icon: '💥', category: 'terrestre', cost: 90, unlock: 1, behavior: 'shotgun',
      desc: 'Dispara 5 perdigones en abanico. Brutal de cerca.',
      targets: { ground: true, air: false }, detect: false,
      stats: { damage: 6, range: 2.2, rate: 1.0, pellets: 5, spread: 0.55, projSpeed: 14 },
      growth: { mul: { damage: 1.38 }, add: { range: 0.12, pellets: 0.5, rate: 0.08 } },
      perk: { name: 'Balas incendiarias', desc: 'Los perdigones queman al enemigo.', burn: { dps: 8, duration: 3 } },
      look: { barrels: 2, barrelLen: 0.42, barrelW: 0.1, color: '#b8763b' }
    },
    lanzagranadas: {
      name: 'Lanzagranadas', icon: '💣', category: 'terrestre', cost: 180, unlock: 1, behavior: 'splash',
      desc: 'Granadas con daño en área.',
      targets: { ground: true, air: false }, detect: false,
      stats: { damage: 24, range: 3.2, rate: 0.6, splash: 1.1, projSpeed: 6.5 },
      growth: { mul: { damage: 1.4 }, add: { range: 0.15, splash: 0.12, rate: 0.04 } },
      perk: { name: 'Racimo', desc: 'Cada granada suelta 3 minigranadas.', cluster: 3 },
      look: { barrels: 1, barrelLen: 0.38, barrelW: 0.2, color: '#6d7a3a' }
    },
    lanzallamas: {
      name: 'Lanzallamas', icon: '🔥', category: 'terrestre', cost: 200, unlock: 3, behavior: 'flame',
      desc: 'Cono de fuego continuo que quema a todo lo que toca.',
      targets: { ground: true, air: false }, detect: false,
      stats: { damage: 3.2, range: 1.9, rate: 10, cone: 0.55, burnDps: 5, burnTime: 2 },
      growth: { mul: { damage: 1.35, burnDps: 1.3 }, add: { range: 0.1, cone: 0.04 } },
      perk: { name: 'Napalm', desc: 'Deja charcos de fuego en el camino.', napalm: { dps: 22, duration: 3, every: 1.5 } },
      look: { barrels: 1, barrelLen: 0.34, barrelW: 0.16, color: '#c0492b' }
    },
    mortero: {
      name: 'Mortero', icon: '🎇', category: 'terrestre', cost: 220, unlock: 5, behavior: 'mortar',
      desc: 'Alcance enorme y daño en área, pero lento. No dispara muy cerca.',
      targets: { ground: true, air: false }, detect: false,
      stats: { damage: 38, range: 7, minRange: 1.5, rate: 0.35, splash: 1.3, flight: 1.2 },
      growth: { mul: { damage: 1.4 }, add: { splash: 0.12, rate: 0.03, range: 0.3 } },
      perk: { name: 'Bombardeo triple', desc: 'Dispara 3 proyectiles por salva.', shells: 3 },
      look: { barrels: 1, barrelLen: 0.26, barrelW: 0.26, color: '#5a5f66' }
    },
    tanque: {
      name: 'Tanque', icon: '🪖', category: 'terrestre', cost: 350, unlock: 9, behavior: 'cannon',
      desc: 'Cañón perforante que IGNORA el blindaje.',
      targets: { ground: true, air: false }, detect: false, armorPierce: true,
      stats: { damage: 75, range: 3.5, rate: 0.5, splash: 0.6, projSpeed: 11 },
      growth: { mul: { damage: 1.4 }, add: { range: 0.15, rate: 0.05, splash: 0.08 } },
      perk: { name: 'Doble disparo', desc: 'Cada ataque son dos cañonazos.', double: true },
      look: { barrels: 1, barrelLen: 0.5, barrelW: 0.16, color: '#4e5d3a' }
    },
    minador: {
      name: 'Minador', icon: '⛏️', category: 'terrestre', cost: 130, unlock: 6, behavior: 'minelayer',
      desc: 'Siembra minas en el camino cercano.',
      targets: { ground: true, air: false }, detect: true,
      stats: { damage: 45, range: 2.5, rate: 0.35, splash: 0.9, maxMines: 4 },
      growth: { mul: { damage: 1.38 }, add: { rate: 0.05, maxMines: 1, splash: 0.08 } },
      perk: { name: 'Minas de racimo', desc: 'Cada mina explota 3 veces.', cluster: 3 },
      look: { barrels: 0, color: '#7a6040' }
    },

    // ===== ANTIAÉREAS =====
    antiaerea: {
      name: 'Antiaérea', icon: '🚀', category: 'aerea', cost: 170, unlock: 2, behavior: 'missile',
      desc: 'Misiles teledirigidos. Solo contra voladores.',
      targets: { ground: false, air: true }, detect: false,
      stats: { damage: 30, range: 4, rate: 0.8, projSpeed: 8, splash: 0.5 },
      growth: { mul: { damage: 1.4 }, add: { range: 0.2, rate: 0.08 } },
      perk: { name: 'Salva', desc: 'Lanza 4 misiles a la vez.', salvo: 4 },
      look: { barrels: 2, barrelLen: 0.34, barrelW: 0.12, color: '#3f6fa8' }
    },
    flak: {
      name: 'Flak', icon: '🎆', category: 'aerea', cost: 150, unlock: 4, behavior: 'flak',
      desc: 'Explosiones en el aire con daño en área. Solo voladores.',
      targets: { ground: false, air: true }, detect: false,
      stats: { damage: 13, range: 3.3, rate: 1.2, splash: 1.0 },
      growth: { mul: { damage: 1.38 }, add: { range: 0.15, splash: 0.1, rate: 0.08 } },
      perk: { name: 'Metralla', desc: 'Área +50% y fragmentos adicionales.', splashMul: 1.5 },
      look: { barrels: 4, barrelLen: 0.3, barrelW: 0.07, color: '#577ca8' }
    },
    red: {
      name: 'Red de Captura', icon: '🕸️', category: 'aerea', cost: 120, unlock: 7, behavior: 'net',
      desc: 'Derriba voladores: caen y las torres terrestres pueden atacarlos.',
      targets: { ground: false, air: true }, detect: false,
      stats: { damage: 6, range: 3.0, rate: 0.5, groundTime: 4 },
      growth: { mul: { damage: 1.3 }, add: { rate: 0.08, groundTime: 0.8, range: 0.15 } },
      perk: { name: 'Red eléctrica', desc: 'Los derribados reciben descargas.', shock: 15 },
      look: { barrels: 1, barrelLen: 0.3, barrelW: 0.22, color: '#8aa0b8' }
    },

    // ===== MIXTAS =====
    fusilero: {
      name: 'Fusilero', icon: '🪖', category: 'mixta', cost: 50, unlock: 1, behavior: 'bullet',
      desc: 'Barato y rápido. Tierra y aire.',
      targets: { ground: true, air: true }, detect: false,
      stats: { damage: 7, range: 2.6, rate: 2.2, projSpeed: 16 },
      growth: { mul: { damage: 1.4, rate: 1.06 }, add: { range: 0.16 } },
      perk: { name: 'Veterano', desc: 'Cada 5º disparo hace daño doble.', everyN: 5, mult: 2 },
      look: { barrels: 1, barrelLen: 0.4, barrelW: 0.08, color: '#6b8a4a' }
    },
    ametralladora: {
      name: 'Ametralladora', icon: '🔫', category: 'mixta', cost: 140, unlock: 1, behavior: 'bullet',
      desc: 'Cadencia altísima, poco daño por bala. Tierra y aire.',
      targets: { ground: true, air: true }, detect: false,
      stats: { damage: 4, range: 2.8, rate: 8, projSpeed: 20 },
      growth: { mul: { damage: 1.36 }, add: { range: 0.12, rate: 0.6 } },
      perk: { name: 'Doble cañón', desc: 'Dispara a 2 enemigos a la vez.', multiTarget: 2 },
      look: { barrels: 2, barrelLen: 0.44, barrelW: 0.07, color: '#555b63' }
    },
    laser: {
      name: 'Láser', icon: '⚡', category: 'mixta', cost: 300, unlock: 12, behavior: 'laser',
      desc: 'Rayo continuo que atraviesa a todos en línea.',
      targets: { ground: true, air: true }, detect: false,
      stats: { damage: 4.5, range: 3.5, rate: 10 },
      growth: { mul: { damage: 1.4 }, add: { range: 0.15 } },
      perk: { name: 'Rayo rebotante', desc: 'El rayo rebota a 2 enemigos más.', bounces: 2 },
      look: { barrels: 1, barrelLen: 0.42, barrelW: 0.12, color: '#d44f8a' }
    },
    tesla: {
      name: 'Tesla', icon: '🌩️', category: 'mixta', cost: 260, unlock: 10, behavior: 'chain',
      desc: 'Rayo que salta entre varios enemigos.',
      targets: { ground: true, air: true }, detect: false,
      stats: { damage: 20, range: 2.8, rate: 0.9, chain: 3, chainRange: 1.7 },
      growth: { mul: { damage: 1.36 }, add: { chain: 0.75, rate: 0.08, range: 0.1 } },
      perk: { name: 'Tormenta', desc: 'Aturde brevemente a los enemigos alcanzados.', stun: 0.4 },
      look: { barrels: 0, color: '#6c7fe0' }
    },

    // ===== DETECCIÓN =====
    francotirador: {
      name: 'Francotirador', icon: '🎯', category: 'deteccion', cost: 160, unlock: 1, behavior: 'sniper',
      desc: 'Alcance enorme, ve camuflados e ignora blindaje. Apunta al más fuerte.',
      targets: { ground: true, air: true }, detect: true, armorPierce: true, defaultTargeting: 'fuerte',
      stats: { damage: 42, range: 8, rate: 0.45 },
      growth: { mul: { damage: 1.45 }, add: { rate: 0.06, range: 0.5 } },
      perk: { name: 'Tiro letal', desc: '10% de probabilidad de eliminar al instante (no jefes).', instakill: 0.1 },
      look: { barrels: 1, barrelLen: 0.56, barrelW: 0.07, color: '#2f6b5e' }
    },
    radar: {
      name: 'Radar', icon: '📡', category: 'deteccion', cost: 150, unlock: 2, behavior: 'radar',
      desc: 'No dispara. Las torres cercanas ven camuflados y ganan alcance.',
      targets: { ground: false, air: false }, detect: true,
      stats: { range: 2.5, rangeBonus: 0.1 },
      growth: { mul: {}, add: { range: 0.3, rangeBonus: 0.04 } },
      perk: { name: 'Barrido total', desc: 'Cada 20 s revela TODOS los camuflados del mapa durante 5 s.', pulseEvery: 20, pulseTime: 5 },
      look: { barrels: 0, color: '#2fb3a3' }
    },
    dron: {
      name: 'Dron Explorador', icon: '🛸', category: 'deteccion', cost: 190, unlock: 8, behavior: 'drone',
      desc: 'Un dron patrulla la zona: tierra, aire y ve camuflados.',
      targets: { ground: true, air: true }, detect: true,
      stats: { damage: 6, range: 2.6, rate: 3, droneRange: 1.8, drones: 1 },
      growth: { mul: { damage: 1.38 }, add: { rate: 0.3, range: 0.2 } },
      perk: { name: 'Enjambre', desc: '3 drones en lugar de 1.', drones: 3 },
      look: { barrels: 0, color: '#3c9c8f' }
    },

    // ===== APOYO =====
    criogenizador: {
      name: 'Criogenizador', icon: '❄️', category: 'apoyo', cost: 110, unlock: 1, behavior: 'slow',
      desc: 'Pulso helado que ralentiza a todos en su alcance.',
      targets: { ground: true, air: true }, detect: false,
      stats: { damage: 2, range: 2.2, rate: 0.8, slow: 0.5, slowTime: 1.6 },
      growth: { mul: { damage: 1.5 }, add: { range: 0.15, slow: -0.04, slowTime: 0.2 } },
      perk: { name: 'Congelación', desc: '20% de congelar por completo 1 s.', freezeChance: 0.2, freezeTime: 1 },
      look: { barrels: 0, color: '#7fd0f0' }
    },
    mando: {
      name: 'Tienda de Mando', icon: '🎖️', category: 'apoyo', cost: 200, unlock: 11, behavior: 'command',
      desc: 'Las torres cercanas ganan daño y cadencia.',
      targets: { ground: false, air: false }, detect: false,
      stats: { range: 2.2, dmgBonus: 0.15, rateBonus: 0.1 },
      growth: { mul: {}, add: { range: 0.2, dmgBonus: 0.05, rateBonus: 0.03 } },
      perk: { name: 'Moral alta', desc: 'Las torres cercanas también ganan +10% de alcance.', rangeBonus: 0.1 },
      look: { barrels: 0, color: '#8a7a4a' }
    },

    // ===== ECONOMÍA =====
    granja: {
      name: 'Granja', icon: '🌾', category: 'economia', cost: 120, unlock: 1, behavior: 'farm',
      desc: 'Da plata al terminar cada oleada.',
      targets: { ground: false, air: false }, detect: false,
      stats: { income: 30 },
      growth: { mul: { income: 1.35 }, add: {} },
      perk: { name: 'Hacienda', desc: 'Producción doble.', incomeMul: 2 },
      look: { barrels: 0, color: '#c9953a' }
    },
    minaplata: {
      name: 'Mina de Plata', icon: '🪙', category: 'economia', cost: 250, unlock: 6, behavior: 'silvermine',
      desc: 'Genera monedas DURANTE la oleada. Haz clic en ellas para +25%.',
      targets: { ground: false, air: false }, detect: false,
      stats: { income: 8, rate: 0.2 },
      growth: { mul: { income: 1.35 }, add: { rate: 0.02 } },
      perk: { name: 'Veta madre', desc: 'Las monedas valen el triple.', incomeMul: 3 },
      look: { barrels: 0, color: '#9aa3ad' }
    },
    banco: {
      name: 'Banco', icon: '🏦', category: 'economia', cost: 400, unlock: 13, behavior: 'bank',
      desc: 'Paga intereses sobre tu plata al terminar cada oleada.',
      targets: { ground: false, air: false }, detect: false,
      stats: { interest: 0.08, cap: 120 },
      growth: { mul: { cap: 1.4 }, add: { interest: 0.01 } },
      perk: { name: 'Bóveda', desc: 'Interés del 15% y tope doble.', interest: 0.15, capMul: 2 },
      look: { barrels: 0, color: '#d4b85a' }
    }
  },

  // ---------------------------------------------------------------
  // Héroes (uno por partida, se coloca gratis y sube de nivel solo)
  // ---------------------------------------------------------------
  heroes: {
    rex: {
      name: 'Sargento Rex', icon: '🦁', color: '#d0873a', unlock: 1,
      look: { uniform: '#8a6a3a', beret: '#a02a2a', gun: { len: 0.42, w: 0.06 }, pack: 'mochila' },
      desc: 'Potencia a las torres cercanas (+15% daño). Nivel 3: lanza granadas.',
      targets: { ground: true, air: true }, detect: false,
      stats: { damage: 10, range: 2.8, rate: 1.6, auraRange: 2.5, auraDmg: 0.15 },
      ability: { type: 'grenade', level: 3, every: 10, damage: 90, splash: 1.3 }
    },
    luna: {
      name: 'Doc Luna', icon: '🩺', color: '#e46aa4', unlock: 4,
      look: { uniform: '#e8e8ee', helmet: '#e46aa4', gun: { len: 0.3, w: 0.05 }, pack: 'mochila' },
      desc: 'Ve camuflados. Recupera 1 vida cada 3 oleadas y despierta torres aturdidas.',
      targets: { ground: true, air: true }, detect: true,
      stats: { damage: 7, range: 3.0, rate: 2.4, auraRange: 2.5 },
      ability: { type: 'heal', level: 2, lifeEvery: 3 }
    },
    chispa: {
      name: 'Ingeniera Chispa', icon: '🔧', color: '#f0c43a', unlock: 8,
      look: { uniform: '#4a5a7a', helmet: '#f0c43a', gun: { len: 0.34, w: 0.07, color: '#6a6f78' }, pack: 'tanques' },
      desc: 'Despliega torretas temporales. Nivel 4: torretas dobles.',
      targets: { ground: true, air: true }, detect: false,
      stats: { damage: 8, range: 2.6, rate: 1.8 },
      ability: { type: 'turret', level: 1, every: 14, duration: 9, damage: 5, rate: 3, range: 2.2 }
    }
  },
  // XP del héroe (por plata de recompensa de sus bajas o de bajas cercanas) para llegar a cada nivel
  heroLevels: [0, 40, 110, 230, 420],
  heroGrowth: 1.28,

  // ---------------------------------------------------------------
  // Habilidades del jugador
  // ---------------------------------------------------------------
  abilities: {
    bombardeo:  { name: 'Bombardeo',        icon: '✈️', key: 'Q', cooldown: 60, unlock: 1, damage: 160, radius: 1.2, bombs: 5, spacing: 1.1, desc: 'Haz clic en el camino: cae una línea de bombas.' },
    congelar:   { name: 'Granada de hielo', icon: '🧊', key: 'W', cooldown: 45, unlock: 1, duration: 3, desc: 'Congela a todos los zombis 3 s (jefes 1.5 s).' },
    suministro: { name: 'Suministro aéreo', icon: '📦', key: 'E', cooldown: 90, unlock: 3, money: 100, perWave: 10, desc: '+100 de plata (+10 por oleada).' },
    barricada:  { name: 'Barricada',        icon: '🧱', key: 'R', cooldown: 6, unlock: 2, cost: 40, hp: 220, hpPerWave: 20, desc: 'Colócala en el camino: frena a los zombis terrestres.' },
    mina:       { name: 'Mina',             icon: '💣', key: 'T', cooldown: 3, unlock: 1, cost: 25, damage: 130, radius: 1.0, desc: 'Colócala en el camino: explota al pasar un zombi.' }
  },

  // ---------------------------------------------------------------
  // Perfil: XP, rangos, medallas
  // ---------------------------------------------------------------
  profile: {
    maxLevel: 50,
    xpBase: 120,
    xpPerLevel: 70,
    medalsPerLevelUp: 1,
    // XP de una partida = puntuación × factor × multiplicador de dificultad
    xpPerScore: 0.02,
    winXpBonus: 150,
    lossXpFactor: 0.5
  },

  // Rangos militares: nivel mínimo, nombre, insignia y color
  ranks: [
    { level: 1,  name: 'Recluta',               badge: '✧', color: '#9aa3ad' },
    { level: 3,  name: 'Soldado',               badge: '›',  color: '#a0c46a' },
    { level: 5,  name: 'Cabo',                  badge: '»',  color: '#7fbf5a' },
    { level: 8,  name: 'Sargento',              badge: '≫',  color: '#5fb0c0' },
    { level: 11, name: 'Sargento Mayor',        badge: '⋙',  color: '#4f8fd6' },
    { level: 14, name: 'Teniente',              badge: '◆',  color: '#8e6fd1' },
    { level: 18, name: 'Capitán',               badge: '◆◆', color: '#b05fc4' },
    { level: 22, name: 'Mayor',                 badge: '✦',  color: '#d06c9c' },
    { level: 26, name: 'Teniente Coronel',      badge: '✦✦', color: '#e0703a' },
    { level: 30, name: 'Coronel',               badge: '✦✦✦', color: '#e0903a' },
    { level: 35, name: 'General de Brigada',    badge: '★',  color: '#e0b23a' },
    { level: 40, name: 'General',               badge: '★★', color: '#f0c43a' },
    { level: 45, name: 'Mariscal',              badge: '★★★', color: '#ffd84a' },
    { level: 50, name: 'Leyenda del Apocalipsis', badge: '👑', color: '#ff5a5a' }
  ],

  // Recompensa diaria (racha de 7 días, luego se repite el último)
  dailyRewards: [
    { xp: 60, medals: 1 }, { xp: 80, medals: 1 }, { xp: 100, medals: 2 }, { xp: 130, medals: 2 },
    { xp: 160, medals: 3 }, { xp: 200, medals: 3 }, { xp: 300, medals: 5 }
  ],

  // Misiones diarias (se eligen 3 al azar cada día)
  missions: [
    { id: 'kill300',   text: 'Elimina 300 zombis',                 stat: 'kills',        goal: 300, xp: 120, medals: 1 },
    { id: 'kill800',   text: 'Elimina 800 zombis',                 stat: 'kills',        goal: 800, xp: 250, medals: 2 },
    { id: 'air50',     text: 'Derriba 50 voladores',               stat: 'killsAir',     goal: 50,  xp: 120, medals: 1 },
    { id: 'hidden40',  text: 'Elimina 40 camuflados',              stat: 'killsHidden',  goal: 40,  xp: 120, medals: 1 },
    { id: 'boss1',     text: 'Derrota a un jefe',                  stat: 'bossKills',    goal: 1,   xp: 150, medals: 2 },
    { id: 'build25',   text: 'Construye 25 torres',                stat: 'built',        goal: 25,  xp: 100, medals: 1 },
    { id: 'max2',      text: 'Lleva 2 torres a nivel 5',           stat: 'maxed',        goal: 2,   xp: 150, medals: 2 },
    { id: 'win1',      text: 'Gana una partida',                   stat: 'wins',         goal: 1,   xp: 150, medals: 2 },
    { id: 'earn3000',  text: 'Consigue 3000 de plata',             stat: 'moneyEarned',  goal: 3000, xp: 120, medals: 1 },
    { id: 'abil10',    text: 'Usa 10 habilidades',                 stat: 'abilities',    goal: 10,  xp: 100, medals: 1 },
    { id: 'early10',   text: 'Adelanta 10 oleadas',                stat: 'earlyCalls',   goal: 10,  xp: 100, medals: 1 },
    { id: 'waves30',   text: 'Supera 30 oleadas',                  stat: 'waves',        goal: 30,  xp: 130, medals: 1 }
  ],

  // Logros (se desbloquean una sola vez)
  achievements: [
    { id: 'primera',    icon: '🏁', name: 'Primera victoria',   desc: 'Gana tu primera partida.',                        medals: 3 },
    { id: 'perfecto',   icon: '💎', name: 'Perfecto',           desc: 'Gana sin perder ninguna vida.',                    medals: 5 },
    { id: 'sinGranjas', icon: '🚜', name: 'Sin granjas',        desc: 'Gana sin construir torres de economía.',           medals: 4 },
    { id: 'leyenda',    icon: '🔥', name: 'Leyenda viva',       desc: 'Gana un mapa en dificultad Leyenda.',              medals: 6 },
    { id: 'trilogia',   icon: '🗺️', name: 'Trotamundos',        desc: 'Gana en los 3 mapas.',                             medals: 5 },
    { id: 'estrellas',  icon: '🌟', name: 'Constelación',       desc: 'Consigue 3 estrellas en los 3 mapas.',             medals: 8 },
    { id: 'max5',       icon: '⭐', name: 'Al máximo',          desc: 'Lleva una torre a nivel 5.',                       medals: 2 },
    { id: 'jefe',       icon: '👹', name: 'Matagigantes',       desc: 'Derrota a un jefe.',                               medals: 3 },
    { id: 'sniperJefe', icon: '🎯', name: 'Ojo de halcón',      desc: 'Da el golpe final a un jefe con un Francotirador.', medals: 4 },
    { id: 'mil',        icon: '🧟', name: 'Exterminador',       desc: 'Elimina 1000 zombis en total.',                    medals: 3 },
    { id: 'diezmil',    icon: '☠️', name: 'Apocalipsis Zero',   desc: 'Elimina 10000 zombis en total.',                   medals: 8 },
    { id: 'rico',       icon: '💰', name: 'Magnate',            desc: 'Ten 3000 de plata a la vez.',                       medals: 3 },
    { id: 'racha',      icon: '⚡', name: 'Carnicería',         desc: 'Consigue una racha de 25 bajas.',                  medals: 3 },
    { id: 'infinito30', icon: '♾️', name: 'Resistencia',        desc: 'Llega a la oleada 30 en modo Infinito.',           medals: 5 },
    { id: 'desafio',    icon: '🏆', name: 'Retador',            desc: 'Completa un desafío.',                             medals: 4 },
    { id: 'nivel10',    icon: '🎖️', name: 'Veterano',           desc: 'Alcanza el nivel 10 de perfil.',                   medals: 3 },
    { id: 'nivel25',    icon: '🏅', name: 'Oficial',            desc: 'Alcanza el nivel 25 de perfil.',                   medals: 6 }
  ],

  // Cuartel: mejoras permanentes que se compran con medallas
  barracks: [
    { id: 'plata',     icon: '💵', name: 'Fondos de guerra',   desc: '+8% de plata inicial por nivel.',           max: 5, costs: [2, 4, 6, 9, 12], value: 0.08 },
    { id: 'vidas',     icon: '❤️', name: 'Muros reforzados',   desc: '+2 vidas por nivel.',                        max: 3, costs: [3, 6, 10],       value: 2 },
    { id: 'descuento', icon: '🏷️', name: 'Logística',          desc: '−3% en el precio de torres por nivel.',      max: 5, costs: [3, 5, 8, 11, 15], value: 0.03 },
    { id: 'recarga',   icon: '⏱️', name: 'Radio táctica',      desc: '−8% de recarga de habilidades por nivel.',   max: 5, costs: [2, 4, 6, 9, 12], value: 0.08 },
    { id: 'granjas',   icon: '🌾', name: 'Agricultura',        desc: '+10% de producción de economía por nivel.',  max: 5, costs: [3, 5, 8, 11, 15], value: 0.1 },
    { id: 'heroe',     icon: '🦸', name: 'Entrenamiento',      desc: '+25% de XP del héroe por nivel.',            max: 3, costs: [3, 6, 10],       value: 0.25 },
    { id: 'xp',        icon: '📈', name: 'Academia',           desc: '+10% de XP de perfil por nivel.',            max: 5, costs: [4, 7, 10, 14, 18], value: 0.1 }
  ],

  // Desafíos: reglas especiales
  challenges: [
    { id: 'soloFusil', name: 'Solo Fusileros',   icon: '🪖', desc: 'Solo puedes usar Fusileros y Granjas.',                map: 'pradera', difficulty: 'guardian', allowed: ['fusilero', 'granja'], medals: 6, unlock: 3 },
    { id: 'estampida', name: 'Estampida',        icon: '🐗', desc: 'Todos los zombis son un 40% más rápidos.',             map: 'canon',   difficulty: 'aprendiz', speedMul: 1.4, medals: 6, unlock: 5 },
    { id: 'austero',   name: 'Austeridad',       icon: '🚫', desc: 'Sin torres de economía, pero empiezas con 600.',       map: 'fragua',  difficulty: 'aprendiz', banned: ['granja', 'minaplata', 'banco'], money: 600, medals: 7, unlock: 7 },
    { id: 'unaVida',   name: 'Una sola vida',    icon: '💀', desc: 'Empiezas con 1 vida. Un error y se acabó.',            map: 'pradera', difficulty: 'aprendiz', lives: 1, medals: 8, unlock: 9 }
  ]
};

/* =====================================================================
 * profile.js — Perfil del jugador guardado en localStorage:
 * XP, nivel, rango, medallas, estrellas, logros, misiones diarias,
 * recompensa diaria, mejoras del Cuartel y estadísticas.
 * ===================================================================== */
window.TD = window.TD || {};

TD.Profile = {
  KEY: 'reino-en-guardia-perfil-v1',
  data: null,
  // Función opcional para notificar logros/misiones (la asigna la interfaz)
  onToast: null,

  defaults() {
    return {
      name: 'Comandante',
      level: 1, xp: 0, totalXp: 0, medals: 0,
      stars: {}, bestScore: {}, endlessBest: {}, challengesDone: {},
      achievements: {}, barracks: {},
      stats: { kills: 0, killsAir: 0, killsHidden: 0, bossKills: 0, built: 0, maxed: 0, wins: 0, losses: 0,
               games: 0, moneyEarned: 0, abilities: 0, earlyCalls: 0, waves: 0, bestStreak: 0 },
      daily: { last: null, streak: 0 },
      missions: { date: null, list: [] },
      settings: { sound: true, volume: 0.5 },
      lastHero: 'rex'
    };
  },

  load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { saved = null; }
    const d = this.defaults();
    if (saved && typeof saved === 'object') {
      // Mezcla superficial para tolerar versiones antiguas del guardado
      for (const k in d) if (saved[k] !== undefined) d[k] = (typeof d[k] === 'object' && !Array.isArray(d[k]) && d[k] !== null)
        ? Object.assign(d[k], saved[k]) : saved[k];
    }
    this.data = d;
    this.ensureMissions();
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* almacenamiento no disponible */ }
  },

  reset() {
    this.data = this.defaults();
    this.ensureMissions();
    this.save();
  },

  toast(icon, title, text) {
    if (this.onToast) this.onToast(icon, title, text);
  },

  // ---------------- Nivel y rango ----------------
  xpToNext(level) {
    const p = TD.CONFIG.profile;
    return p.xpBase + (level - 1) * p.xpPerLevel;
  },

  rankFor(level) {
    const ranks = TD.CONFIG.ranks;
    let r = ranks[0];
    for (const rk of ranks) if (level >= rk.level) r = rk;
    return r;
  },

  rank() { return this.rankFor(this.data.level); },

  // Suma XP; devuelve un resumen de subidas de nivel y desbloqueos
  addXp(amount) {
    const d = this.data;
    const p = TD.CONFIG.profile;
    amount = Math.round(amount * (1 + this.barracksValue('xp')));
    const before = { level: d.level, xp: d.xp, rank: this.rank().name };
    d.totalXp += amount;
    d.xp += amount;
    const unlocks = [];
    while (d.level < p.maxLevel && d.xp >= this.xpToNext(d.level)) {
      d.xp -= this.xpToNext(d.level);
      d.level++;
      d.medals += p.medalsPerLevelUp;
      unlocks.push(...this.unlocksAtLevel(d.level));
    }
    if (d.level >= p.maxLevel) d.xp = Math.min(d.xp, this.xpToNext(d.level));
    if (d.level >= 10) this.unlockAchievement('nivel10');
    if (d.level >= 25) this.unlockAchievement('nivel25');
    this.save();
    return { amount, before, after: { level: d.level, xp: d.xp, rank: this.rank().name },
             levels: d.level - before.level, rankUp: before.rank !== this.rank().name, unlocks };
  },

  // Lista de cosas que se desbloquean exactamente en un nivel
  unlocksAtLevel(level) {
    const C = TD.CONFIG, out = [];
    for (const id in C.towers) if (C.towers[id].unlock === level) out.push(C.towers[id].icon + ' Torre: ' + C.towers[id].name);
    for (const id in C.heroes) if (C.heroes[id].unlock === level) out.push(C.heroes[id].icon + ' Héroe: ' + C.heroes[id].name);
    for (const id in C.abilities) if (C.abilities[id].unlock === level) out.push(C.abilities[id].icon + ' Habilidad: ' + C.abilities[id].name);
    for (const ch of C.challenges) if (ch.unlock === level) out.push(ch.icon + ' Desafío: ' + ch.name);
    return out;
  },

  isTowerUnlocked(id) { return this.data.level >= TD.CONFIG.towers[id].unlock; },
  isHeroUnlocked(id) { return this.data.level >= TD.CONFIG.heroes[id].unlock; },
  isAbilityUnlocked(id) { return this.data.level >= TD.CONFIG.abilities[id].unlock; },
  isChallengeUnlocked(ch) { return this.data.level >= ch.unlock; },

  // Un mapa se desbloquea al ganar el anterior en cualquier dificultad
  isMapUnlocked(index) {
    if (index === 0) return true;
    const prev = TD.CONFIG.maps[index - 1].id;
    const s = this.data.stars[prev];
    return !!s && Object.values(s).some(v => v > 0);
  },
  isEndlessUnlocked() { return this.data.stats.wins > 0; },

  mapStars(mapId, diff) { return (this.data.stars[mapId] && this.data.stars[mapId][diff]) || 0; },
  totalStars() {
    let t = 0;
    for (const m in this.data.stars) for (const dd in this.data.stars[m]) t += this.data.stars[m][dd];
    return t;
  },

  // ---------------- Estadísticas y misiones ----------------
  addStat(key, n) {
    const d = this.data;
    d.stats[key] = (d.stats[key] || 0) + (n || 1);
    for (const m of d.missions.list) {
      const def = TD.CONFIG.missions.find(x => x.id === m.id);
      if (def && def.stat === key && !m.done) {
        m.progress = Math.min(def.goal, m.progress + (n || 1));
        if (m.progress >= def.goal) {
          m.done = true;
          this.toast('📋', '¡Misión completada!', def.text + ' — reclámala en el menú');
        }
      }
    }
    if (key === 'kills') {
      if (d.stats.kills >= 1000) this.unlockAchievement('mil');
      if (d.stats.kills >= 10000) this.unlockAchievement('diezmil');
    }
  },

  ensureMissions() {
    const d = this.data;
    const today = TD.U.today();
    if (d.missions.date === today && d.missions.list.length) return;
    const pool = TD.CONFIG.missions.slice();
    const list = [];
    while (list.length < 3 && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      list.push({ id: pool[i].id, progress: 0, done: false, claimed: false });
      pool.splice(i, 1);
    }
    d.missions = { date: today, list };
    this.save();
  },

  claimMission(index) {
    const m = this.data.missions.list[index];
    if (!m || !m.done || m.claimed) return null;
    const def = TD.CONFIG.missions.find(x => x.id === m.id);
    m.claimed = true;
    this.data.medals += def.medals;
    const res = this.addXp(def.xp);
    this.save();
    return { def, res };
  },

  // ---------------- Recompensa diaria ----------------
  dailyAvailable() { return this.data.daily.last !== TD.U.today(); },

  // Día de la racha que se cobraría hoy (0..6)
  dailyIndex() {
    const d = this.data.daily;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    const streak = d.last === yesterday ? d.streak : 0;
    return Math.min(streak, TD.CONFIG.dailyRewards.length - 1);
  },

  claimDaily() {
    if (!this.dailyAvailable()) return null;
    const idx = this.dailyIndex();
    const reward = TD.CONFIG.dailyRewards[idx];
    this.data.daily = { last: TD.U.today(), streak: idx + 1 };
    this.data.medals += reward.medals;
    const res = this.addXp(reward.xp);
    this.save();
    return { reward, day: idx + 1, res };
  },

  // ---------------- Logros ----------------
  unlockAchievement(id) {
    if (this.data.achievements[id]) return false;
    const def = TD.CONFIG.achievements.find(a => a.id === id);
    if (!def) return false;
    this.data.achievements[id] = Date.now();
    this.data.medals += def.medals;
    this.save();
    this.toast(def.icon, '¡Logro desbloqueado!', def.name + ' (+' + def.medals + ' 🏅)');
    return true;
  },

  // ---------------- Cuartel ----------------
  barracksLevel(id) { return this.data.barracks[id] || 0; },
  barracksValue(id) {
    const def = TD.CONFIG.barracks.find(b => b.id === id);
    return def ? def.value * this.barracksLevel(id) : 0;
  },
  buyBarracks(id) {
    const def = TD.CONFIG.barracks.find(b => b.id === id);
    const lvl = this.barracksLevel(id);
    if (!def || lvl >= def.max) return false;
    const cost = def.costs[lvl];
    if (this.data.medals < cost) return false;
    this.data.medals -= cost;
    this.data.barracks[id] = lvl + 1;
    this.save();
    return true;
  }
};

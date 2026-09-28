/* ================== MOTOR DE LA CARRERA ================== */
const SAVE_KEY = 'mcf_save_v1', HALL_KEY = 'mcf_hall_v1';
const SEASON_WEEKS = 14;
const CUP_WEEKS = { 4: 'Cuartos de final', 8: 'Semifinal', 12: 'Final' };
const CONT_WEEKS = { 3: 'Cuartos de final', 7: 'Semifinal', 11: 'Final' };
const NATION_WEEK = 7;
const START_YEAR = 2026;
let C = null;

const pos = () => POSITIONS[C.pos];
function calcOvr(a, p) { const w = POSITIONS[p || C.pos].w; let o = 0; for (const k in w) o += a[k] * w[k]; return Math.round(o); }
function club(id) { return C.clubs[id === undefined ? C.clubId : id]; }
function leagueOf(cl) { return LEAGUES.find(L => L.id === cl.league); }
function wageFor(ovr, lg) { return Math.round(12 * Math.exp((ovr - 45) / 7.6) * lg.wage / 10) * 10; }
function marketValue() { const o = C.ovr, ageK = C.age < 24 ? 1.4 : C.age < 29 ? 1 : C.age < 32 ? 0.6 : 0.25; return Math.round(Math.exp((o - 40) / 6.2) * 900 * ageK / 1000) * 1000; }
function log(txt, kind) { C.log.unshift({ t: txt, kind: kind || 'info', s: C.season, w: C.week }); if (C.log.length > 60) C.log.length = 60; }
function yearNow() { return START_YEAR + C.season - 1; }

/* ---------- crear carrera ---------- */
function newCareer(o) {
  const clubs = buildWorld();
  const a = { pac: irand(42, 56), sho: irand(38, 52), pas: irand(38, 52), dri: irand(40, 54), def: irand(30, 46), phy: irand(36, 50) };
  const boost = { DEL: ['sho', 'pac'], EXT: ['pac', 'dri'], MED: ['pas', 'dri'], DEF: ['def', 'phy'] }[o.pos];
  for (const k of boost) a[k] += irand(6, 10);
  const home = pick(clubs.filter(c => c.league === 'per'));
  C = {
    v: 1, first: o.first, last: o.last, pos: o.pos, foot: o.foot, origin: o.origin, skin: o.skin,
    age: 16, season: 1, week: 0, attr: a, pot: irand(76, 95), ovr: 0, peakOvr: 0,
    form: 60, fatigue: 10, happy: 65, disc: 60, fame: 0, followers: 300, trust: 30, mom: 70, friends: 70,
    money: 300, salary: 150, contractEnd: 3, clubId: home.id, clubs,
    rel: 'soltero', relLvl: 0, partner: null, kids: 0, momHouse: false, agent: null, sponsor: false, sponsorBig: false, captain: false, slowAging: false, invest: 0, loan: false,
    house: 0, cars: [], injured: 0, plan: 'normal',
    career: { apps: 0, goals: 0, assists: 0, ratingSum: 0, motm: 0, reserve: 0 },
    ss: null, history: [], trophies: [], nation: { caps: 0, goals: 0, called: false }, transfers: 0,
    log: [], pendingOffers: [], done: false, lastMatch: null,
  };
  C.ovr = calcOvr(C.attr); C.peakOvr = C.ovr;
  C.history.push({ club: home.id, from: 1, apps: 0, goals: 0, assists: 0 });
  startSeason(true);
  log('Firmaste tu primer contrato con las menores de ' + home.name + '. Tienes 16 años y un sueño.', 'big');
  return C;
}

/* ---------- temporada ---------- */
function roundRobin(ids) {
  const n = ids.length, arr = ids.slice(), rounds = [];
  for (let r = 0; r < n - 1; r++) { const rd = []; for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; rd.push(r % 2 ? [b, a] : [a, b]); } rounds.push(rd); arr.splice(1, 0, arr.pop()); }
  return rounds.concat(rounds.map(rd => rd.map(([a, b]) => [b, a])));
}
function startSeason(first) {
  const my = club(), L = leagueOf(my);
  const ids = C.clubs.filter(c => c.league === my.league).map(c => c.id);
  C.fixtures = roundRobin(shuffle(ids.slice()));
  C.table = {}; for (const id of ids) C.table[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  C.cup = { alive: shuffle(ids.slice()), name: 'Copa ' + L.country, winner: null };
  C.cont = null;
  if (L.cont) {
    const pool = [];
    for (const L2 of LEAGUES.filter(x => x.cont === L.cont)) { const cs = C.clubs.filter(c => c.league === L2.id).sort((a, b) => b.str - a.str); pool.push(cs[0].id, cs[1].id); }
    C.cont = { alive: shuffle(pool), name: CONT_NAME[L.cont], winner: null, inIt: pool.includes(my.id) };
  }
  C.ss = { apps: 0, goals: 0, assists: 0, ratingSum: 0, motm: 0, reserve: 0, club: my.id, league: my.league };
  C.week = 0;
  C.nation.called = false;
  if (!first) log('Arranca la temporada ' + yearNow() + ' con ' + my.name + '.', 'big');
}
function weekMatches() {
  const w = C.week, my = C.clubId, list = [];
  const rd = C.fixtures[w - 1];
  if (rd) { const m = rd.find(([a, b]) => a === my || b === my); if (m) list.push({ comp: leagueOf(club()).name, type: 'liga', home: m[0], away: m[1] }); }
  if (CUP_WEEKS[w] && C.cup.alive.includes(my)) { const i = C.cup.alive.indexOf(my), j = i % 2 ? i - 1 : i + 1; list.push({ comp: C.cup.name + ', ' + CUP_WEEKS[w].toLowerCase(), type: 'copa', home: C.cup.alive[Math.min(i, j)], away: C.cup.alive[Math.max(i, j)], ko: true }); }
  if (C.cont && CONT_WEEKS[w] && C.cont.alive.includes(my)) { const i = C.cont.alive.indexOf(my), j = i % 2 ? i - 1 : i + 1; list.push({ comp: C.cont.name + ', ' + CONT_WEEKS[w].toLowerCase(), type: 'cont', home: C.cont.alive[Math.min(i, j)], away: C.cont.alive[Math.max(i, j)], ko: true }); }
  if (w === NATION_WEEK && C.nation.called) list.push({ comp: 'Eliminatorias al Mundial', type: 'nation', home: -1, away: -2 });
  return list;
}

/* ---------- entrenamiento, forma y edad ---------- */
function applyPlan(id) {
  const P = WEEK_PLANS.find(x => x.id === id) || WEEK_PLANS[1];
  const fx = P.fx;
  C.fatigue = clamp(C.fatigue + fx.fatigue, 0, 100);
  C.happy = clamp(C.happy + fx.happy, 0, 100);
  C.disc = clamp(C.disc + fx.disc, 0, 100);
  C.trust = clamp(C.trust + fx.trust, 0, 100);
  if (fx.fame) C.fame = clamp(C.fame + fx.fame, 0, 100);
  if (fx.rel && C.rel !== 'soltero') C.relLvl = clamp(C.relLvl + fx.rel, 0, 100);
  if (id === 'familia') C.mom = clamp(C.mom + 4, 0, 100);
  if (id === 'fiesta') C.friends = clamp(C.friends + 5, 0, 100);
  if (C.injured > 0) return;
  train(fx.train);
  if (id === 'fuerte' && chance(0.01 + Math.max(0, C.fatigue - 60) / 1200)) injure('entrenando');
}
function ageFactor() { const a = C.age; if (a < 19) return 1.5; if (a < 22) return 1.2; if (a < 25) return 0.8; if (a < 28) return 0.45; if (a < 30) return 0.2; return 0.05; }
function train(mult) {
  const gap = Math.max(0, C.pot - C.ovr);
  const g = 0.12 * mult * ageFactor() * (0.35 + gap / 18) * (0.7 + C.disc / 170);
  const w = pos().w;
  for (const k in C.attr) C.attr[k] = Math.min(99, C.attr[k] + g * (0.4 + w[k] * 3.2) * rand(0.6, 1.4));
  C.ovr = calcOvr(C.attr); C.peakOvr = Math.max(C.peakOvr, C.ovr);
}
function ageUp() {
  C.age++;
  let dec = 0;
  if (C.age >= 30) dec = (C.age - 29) * 0.55 * (C.slowAging ? 0.6 : 1);
  if (dec > 0) { for (const k of ['pac', 'phy']) C.attr[k] = Math.max(25, C.attr[k] - dec * 1.4); for (const k of ['sho', 'dri', 'def']) C.attr[k] = Math.max(25, C.attr[k] - dec * 0.7); C.attr.pas = Math.max(25, C.attr.pas - dec * 0.3); }
  C.ovr = calcOvr(C.attr);
}
function injure(why) {
  const serious = chance(0.12);
  C.injured = serious ? irand(6, 14) : irand(1, 3);
  C.fatigue = 20; C.happy = clamp(C.happy - (serious ? 18 : 6), 0, 100);
  log((serious ? 'Lesión grave ' : 'Lesión ') + why + ': estarás ' + C.injured + (C.injured === 1 ? ' semana' : ' semanas') + ' fuera.', 'bad');
  if (serious && C.age >= 34) C.forceRetire = chance(0.3);
}

/* ---------- partido simulado ---------- */
const NATIONS = [['Argentina', 82], ['Brasil', 84], ['Uruguay', 76], ['Colombia', 77], ['Ecuador', 73], ['Chile', 70], ['Paraguay', 70], ['Venezuela', 67], ['Bolivia', 60], ['España', 86], ['Francia', 87], ['Alemania', 83], ['Inglaterra', 85], ['Portugal', 84], ['Italia', 81], ['Países Bajos', 82], ['México', 74], ['Estados Unidos', 74], ['Japón', 76], ['Marruecos', 78], ['Senegal', 75], ['Croacia', 79], ['Corea del Sur', 73], ['Nigeria', 72]];
function peruStr() { return 66; }
function roleFor(m) {
  if (C.injured > 0) return { mins: 0, role: 'lesionado' };
  if (m.type === 'nation') return { mins: C.ovr >= 76 || C.trust > 60 ? 90 : 30, role: C.ovr >= 76 ? 'titular' : 'suplente' };
  const my = club();
  const score = (C.ovr - my.str) + (C.trust - 50) / 6 + (C.form - 50) / 12 - Math.max(0, C.fatigue - 70) / 8;
  if (C.age < 17 && score < 2) return { mins: 0, role: 'reserva' };
  if (score >= -3) return { mins: C.fatigue > 85 ? irand(55, 70) : chance(0.85) ? 90 : irand(65, 85), role: 'titular' };
  if (score >= -9) return { mins: irand(15, 35), role: 'suplente' };
  return { mins: 0, role: 'banca' };
}
function simMatch(m) {
  const my = C.clubId, isNat = m.type === 'nation';
  let A, B;
  if (isNat) { const r = pick(NATIONS.slice(0, 9)); A = { name: 'Perú', str: peruStr() }; B = { name: r[0], str: r[1] }; m.home = -1; m.away = -2; }
  else { A = club(m.home); B = club(m.away); }
  const mySide = isNat ? 'A' : (m.home === my ? 'A' : 'B');
  const role = roleFor(m);
  const onFrom = role.role === 'suplente' ? 90 - role.mins : 0, onTo = role.role === 'titular' ? role.mins : 90;
  const myTeam = mySide === 'A' ? A : B;
  let sA = A.str + 2.5, sB = B.str;
  if (role.mins > 0) { const imp = ((C.ovr - myTeam.str) * 0.2 + (C.form - 50) * 0.05 - Math.max(0, C.fatigue - 60) * 0.05) * role.mins / 90; if (mySide === 'A') sA += imp; else sB += imp; }
  let ga = poisson(1.35 * Math.exp((sA - sB) / 21)), gb = poisson(1.1 * Math.exp((sB - sA) / 21));
  const ev = [];
  const mins = n => Array.from({ length: n }, () => irand(2, 90)).sort((x, y) => x - y);
  const P = pos(), q = clamp(0.62 + (C.ovr - myTeam.str) / 28 + (C.form - 50) / 110 - C.fatigue / 320, 0.2, 1.9);
  let yg = 0, ya = 0;
  const addGoals = (n, side) => {
    for (const mi of mins(n)) {
      const mine = side === mySide, on = mi >= onFrom && mi <= onTo && role.mins > 0;
      let scorer = null, assist = null;
      if (mine && on) { if (chance(P.goal * q)) { scorer = 'you'; yg++; } else if (chance(P.ast * q)) { assist = 'you'; ya++; } }
      ev.push({ min: mi, type: 'goal', side, scorer, assist });
    }
  };
  addGoals(ga, 'A'); addGoals(gb, 'B');
  // ocasiones propias: goles extra que dependen solo de ti
  if (role.mins > 0) { const extra = poisson(P.solo * q * role.mins / 90); for (let k = 0; k < extra; k++) { ev.push({ min: irand(onFrom + 1, onTo), type: 'goal', side: mySide, scorer: 'you' }); yg++; } if (mySide === 'A') ga += extra; else gb += extra; }
  if (role.mins > 0) { const nChances = irand(0, 3); for (let k = 0; k < nChances; k++) ev.push({ min: irand(onFrom + 1, onTo), type: 'chance', side: mySide, you: true }); if (chance(0.08 + (100 - C.disc) / 800)) ev.push({ min: irand(onFrom + 1, onTo), type: 'yellow', you: true }); }
  if (role.role === 'suplente') ev.push({ min: onFrom, type: 'sub', you: true });
  ev.sort((x, y) => x.min - y.min);
  let hg = ga, ag = gb;
  let pens = null;
  if (m.ko && hg === ag) { const pa = irand(3, 5), pb = irand(3, 5); pens = pa === pb ? [pa + 1, pb] : [pa, pb]; if (chance(0.5)) pens.reverse(); }
  const won = mySide === 'A' ? (hg > ag || (pens && pens[0] > pens[1])) : (ag > hg || (pens && pens[1] > pens[0]));
  const drew = hg === ag && !pens;
  let rating = 0;
  if (role.mins > 0) rating = clamp(6 + yg * 1.05 + ya * 0.65 + (C.form - 50) / 70 + (won ? 0.45 : drew ? 0 : -0.35) - Math.max(0, C.fatigue - 65) / 45 + rand(-0.55, 0.55) - (role.role === 'suplente' ? 0.3 : 0), 3, 10);
  rating = Math.round(rating * 10) / 10;
  return { m, A, B, hg, ag, pens, ev, mySide, role, yg, ya, rating, won, drew };
}
function applyMatch(r) {
  const m = r.m, isNat = m.type === 'nation';
  if (r.role.mins > 0) {
    if (isNat) { C.nation.caps++; C.nation.goals += r.yg; }
    else { C.ss.apps++; C.ss.goals += r.yg; C.ss.assists += r.ya; C.ss.ratingSum += r.rating; C.career.apps++; C.career.goals += r.yg; C.career.assists += r.ya; C.career.ratingSum += r.rating; const h = C.history[C.history.length - 1]; h.apps++; h.goals += r.yg; h.assists += r.ya; }
    if (r.rating >= 8.3) { C.ss.motm++; C.career.motm++; }
    C.form = clamp(lerp(C.form, 50 + (r.rating - 6.2) * 22, 0.45), 5, 100);
    C.trust = clamp(C.trust + (r.rating - 6.4) * 3, 0, 100);
    C.fame = clamp(C.fame + (r.yg * 0.6 + r.ya * 0.3) * leagueFame() + (r.rating >= 8 ? 0.6 : 0) + (isNat ? 1 : 0), 0, 100);
    C.happy = clamp(C.happy + (r.won ? 2 : r.drew ? 0 : -2) + r.yg, 0, 100);
    C.fatigue = clamp(C.fatigue + r.role.mins / 90 * 14, 0, 100);
    if (chance(0.006 + Math.max(0, C.fatigue - 50) / 1500)) injure('en el partido');
  } else if (r.role.role === 'reserva' || r.role.role === 'banca') {
    C.ss.reserve++; C.career.reserve++; train(0.4); C.happy = clamp(C.happy - (C.age > 18 ? 2 : 0), 0, 100);
    C.fatigue = clamp(C.fatigue - 8, 0, 100);
  }
  if (!isNat && m.type === 'liga') recordLeague(m.home, m.away, r.hg, r.ag);
  if (m.ko && !isNat) { C.koRes = C.koRes || {}; C.koRes[m.type] = r.won ? C.clubId : (r.mySide === 'A' ? m.away : m.home); }
  C.lastMatch = r;
  C.followers = Math.max(C.followers, Math.round(300 + Math.pow(C.fame, 2.6) * 18));
}
function leagueFame() { const L = leagueOf(club()); return L.str >= 80 ? 1.6 : L.str >= 70 ? 1.1 : 0.8; }
function recordLeague(h, a, hg, ag) {
  const T = C.table, th = T[h], ta = T[a]; if (!th || !ta) return;
  th.p++; ta.p++; th.gf += hg; th.ga += ag; ta.gf += ag; ta.ga += hg;
  if (hg > ag) { th.w++; ta.l++; th.pts += 3; } else if (hg < ag) { ta.w++; th.l++; ta.pts += 3; } else { th.d++; ta.d++; th.pts++; ta.pts++; }
}
function quickSim(h, a, ko) { const A = club(h), B = club(a); let hg = poisson(1.35 * Math.exp((A.str + 2.5 - B.str) / 21)), ag = poisson(1.1 * Math.exp((B.str - A.str - 2.5) / 21)); let w = hg > ag ? h : hg < ag ? a : (ko ? (chance(0.5) ? h : a) : null); return { hg, ag, w }; }
function simOthers() {
  const w = C.week, my = C.clubId;
  const rd = C.fixtures[w - 1]; if (rd) for (const [h, a] of rd) if (h !== my && a !== my) { const r = quickSim(h, a); recordLeague(h, a, r.hg, r.ag); }
  for (const [T, weeks, type] of [[C.cup, CUP_WEEKS, 'copa'], [C.cont, CONT_WEEKS, 'cont']]) {
    if (!T || !weeks[w] || T.alive.length < 2) continue;
    const next = [];
    for (let i = 0; i < T.alive.length; i += 2) {
      const a = T.alive[i], b = T.alive[i + 1];
      if (b === undefined) next.push(a);
      else if ((a === my || b === my) && C.koRes && C.koRes[type] !== undefined) next.push(C.koRes[type]);
      else next.push(quickSim(a, b, true).w);
    }
    T.alive = next; if (C.koRes) delete C.koRes[type];
    if (T.alive.length === 1) T.winner = T.alive[0];
  }
}
function standings() { return Object.entries(C.table).map(([id, t]) => Object.assign({ id: +id }, t)).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf); }

/* ---------- semana ---------- */
function weeklyMoney() {
  const L = leagueOf(club());
  let inc = C.salary * (C.agent === 'turbio' ? 0.8 : C.agent === 'serio' ? 0.9 : 1);
  if (C.sponsor) inc += Math.round(C.fame * C.fame * 4 * (C.sponsorBig ? 2 : 1));
  const cost = HOUSES[C.house].week + C.cars.length * 150 + (C.kids * 300) + Math.round(C.fame * 20);
  if (C.invest) { const r = rand(-0.02, 0.035) * C.invest / 4; inc += r; C.invest = Math.max(0, C.invest + r * 0.2); }
  C.money += inc - cost;
  void L;
  return { inc: Math.round(inc), cost: Math.round(cost) };
}
function endWeekUpdate() {
  if (C.injured > 0) { C.injured--; if (!C.injured) log('Ya estás recuperado de tu lesión.', 'good'); }
  C.fatigue = clamp(C.fatigue - 22, 0, 100);
  C.happy = clamp(C.happy + (HOUSES[C.house].happy + C.cars.length) * 0.05 + (C.rel !== 'soltero' ? (C.relLvl - 50) / 60 : 0) + (C.mom - 50) / 80 + (C.friends - 50) / 90, 0, 100);
  C.disc = clamp(C.disc + (C.happy < 30 ? -1 : 0.2), 0, 100);
  if (C.rel === 'pareja' || C.rel === 'casado') C.relLvl = clamp(C.relLvl - 1.5, 0, 100);
  if (C.loan && chance(0.04)) { C.loan = false; if (chance(0.5)) { C.money += 12000; log('Tu amigo te devolvió el préstamo con intereses. ¡La pollería va bien!', 'good'); } else log('La pollería de tu amigo quebró. Ese préstamo no vuelve.', 'bad'); }
  C.peakOvr = Math.max(C.peakOvr, C.ovr);
}
function pickEvent() {
  if (!chance(0.62)) return null;
  const opts = EVENTS.filter(e => e.when(C) && !(C.seen || []).includes(e.id + C.season));
  if (!opts.length) return null;
  const e = pick(opts); (C.seen = C.seen || []).push(e.id + C.season); if (C.seen.length > 40) C.seen.shift();
  return e;
}
function applyFx(fxIn) {
  const fx = typeof fxIn === 'function' ? fxIn(C) : fxIn;
  const num = ['money', 'happy', 'disc', 'fame', 'trust', 'fatigue', 'form', 'mom', 'friends'];
  for (const k of num) if (fx[k] !== undefined) C[k] = k === 'money' ? C[k] + fx[k] : clamp(C[k] + fx[k], 0, 100);
  if (fx.relLvl) C.relLvl = clamp(C.relLvl + fx.relLvl, 0, 100);
  if (fx.rel) { C.rel = fx.rel; if (fx.rel === 'pareja') { C.partner = pick(PARTNER_NAMES); C.relLvl = 60; } if (fx.rel === 'soltero') { C.partner = null; C.relLvl = 0; } if (fx.rel === 'casado') C.relLvl = Math.max(C.relLvl, 80); }
  if (fx.kids) C.kids += fx.kids;
  if (fx.ovr) train(fx.ovr * 6);
  if (fx.followers) C.followers += fx.followers;
  for (const k of ['agent', 'momHouse', 'loan', 'sponsor', 'sponsorBig', 'captain', 'slowAging']) if (fx[k] !== undefined) C[k] = fx[k];
  if (fx.sponsorBig) C.sponsor = true;
  if (fx.invest) C.invest += fx.invest;
  if (fx.injury && chance(fx.injury)) injure('');
  if (fx.scandal && chance(fx.scandal)) { C.fame = clamp(C.fame + 3, 0, 100); C.trust = clamp(C.trust - 10, 0, 100); log('Tus fotos de la fiesta salieron en redes. Al DT no le gustó nada.', 'bad'); }
}

/* ---------- fichajes ---------- */
function makeOffers(kind) {
  const offers = [];
  const my = club();
  const cands = C.clubs.filter(c => c.id !== my.id && c.str <= C.ovr + 6 && c.str >= C.ovr - 16);
  const avg = C.ss && C.ss.apps ? C.ss.ratingSum / C.ss.apps : 6.3;
  const n = clamp(Math.round((C.fame / 25 + (avg - 6.2) * 1.5 + (C.agent === 'turbio' ? 1.2 : C.agent === 'serio' ? 0.6 : 0) + rand(-0.6, 1.2))), 0, 4);
  shuffle(cands).sort((a, b) => b.str - a.str);
  for (const c of cands.slice(0, 12)) {
    if (offers.length >= n) break;
    if (!chance(0.45)) continue;
    const L = leagueOf(c), w = wageFor(C.ovr, L) * rand(0.9, 1.3);
    const role = C.ovr >= c.str + 2 ? 'Titular' : C.ovr >= c.str - 5 ? 'Rotación' : 'Suplente';
    offers.push({ club: c.id, wage: Math.round(w / 10) * 10, years: irand(2, 5), role, fee: marketValue(), signing: Math.round(w * rand(4, 12)) });
  }
  if (C.age >= 19 && (C.contractEnd <= 1 || kind === 'renew')) {
    const w = wageFor(C.ovr, leagueOf(my)) * rand(0.95, 1.15);
    offers.unshift({ club: my.id, renew: true, wage: Math.round(w / 10) * 10, years: irand(2, 4), role: 'Renovación', fee: 0, signing: 0 });
  }
  return offers;
}
function signOffer(o) {
  const prev = club();
  if (!o.renew) {
    C.clubId = o.club; C.transfers++; C.trust = 45; C.captain = false;
    C.history.push({ club: o.club, from: C.season, apps: 0, goals: 0, assists: 0, fee: o.fee });
    const L = leagueOf(club());
    C.fame = clamp(C.fame + (L.str >= 80 ? 6 : 2), 0, 100);
    log('¡Fichaste por ' + club().name + ' (' + L.name + ')! Pagaron ' + money(o.fee) + ' por tu pase.', 'big');
    if (L.id !== prev.league) C.happy = clamp(C.happy - 6, 0, 100);
  } else log('Renovaste con ' + prev.name + ' por ' + o.years + ' años.', 'good');
  C.salary = o.wage; C.contractEnd = o.years; C.money += o.signing;
  if (C.agent === 'turbio') C.money -= o.signing * 0.2;
}

/* ---------- fin de temporada ---------- */
function trophy(name, kind, weight) { C.trophies.push({ name, kind, weight, season: C.season, year: yearNow(), club: club().name, age: C.age }); }
function endSeason() {
  const my = club(), L = leagueOf(my), res = { titles: [], awards: [], nation: null };
  const tbl = standings(), pos1 = tbl.findIndex(t => t.id === my.id) + 1;
  const lw = { per: 3, usa: 4, ara: 3, arg: 5, bra: 5, mex: 5, por: 6, esp: 10, ing: 10, ita: 9 }[L.id];
  if (pos1 === 1 && C.ss.apps >= 3) { trophy('Campeón de la ' + L.name, 'col', lw); res.titles.push('Campeón de la ' + L.name); }
  if (C.cup.winner === my.id && C.ss.apps >= 3) { trophy(C.cup.name, 'col', Math.max(2, lw / 2)); res.titles.push(C.cup.name); }
  if (C.cont && C.cont.winner === my.id && C.ss.apps >= 3) { const w = L.cont === 'euro' ? 16 : 9; trophy(C.cont.name, 'col', w); res.titles.push(C.cont.name); }
  const avg = C.ss.apps ? C.ss.ratingSum / C.ss.apps : 0;
  const topScorer = Math.round(rand(8, 13) * (C.pos === 'DEL' ? 1 : 0.9));
  if (C.ss.goals >= topScorer && C.ss.apps >= 8) { trophy('Goleador de la ' + L.name, 'ind', lw * 0.5); res.awards.push('Goleador del torneo (' + C.ss.goals + ' goles)'); }
  if (avg >= 7.45 && C.ss.apps >= 9) { trophy('Mejor jugador de la ' + L.name, 'ind', lw * 0.6); res.awards.push('Mejor jugador de la liga'); }
  if (C.age <= 21 && avg >= 7.1 && C.ss.apps >= 8) { trophy('Mejor jugador joven', 'ind', 3); res.awards.push('Mejor jugador joven'); }
  const ga = C.ss.goals + C.ss.assists * 0.7;
  const bdoReq = L.str >= 79 || (C.cont && C.cont.winner === my.id && L.cont === 'euro');
  if (bdoReq && C.ovr >= 86 && avg >= 7.5 && (ga >= 16 || (C.pos === 'DEF' && avg >= 7.7)) && chance(0.55 + (C.ovr - 86) * 0.08)) { trophy('Balón de Oro', 'ind', 22); res.awards.push('¡BALÓN DE ORO!'); }
  // selección: torneos cada dos años
  const y = yearNow();
  if (C.nation.caps > 0 && C.ovr >= 68 && (y % 4 === 2 || y % 4 === 0)) res.nation = playTournament(y % 4 === 2 ? 'Mundial' : 'Copa América');
  C.history[C.history.length - 1].to = C.season;
  C.seasonLog = (C.seasonLog || []);
  C.seasonLog.push({ season: C.season, year: y, club: my.name, league: L.name, pos: pos1, apps: C.ss.apps, goals: C.ss.goals, assists: C.ss.assists, avg: Math.round(avg * 10) / 10, ovr: C.ovr, titles: res.titles.concat(res.awards) });
  // envejecer y mundo
  ageUp();
  C.contractEnd--;
  for (const c of C.clubs) c.str = Math.round(clamp(lerp(c.str, c.base, 0.3) + rand(-3, 3), 35, 92));
  C.season++;
  res.pos = pos1; res.avg = avg;
  return res;
}
function playTournament(name) {
  const r = { name, games: [], champion: false, stage: '' };
  const pStr = peruStr() + (C.ovr - 70) * 0.25;
  const pool = shuffle(NATIONS.slice());
  const stages = ['Fase de grupos', 'Fase de grupos', 'Fase de grupos', 'Cuartos de final', 'Semifinal', 'Final'];
  let pts = 0, alive = true;
  for (let i = 0; i < stages.length && alive; i++) {
    const opp = pool[i];
    const g1 = poisson(1.25 * Math.exp((pStr - opp[1]) / 20)), g2 = poisson(1.2 * Math.exp((opp[1] - pStr) / 20));
    let yg = 0; for (let k = 0; k < g1; k++) if (chance(pos().goal * 0.9)) yg++;
    C.nation.caps++; C.nation.goals += yg; C.career.goals += 0;
    let won = g1 > g2; const draw = g1 === g2;
    if (i >= 3 && draw) won = chance(0.5);
    r.games.push({ stage: stages[i], opp: opp[0], g1, g2, yg, pens: i >= 3 && draw });
    if (i < 3) { pts += won ? 3 : draw ? 1 : 0; if (i === 2 && pts < 4) { alive = false; r.stage = 'Eliminados en grupos'; } }
    else if (!won) { alive = false; r.stage = 'Eliminados en ' + stages[i].toLowerCase(); }
  }
  if (alive) { r.champion = true; r.stage = '¡Campeones!'; trophy(name + ' con Perú', 'col', name === 'Mundial' ? 30 : 14); C.fame = clamp(C.fame + 15, 0, 100); }
  const tg = r.games.reduce((a, g) => a + g.yg, 0);
  if (tg >= 4 || (r.champion && tg >= 2)) { trophy('Mejor jugador del ' + name, 'ind', name === 'Mundial' ? 10 : 6); r.best = true; }
  return r;
}

/* ---------- puntaje de carrera ---------- */
function careerScore() {
  let raw = 0;
  const parts = [];
  const add = (k, v) => { raw += v; parts.push([k, v]); };
  add('Títulos con tus equipos', C.trophies.filter(t => t.kind === 'col').reduce((a, t) => a + t.weight, 0));
  add('Premios individuales', C.trophies.filter(t => t.kind === 'ind').reduce((a, t) => a + t.weight, 0));
  const posK = { DEL: 1, EXT: 1.15, MED: 1.35, DEF: 2.2 }[C.pos];
  add('Goles y asistencias', (C.career.goals * 0.09 + C.career.assists * 0.07) * posK);
  const seasons = Math.max(1, C.season - 1), part = clamp(C.career.apps / (seasons * 9), 0.15, 1);
  add('Nivel máximo alcanzado', Math.max(0, C.peakOvr - 58) * 0.7 * part);
  add('Selección nacional', C.nation.caps * 0.12 + C.nation.goals * 0.3);
  const topSeasons = (C.seasonLog || []).filter(s => ['Liga Española', 'Liga Inglesa', 'Liga Italiana'].includes(s.league) && s.apps >= 7).length;
  add('Temporadas en ligas top', topSeasons * 1.2);
  add('Fama', C.fame * 0.08 * part);
  const score = clamp(Math.round(100 * (1 - Math.exp(-raw / 95))), 1, 100);
  return { score, raw, parts };
}
function gradeFor(s) { return s >= 90 ? 'Leyenda del fútbol mundial' : s >= 75 ? 'Crack internacional' : s >= 60 ? 'Gran carrera' : s >= 45 ? 'Profesional respetado' : s >= 30 ? 'Carrera modesta' : s >= 15 ? 'Jugador de barrio' : 'Lo que pudo ser'; }
function retire() {
  const sc = careerScore();
  const sum = {
    id: Date.now(), name: C.first + ' ' + C.last, pos: C.pos, origin: C.origin, score: sc.score, grade: gradeFor(sc.score), parts: sc.parts,
    retireAge: C.age, seasons: C.season - 1, apps: C.career.apps, goals: C.career.goals, assists: C.career.assists,
    avg: C.career.apps ? Math.round(C.career.ratingSum / C.career.apps * 100) / 100 : 0, peakOvr: C.peakOvr, transfers: C.transfers,
    clubs: C.history.map(h => ({ name: C.clubs[h.club].name, from: START_YEAR + h.from - 1, to: START_YEAR + (h.to || C.season) - 1, apps: h.apps, goals: h.goals })),
    trophies: C.trophies.map(t => ({ name: t.name, kind: t.kind, year: t.year })), caps: C.nation.caps, natGoals: C.nation.goals,
    money: Math.round(C.money), house: HOUSES[C.house].name, cars: C.cars.length, family: C.rel === 'casado' ? 'Casado' + (C.kids ? ', ' + C.kids + (C.kids === 1 ? ' hijo' : ' hijos') : '') : C.rel === 'pareja' ? 'Con pareja' : 'Soltero', date: new Date().toLocaleDateString('es-PE'),
  };
  const hall = loadHall(); hall.push(sum); hall.sort((a, b) => b.score - a.score); saveHall(hall);
  C.done = true; persist();
  return sum;
}
function loadHall() { try { return JSON.parse(localStorage.getItem(HALL_KEY)) || []; } catch (e) { return []; } }
function saveHall(h) { try { localStorage.setItem(HALL_KEY, JSON.stringify(h.slice(0, 100))); } catch (e) { } }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(C)); } catch (e) { } }
function loadCareer() { try { const c = JSON.parse(localStorage.getItem(SAVE_KEY)); if (c && !c.done) { C = c; return true; } } catch (e) { } return false; }

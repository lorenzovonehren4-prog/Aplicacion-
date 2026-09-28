/* ================== INTERFAZ ================== */
const $ = s => document.querySelector(s);
const scr = id => { document.querySelectorAll('.screen').forEach(e => { e.hidden = e.id !== id; }); };
let plan = 'normal', busy = false;
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setPixelRatio(Math.min(QUAL.pr, window.devicePixelRatio || 1)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize);
function modal(html, wide) { const m = $('#modal'); m.innerHTML = '<div class="mcard' + (wide ? ' wide' : '') + '">' + html + '</div>'; m.hidden = false; if (typeof sfxPop === 'function') sfxPop(); return m; }
function closeModal() { $('#modal').hidden = true; }
function waitClick(sel) { return new Promise(res => { document.querySelectorAll(sel).forEach(b => b.addEventListener('click', e => { if (typeof sfxClick === 'function') sfxClick(); res(e.currentTarget); }, { once: true })); }); }
const bar = (v, col) => '<span class="bar"><i style="width:' + clamp(v, 0, 100) + '%;background:' + (col || (v >= 66 ? '#19D46E' : v >= 36 ? '#FFB800' : '#FF5A4E')) + '"></i></span>';
const crest = (c, cls) => '<img class="crest ' + (cls || '') + '" alt="" src="' + crestURL(c) + '">';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SPEED = () => ({ lento: 1.6, normal: 1, rapido: 0.45, instantaneo: 0 }[OPTS.speed] ?? 1);
function closeBtn(m, sel) { const b = m.querySelector(sel || '#close'); if (b) b.onclick = () => { sfxClick(); closeModal(); }; }
function fmtK(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' mil' : String(Math.round(n)); }
function toast(txt, kind) { const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.innerHTML = txt; $('#toasts').appendChild(d); setTimeout(() => d.classList.add('out'), 2600); setTimeout(() => d.remove(), 3200); }
function titleKit() { const cl = pick(C && C.clubs ? C.clubs.filter(c => c.league === 'per') : buildWorld().filter(c => c.league === 'per')); return kitOf(cl); }

/* ---------- inicio ---------- */
function showTitle() {
  scr('title');
  $('#btn-continue').hidden = !loadCareer();
  const hall = loadHall(); $('#btn-hall').textContent = 'Mis carreras' + (hall.length ? ' (' + hall.length + ')' : '');
  const ach = loadAch(), na = Object.keys(ach).length; $('#btn-ach').textContent = 'Logros (' + na + ' de ' + ACHIEVEMENTS.length + ')';
  if (hall.length) $('#t-best').innerHTML = '👑 Tu mejor carrera: <b>' + esc(hall[0].name) + '</b>, ' + hall[0].score + ' puntos'; else $('#t-best').textContent = '';
  const k1 = titleKit(), cl2 = kitOf({ id: 3, c1: '#FFFFFF', c2: '#1B1523', name: 'Visita' });
  buildStadium(k1, cl2, 0.9); S3.hype = 0.4;
  setMusic('menu'); crowdOff();
}
$('#btn-new').onclick = () => { sfxClick(); showCreate(); };
$('#btn-continue').onclick = () => { sfxClick(); if (loadCareer()) enterHub(); };
$('#btn-hall').onclick = () => { sfxClick(); showHall(); };
$('#btn-ach').onclick = () => { sfxClick(); showAchievements(); };
$('#btn-opts').onclick = () => { sfxClick(); showOptions(); };

/* ---------- crear jugador ---------- */
let cr = { pos: 'DEL', foot: 'Derecho', skin: '#A56B45' };
function showCreate() {
  scr('create');
  $('#c-first').value = pick(FIRST); $('#c-last').value = pick(LAST);
  $('#c-origin').innerHTML = BARRIOS.map(b => '<option>' + b + '</option>').join('');
  $('#c-pos').innerHTML = Object.entries(POSITIONS).map(([k, p]) => '<button data-pos="' + k + '" class="' + (cr.pos === k ? 'on' : '') + '"><b>' + k + '</b>' + p.name + '</button>').join('');
  $('#c-pos').querySelectorAll('button').forEach(b => b.onclick = () => { cr.pos = b.dataset.pos; sfxClick(); showCreateSel(); });
  $('#c-foot').querySelectorAll('button').forEach(b => b.onclick = () => { cr.foot = b.dataset.foot; sfxClick(); showCreateSel(); });
  $('#c-skin').innerHTML = ['#6B4428', '#8D5A3B', '#A56B45', '#C68A5E', '#D9A37A', '#F0C9A0'].map(c => '<button class="sw" style="--c:' + c + '" data-skin="' + c + '" aria-label="Tono de piel"></button>').join('');
  $('#c-skin').querySelectorAll('button').forEach(b => b.onclick = () => { cr.skin = b.dataset.skin; sfxClick(); showCreateSel(); });
  showCreateSel();
}
function showCreateSel() {
  $('#c-pos').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.pos === cr.pos));
  $('#c-foot').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.foot === cr.foot));
  $('#c-skin').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.skin === cr.skin));
}
$('#c-go').onclick = () => {
  const first = $('#c-first').value.trim() || 'Kevin', last = $('#c-last').value.trim() || 'Quispe';
  newCareer({ first, last, pos: cr.pos, foot: cr.foot, origin: $('#c-origin').value, skin: cr.skin });
  C.tut = OPTS.tutorial ? 0 : 99;
  persist(); sfxCash(); enterHub();
};
$('#c-back').onclick = () => { sfxClick(); showTitle(); };

/* ---------- centro de mando ---------- */
function enterHub() { scr('hub'); buildHome(); renderHub(); setMusic('menu'); crowdOff(); }
function renderHub() {
  const cl = club(), L = leagueOf(cl);
  $('#p-name').textContent = C.first + ' ' + C.last;
  $('#p-nick').textContent = C.nick ? '"' + C.nick + '"' : '';
  $('#p-sub').textContent = C.age + ' años, ' + POSITIONS[C.pos].name.toLowerCase() + ', de ' + C.origin;
  $('#p-ovr').textContent = C.ovr;
  $('#p-club').innerHTML = crest(cl) + '<span><b>' + esc(cl.name) + '</b><small>' + esc(L.name) + (C.onLoan ? ' · a préstamo' : '') + (C.captain ? ' · capitán' : '') + '</small></span>';
  $('#p-attrs').innerHTML = ATTRS.map(([k, n]) => '<div class="at"><span>' + n + '</span>' + bar(C.attr[k], '#2E6BFF') + '<b>' + Math.round(C.attr[k]) + '</b></div>').join('');
  $('#p-money').innerHTML = '<div><small>Plata</small><b>' + money(C.money) + '</b></div><div><small>Sueldo</small><b>' + money(C.salary) + '/sem</b></div><div><small>Contrato</small><b>' + (C.contractEnd > 0 ? C.contractEnd + (C.contractEnd === 1 ? ' año' : ' años') : 'Termina') + '</b></div><div><small>Seguidores</small><b>' + fmtK(C.followers) + '</b></div>' + (C.bonus ? '<div><small>Bono por gol</small><b>' + money(C.bonus) + '</b></div>' : '') + (C.clause ? '<div><small>Cláusula</small><b>' + money(C.clause) + '</b></div>' : '');
  $('#p-state').innerHTML = [['Forma', C.form], ['Energía', 100 - C.fatigue], ['Felicidad', C.happy], ['Disciplina', C.disc], ['Confianza del DT', C.trust], ['Fama', C.fame]].map(([n, v]) => '<div class="st"><span>' + n + '</span>' + bar(v) + '</div>').join('') + (C.rel !== 'soltero' ? '<div class="st"><span>' + (C.rel === 'casado' ? 'Matrimonio con ' : 'Relación con ') + esc(C.partner) + '</span>' + bar(C.relLvl, '#FF2E88') + '</div>' : '') + (C.injured ? '<div class="inj">Lesionado: ' + C.injured + (C.injured === 1 ? ' semana' : ' semanas') + '</div>' : '') + (C.suspended ? '<div class="inj">Suspendido: ' + C.suspended + (C.suspended === 1 ? ' fecha' : ' fechas') + '</div>' : '');
  $('#h-season').innerHTML = '<b>Temporada ' + yearNow() + '</b> · semana ' + (C.week + 1) + ' de ' + SEASON_WEEKS + '<span class="wk"><i style="width:' + (C.week / SEASON_WEEKS * 100) + '%"></i></span>';
  const next = (() => { const save = C.week; C.week++; const l = weekMatches(); C.week = save; return l; })();
  $('#h-next').innerHTML = next.length ? next.map(m => m.type === 'nation' ? '<div class="nx"><small>' + m.comp + '</small><b>' + '🇵🇪 Perú</b></div>' : '<div class="nx' + (m.derby ? ' derby' : '') + '"><small>' + esc(m.comp) + (m.derby ? ' · ¡CLÁSICO!' : '') + '</small><div class="vs">' + crest(club(m.home), 'sm') + '<b>' + esc(club(m.home).name) + '</b><i>vs</i><b>' + esc(club(m.away).name) + '</b>' + crest(club(m.away), 'sm') + '</div></div>').join('') : '<div class="nx"><small>Sin partido esta semana</small></div>';
  $('#plans').innerHTML = WEEK_PLANS.map(p => { const dis = p.adult && C.age < 18; return '<button class="plan' + (plan === p.id ? ' on' : '') + '" data-plan="' + p.id + '"' + (dis ? ' disabled' : '') + '><b>' + p.name + '</b><span>' + (dis ? 'Desde los 18 años' : p.desc) + '</span></button>'; }).join('');
  $('#plans').querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { plan = b.dataset.plan; sfxClick(); renderHub(); });
  $('#btn-week').textContent = 'Jugar semana ' + (C.week + 1) + ' ▶';
  $('#btn-retire').hidden = C.age < 33;
  $('#feed').innerHTML = C.log.slice(0, 14).map(l => '<div class="msg ' + l.kind + '"><small>' + (START_YEAR + l.s - 1) + ', sem ' + l.w + '</small>' + esc(l.t) + '</div>').join('');
  showTip();
}

/* ---------- tutorial ---------- */
const TUTORIAL = [
  { w: 0, t: '¡Bienvenido a tu carrera!', x: 'Cada semana eliges cómo vivirla en <b>"¿Cómo vives esta semana?"</b>. Después pasan cosas en tu vida y se juegan los partidos. Dale a <b>Jugar semana</b> cuando estés listo.' },
  { w: 1, t: 'La forma', x: 'La <b>forma</b> sube cuando juegas bien y baja cuando juegas mal. Con buena forma rindes más en la cancha.' },
  { w: 2, t: 'La energía', x: 'Entrenar fuerte y salir de fiesta te cansan. Con poca <b>energía</b> juegas peor y te puedes lesionar. Si estás en rojo, <b>descansa</b>.' },
  { w: 3, t: 'La confianza del DT', x: 'El DT decide si eres titular. Su <b>confianza</b> sube si entrenas y juegas bien, y baja con fiestas y escándalos. Revisa <b>Celular → Tu gente</b>.' },
  { w: 4, t: 'Tu casa', x: 'Haz clic en los objetos de tu casa: la <b>cama</b> para descansar, el <b>gimnasio</b> para entrenar extra, el <b>celular</b>, el <b>clóset</b> y la <b>tele</b>. Arrastra para girar la cámara.' },
  { w: 5, t: 'La plata', x: 'Con tu sueldo compras casas, carros y mascotas en la <b>Tienda</b>. Ojo: tu puntaje final depende de títulos, goles y nivel, no de la plata.' },
  { w: 6, t: 'El mercado', x: 'En la semana 7 llegan ofertas. Puedes <b>negociar</b> sueldo, años, prima, bono por gol y cláusula. Si pides demasiado, el club se levanta de la mesa.' },
];
function showTip() {
  const el = $('#tip');
  if (C.season > 1 || C.tut >= TUTORIAL.length || C.week < TUTORIAL[C.tut].w) { el.hidden = true; return; }
  const tp = TUTORIAL[C.tut];
  el.hidden = false;
  el.innerHTML = '<small>Consejo del profe · ' + (C.tut + 1) + ' de ' + TUTORIAL.length + '</small><h4>' + tp.t + '</h4><p>' + tp.x + '</p><div><button class="b g" id="tip-ok">Entendido</button><button class="b s" id="tip-skip">Saltar tutorial</button></div>';
  $('#tip-ok').onclick = () => { sfxClick(); C.tut++; persist(); showTip(); };
  $('#tip-skip').onclick = () => { sfxClick(); C.tut = 99; persist(); el.hidden = true; };
}

/* ---------- semana ---------- */
async function playWeek() {
  if (busy) return; busy = true;
  $('#hub').classList.add('dim');
  try {
    if (C.tut < TUTORIAL.length && C.season === 1) C.tut = Math.max(C.tut, TUTORIAL.findIndex(t => t.w > C.week + 1) >= 0 ? TUTORIAL.findIndex(t => t.w > C.week + 1) : TUTORIAL.length);
    $('#tip').hidden = true;
    C.week++;
    applyPlan(plan);
    if (plan === 'fiesta') await showDisco();
    if (C.week === 5 && !C.nation.called && C.ovr >= 64 && C.form >= 45 && C.ss.apps >= 2) { C.nation.called = true; log('¡Te convocaron a la selección peruana para las Eliminatorias!', 'big'); toast('🇵🇪 ¡Convocado a la selección!', 'big'); }
    const ev = pickEvent(); if (ev) await showEvent(ev);
    const ms = weekMatches();
    let first = true;
    for (const m of ms) { const r = simMatch(m); applyMatch(r); await showMatch(r, first); first = false; }
    simOthers();
    const mw = weeklyMoney(); if (C.weekGoals && C.bonus) toast('💰 Bono por goles cobrado', 'good'); void mw;
    endWeekUpdate();
    if (C.week === 7) {
      const offs = makeOffers('mid');
      if (C.ss.apps <= 2 && C.age >= 17) { const lo = makeLoanOffer(); if (lo) offs.push(lo); }
      if (offs.filter(o => !o.renew).length) await showOffers(offs, 'Mercado de pases de mitad de año', false);
    }
    if (C.week >= SEASON_WEEKS) {
      const res = endSeason();
      await showSeasonEnd(res);
      if (C.age >= 40 || C.forceRetire) { await showRetire(true); return; }
      let offs = makeOffers(C.contractEnd <= 0 ? 'renew' : 'pre');
      if (C.contractEnd <= 0 && !offs.length) offs = [emergencyOffer()];
      const last = C.seasonLog[C.seasonLog.length - 1];
      if (last && last.apps < 5 && C.contractEnd > 0 && C.age >= 17) { const lo = makeLoanOffer(); if (lo) offs.push(lo); }
      if (offs.length) await showOffers(offs, C.contractEnd <= 0 ? 'Tu contrato terminó: elige tu futuro' : 'Mercado de pases de verano', C.contractEnd <= 0);
      if (C.contractEnd <= 0) { C.contractEnd = 1; }
      startSeason(false);
      toast('📅 Arranca la temporada ' + yearNow(), 'big');
    }
    persist();
    if (!C.done) { buildHome(); renderHub(); setMusic('menu'); crowdOff(); }
  } finally { busy = false; $('#hub').classList.remove('dim'); }
}
function emergencyOffer() { const cands = C.clubs.filter(c => c.str <= C.ovr + 2).sort((a, b) => b.str - a.str); const c = cands[0] || C.clubs[0]; return { club: c.id, wage: wageFor(C.ovr, leagueOf(c)), years: 1, role: 'Suplente', fee: 0, signing: 0 }; }
$('#btn-week').onclick = () => { sfxClick(); playWeek(); };

/* ---------- eventos ---------- */
async function showEvent(ev) {
  const txt = typeof ev.text === 'function' ? ev.text(C) : ev.text;
  const m = modal('<small class="kick">' + (ev.chainOnly ? 'Consecuencias' : 'Tu vida') + '</small><h2>' + esc(ev.title) + '</h2><p>' + esc(txt) + '</p><div class="opts">' + ev.opts.map((o, i) => '<button class="b opt" data-i="' + i + '">' + esc(o.t) + '</button>').join('') + '</div>');
  const b = await waitClick('#modal .opt'); const o = ev.opts[+b.dataset.i];
  const before = { money: C.money, happy: C.happy, trust: C.trust, fame: C.fame };
  applyFx(o.fx); log(ev.title + ': ' + o.res, 'life');
  const diff = [['Plata', C.money - before.money, true], ['Felicidad', C.happy - before.happy], ['Confianza DT', C.trust - before.trust], ['Fama', C.fame - before.fame]].filter(d => Math.abs(d[1]) >= 0.5).map(([n, v, isM]) => '<span class="' + (v > 0 ? 'up' : 'down') + '">' + n + ' ' + (v > 0 ? '+' : '') + (isM ? money(v) : Math.round(v)) + '</span>').join('');
  m.querySelector('.mcard').innerHTML = '<small class="kick">Tu vida</small><h2>' + esc(ev.title) + '</h2><p class="res">' + esc(o.res) + '</p>' + (diff ? '<div class="diff">' + diff + '</div>' : '') + (o.fx && o.fx.chain ? '<p class="warn">⏳ Esta decisión tendrá consecuencias en unas semanas.</p>' : '') + '<button class="b g" id="ok">Seguir</button>';
  await waitClick('#ok'); closeModal();
}

/* ---------- discoteca ---------- */
async function showDisco() {
  buildDisco(); setMusic('disco');
  const steps = shuffle(DISCO_STEPS.slice()).slice(0, irand(2, 3));
  const p = $('#scenep'); p.hidden = false;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    p.innerHTML = '<small class="kick neon">La noche · ' + (i + 1) + ' de ' + steps.length + '</small><h3>' + esc(s.t) + '</h3><p>' + esc(s.q) + '</p><div class="opts">' + s.opts.map((o, j) => '<button class="b opt" data-i="' + j + '">' + esc(o.t) + '</button>').join('') + '</div>';
    const b = await waitClick('#scenep .opt'); const o = s.opts[+b.dataset.i];
    applyFx(o.fx); log('En la disco: ' + o.res, 'life');
    p.innerHTML = '<h3>' + esc(s.t) + '</h3><p class="res">' + esc(o.res) + '</p><button class="b g" id="dn">' + (i < steps.length - 1 ? 'Seguir la noche' : 'Volver a casa') + '</button>';
    await waitClick('#dn');
  }
  p.hidden = true; setMusic('menu');
}

/* ---------- partido en vivo ---------- */
const NAT_KIT = { Argentina: ['#75AADB', '#FFFFFF', 'rayas'], Brasil: ['#FFDF00', '#009C3B', 'liso'], Uruguay: ['#5CBFEB', '#FFFFFF', 'liso'], Colombia: ['#FCD116', '#003893', 'liso'], Ecuador: ['#FFD100', '#034EA2', 'liso'], Chile: ['#D52B1E', '#0039A6', 'liso'], Paraguay: ['#D52B1E', '#FFFFFF', 'rayas'], Venezuela: ['#7B1F2C', '#FFFFFF', 'liso'], Bolivia: ['#007934', '#FFFFFF', 'liso'] };
function kitsFor(r) {
  if (r.m.type === 'nation') { const n = NAT_KIT[r.B.name] || ['#2E6BFF', '#FFFFFF', 'liso']; return [PERU_KIT, { c1: n[0], c2: n[1], style: n[2], id: r.B.name, name: r.B.name }]; }
  const me = kitOf(club()), oppId = r.mySide === 'A' ? r.m.away : r.m.home; let foe = kitOf(club(oppId));
  if (me.c1 === foe.c1 || Math.abs(lum(me.c1) - lum(foe.c1)) < 0.08) foe = { c1: foe.c2, c2: foe.c1, style: foe.style, id: foe.id + 'b', name: foe.name };
  return [me, foe];
}
let MATCH = null;
async function showMatch(r, firstOfWeek) {
  const A = r.A, B = r.B, sp = SPEED();
  const isNat = r.m.type === 'nation';
  // llegada al estadio en tu carro
  if (firstOfWeek && !isNat && C.cars.length && sp > 0 && (r.m.derby || r.m.ko || chance(0.3))) {
    const best = C.cars.map(id => CARS.find(c => c.id === id)).sort((a, b) => b.cost - a.cost)[0];
    buildArrival(best.id, club()); crowdOn(0.3);
    $('#tvtag').hidden = false; $('#tvtag').textContent = 'LLEGADA AL ESTADIO';
    await sleep(3400);
  }
  const [kh, ka] = kitsFor(r);
  buildStadium(kh, ka, clamp(C.fame / 100 + (r.m.type !== 'liga' ? 0.45 : 0.25) + (r.m.derby ? 0.4 : 0), 0.2, 1));
  S3.hype = 0.25; crowdOn(r.m.derby ? 0.9 : 0.5); sfxWhistle(1);
  const el = $('#match'); el.hidden = false;
  const cA = crestHTML(r, 'A'), cB = crestHTML(r, 'B');
  el.innerHTML = '<div class="mb' + (r.m.derby ? ' derby' : '') + '"><small>' + esc(r.m.comp) + (r.m.derby ? ' · CLÁSICO' : '') + '</small><div class="score"><span class="tn">' + cA + esc(A.name) + '</span><b id="sc">0 - 0</b><span class="tn">' + esc(B.name) + cB + '</span></div><div class="min"><span id="mn">0\'</span><span class="mbar"><i id="mbi"></i></span></div><div class="role">' + roleText(r.role) + '</div><div class="lines" id="ln"></div><div class="mfoot"><span id="rt"></span><button class="b s" id="skip">Saltar ⏭</button><button class="b g" id="cont" hidden>Continuar</button></div><div class="posts" id="posts" hidden></div></div><div id="gol" hidden>¡GOOOL!</div>';
  $('#sbug').hidden = false; $('#sbug').innerHTML = '<span class="sb-t">' + esc(abbr(A.name)) + '</span><b id="sbs">0-0</b><span class="sb-t">' + esc(abbr(B.name)) + '</span><i id="sbm">0\'</i>';
  let skip = sp === 0; el.querySelector('#skip').onclick = () => { skip = true; if (S3.anim) S3.anim.t = 999; };
  let a = 0, b = 0, ei = 0, moments = 0;
  MATCH = r;
  const addLine = (min, txt, cls) => { const d = document.createElement('div'); d.className = 'ln ' + (cls || ''); d.innerHTML = '<b>' + min + '\'</b> ' + txt; $('#ln').prepend(d); };
  if (r.m.derby) addLine(0, pick(PHRASES.derby), 'warn');
  if (r.role.role === 'titular') addLine(0, phrase('start'), 'you');
  else if (r.role.role === 'banca') addLine(0, 'Te quedas en la banca todo el partido.', '');
  else if (r.role.role === 'reserva') addLine(0, 'Todavía juegas en la reserva. Hoy miras desde la tribuna.', '');
  else if (r.role.role === 'lesionado') addLine(0, 'Estás lesionado. Lo ves desde la tribuna.', '');
  else if (r.role.role === 'suspendido') addLine(0, 'Estás suspendido. Lo ves desde la tribuna.', 'warn');
  const moment = async kind => { if (skip || moments >= 3 || sp === 0) return; moments++; const d = playMoment(kind, 1 / Math.max(0.6, sp)); await waitMoment(d, () => skip); };
  for (let min = 1; min <= 90; min++) {
    while (ei < r.ev.length && r.ev[ei].min <= min) {
      const e = r.ev[ei++];
      if (e.type === 'goal') {
        if (e.side === 'A') a++; else b++;
        $('#sc').textContent = a + ' - ' + b; $('#sbs').textContent = a + '-' + b;
        const team = e.side === 'A' ? A.name : B.name, ours = e.side === r.mySide;
        if (e.scorer === 'you') { addLine(min, phrase('goal', team), 'goal you'); S3.hype = 1; if (!skip) { $('#gol').hidden = false; setTimeout(() => { $('#gol').hidden = true; }, 2400); } await moment('goal'); if (skip) sfxGoal(); }
        else if (e.assist === 'you') { addLine(min, phrase('assist', team), 'goal you'); S3.hype = 0.9; await moment('assist'); if (skip) sfxGoal(); }
        else { addLine(min, 'Gol de ' + esc(team) + '.', 'goal ' + (ours ? 'ours' : 'theirs')); if (ours) { sfxCheer(); S3.hype = 0.8; } else { sfxBoo(); S3.hype = 0.1; } }
      } else if (e.type === 'chance') addLine(min, phrase('chance'), 'you');
      else if (e.type === 'defense') { addLine(min, phrase('defense'), 'you'); if (chance(0.5)) await moment('defense'); }
      else if (e.type === 'yellow') { addLine(min, phrase('yellow'), 'warn'); sfxWhistle(1); }
      else if (e.type === 'sub') addLine(min, phrase('sub'), 'you');
    }
    $('#mn').textContent = min + '\''; $('#sbm').textContent = min + '\''; $('#mbi').style.width = (min / 90 * 100) + '%';
    if (min === 45) { addLine(45, 'Final del primer tiempo.', ''); if (!skip) { sfxWhistle(2); await sleep(500 * sp); } }
    S3.hype = lerp(S3.hype || 0.2, 0.25, 0.08);
    if (!skip) await sleep((min % 15 === 0 ? 160 : 45) * sp);
  }
  if (r.pens) addLine(90, 'Penales: ' + r.pens[0] + ' - ' + r.pens[1] + '.', 'goal');
  sfxWhistle(3);
  addLine(90, r.won ? pick(PHRASES.win) : r.drew ? pick(PHRASES.draw) : pick(PHRASES.loss), r.won ? 'goal ours' : '');
  if (r.won) { S3.hype = 1; confetti(new THREE.Vector3(0, 300, 0), [kh.c1, kh.c2, '#FFE14D'], QUAL.level === 'baja' ? 30 : 90); }
  $('#rt').innerHTML = r.role.mins > 0 ? 'Tu nota: <b class="' + (r.rating >= 7.5 ? 'hi' : r.rating < 6 ? 'lo' : '') + '">' + r.rating.toFixed(1) + '</b>' + (r.yg ? ', ' + r.yg + (r.yg === 1 ? ' gol' : ' goles') : '') + (r.ya ? ', ' + r.ya + (r.ya === 1 ? ' asistencia' : ' asistencias') : '') : 'No jugaste';
  if (r.posts && r.posts.length) { const pe = $('#posts'); pe.hidden = false; pe.innerHTML = '<small>Lo que dicen en redes</small>' + r.posts.map(p => '<div class="post"><b>' + esc(p.u) + '</b> ' + esc(p.t) + ' <span>❤ ' + fmtK(p.likes) + '</span></div>').join(''); }
  el.querySelector('#skip').hidden = true; el.querySelector('#cont').hidden = false;
  await waitClick('#cont'); el.hidden = true; $('#sbug').hidden = true; $('#tvtag').hidden = true; MATCH = null;
}
async function waitMoment(dur, cancel) { const t0 = performance.now(); while (S3.anim && performance.now() - t0 < dur * 1000 + 500) { if (cancel()) { if (S3.anim) S3.anim.t = 999; break; } await sleep(60); } }
function abbr(n) { const w = n.split(/\s+/).filter(p => !/^(de|del|la|el|los|las)$/i.test(p)); return (w.length > 1 ? w[0].slice(0, 2) + w[1][0] : n.slice(0, 3)).toUpperCase(); }
function crestHTML(r, side) { if (r.m.type === 'nation') { const nm = side === 'A' ? 'Perú' : r.B.name, k = side === 'A' ? PERU_KIT : { c1: (NAT_KIT[nm] || ['#2E6BFF'])[0], c2: (NAT_KIT[nm] || ['#2E6BFF', '#FFF'])[1], style: 'liso' }; return '<i class="flag" style="background:linear-gradient(90deg,' + k.c1 + ' 50%,' + k.c2 + ' 50%)"></i>'; } return crest(club(side === 'A' ? r.m.home : r.m.away), 'sm'); }
function roleText(r) { return { titular: 'Titular', suplente: 'Suplente: entrarías en el segundo tiempo', banca: 'En la banca', reserva: 'En la reserva', lesionado: 'Lesionado', suspendido: 'Suspendido' }[r.role] || ''; }

/* ---------- fichajes y negociación ---------- */
async function showOffers(offs, title, must) {
  for (;;) {
    offs = offs.filter(o => !o.walked);
    if (!offs.length) { if (must) offs = [emergencyOffer()]; else return; }
    const html = '<small class="kick">Tu futuro</small><h2>' + esc(title) + '</h2><p>Tu valor de mercado: <b>' + money(marketValue()) + '</b>. Nivel ' + C.ovr + '.' + (C.agent ? ' Representante: <b>' + esc(C.people.agente.name) + '</b>.' : '') + '</p><div class="offers">' + offs.map((o, i) => { const c = club(o.club), L = leagueOf(c); return '<div class="offer' + (o.loan ? ' loan' : '') + '">' + crest(c) + '<div class="oi"><b>' + esc(c.name) + '</b><small>' + esc(L.name) + ', nivel ' + c.str + '. ' + o.role + '</small><span>' + (o.loan ? 'Préstamo por lo que queda de la temporada. Juegas seguido.' : money(o.wage) + ' por semana, ' + o.years + (o.years === 1 ? ' año' : ' años') + (o.signing ? ', prima ' + money(o.signing) : '') + (o.fee ? '. Traspaso: ' + money(o.fee) : '')) + '</span></div><div class="oa">' + (o.loan ? '<button class="b g" data-acc="' + i + '">Aceptar préstamo</button>' : '<button class="b g" data-neg="' + i + '">Negociar</button>') + '</div></div>'; }).join('') + '</div>' + (must ? '' : '<button class="b s" id="stay">Quedarme donde estoy</button>');
    const m = modal(html, true);
    const r = await new Promise(res => {
      m.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => { sfxCash(); signOffer(offs[+b.dataset.acc]); closeModal(); res('done'); });
      m.querySelectorAll('[data-neg]').forEach(b => b.onclick = () => { sfxClick(); closeModal(); res(+b.dataset.neg); });
      const st = m.querySelector('#stay'); if (st) st.onclick = () => { sfxClick(); closeModal(); res('done'); };
    });
    if (r === 'done') return;
    const signed = await negotiateUI(offs[r]);
    if (signed) return;
  }
}
async function negotiateUI(o) {
  prepOffer(o);
  const cl = club(o.club);
  buildOffice(cl, C.agent);
  const p = $('#nego'); p.hidden = false;
  const b = o.base;
  const F = [
    { k: 'wage', n: 'Sueldo por semana', min: Math.round(b.wage * 0.8), max: Math.round(b.wage * 1.9), fmt: money },
    { k: 'years', n: 'Años de contrato', min: 1, max: 5, fmt: v => v + (v === 1 ? ' año' : ' años'), step: 1 },
    { k: 'signing', n: 'Prima por firmar', min: 0, max: Math.max(1000, Math.round(b.signing * 2.5)), fmt: money },
    { k: 'bonus', n: 'Bono por gol', min: 0, max: Math.max(100, Math.round(b.bonus * 3)), fmt: money },
    { k: 'clause', n: 'Cláusula de salida', min: Math.round(b.clause * 0.4), max: Math.round(b.clause * 1.3), fmt: money, hint: 'Más baja = más fácil irte a un club grande.' },
  ];
  const ask = { wage: o.wage, years: o.years, signing: o.signing, bonus: o.bonus, clause: o.clause };
  let msg = 'El director deportivo te recibe en su oficina.', mood = '';
  const render = () => {
    p.innerHTML = '<div class="nh">' + crest(cl, 'lg') + '<div><small class="kick">Negociación · ronda ' + (o.rounds + 1) + ' de 4</small><h3>' + esc(cl.name) + '</h3><small>' + esc(leagueOf(cl).name) + ' · ' + o.role + (o.renew ? ' · renovación' : '') + '</small></div></div>' +
      '<div class="st"><span>Cuánto te quieren</span>' + bar(o.interest * 83, '#FF2E88') + '</div>' +
      '<p class="agent">🗣 ' + esc(agentTalk(o)) + '</p>' +
      '<div class="nmsg ' + mood + '">' + msg + '</div>' +
      '<div class="nf">' + F.map(f => '<label>' + f.n + ' <em>Ellos: ' + f.fmt(o[f.k]) + '</em></label><div class="rng"><input type="range" data-k="' + f.k + '" min="' + f.min + '" max="' + f.max + '" step="' + (f.step || Math.max(1, Math.round((f.max - f.min) / 60))) + '" value="' + ask[f.k] + '"><b id="v-' + f.k + '">' + f.fmt(ask[f.k]) + '</b></div>' + (f.hint ? '<small class="hint">' + f.hint + '</small>' : '')).join('') + '</div>' +
      '<div class="nb"><button class="b g" id="n-prop">Proponer</button><button class="b" id="n-acc">Firmar lo que ofrecen</button><button class="b s" id="n-back">Volver a las ofertas</button></div>';
    p.querySelectorAll('input[type=range]').forEach(inp => inp.oninput = () => { const f = F.find(x => x.k === inp.dataset.k); ask[f.k] = +inp.value; $('#v-' + f.k).textContent = f.fmt(ask[f.k]); });
  };
  render();
  const out = await new Promise(res => {
    const bind = () => {
      $('#n-acc').onclick = () => { sfxCash(); officeReact('accept'); signOffer(o); res(true); };
      $('#n-back').onclick = () => { sfxClick(); res(false); };
      $('#n-prop').onclick = () => {
        const r = negotiate(o, Object.assign({}, ask));
        officeReact(r.v);
        if (r.v === 'accept') { sfxCash(); msg = '<b>¡Trato hecho!</b> Aceptaron todo lo que pediste.'; mood = 'ok'; p.querySelector('.nb').innerHTML = ''; render(); p.querySelector('.nb').innerHTML = '<button class="b g" id="n-sign">Firmar contrato ✍</button>'; $('#n-sign').onclick = () => { sfxCash(); signOffer(o); res(true); }; return; }
        if (r.v === 'walk') { sfxBad(); msg = '<b>Se levantaron de la mesa.</b> "Así no podemos seguir". La oferta ya no existe.'; mood = 'bad'; log('Pediste demasiado y ' + cl.name + ' retiró su oferta.', 'bad'); render(); p.querySelector('.nb').innerHTML = '<button class="b s" id="n-back2">Volver</button>'; $('#n-back2').onclick = () => res(false); return; }
        sfxPop(); msg = '<b>Contraoferta.</b> "Podemos acercarnos, pero no tanto". Mira sus nuevos números.'; mood = 'mid'; render(); bind();
      };
    };
    bind();
  });
  if (out) await sleep(1400);
  p.hidden = true;
  if (!out) buildHome();
  return out;
}

/* ---------- fin de temporada ---------- */
async function showSeasonEnd(r) {
  const s = C.seasonLog[C.seasonLog.length - 1];
  const kh = kitOf(C.clubs.find(c => c.name === s.club) || club());
  buildStadium(kh, kh, 0.8); S3.hype = r.titles.length ? 1 : 0.3;
  if (r.titles.length || r.awards.length) { confetti(new THREE.Vector3(0, 320, 0), [kh.c1, kh.c2, '#FFE14D', '#FFFFFF'], 160); sfxGoal(); }
  const nat = r.nation ? '<h3>' + r.nation.name + ' con Perú</h3><div class="natg">' + r.nation.games.map(g => '<div><small>' + g.stage + '</small> Perú ' + g.g1 + ' - ' + g.g2 + ' ' + esc(g.opp) + (g.yg ? ' <b>(' + g.yg + ' tuyo' + (g.yg > 1 ? 's' : '') + ')</b>' : '') + '</div>').join('') + '</div><p class="res">' + r.nation.stage + '</p>' : '';
  const ts = r.topScorer;
  const m = modal('<small class="kick">Fin de la temporada ' + s.year + '</small><h2>' + esc(s.club) + '</h2>' +
    '<div class="sgrid"><div><small>Posición</small><b>' + s.pos + '°</b></div><div><small>Partidos</small><b>' + s.apps + '</b></div><div><small>Goles</small><b>' + s.goals + '</b></div><div><small>Asistencias</small><b>' + s.assists + '</b></div><div><small>Nota media</small><b>' + (s.avg || '-') + '</b></div><div><small>Nivel</small><b>' + C.ovr + '</b></div></div>' +
    (r.titles.length || r.awards.length ? '<div class="troph">' + r.titles.map(t => '<span class="tc">🏆 ' + esc(t) + '</span>').join('') + r.awards.map(t => '<span class="ti">⭐ ' + esc(t) + '</span>').join('') + '</div>' : '<p class="res">Sin títulos esta temporada.</p>') +
    '<div class="hl">' + (r.best ? '<div><small>Tu mejor partido</small><b>' + r.best.text + '</b><span>Nota ' + r.best.rating.toFixed(1) + ' · ' + esc(r.best.comp) + '</span></div>' : '') + (r.bestGoal ? '<div><small>Tu mejor gol</small><b>' + r.bestGoal.text + '</b><span>' + esc(r.bestGoal.comp) + '</span><button class="b s sm" id="rep">▶ Ver repetición</button></div>' : '') + (ts && !ts.me ? '<div><small>Goleador de la liga</small><b>' + esc(ts.name) + '</b><span>' + ts.goals + ' goles</span></div>' : '') + '</div>' +
    (r.nick ? '<p class="nick">📰 La prensa te bautizó: <b>"' + esc(r.nick) + '"</b></p>' : '') + nat +
    '<p>Ahora tienes ' + C.age + ' años.</p><button class="b g" id="ok">Siguiente ▶</button>', true);
  const rep = m.querySelector('#rep');
  if (rep) rep.onclick = async () => { m.hidden = true; const d = playMoment('goal', 1); $('#tvtag').hidden = false; await waitMoment(d, () => false); $('#tvtag').hidden = true; m.hidden = false; };
  await waitClick('#ok'); closeModal();
}

/* ---------- tienda ---------- */
let shopTab = 'casa';
function showShop() {
  const tabs = [['casa', 'Casas'], ['carros', 'Carros'], ['mascotas', 'Mascotas']];
  let body = '';
  if (shopTab === 'casa') body = HOUSES.map((x, i) => '<div class="offer"><div class="oi"><b>' + x.name + '</b><small>' + (i ? 'Gasto ' + money(x.week) + ' por semana. +' + x.happy + ' felicidad' : 'Donde empezaste') + '</small></div><div class="oa">' + (C.house >= i ? '<span class="own">' + (C.house === i ? 'Vives aquí' : 'Ya pasaste') + '</span>' : '<button class="b g" data-house="' + i + '"' + (C.money < x.cost ? ' disabled' : '') + '>' + money(x.cost) + '</button>') + '</div></div>').join('');
  else if (shopTab === 'carros') body = CARS.map(x => '<div class="offer"><i class="swatch" style="background:' + x.col + '"></i><div class="oi"><b>' + x.name + '</b><small>+' + x.fame + ' de fama. Aparece en tu cochera y llegas en él al estadio.</small></div><div class="oa">' + (C.cars.includes(x.id) ? '<span class="own">En tu cochera</span>' : '<button class="b g" data-car="' + x.id + '"' + (C.money < x.cost ? ' disabled' : '') + '>' + money(x.cost) + '</button>') + '</div></div>').join('');
  else body = PETS.map(x => '<div class="offer"><i class="swatch" style="background:' + x.col + '"></i><div class="oi"><b>' + x.name + '</b><small>' + x.desc + ' +' + x.happy + ' felicidad.</small></div><div class="oa">' + (C.pets.includes(x.id) ? '<span class="own">En tu casa</span>' : '<button class="b g" data-pet="' + x.id + '"' + (C.money < x.cost ? ' disabled' : '') + '>' + money(x.cost) + '</button>') + '</div></div>').join('');
  const m = modal('<small class="kick">Tu vida</small><h2>Tienda</h2><p>Tienes <b>' + money(C.money) + '</b>.</p><div class="seg">' + tabs.map(([k, n]) => '<button data-t="' + k + '" class="' + (shopTab === k ? 'on' : '') + '">' + n + '</button>').join('') + '</div>' + body + '<button class="b s" id="close">Cerrar</button>');
  const after = t => { sfxCash(); log(t, 'big'); toast('🛍 ' + t, 'good'); persist(); buildHome(); renderHub(); showShop(); };
  m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { shopTab = b.dataset.t; sfxClick(); showShop(); });
  m.querySelectorAll('[data-house]').forEach(b => b.onclick = () => { const i = +b.dataset.house; C.money -= HOUSES[i].cost; C.house = i; C.happy = clamp(C.happy + 10, 0, 100); after('Te mudaste: ' + HOUSES[i].name + '.'); });
  m.querySelectorAll('[data-car]').forEach(b => b.onclick = () => { const x = CARS.find(c => c.id === b.dataset.car); C.money -= x.cost; C.cars.push(x.id); C.fame = clamp(C.fame + x.fame, 0, 100); C.happy = clamp(C.happy + 5, 0, 100); after('Te compraste: ' + x.name + '.'); });
  m.querySelectorAll('[data-pet]').forEach(b => b.onclick = () => { const x = PETS.find(c => c.id === b.dataset.pet); C.money -= x.cost; C.pets.push(x.id); C.happy = clamp(C.happy + x.happy, 0, 100); after('Adoptaste: ' + x.name + '.'); });
  closeBtn(m);
}
$('#h-shop').onclick = () => { sfxClick(); showShop(); };

/* ---------- tabla, goleadores, carrera, celular ---------- */
function showTable() {
  const t = standings();
  const cupTxt = C.cup.tied ? 'no participas (cambiaste de liga)' : C.cup.winner !== null && C.cup.winner !== undefined ? 'campeón ' + esc(club(C.cup.winner).name) : C.cup.alive.includes(C.clubId) ? 'sigues en carrera' : 'eliminado';
  const m = modal('<small class="kick">' + esc(leagueOf(club()).name) + '</small><h2>Tabla de posiciones</h2><table class="tbl"><tr><th>#</th><th>Club</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>Pts</th></tr>' + t.map((r, i) => '<tr class="' + (r.id === C.clubId ? 'me' : '') + (i === 0 ? ' lead' : '') + '"><td>' + (i + 1) + '</td><td class="cl">' + crest(club(r.id), 'xs') + esc(club(r.id).name) + (isDerby(r.id, C.clubId) ? ' <em>rival</em>' : '') + '</td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td>' + (r.gf - r.ga) + '</td><td><b>' + r.pts + '</b></td></tr>').join('') + '</table>' +
    '<p>' + esc(C.cup.name) + ': ' + cupTxt + (C.cont && C.cont.inIt ? '. ' + esc(C.cont.name) + ': ' + (C.cont.winner === C.clubId ? '¡campeón!' : C.cont.alive.includes(C.clubId) ? 'sigues en carrera' : 'eliminado') : '') + '</p><button class="b s" id="close">Cerrar</button>', true);
  closeBtn(m);
}
function showScorers() {
  const t = scorerTable().slice(0, 12);
  const m = modal('<small class="kick">' + esc(leagueOf(club()).name) + '</small><h2>Tabla de goleadores</h2><table class="tbl"><tr><th>#</th><th>Jugador</th><th>Club</th><th>Goles</th></tr>' + t.map((s, i) => '<tr class="' + (s.me ? 'me' : '') + '"><td>' + (i + 1) + '</td><td>' + (i === 0 ? '👟 ' : '') + esc(s.name) + '</td><td class="cl">' + crest(club(s.club), 'xs') + esc(abbr(club(s.club).name)) + '</td><td><b>' + s.goals + '</b></td></tr>').join('') + '</table><p class="hint">Solo cuentan los goles de liga. El goleador al final de la temporada se lleva el premio.</p><button class="b s" id="close">Cerrar</button>');
  closeBtn(m);
}
function showCareer() {
  const mv = C.moves.slice().reverse();
  const m = modal('<small class="kick">Tu carrera</small><h2>Clubes y fichajes</h2><div class="stat3"><div><small>Partidos</small><b>' + C.career.apps + '</b></div><div><small>Goles</small><b>' + C.career.goals + '</b></div><div><small>Asistencias</small><b>' + C.career.assists + '</b></div><div><small>Con Perú</small><b>' + C.nation.caps + '</b></div><div><small>Clásicos ganados</small><b>' + C.derbyWins + '</b></div><div><small>Valor</small><b>' + money(marketValue()) + '</b></div></div>' +
    '<h3>Historial de fichajes</h3><div class="moves">' + mv.map(x => '<div class="mv"><small>' + x.year + '</small>' + (x.from !== null && x.from !== x.to ? crest(club(x.from), 'xs') + '<span>' + esc(club(x.from).name) + '</span><i>→</i>' : '') + crest(club(x.to), 'xs') + '<span>' + esc(club(x.to).name) + '</span><em class="k-' + x.kind.split(' ')[0].toLowerCase() + '">' + x.kind + (x.fee ? ' · ' + money(x.fee) : '') + '</em></div>').join('') + '</div>' +
    '<h3>Temporada por temporada</h3><table class="tbl"><tr><th>Año</th><th>Club</th><th>PJ</th><th>G</th><th>A</th><th>Nota</th></tr>' + (C.seasonLog || []).slice().reverse().map(s => '<tr><td>' + s.year + '</td><td>' + esc(s.club) + '</td><td>' + s.apps + '</td><td>' + s.goals + '</td><td>' + s.assists + '</td><td>' + (s.avg || '-') + '</td></tr>').join('') + '</table>' +
    '<h3>Trofeos (' + C.trophies.length + ')</h3>' + (C.trophies.length ? '<div class="troph">' + C.trophies.map(t => '<span class="' + (t.kind === 'ind' ? 'ti' : 'tc') + '">' + (t.kind === 'ind' ? '⭐ ' : '🏆 ') + esc(t.name) + ' <small>' + t.year + '</small></span>').join('') + '</div>' : '<p class="none">Todavía no ganas nada. Paciencia.</p>') +
    '<button class="b s" id="close">Cerrar</button>', true);
  closeBtn(m);
}
let phoneTab = 'msg';
function showPhone() {
  const tabs = [['msg', 'Mensajes'], ['red', 'Redes'], ['gente', 'Tu gente']];
  let body = '';
  if (phoneTab === 'msg') body = C.log.slice(0, 30).map(l => '<div class="msg ' + l.kind + '"><small>' + (START_YEAR + l.s - 1) + ', sem ' + l.w + '</small>' + esc(l.t) + '</div>').join('');
  else if (phoneTab === 'red') body = '<p class="hint">' + fmtK(C.followers) + ' seguidores' + (C.nick ? ' · te dicen "' + esc(C.nick) + '"' : '') + '</p>' + (C.social.length ? C.social.map(p => '<div class="post"><b>' + esc(p.u) + '</b> ' + esc(p.t) + '<span>❤ ' + fmtK(p.likes) + ' · ' + (START_YEAR + p.s - 1) + ', sem ' + p.w + '</span></div>').join('') : '<p class="none">Todavía nadie habla de ti. Juega un partido.</p>');
  else body = Object.entries(PEOPLE_INFO).map(([k, inf]) => { const p = C.people[k]; if (k === 'agente' && !C.agent) return '<div class="person"><div><b>' + inf.t + '</b><small>No tienes representante todavía.</small></div></div>'; return '<div class="person"><div><b>' + esc(p.name) + '</b><small>' + inf.t + '. ' + inf.d + '</small></div>' + bar(p.lvl, p.lvl >= 60 ? '#19D46E' : p.lvl >= 35 ? '#FFB800' : '#FF5A4E') + '<em>' + relWord(p.lvl) + '</em></div>'; }).join('') +
    '<div class="person"><div><b>Tu mamá</b><small>Siempre está. Si la descuidas, se nota en tu ánimo.</small></div>' + bar(C.mom, '#FF2E88') + '<em>' + relWord(C.mom) + '</em></div>' +
    (C.rel !== 'soltero' ? '<div class="person"><div><b>' + esc(C.partner) + '</b><small>' + (C.rel === 'casado' ? 'Tu esposa' : 'Tu pareja') + '. Pasa tiempo con ella con el plan "Familia y pareja".</small></div>' + bar(C.relLvl, '#FF2E88') + '<em>' + relWord(C.relLvl) + '</em></div>' : '') +
    '<div class="person"><div><b>Tu collera del barrio</b><small>Los de siempre.</small></div>' + bar(C.friends, '#2E6BFF') + '<em>' + relWord(C.friends) + '</em></div>';
  const m = modal('<div class="phone"><div class="notch"></div><small class="kick">Tu celular</small><div class="seg">' + tabs.map(([k, n]) => '<button data-t="' + k + '" class="' + (phoneTab === k ? 'on' : '') + '">' + n + '</button>').join('') + '</div><div class="pbody">' + body + '</div><button class="b s" id="close">Cerrar</button></div>');
  m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { phoneTab = b.dataset.t; sfxClick(); showPhone(); });
  closeBtn(m);
}
function relWord(v) { return v >= 80 ? 'Uña y mugre' : v >= 60 ? 'Bien' : v >= 40 ? 'Normal' : v >= 20 ? 'Tensa' : 'Rota'; }
$('#h-table').onclick = () => { sfxClick(); showTable(); };
$('#h-scorers').onclick = () => { sfxClick(); showScorers(); };
$('#h-career').onclick = () => { sfxClick(); showCareer(); };
$('#h-phone').onclick = () => { sfxClick(); showPhone(); };
$('#h-opts').onclick = () => { sfxClick(); showOptions(); };
$('#btn-retire').onclick = async () => { sfxClick(); modal('<h2>¿Retirarte?</h2><p>Tienes ' + C.age + ' años. Tu carrera terminará y verás tu puntaje final.</p><div class="opts"><button class="b g" id="yes">Sí, colgar los chimpunes</button><button class="b s" id="no">Todavía no</button></div>'); const b = await waitClick('#modal #yes, #modal #no'); closeModal(); if (b.id === 'yes') showRetire(false); };
$('#h-menu').onclick = () => { sfxClick(); persist(); showTitle(); };

/* ---------- acciones en la casa ---------- */
function onHomeAction(id) {
  const wk = absWeek(), used = C.homeUsed;
  if (id === 'cama') { if (used.cama === wk) return toast('Ya descansaste esta semana.'); used.cama = wk; C.fatigue = clamp(C.fatigue - 15, 0, 100); C.happy = clamp(C.happy + 2, 0, 100); toast('😴 Siesta reparadora: +15 de energía', 'good'); }
  else if (id === 'gym') { if (used.gym === wk) return toast('Ya entrenaste extra esta semana.'); used.gym = wk; train(0.5); C.fatigue = clamp(C.fatigue + 8, 0, 100); C.disc = clamp(C.disc + 1, 0, 100); toast('💪 Entrenamiento extra en casa', 'good'); }
  else if (id === 'celular') return showPhone();
  else if (id === 'tv') return showTV();
  else if (id === 'vitrina') return showCareer();
  else if (id === 'cochera') { shopTab = 'carros'; return showShop(); }
  else if (id === 'closet') return showCloset();
  persist(); renderHub();
}
function showCloset() {
  const cols = ['#F4F4F2', '#1B1523', '#E23B3B', '#2E6BFF', '#19A35A', '#FFE14D', '#FF7A1A', '#7B3FF2', '#FF2E88', '#8B5E3C', '#6FB3E0', '#C0C4CC'];
  const m = modal('<small class="kick">Tu clóset</small><h2>¿Qué te pones hoy?</h2><div class="swatches">' + cols.map(c => '<button class="sw big' + (C.outfit === c ? ' on' : '') + '" style="--c:' + c + '" data-c="' + c + '" aria-label="Color"></button>').join('') + '</div><p class="hint">Tu ropa se ve en tu casa, en la oficina y en la discoteca.</p><button class="b s" id="close">Listo</button>');
  m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { C.outfit = b.dataset.c; sfxPop(); persist(); buildHome(); showCloset(); });
  closeBtn(m);
}
function showTV() {
  const lm = C.lastMatch, t = standings().slice(0, 5), sc = scorerTable().slice(0, 5);
  const m = modal('<small class="kick">Resumen de la jornada</small><h2>Fútbol en la tele</h2>' + (lm ? '<div class="tvres"><b>' + esc(lm.A) + ' ' + lm.hg + ' - ' + lm.ag + ' ' + esc(lm.B) + '</b><small>' + esc(lm.comp) + (lm.role === 'titular' || lm.role === 'suplente' ? ' · tu nota: ' + lm.rating.toFixed(1) : ' · no jugaste') + '</small></div>' : '<p>Todavía no juegas esta temporada.</p>') +
    '<h3>Arriba en la tabla</h3><table class="tbl">' + t.map((r, i) => '<tr class="' + (r.id === C.clubId ? 'me' : '') + '"><td>' + (i + 1) + '</td><td class="cl">' + crest(club(r.id), 'xs') + esc(club(r.id).name) + '</td><td><b>' + r.pts + '</b></td></tr>').join('') + '</table><h3>Goleadores</h3><table class="tbl">' + sc.map((s, i) => '<tr class="' + (s.me ? 'me' : '') + '"><td>' + (i + 1) + '</td><td>' + esc(s.name) + '</td><td><b>' + s.goals + '</b></td></tr>').join('') + '</table><button class="b s" id="close">Apagar la tele</button>');
  closeBtn(m);
}

/* ---------- retiro, periódico y puntaje final ---------- */
async function showRetire(forced) {
  const s = retire();
  if (forced) log('Llegó el momento de retirarte.', 'big');
  buildCeremony(s); crowdOn(1); setMusic('none');
  scr('cere');
  $('#cere').innerHTML = '<div class="cbig"><small>Ceremonia de despedida</small><h1>Gracias, ' + esc(s.name) + '</h1><p>' + esc(s.bestClub.name) + ' llenó su estadio para despedirte. ' + s.trophies.length + (s.trophies.length === 1 ? ' trofeo te espera' : ' trofeos te esperan') + ' en el centro del campo.</p><button class="b g" id="ce-go" hidden>Ver mi puntaje final</button></div>';
  setTimeout(() => { const b = $('#ce-go'); if (b) b.hidden = false; }, 5200);
  await waitClick('#ce-go');
  renderSummary(s, true);
}
function headline(s) {
  const o = s.origin.toUpperCase(), L = s.name.split(' ').slice(-1)[0].toUpperCase();
  if (s.score >= 90) return ['SE RETIRA LA LEYENDA DE ' + o, 'El país entero le dice gracias al mejor de su generación.'];
  if (s.score >= 75) return ['ADIÓS AL CRACK DE ' + o, 'Brilló en Europa y dejó la vara alta para los que vienen.'];
  if (s.score >= 60) return [L + ' CUELGA LOS CHIMPUNES', 'Una gran carrera que su barrio no olvidará.'];
  if (s.score >= 45) return [s.name.toUpperCase() + ' SE DESPIDE DEL FÚTBOL', 'Profesional de los que ya no hay.'];
  if (s.score >= 30) return ['SE RETIRA ' + L + ', EL GUERRERO', 'No llegó a la cima, pero nunca se rindió.'];
  return ['¿Y SI SE HUBIERA CUIDADO?', s.name + ' se retira: el talento estaba, la disciplina no.'];
}
function renderSummary(s, animate) {
  scr('summary');
  const k = s.bestClub ? kitOf({ id: s.bestClub.id, name: s.bestClub.name, c1: s.bestClub.c1, c2: s.bestClub.c2 }) : '#FFE14D';
  buildStadium(k, k, 1); S3.hype = 1; crowdOn(0.8);
  if (animate) setTimeout(() => { playMoment('goal', 0.8); }, 400);
  const col = s.trophies.filter(t => t.kind === 'col'), ind = s.trophies.filter(t => t.kind === 'ind');
  const group = arr => { const m = {}; for (const t of arr) m[t.name] = (m[t.name] || 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const [hl, sub] = headline(s);
  const newAch = (s.newAch || []).map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
  $('#summary').innerHTML = '<div class="scard"><div class="stop"><div class="ring"><svg viewBox="0 0 120 120"><defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#19D46E"/><stop offset="1" stop-color="#FFE14D"/></linearGradient></defs><circle cx="60" cy="60" r="52" class="rbg"/><circle cx="60" cy="60" r="52" class="rfg" id="rfg"/></svg><b id="snum">0</b><small>de 100</small></div><div class="sti"><small>Fin de la carrera</small><h2>' + esc(s.name) + '</h2>' + (s.nick ? '<p class="snick">"' + esc(s.nick) + '"</p>' : '') + '<p class="grade" id="sgrade">' + esc(s.grade) + '</p><p>' + POSITIONS[s.pos].name + ' de ' + esc(s.origin) + '. Se retiró a los ' + s.retireAge + ' años.</p></div></div>' +
    '<div class="paper" id="paper"><div class="ph"><span>EL CHIMPUNAZO</span><small>' + esc(s.date) + ' · Edición especial</small></div><h1>' + esc(hl) + '</h1><div class="pb">' + (s.bestClub ? '<img alt="" src="' + crestURL({ id: s.bestClub.id, name: s.bestClub.name, c1: s.bestClub.c1, c2: s.bestClub.c2 }) + '">' : '') + '<p><b>' + esc(sub) + '</b> ' + esc(s.name) + ' jugó ' + s.apps + ' partidos, marcó ' + s.goals + ' goles y dio ' + s.assists + ' asistencias en ' + s.seasons + ' temporadas. Ganó ' + col.length + (col.length === 1 ? ' título' : ' títulos') + ' y ' + ind.length + (ind.length === 1 ? ' premio individual' : ' premios individuales') + '. Su club del alma: ' + esc(s.bestClub ? s.bestClub.name : '') + '.</p></div></div>' +
    (newAch.length ? '<h3>¡Logros desbloqueados!</h3><div class="troph">' + newAch.map(a => '<span class="ach">🏅 ' + esc(a.name) + '</span>').join('') + '</div>' : '') +
    '<div class="sgrid"><div><small>Partidos</small><b data-n="' + s.apps + '">0</b></div><div><small>Goles</small><b data-n="' + s.goals + '">0</b></div><div><small>Asistencias</small><b data-n="' + s.assists + '">0</b></div><div><small>Nivel máximo</small><b data-n="' + s.peakOvr + '">0</b></div><div><small>Fichajes</small><b data-n="' + s.transfers + '">0</b></div><div><small>Con Perú</small><b>' + s.caps + ' PJ, ' + s.natGoals + ' g</b></div></div>' +
    '<h3>Títulos colectivos (' + col.length + ')</h3><div class="troph">' + (col.length ? group(col).map(([n, c]) => '<span class="tc">🏆 ' + esc(n) + (c > 1 ? ' x' + c : '') + '</span>').join('') : '<span class="none">Ninguno</span>') + '</div>' +
    '<h3>Premios individuales (' + ind.length + ')</h3><div class="troph">' + (ind.length ? group(ind).map(([n, c]) => '<span class="ti">⭐ ' + esc(n) + (c > 1 ? ' x' + c : '') + '</span>').join('') : '<span class="none">Ninguno</span>') + '</div>' +
    '<h3>Tu camino</h3><div class="path">' + s.clubs.map(c => '<div><b>' + esc(c.name) + '</b><small>' + c.from + (c.to && c.to !== c.from ? '-' + c.to : '') + ', ' + c.apps + ' PJ, ' + c.goals + ' goles</small></div>').join('') + '</div>' +
    ((s.moves || []).length ? '<h3>Fichajes</h3><div class="moves">' + s.moves.map(x => '<div class="mv"><small>' + x.year + '</small><span>' + esc(x.from) + '</span><i>→</i><span>' + esc(x.to) + '</span><em>' + x.kind + (x.fee ? ' · ' + money(x.fee) : '') + '</em></div>').join('') + '</div>' : '') +
    '<h3>Tu vida</h3><p>' + esc(s.house) + '. ' + s.cars + (s.cars === 1 ? ' carro' : ' carros') + '. ' + esc(s.family) + '. Terminaste con ' + money(s.money) + '.</p>' +
    '<h3>Cómo se calculó</h3><div class="parts">' + s.parts.map(([k2, v]) => '<div><span>' + k2 + '</span><b>+' + v.toFixed(1) + '</b></div>').join('') + '</div>' +
    '<div class="opts row"><button class="b g" id="s-new">Nueva carrera</button><button class="b" id="s-img">📸 Compartir como imagen</button><button class="b s" id="s-hall">Mis carreras</button></div></div>';
  $('#s-new').onclick = () => { sfxClick(); showCreate(); }; $('#s-hall').onclick = () => { sfxClick(); showHall(); }; $('#s-img').onclick = () => { sfxClick(); exportImage(s); };
  const ring = $('#rfg'), L = 2 * Math.PI * 52; ring.style.strokeDasharray = L; ring.style.strokeDashoffset = L;
  const dur = animate ? 2800 : 1, t0 = performance.now();
  let lastN = -1;
  const step = t => { const kk = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - kk, 3); const n = Math.round(s.score * e); $('#snum').textContent = n; if (animate && n !== lastN && n % 4 === 0) { tone(300 + n * 8, 0.05, 'triangle', 0.04); } lastN = n; ring.style.strokeDashoffset = L * (1 - s.score / 100 * e); document.querySelectorAll('#summary [data-n]').forEach(b => { b.textContent = Math.round(+b.dataset.n * e); }); if (kk < 1) requestAnimationFrame(step); else { $('#sgrade').classList.add('pop'); $('#paper').classList.add('in'); if (animate) { sfxGoal(); confetti(new THREE.Vector3(0, 300, 0), [k.c1 || '#FFE14D', '#FFE14D', '#FFFFFF'], 150); } } };
  requestAnimationFrame(step);
}
function exportImage(s) {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0B1030'); g.addColorStop(1, '#16391F'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 14; i++) x.fillRect(i * W / 14, 820, W / 28, H);
  x.fillStyle = '#19D46E'; x.font = '44px ' + FONT_D; x.textAlign = 'left'; x.fillText('MODO CARRERA FÚTBOL', 70, 110);
  x.lineWidth = 34; x.strokeStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(250, 380, 150, 0, Math.PI * 2); x.stroke();
  const rg = x.createLinearGradient(100, 0, 400, 0); rg.addColorStop(0, '#19D46E'); rg.addColorStop(1, '#FFE14D'); x.strokeStyle = rg; x.lineCap = 'round'; x.beginPath(); x.arc(250, 380, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.score / 100); x.stroke();
  x.fillStyle = '#FFFFFF'; x.textAlign = 'center'; x.font = '120px ' + FONT_D; x.fillText(String(s.score), 250, 420); x.font = '28px Rubik, sans-serif'; x.fillText('de 100', 250, 470);
  x.textAlign = 'left'; x.font = '58px ' + FONT_D; fitFont(x, s.name.toUpperCase(), 600, 58, FONT_D); x.fillText(s.name.toUpperCase(), 450, 330);
  x.fillStyle = '#FFE14D'; x.font = '36px ' + FONT_D; fitFont(x, s.grade, 590, 36, FONT_D); x.fillText(s.grade, 450, 390);
  x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '30px Rubik, sans-serif'; x.fillText(POSITIONS[s.pos].name + ' de ' + s.origin, 450, 440); if (s.nick) x.fillText('"' + s.nick + '"', 450, 480);
  const stats = [['Partidos', s.apps], ['Goles', s.goals], ['Asistencias', s.assists], ['Títulos', s.trophies.filter(t => t.kind === 'col').length], ['Premios', s.trophies.filter(t => t.kind === 'ind').length], ['Nivel máx.', s.peakOvr]];
  stats.forEach(([n, v], i) => { const cx = 70 + (i % 3) * 320, cy = 600 + Math.floor(i / 3) * 190; x.fillStyle = 'rgba(255,255,255,.08)'; roundRect(x, cx, cy, 300, 160, 24); x.fill(); x.fillStyle = '#FFFFFF'; x.font = '72px ' + FONT_D; x.textAlign = 'center'; x.fillText(String(v), cx + 150, cy + 95); x.font = '26px Rubik, sans-serif'; x.fillStyle = 'rgba(255,255,255,.7)'; x.fillText(n.toUpperCase(), cx + 150, cy + 138); });
  x.textAlign = 'left'; x.fillStyle = '#FFFFFF'; x.font = '30px ' + FONT_D; x.fillText('TU CAMINO', 70, 1020);
  x.font = '28px Rubik, sans-serif'; x.fillStyle = 'rgba(255,255,255,.85)';
  const path = s.clubs.map(c => c.name).filter((n, i, a) => a.indexOf(n) === i); let line = '', y = 1068;
  for (const n of path) { if (x.measureText(line + n + ' → ').width > 940) { x.fillText(line, 70, y); y += 40; line = ''; if (y > 1220) break; } line += n + ' → '; }
  if (y <= 1220) x.fillText(line.replace(/ → $/, ''), 70, y);
  x.fillStyle = 'rgba(255,255,255,.5)'; x.font = '24px Rubik, sans-serif'; x.textAlign = 'center'; x.fillText('¿Puedes superarlo? Juega Modo Carrera Fútbol', W / 2, 1300);
  let url = ''; try { url = cv.toDataURL('image/png'); } catch (e) { }
  const m = modal('<small class="kick">Compartir</small><h2>Tu carrera en una imagen</h2><img class="share" alt="Resumen de tu carrera" src="' + url + '"><p class="hint">Para guardarla, haz clic derecho sobre la imagen y elige "Guardar imagen como". En el celular, mantenla presionada.</p><button class="b g" id="close">Listo</button>');
  closeBtn(m);
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

/* ---------- mis carreras: lista, comparar y récords ---------- */
let hallTab = 'lista', cmpSel = [];
function showHall() {
  scr('hall');
  const h = loadHall();
  $('#hall-tabs').innerHTML = [['lista', 'Carreras'], ['comparar', 'Comparar'], ['records', 'Récords']].map(([k, n]) => '<button data-t="' + k + '" class="' + (hallTab === k ? 'on' : '') + '">' + n + '</button>').join('');
  $('#hall-tabs').querySelectorAll('button').forEach(b => b.onclick = () => { hallTab = b.dataset.t; cmpSel = []; sfxClick(); showHall(); });
  const L = $('#hall-list');
  if (!h.length) { L.innerHTML = '<p>Todavía no terminas ninguna carrera. ¡Empieza una!</p>'; return; }
  if (hallTab === 'records') {
    L.innerHTML = RECORDS.map(r => { const best = h.slice().sort((a, b) => r.val(b) - r.val(a))[0]; return '<div class="rec"><small>' + r.name + '</small><b>' + r.fmt(r.val(best)) + '</b><span>' + esc(best.name) + ' · ' + best.score + ' pts</span></div>'; }).join('');
    return;
  }
  L.innerHTML = (hallTab === 'comparar' ? '<p class="hint">Elige dos carreras para compararlas lado a lado.</p>' : '') + h.map((s, i) => '<button class="hc' + (i === 0 ? ' best' : '') + (cmpSel.includes(i) ? ' sel' : '') + '" data-i="' + i + '"><b class="hs">' + s.score + '</b><span class="hi"><b>' + (i === 0 ? '👑 ' : '') + esc(s.name) + (s.nick ? ' <em>"' + esc(s.nick) + '"</em>' : '') + '</b><small>' + esc(s.grade) + '. ' + POSITIONS[s.pos].name + ', ' + s.seasons + ' temporadas</small><small>' + s.goals + ' goles, ' + s.assists + ' asistencias, ' + s.trophies.length + ' trofeos, ' + s.transfers + ' fichajes</small></span><small class="hd">' + s.date + '</small></button>').join('');
  document.querySelectorAll('.hc').forEach(b => b.onclick = () => {
    sfxClick(); const i = +b.dataset.i;
    if (hallTab !== 'comparar') return renderSummary(h[i], false);
    if (cmpSel.includes(i)) cmpSel = cmpSel.filter(x => x !== i); else cmpSel.push(i);
    if (cmpSel.length === 2) { compare(h[cmpSel[0]], h[cmpSel[1]]); cmpSel = []; }
    showHall();
  });
}
function compare(a, b) {
  const rows = [['Puntaje', s => s.score], ['Temporadas', s => s.seasons], ['Partidos', s => s.apps], ['Goles', s => s.goals], ['Asistencias', s => s.assists], ['Títulos', s => s.trophies.filter(t => t.kind === 'col').length], ['Premios', s => s.trophies.filter(t => t.kind === 'ind').length], ['Nivel máximo', s => s.peakOvr], ['Con Perú', s => s.caps], ['Fichajes', s => s.transfers], ['Plata final', s => s.money, money]];
  const m = modal('<small class="kick">Cara a cara</small><h2>Comparar carreras</h2><table class="tbl cmp"><tr><th></th><th>' + esc(a.name) + '</th><th>' + esc(b.name) + '</th></tr>' + rows.map(([n, f, fm]) => { const va = f(a), vb = f(b); return '<tr><td>' + n + '</td><td class="' + (va > vb ? 'win' : '') + '">' + (fm ? fm(va) : va) + '</td><td class="' + (vb > va ? 'win' : '') + '">' + (fm ? fm(vb) : vb) + '</td></tr>'; }).join('') + '</table><button class="b s" id="close">Cerrar</button>', true);
  closeBtn(m);
}
$('#hall-back').onclick = () => { sfxClick(); showTitle(); };
function showAchievements() {
  const got = loadAch();
  const m = modal('<small class="kick">Entre todas tus carreras</small><h2>Logros</h2><div class="achs">' + ACHIEVEMENTS.map(a => '<div class="achc' + (got[a.id] ? ' on' : '') + '"><b>' + (got[a.id] ? '🏅 ' : '🔒 ') + esc(a.name) + '</b><small>' + esc(a.desc) + '</small>' + (got[a.id] ? '<em>' + esc(got[a.id].name) + ', ' + got[a.id].date + '</em>' : '') + '</div>').join('') + '</div><button class="b s" id="close">Cerrar</button>', true);
  closeBtn(m);
}

/* ---------- opciones ---------- */
function showOptions() {
  const sel = (id, vals, cur) => '<select id="' + id + '">' + vals.map(([v, n]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>';
  const m = modal('<small class="kick">Ajustes</small><h2>Opciones</h2><div class="optg">' +
    '<label class="tg"><input type="checkbox" id="o-music"' + (OPTS.music ? ' checked' : '') + '> Música</label>' +
    '<label class="tg"><input type="checkbox" id="o-sfx"' + (OPTS.sfx ? ' checked' : '') + '> Sonidos (hinchada, silbato, gol)</label>' +
    '<label>Volumen</label><input type="range" id="o-vol" min="0" max="1" step="0.05" value="' + OPTS.vol + '">' +
    '<label>Calidad gráfica</label>' + sel('o-q', [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja (computadoras lentas)']], OPTS.quality) +
    '<label>Velocidad de los partidos</label>' + sel('o-sp', [['lento', 'Lenta'], ['normal', 'Normal'], ['rapido', 'Rápida'], ['instantaneo', 'Instantánea (sin animaciones)']], OPTS.speed) +
    '<label class="tg"><input type="checkbox" id="o-tut"' + (OPTS.tutorial ? ' checked' : '') + '> Mostrar tutorial en carreras nuevas</label>' +
    '</div><button class="b g" id="close">Guardar</button>');
  const upd = () => { OPTS.music = $('#o-music').checked; OPTS.sfx = $('#o-sfx').checked; OPTS.vol = +$('#o-vol').value; OPTS.speed = $('#o-sp').value; OPTS.tutorial = $('#o-tut').checked; const q = $('#o-q').value; if (q !== OPTS.quality) { OPTS.quality = q; setQuality(q); resize(); } saveOpts(); applyAudioOpts(); };
  m.querySelectorAll('input, select').forEach(e => e.onchange = upd); $('#o-vol').oninput = upd;
  m.querySelector('#close').onclick = () => { upd(); sfxClick(); closeModal(); if (C && !C.done && !$('#hub').hidden) { C.tut = C.tut; } };
}

/* ---------- etiquetas 3D de la casa y overlay de TV ---------- */
const _pp = new THREE.Vector3();
function updateOverlays() {
  const box = $('#labels');
  const show = S3.mode === 'home' && !$('#hub').hidden && $('#modal').hidden && !busy;
  if (!show) { if (box.childElementCount) box.innerHTML = ''; box.dataset.k = ''; }
  else {
    const key = S3.labels.map(l => l.id).join(',');
    if (box.dataset.k !== key) { box.dataset.k = key; box.innerHTML = S3.labels.map(l => '<button class="lbl" data-id="' + l.id + '">' + esc(l.text) + '</button>').join(''); box.querySelectorAll('.lbl').forEach(b => b.onclick = () => { sfxClick(); homeGo(b.dataset.id); }); }
    const W = window.innerWidth, H = window.innerHeight;
    box.querySelectorAll('.lbl').forEach(b => { const l = S3.labels.find(x => x.id === b.dataset.id); if (!l) return; _pp.copy(l.pos).project(camera); const vis = _pp.z < 1 && _pp.x > -1.1 && _pp.x < 1.1 && _pp.y > -1.1 && _pp.y < 1.1; b.style.display = vis ? '' : 'none'; if (vis) b.style.transform = 'translate(' + ((_pp.x + 1) / 2 * W) + 'px,' + ((1 - _pp.y) / 2 * H) + 'px) translate(-50%,-100%)'; });
  }
  const tg = $('#tvtag');
  if (!$('#summary').hidden || !$('#title').hidden || !$('#cere').hidden) tg.hidden = true;
  else if (S3.mode === 'stadium' && S3.tv) { tg.hidden = false; tg.textContent = S3.tv; tg.className = S3.tv === 'REPETICIÓN' ? 'rep' : S3.tv === 'EN VIVO' ? 'live' : 'big'; }
  else if (S3.mode === 'stadium' && MATCH) { tg.hidden = false; tg.textContent = 'EN VIVO'; tg.className = 'live'; }
  else if (S3.mode !== 'arrival') tg.hidden = true;
}

/* ---------- bucle ---------- */
let last = performance.now();
function frame(t) { const dt = Math.min(0.05, (t - last) / 1000); last = t; render3d(dt); updateOverlays(); requestAnimationFrame(frame); }
function boot() { init3d(); setQuality(OPTS.quality); resize(); showTitle(); document.body.classList.add('ready'); requestAnimationFrame(frame); }
const fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('40px Bungee'), document.fonts.load('800 16px Rubik')]) : Promise.resolve();
Promise.race([fontsReady, new Promise(r => setTimeout(r, 1800))]).then(boot, boot);
window.__mcf = { get C() { return C; }, newCareer, playWeek, simMatch, endSeason, retire, careerScore, loadHall, showHall, renderHub, playMoment, buildOffice, buildDisco, buildArrival, buildCeremony, negotiateUI, showSeasonEnd, renderSummary, showRetire };

/* ================== INTERFAZ ================== */
const $ = s => document.querySelector(s);
const scr = id => { document.querySelectorAll('.screen').forEach(e => { e.hidden = e.id !== id; }); };
let plan = 'normal', busy = false;
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize);
function modal(html) { const m = $('#modal'); m.innerHTML = '<div class="mcard">' + html + '</div>'; m.hidden = false; return m; }
function closeModal() { $('#modal').hidden = true; }
function waitClick(sel) { return new Promise(res => { document.querySelectorAll(sel).forEach(b => b.addEventListener('click', e => res(e.currentTarget), { once: true })); }); }
const bar = (v, col) => '<span class="bar"><i style="width:' + clamp(v, 0, 100) + '%;background:' + (col || (v >= 66 ? '#19D46E' : v >= 36 ? '#FFB800' : '#FF5A4E')) + '"></i></span>';

/* ---------- inicio ---------- */
function showTitle() {
  scr('title');
  $('#btn-continue').hidden = !loadCareer();
  const hall = loadHall(); $('#btn-hall').textContent = 'Mis carreras' + (hall.length ? ' (' + hall.length + ')' : '');
  if (hall.length) $('#t-best').innerHTML = 'Tu mejor carrera: <b>' + esc(hall[0].name) + '</b>, ' + hall[0].score + ' puntos'; else $('#t-best').textContent = '';
  buildStadium('#E23B3B', '#FFFFFF', 0.8);
}
$('#btn-new').onclick = () => showCreate();
$('#btn-continue').onclick = () => { if (loadCareer()) enterHub(); };
$('#btn-hall').onclick = () => showHall();

/* ---------- crear jugador ---------- */
let cr = { pos: 'DEL', foot: 'Derecho', skin: '#A56B45' };
function showCreate() {
  scr('create');
  $('#c-first').value = pick(FIRST); $('#c-last').value = pick(LAST);
  $('#c-origin').innerHTML = BARRIOS.map(b => '<option>' + b + '</option>').join('');
  $('#c-pos').innerHTML = Object.entries(POSITIONS).map(([k, p]) => '<button data-pos="' + k + '" class="' + (cr.pos === k ? 'on' : '') + '"><b>' + k + '</b>' + p.name + '</button>').join('');
  $('#c-pos').querySelectorAll('button').forEach(b => b.onclick = () => { cr.pos = b.dataset.pos; showCreateSel(); });
  $('#c-foot').querySelectorAll('button').forEach(b => b.onclick = () => { cr.foot = b.dataset.foot; showCreateSel(); });
  $('#c-skin').innerHTML = ['#6B4428', '#8D5A3B', '#A56B45', '#C68A5E', '#D9A37A', '#F0C9A0'].map(c => '<button class="sw" style="--c:' + c + '" data-skin="' + c + '"></button>').join('');
  $('#c-skin').querySelectorAll('button').forEach(b => b.onclick = () => { cr.skin = b.dataset.skin; showCreateSel(); });
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
  persist(); enterHub();
};

/* ---------- centro de mando ---------- */
function enterHub() { scr('hub'); buildHome(); renderHub(); }
function renderHub() {
  const cl = club(), L = leagueOf(cl);
  $('#p-name').textContent = C.first + ' ' + C.last;
  $('#p-sub').textContent = C.age + ' años, ' + POSITIONS[C.pos].name.toLowerCase() + ', de ' + C.origin;
  $('#p-ovr').textContent = C.ovr;
  $('#p-club').innerHTML = '<i class="crest" style="background:linear-gradient(135deg,' + cl.c1 + ' 50%,' + cl.c2 + ' 50%)"></i>' + esc(cl.name) + '<small>' + esc(L.name) + '</small>';
  $('#p-attrs').innerHTML = ATTRS.map(([k, n]) => '<div class="at"><span>' + n + '</span>' + bar(C.attr[k], '#2E6BFF') + '<b>' + Math.round(C.attr[k]) + '</b></div>').join('');
  $('#p-money').innerHTML = '<div><small>Plata</small><b>' + money(C.money) + '</b></div><div><small>Sueldo</small><b>' + money(C.salary) + '/sem</b></div><div><small>Contrato</small><b>' + (C.contractEnd > 0 ? C.contractEnd + (C.contractEnd === 1 ? ' año' : ' años') : 'Termina') + '</b></div><div><small>Seguidores</small><b>' + fmtK(C.followers) + '</b></div>';
  $('#p-state').innerHTML = [['Forma', C.form], ['Cansancio', 100 - C.fatigue, 'inv'], ['Felicidad', C.happy], ['Disciplina', C.disc], ['Confianza del DT', C.trust], ['Fama', C.fame]].map(([n, v]) => '<div class="st"><span>' + n + '</span>' + bar(v) + '</div>').join('') + (C.rel !== 'soltero' ? '<div class="st"><span>' + (C.rel === 'casado' ? 'Matrimonio con ' : 'Relación con ') + esc(C.partner) + '</span>' + bar(C.relLvl, '#FF2E88') + '</div>' : '') + (C.injured ? '<div class="inj">Lesionado: ' + C.injured + (C.injured === 1 ? ' semana' : ' semanas') + '</div>' : '');
  $('#h-season').textContent = 'Temporada ' + yearNow() + ', semana ' + (C.week + 1) + ' de ' + SEASON_WEEKS;
  const next = (() => { const save = C.week; C.week++; const l = weekMatches(); C.week = save; return l; })();
  $('#h-next').innerHTML = next.length ? next.map(m => m.type === 'nation' ? '<div class="nx"><small>' + m.comp + '</small><b>Perú</b></div>' : '<div class="nx"><small>' + esc(m.comp) + '</small><b>' + esc(club(m.home).name) + ' vs ' + esc(club(m.away).name) + '</b></div>').join('') : '<div class="nx"><small>Sin partido esta semana</small></div>';
  $('#plans').innerHTML = WEEK_PLANS.map(p => { const dis = p.adult && C.age < 18; return '<button class="plan' + (plan === p.id ? ' on' : '') + '" data-plan="' + p.id + '"' + (dis ? ' disabled' : '') + '><b>' + p.name + '</b><span>' + (dis ? 'Desde los 18 años' : p.desc) + '</span></button>'; }).join('');
  $('#plans').querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { plan = b.dataset.plan; renderHub(); });
  $('#btn-week').textContent = 'Jugar semana ' + (C.week + 1);
  $('#btn-retire').hidden = C.age < 33;
  $('#feed').innerHTML = C.log.slice(0, 14).map(l => '<div class="msg ' + l.kind + '"><small>' + (START_YEAR + l.s - 1) + ', sem ' + l.w + '</small>' + esc(l.t) + '</div>').join('');
  $('#h-trophies').textContent = 'Trofeos (' + C.trophies.length + ')';
}
function fmtK(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' mil' : String(n); }

/* ---------- semana ---------- */
async function playWeek() {
  if (busy) return; busy = true;
  try {
    C.week++;
    applyPlan(plan);
    if (C.week === 5 && !C.nation.called && C.ovr >= 64 && C.form >= 45 && C.ss.apps >= 2) { C.nation.called = true; log('¡Te convocaron a la selección peruana para las Eliminatorias!', 'big'); }
    const ev = pickEvent(); if (ev) await showEvent(ev);
    for (const m of weekMatches()) { const r = simMatch(m); applyMatch(r); await showMatch(r); }
    simOthers();
    const mw = weeklyMoney(); void mw;
    endWeekUpdate();
    if (C.week === 7) { const offs = makeOffers('mid'); if (offs.filter(o => !o.renew).length) await showOffers(offs, 'Mercado de pases de mitad de año', false); }
    if (C.week >= SEASON_WEEKS) {
      const res = endSeason();
      await showSeasonEnd(res);
      if (C.age >= 40 || C.forceRetire) { await showRetire(true); return; }
      let offs = makeOffers(C.contractEnd <= 0 ? 'renew' : 'pre');
      if (C.contractEnd <= 0 && !offs.length) offs = [emergencyOffer()];
      if (offs.length) await showOffers(offs, C.contractEnd <= 0 ? 'Tu contrato terminó: elige tu futuro' : 'Mercado de pases de verano', C.contractEnd <= 0);
      if (C.contractEnd <= 0) { C.contractEnd = 1; }
      startSeason(false);
    }
    persist();
    if (!C.done) { buildHome(); renderHub(); }
  } finally { busy = false; }
}
function emergencyOffer() { const cands = C.clubs.filter(c => c.str <= C.ovr + 2).sort((a, b) => b.str - a.str); const c = cands[0] || C.clubs[0]; return { club: c.id, wage: wageFor(C.ovr, leagueOf(c)), years: 1, role: 'Suplente', fee: 0, signing: 0 }; }
$('#btn-week').onclick = () => playWeek();

/* ---------- eventos ---------- */
async function showEvent(ev) {
  const m = modal('<small class="kick">Tu vida</small><h2>' + esc(ev.title) + '</h2><p>' + esc(ev.text) + '</p><div class="opts">' + ev.opts.map((o, i) => '<button class="b opt" data-i="' + i + '">' + esc(o.t) + '</button>').join('') + '</div>');
  const b = await waitClick('#modal .opt'); const o = ev.opts[+b.dataset.i];
  applyFx(o.fx); log(ev.title + ': ' + o.res, 'life');
  m.querySelector('.mcard').innerHTML = '<small class="kick">Tu vida</small><h2>' + esc(ev.title) + '</h2><p class="res">' + esc(o.res) + '</p><button class="b g" id="ok">Seguir</button>';
  await waitClick('#ok'); closeModal();
}

/* ---------- partido en vivo ---------- */
async function showMatch(r) {
  const A = r.A, B = r.B, youName = C.last;
  const cA = r.m.type === 'nation' ? '#E23B3B' : club(r.m.home).c1, cB = r.m.type === 'nation' ? '#FFFFFF' : club(r.m.away).c1;
  buildStadium(r.mySide === 'A' ? cA : cB, '#FFFFFF', clamp(C.fame / 100 + (r.m.type !== 'liga' ? 0.4 : 0.2), 0.15, 1));
  const el = $('#match'); el.hidden = false;
  el.innerHTML = '<div class="mb"><small>' + esc(r.m.comp) + '</small><div class="score"><span class="tn"><i style="background:' + cA + '"></i>' + esc(A.name) + '</span><b id="sc">0 - 0</b><span class="tn">' + esc(B.name) + '<i style="background:' + cB + '"></i></span></div><div class="min" id="mn">0\'</div><div class="role">' + roleText(r.role) + '</div><div class="lines" id="ln"></div><div class="mfoot"><span id="rt"></span><button class="b" id="skip">Saltar</button><button class="b g" id="cont" hidden>Continuar</button></div></div><div id="gol" hidden>¡GOOOL!</div>';
  let skip = false; el.querySelector('#skip').onclick = () => { skip = true; };
  let a = 0, b = 0, ei = 0;
  const addLine = (min, txt, cls) => { const d = document.createElement('div'); d.className = 'ln ' + (cls || ''); d.innerHTML = '<b>' + min + '\'</b> ' + txt; $('#ln').prepend(d); };
  if (r.role.role === 'titular') addLine(0, 'Sales de titular. ¡Vamos!', 'you');
  else if (r.role.role === 'banca') addLine(0, 'Te quedas en la banca todo el partido.', '');
  else if (r.role.role === 'reserva') addLine(0, 'Todavía juegas en la reserva. Hoy miras desde la tribuna.', '');
  else if (r.role.role === 'lesionado') addLine(0, 'Estás lesionado. Lo ves desde la tribuna.', '');
  for (let min = 1; min <= 90; min++) {
    while (ei < r.ev.length && r.ev[ei].min <= min) {
      const e = r.ev[ei++];
      if (e.type === 'goal') {
        if (e.side === 'A') a++; else b++;
        $('#sc').textContent = a + ' - ' + b;
        const team = e.side === 'A' ? A.name : B.name;
        if (e.scorer === 'you') { addLine(min, '¡GOOOL DE ' + esc(youName.toUpperCase()) + '! La tribuna explota.', 'goal you'); if (!skip) { $('#gol').hidden = false; playGoalAnim(); await sleep(2600); $('#gol').hidden = true; } }
        else if (e.assist === 'you') addLine(min, 'Gol de ' + esc(team) + ' con tu asistencia. ¡Qué pase!', 'goal you');
        else addLine(min, 'Gol de ' + esc(team) + '.', 'goal ' + (e.side === r.mySide ? 'ours' : 'theirs'));
      } else if (e.type === 'chance') addLine(min, pick(['Tu remate se va apenas desviado.', 'Te lo tapa el arquero con una atajada enorme.', 'Tu cabezazo sale por encima del travesaño.', 'Tu remate pega en el palo.']), 'you');
      else if (e.type === 'yellow') addLine(min, 'Tarjeta amarilla para ti por una falta fuerte.', 'warn');
      else if (e.type === 'sub') addLine(min, 'Entras al campo. El DT confía en ti.', 'you');
    }
    $('#mn').textContent = min + '\'';
    if (!skip) await sleep(min % 15 === 0 ? 180 : 45);
  }
  if (r.pens) addLine(90, 'Penales: ' + r.pens[0] + ' - ' + r.pens[1] + '.', 'goal');
  addLine(90, r.won ? '¡Final! Ganaron.' : r.drew ? 'Final. Empate.' : 'Final. Perdieron.', r.won ? 'goal ours' : '');
  $('#rt').innerHTML = r.role.mins > 0 ? 'Tu nota: <b class="' + (r.rating >= 7.5 ? 'hi' : r.rating < 6 ? 'lo' : '') + '">' + r.rating.toFixed(1) + '</b>' + (r.yg ? ', ' + r.yg + (r.yg === 1 ? ' gol' : ' goles') : '') + (r.ya ? ', ' + r.ya + (r.ya === 1 ? ' asistencia' : ' asistencias') : '') : 'No jugaste';
  el.querySelector('#skip').hidden = true; el.querySelector('#cont').hidden = false;
  await waitClick('#cont'); el.hidden = true;
  buildHome();
}
function roleText(r) { return { titular: 'Titular', suplente: 'Suplente: entrarías en el segundo tiempo', banca: 'En la banca', reserva: 'En la reserva', lesionado: 'Lesionado' }[r.role] || ''; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- fichajes ---------- */
async function showOffers(offs, title, must) {
  const render = () => '<small class="kick">Tu futuro</small><h2>' + esc(title) + '</h2><p>Tu valor de mercado: <b>' + money(marketValue()) + '</b>. Nivel ' + C.ovr + '.</p><div class="offers">' + offs.map((o, i) => { const c = club(o.club), L = leagueOf(c); return '<div class="offer"><i class="crest" style="background:linear-gradient(135deg,' + c.c1 + ' 50%,' + c.c2 + ' 50%)"></i><div class="oi"><b>' + esc(c.name) + '</b><small>' + esc(L.name) + ', nivel ' + c.str + '. ' + o.role + '</small><span>' + money(o.wage) + ' por semana, ' + o.years + ' años' + (o.signing ? ', prima ' + money(o.signing) : '') + '</span></div><div class="oa"><button class="b g" data-acc="' + i + '">Firmar</button>' + (!o.haggled ? '<button class="b" data-hag="' + i + '">Pedir más</button>' : '') + '</div></div>'; }).join('') + '</div>' + (must ? '' : '<button class="b s" id="stay">Quedarme donde estoy</button>');
  const m = modal(render());
  return new Promise(res => {
    const bind = () => {
      m.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => { signOffer(offs[+b.dataset.acc]); closeModal(); res(); });
      m.querySelectorAll('[data-hag]').forEach(b => b.onclick = () => { const o = offs[+b.dataset.hag]; o.haggled = true; if (chance(0.35)) { offs.splice(+b.dataset.hag, 1); log('Pediste demasiado y ' + club(o.club).name + ' retiró su oferta.', 'bad'); } else { o.wage = Math.round(o.wage * 1.18 / 10) * 10; o.signing = Math.round(o.signing * 1.2); } m.querySelector('.mcard').innerHTML = render(); bind(); if (!offs.length && !must) { closeModal(); res(); } });
      const st = m.querySelector('#stay'); if (st) st.onclick = () => { closeModal(); res(); };
    };
    bind();
  });
}

/* ---------- fin de temporada ---------- */
async function showSeasonEnd(r) {
  const s = C.seasonLog[C.seasonLog.length - 1];
  const nat = r.nation ? '<h3>' + r.nation.name + ' con Perú</h3><div class="natg">' + r.nation.games.map(g => '<div><small>' + g.stage + '</small> Perú ' + g.g1 + ' - ' + g.g2 + ' ' + esc(g.opp) + (g.yg ? ' <b>(' + g.yg + ' tuyo' + (g.yg > 1 ? 's' : '') + ')</b>' : '') + '</div>').join('') + '</div><p class="res">' + r.nation.stage + '</p>' : '';
  modal('<small class="kick">Fin de la temporada ' + s.year + '</small><h2>' + esc(s.club) + '</h2>' +
    '<div class="sgrid"><div><small>Posición</small><b>' + s.pos + '°</b></div><div><small>Partidos</small><b>' + s.apps + '</b></div><div><small>Goles</small><b>' + s.goals + '</b></div><div><small>Asistencias</small><b>' + s.assists + '</b></div><div><small>Nota media</small><b>' + (s.avg || '-') + '</b></div><div><small>Nivel</small><b>' + C.ovr + '</b></div></div>' +
    (r.titles.length || r.awards.length ? '<div class="troph">' + r.titles.map(t => '<span class="tc">🏆 ' + esc(t) + '</span>').join('') + r.awards.map(t => '<span class="ti">⭐ ' + esc(t) + '</span>').join('') + '</div>' : '<p class="res">Sin títulos esta temporada.</p>') + nat +
    '<p>Ahora tienes ' + C.age + ' años.</p><button class="b g" id="ok">Siguiente temporada</button>');
  await waitClick('#ok'); closeModal();
}

/* ---------- tienda ---------- */
let shopTab = 'casa';
function showShop() {
  const h = '<small class="kick">Tu vida</small><h2>Tienda</h2><p>Tienes <b>' + money(C.money) + '</b>.</p><div class="seg"><button data-t="casa" class="' + (shopTab === 'casa' ? 'on' : '') + '">Casas</button><button data-t="carros" class="' + (shopTab === 'carros' ? 'on' : '') + '">Carros</button></div>' +
    (shopTab === 'casa' ? HOUSES.map((x, i) => '<div class="offer"><div class="oi"><b>' + x.name + '</b><small>' + (i ? 'Gasto ' + money(x.week) + ' por semana. +' + x.happy + ' felicidad' : 'Donde empezaste') + '</small></div><div class="oa">' + (C.house >= i ? '<span class="own">' + (C.house === i ? 'Vives aquí' : 'Ya pasaste') + '</span>' : '<button class="b g" data-house="' + i + '"' + (C.money < x.cost ? ' disabled' : '') + '>' + money(x.cost) + '</button>') + '</div></div>').join('')
      : CARS.map(x => '<div class="offer"><i class="crest" style="background:' + x.col + '"></i><div class="oi"><b>' + x.name + '</b><small>+' + x.fame + ' de fama</small></div><div class="oa">' + (C.cars.includes(x.id) ? '<span class="own">En tu cochera</span>' : '<button class="b g" data-car="' + x.id + '"' + (C.money < x.cost ? ' disabled' : '') + '>' + money(x.cost) + '</button>') + '</div></div>').join('')) +
    '<button class="b s" id="close">Cerrar</button>';
  const m = modal(h);
  m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { shopTab = b.dataset.t; showShop(); });
  m.querySelectorAll('[data-house]').forEach(b => b.onclick = () => { const i = +b.dataset.house; C.money -= HOUSES[i].cost; C.house = i; C.happy = clamp(C.happy + 10, 0, 100); log('Te mudaste: ' + HOUSES[i].name + '.', 'big'); persist(); buildHome(); renderHub(); showShop(); });
  m.querySelectorAll('[data-car]').forEach(b => b.onclick = () => { const x = CARS.find(c => c.id === b.dataset.car); C.money -= x.cost; C.cars.push(x.id); C.fame = clamp(C.fame + x.fame, 0, 100); C.happy = clamp(C.happy + 5, 0, 100); log('Te compraste: ' + x.name + '.', 'big'); persist(); buildHome(); renderHub(); showShop(); });
  m.querySelector('#close').onclick = closeModal;
}
$('#h-shop').onclick = () => showShop();
$('#h-table').onclick = () => {
  const t = standings();
  const m = modal('<small class="kick">' + esc(leagueOf(club()).name) + '</small><h2>Tabla de posiciones</h2><table class="tbl"><tr><th>#</th><th>Club</th><th>PJ</th><th>DG</th><th>Pts</th></tr>' + t.map((r, i) => '<tr class="' + (r.id === C.clubId ? 'me' : '') + '"><td>' + (i + 1) + '</td><td>' + esc(club(r.id).name) + '</td><td>' + r.p + '</td><td>' + (r.gf - r.ga) + '</td><td><b>' + r.pts + '</b></td></tr>').join('') + '</table>' +
    '<p>' + esc(C.cup.name) + ': ' + (C.cup.winner !== null && C.cup.winner !== undefined ? 'campeón ' + esc(club(C.cup.winner).name) : C.cup.alive.includes(C.clubId) ? 'sigues en carrera' : 'eliminado') + (C.cont && C.cont.inIt ? '. ' + esc(C.cont.name) + ': ' + (C.cont.alive.includes(C.clubId) ? 'sigues en carrera' : 'eliminado') : '') + '</p><button class="b s" id="close">Cerrar</button>');
  m.querySelector('#close').onclick = closeModal;
};
$('#h-trophies').onclick = () => {
  const m = modal('<small class="kick">Tu vitrina</small><h2>Trofeos</h2>' + (C.trophies.length ? '<div class="troph">' + C.trophies.map(t => '<span class="' + (t.kind === 'ind' ? 'ti' : 'tc') + '">' + (t.kind === 'ind' ? '⭐ ' : '🏆 ') + esc(t.name) + ' <small>' + t.year + '</small></span>').join('') + '</div>' : '<p>Todavía no ganas nada. Paciencia.</p>') + '<h3>Tus clubes</h3>' + C.history.map(h => '<div class="hrow">' + esc(C.clubs[h.club].name) + ' <small>' + h.apps + ' PJ, ' + h.goals + ' goles</small></div>').join('') + '<button class="b s" id="close">Cerrar</button>');
  m.querySelector('#close').onclick = closeModal;
};
$('#btn-retire').onclick = async () => { const m = modal('<h2>¿Retirarte?</h2><p>Tienes ' + C.age + ' años. Tu carrera terminará y verás tu puntaje final.</p><div class="opts"><button class="b g" id="yes">Sí, colgar los chimpunes</button><button class="b s" id="no">Todavía no</button></div>'); const b = await waitClick('#modal #yes, #modal #no'); closeModal(); if (b.id === 'yes') showRetire(false); void m; };
$('#h-menu').onclick = () => { persist(); showTitle(); };

/* ---------- retiro y puntaje final ---------- */
async function showRetire(forced) {
  const s = retire();
  if (forced) log('Llegó el momento de retirarte.', 'big');
  renderSummary(s, true);
}
function renderSummary(s, animate) {
  scr('summary');
  buildStadium('#FFE14D', '#FFFFFF', 1); playGoalAnim();
  const col = s.trophies.filter(t => t.kind === 'col'), ind = s.trophies.filter(t => t.kind === 'ind');
  const group = arr => { const m = {}; for (const t of arr) m[t.name] = (m[t.name] || 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  $('#summary').innerHTML = '<div class="scard"><div class="stop"><div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="rbg"/><circle cx="60" cy="60" r="52" class="rfg" id="rfg"/></svg><b id="snum">0</b><small>de 100</small></div><div class="sti"><small>Fin de la carrera</small><h2>' + esc(s.name) + '</h2><p class="grade" id="sgrade">' + esc(s.grade) + '</p><p>' + POSITIONS[s.pos].name + ' de ' + esc(s.origin) + '. Se retiró a los ' + s.retireAge + ' años.</p></div></div>' +
    '<div class="sgrid"><div><small>Partidos</small><b data-n="' + s.apps + '">0</b></div><div><small>Goles</small><b data-n="' + s.goals + '">0</b></div><div><small>Asistencias</small><b data-n="' + s.assists + '">0</b></div><div><small>Nivel máximo</small><b data-n="' + s.peakOvr + '">0</b></div><div><small>Fichajes</small><b data-n="' + s.transfers + '">0</b></div><div><small>Con Perú</small><b>' + s.caps + ' PJ, ' + s.natGoals + ' goles</b></div></div>' +
    '<h3>Títulos colectivos (' + col.length + ')</h3><div class="troph">' + (col.length ? group(col).map(([n, k]) => '<span class="tc">🏆 ' + esc(n) + (k > 1 ? ' x' + k : '') + '</span>').join('') : '<span class="none">Ninguno</span>') + '</div>' +
    '<h3>Premios individuales (' + ind.length + ')</h3><div class="troph">' + (ind.length ? group(ind).map(([n, k]) => '<span class="ti">⭐ ' + esc(n) + (k > 1 ? ' x' + k : '') + '</span>').join('') : '<span class="none">Ninguno</span>') + '</div>' +
    '<h3>Tu camino</h3><div class="path">' + s.clubs.map(c => '<div><b>' + esc(c.name) + '</b><small>' + c.from + (c.to && c.to !== c.from ? '-' + c.to : '') + ', ' + c.apps + ' PJ, ' + c.goals + ' goles</small></div>').join('') + '</div>' +
    '<h3>Tu vida</h3><p>' + esc(s.house) + '. ' + s.cars + (s.cars === 1 ? ' carro' : ' carros') + '. ' + esc(s.family) + '. Terminaste con ' + money(s.money) + '.</p>' +
    '<h3>Cómo se calculó</h3><div class="parts">' + s.parts.map(([k, v]) => '<div><span>' + k + '</span><b>+' + v.toFixed(1) + '</b></div>').join('') + '</div>' +
    '<div class="opts"><button class="b g" id="s-new">Nueva carrera</button><button class="b" id="s-hall">Ver mis carreras</button></div></div>';
  $('#s-new').onclick = () => showCreate(); $('#s-hall').onclick = () => showHall();
  const ring = $('#rfg'), L = 2 * Math.PI * 52; ring.style.strokeDasharray = L; ring.style.strokeDashoffset = L;
  const dur = animate ? 2600 : 1, t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); $('#snum').textContent = Math.round(s.score * e); ring.style.strokeDashoffset = L * (1 - s.score / 100 * e); document.querySelectorAll('#summary [data-n]').forEach(b => { b.textContent = Math.round(+b.dataset.n * e); }); if (k < 1) requestAnimationFrame(step); else $('#sgrade').classList.add('pop'); };
  requestAnimationFrame(step);
}

/* ---------- mis carreras ---------- */
function showHall() {
  scr('hall');
  const h = loadHall();
  $('#hall-list').innerHTML = h.length ? h.map((s, i) => '<button class="hc' + (i === 0 ? ' best' : '') + '" data-i="' + i + '"><b class="hs">' + s.score + '</b><span class="hi"><b>' + (i === 0 ? '👑 ' : '') + esc(s.name) + '</b><small>' + esc(s.grade) + '. ' + POSITIONS[s.pos].name + ', ' + s.seasons + ' temporadas</small><small>' + s.goals + ' goles, ' + s.assists + ' asistencias, ' + s.trophies.length + ' trofeos, ' + s.transfers + ' fichajes</small></span><small class="hd">' + s.date + '</small></button>').join('') : '<p>Todavía no terminas ninguna carrera.</p>';
  document.querySelectorAll('.hc').forEach(b => b.onclick = () => renderSummary(h[+b.dataset.i], false));
}
$('#hall-back').onclick = () => showTitle();

/* ---------- bucle ---------- */
let last = performance.now();
function frame(t) { const dt = Math.min(0.05, (t - last) / 1000); last = t; render3d(dt); requestAnimationFrame(frame); }
function boot() { init3d(); resize(); showTitle(); document.body.classList.add('ready'); requestAnimationFrame(frame); }
const fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('40px Bungee'), document.fonts.load('800 16px Rubik')]) : Promise.resolve();
Promise.race([fontsReady, new Promise(r => setTimeout(r, 1800))]).then(boot, boot);
window.__mcf = { get C() { return C; }, newCareer, playWeek, simMatch, endSeason, retire, careerScore, loadHall, showHall, renderHub };

/* ================== EFECTOS DE INTERFAZ ("juice") ==================
   Partículas en pantalla (confeti, destellos, monedas que vuelan al contador), números que suben animados
   y el contador de plata que se mueve solo. Todo se dibuja en el canvas 2D de encima (ctx) con drawJuice().
   Con prefers-reduced-motion no hay partículas: solo cambian los números. */
const JP = []; // partículas en pantalla: { kind, x, y, vx, vy, t, life, c, s, r, vr, ... }
const JCOLORS = ['#FFE14D', '#FF7A1A', '#FF2E88', '#19D46E', '#2E6BFF', '#FFFFFF', '#7B3FF2'];
function jpush(p) { if (REDUCED || JP.length > 360) return; JP.push(p); }
function confetti(x, y, n, spread) {
  spread = spread || 1;
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + rand(-1.1, 1.1) * spread, v = rand(260, 620); jpush({ kind: 'conf', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rand(1.4, 2.4), c: pick(JCOLORS), s: rand(5, 10), r: rand(0, 6), vr: rand(-12, 12) }); }
}
function confettiRain(n) { for (let i = 0; i < n; i++) jpush({ kind: 'conf', x: rand(0, W), y: rand(-80, -10), vx: rand(-40, 40), vy: rand(60, 220), t: -rand(0, 0.8), life: rand(2.2, 3.4), c: pick(JCOLORS), s: rand(6, 11), r: rand(0, 6), vr: rand(-10, 10) }); }
function sparkle(x, y, n, color) {
  for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), v = rand(80, 260); jpush({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rand(0.45, 0.8), c: color || '#FFE14D', s: rand(3, 6) }); }
  jpush({ kind: 'ring', x, y, t: 0, life: 0.55, c: color || '#FFE14D', s: 10 });
}
// Monedas que saltan desde un punto de la pantalla y vuelan al contador de plata
function flyCoins(x, y, n, onArrive) {
  const el = document.getElementById('c-money'); if (!el) return;
  const r = el.getBoundingClientRect(), tx = r.left + 34, ty = r.top + r.height / 2;
  if (REDUCED) { if (onArrive) onArrive(); return; }
  for (let i = 0; i < n; i++) jpush({ kind: 'coin', x0: x, y0: y, x, y, tx, ty, bx: x + rand(-90, 90), by: y - rand(60, 160), t: -i * 0.045, life: 0.75, s: 7, done: i === n - 1 ? onArrive : null });
}
function updateJuice(dt) {
  for (const p of JP) {
    p.t += dt; if (p.t < 0) continue;
    if (p.kind === 'conf') { p.vy += 520 * dt; p.vx *= 1 - 1.4 * dt; p.vy *= 1 - 0.9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; }
    else if (p.kind === 'spark') { p.vx *= 1 - 3 * dt; p.vy *= 1 - 3 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    else if (p.kind === 'coin') {
      const k = Math.min(1, p.t / p.life), e = k * k * (3 - 2 * k), u = 1 - e; // curva de Bézier: sale hacia arriba y cae en el contador
      p.x = u * u * p.x0 + 2 * u * e * p.bx + e * e * p.tx; p.y = u * u * p.y0 + 2 * u * e * p.by + e * e * p.ty;
      if (k >= 1 && !p.hit) { p.hit = true; bumpMoney(); if (p.done) p.done(); }
    }
  }
  for (let i = JP.length - 1; i >= 0; i--) if (JP[i].t >= JP[i].life) JP.splice(i, 1);
}
function drawJuice() {
  if (!JP.length) return;
  for (const p of JP) {
    if (p.t < 0) continue;
    const k = p.t / p.life, a = k > 0.75 ? (1 - k) / 0.25 : 1;
    ctx.globalAlpha = a;
    if (p.kind === 'conf') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.abs(Math.cos(p.r * 1.7)) + 0.15); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); ctx.restore(); }
    else if (p.kind === 'spark') { ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4); ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore(); }
    else if (p.kind === 'ring') { ctx.strokeStyle = p.c; ctx.lineWidth = 4 * (1 - k); ctx.beginPath(); ctx.arc(p.x, p.y, p.s + k * 60, 0, 7); ctx.stroke(); }
    else if (p.kind === 'coin') { ctx.globalAlpha = 1; ctx.fillStyle = '#FFE14D'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s * Math.abs(Math.cos(p.t * 14)) + 1.5, p.s, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}

/* ---------- contador de plata animado ---------- */
let moneyShown = null;
function bumpMoney() { const el = document.getElementById('c-money'); if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function tickMoney(dt) {
  const el = document.getElementById('h-money'); if (!el) return;
  if (moneyShown === null || REDUCED) moneyShown = save.money;
  const diff = save.money - moneyShown;
  if (Math.abs(diff) < 1) moneyShown = save.money; else moneyShown += diff * Math.min(1, dt * 7);
  const txt = soles(moneyShown); if (el.textContent !== txt) el.textContent = txt;
  el.parentElement.classList.toggle('down', diff < -20);
}

/* ---------- números que suben (resumen del día) ---------- */
function countUp(el, to, dur, fmt) {
  fmt = fmt || (v => String(Math.round(v)));
  if (REDUCED || !el) { if (el) el.textContent = fmt(to); return; }
  const t0 = performance.now(), step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
// Centro de un elemento en pantalla (para lanzar efectos desde botones y tarjetas)
function elCenter(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

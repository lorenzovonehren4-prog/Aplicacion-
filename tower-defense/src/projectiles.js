/* =====================================================================
 * projectiles.js — Proyectiles (balas, perdigones, granadas, obuses,
 * misiles), peligros en el suelo (minas, napalm) y efectos visuales
 * (destellos, explosiones, rayos, textos flotantes).
 * ===================================================================== */
window.TD = window.TD || {};

// ¿Puede un ataque con este filtro dañar a este enemigo?
TD.canHit = function (e, filter) {
  if (!e.alive) return false;
  return e.flying ? !!filter.air : !!filter.ground;
};

// Daño en área centrado en (x, y)
TD.explode = function (game, x, y, radius, damage, filter, source, pierce, color) {
  const R2 = radius * radius;
  for (const e of game.enemies) {
    if (!TD.canHit(e, filter)) continue;
    if (TD.U.dist2(e.x, e.y, x, y) <= R2 + e.radius * e.radius) e.takeDamage(damage, source, pierce);
  }
  game.fx.explosion(x, y, radius, color || '#ffb347');
};

TD.Projectile = class {
  /**
   * kind: 'bullet' | 'pellet' | 'grenade' | 'shell' | 'cannon' | 'missile'
   * o: { x, y, target, tx, ty, speed, damage, splash, filter, pierce, source,
   *      burn, cluster, color, size, angle, range, flight }
   */
  constructor(game, kind, o) {
    Object.assign(this, o);
    this.game = game;
    this.kind = kind;
    this.alive = true;
    this.t = 0;
    this.sx = o.x; this.sy = o.y;
    if (this.target) { this.tx = this.target.x; this.ty = this.target.y; }
    if (kind === 'pellet') { this.vx = Math.cos(o.angle) * o.speed; this.vy = Math.sin(o.angle) * o.speed; this.traveled = 0; }
    if (kind === 'grenade' || kind === 'shell') {
      const d = TD.U.dist(o.x, o.y, this.tx, this.ty);
      this.flight = o.flight || Math.max(0.25, d / o.speed);
    }
    if (kind === 'missile') { this.angle = o.angle !== undefined ? o.angle : Math.atan2(this.ty - o.y, this.tx - o.x); this.speed = o.speed * 0.5; }
    this.trail = [];
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    switch (this.kind) {
      case 'bullet':
      case 'cannon': {
        if (this.target && this.target.alive) { this.tx = this.target.x; this.ty = this.target.y; }
        const d = TD.U.dist(this.x, this.y, this.tx, this.ty);
        const step = this.speed * dt;
        if (d <= step + 2) {
          this.x = this.tx; this.y = this.ty;
          this.hit();
        } else {
          this.x += (this.tx - this.x) / d * step;
          this.y += (this.ty - this.y) / d * step;
        }
        break;
      }
      case 'pellet': {
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.traveled += this.speed * dt;
        for (const e of g.enemies) {
          if (!TD.canHit(e, this.filter)) continue;
          if (TD.U.dist2(e.x, e.y, this.x, this.y) < (e.radius + 3) * (e.radius + 3)) {
            e.takeDamage(this.damage, this.source, this.pierce);
            if (this.burn && e.alive) e.burn(this.burn.dps, this.burn.duration, this.source);
            g.fx.flash(this.x, this.y, '#ffe0a0', 5);
            this.alive = false;
            return;
          }
        }
        if (this.traveled > this.range) this.alive = false;
        break;
      }
      case 'grenade':
      case 'shell': {
        const k = Math.min(1, this.t / this.flight);
        this.x = TD.U.lerp(this.sx, this.tx, k);
        this.y = TD.U.lerp(this.sy, this.ty, k);
        this.z = Math.sin(k * Math.PI) * (this.kind === 'shell' ? 70 : 26);
        if (k >= 1) this.hit();
        break;
      }
      case 'missile': {
        if (this.target && this.target.alive) { this.tx = this.target.x; this.ty = this.target.y; }
        this.speed = Math.min(this.maxSpeed || 400, this.speed + 600 * dt);
        const want = Math.atan2(this.ty - this.y, this.tx - this.x);
        this.angle += TD.U.clamp(TD.U.angleDiff(this.angle, want), -8 * dt, 8 * dt);
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 8) this.trail.shift();
        if (TD.U.dist(this.x, this.y, this.tx, this.ty) < 8 || this.t > 4) this.hit();
        break;
      }
    }
  }

  hit() {
    if (!this.alive) return;
    this.alive = false;
    const g = this.game;
    if (this.splash) {
      TD.explode(g, this.x, this.y, this.splash, this.damage, this.filter, this.source, this.pierce, this.color);
      if (this.kind === 'shell' || this.kind === 'cannon') { g.shake(this.kind === 'shell' ? 3 : 2); TD.Audio.play('boom'); }
      else if (this.kind === 'grenade') TD.Audio.play('boom');
      // Racimo: minigranadas alrededor del impacto
      if (this.cluster) {
        for (let i = 0; i < this.cluster; i++) {
          const a = (i / this.cluster) * Math.PI * 2 + Math.random();
          const d = this.splash * 0.9;
          g.projectiles.push(new TD.Projectile(g, 'grenade', {
            x: this.x, y: this.y, tx: this.x + Math.cos(a) * d, ty: this.y + Math.sin(a) * d, speed: 160, flight: 0.35,
            damage: this.damage * 0.4, splash: this.splash * 0.6, filter: this.filter, source: this.source, color: '#ffd27f', size: 3
          }));
        }
      }
    } else if (this.target && this.target.alive) {
      this.target.takeDamage(this.damage, this.source, this.pierce);
      if (this.burn && this.target.alive) this.target.burn(this.burn.dps, this.burn.duration, this.source);
      g.fx.flash(this.x, this.y, this.color || '#fff6c0', this.size ? this.size + 4 : 6);
    }
  }

  draw(ctx) {
    const c = this.color || '#fff';
    switch (this.kind) {
      case 'bullet':
      case 'pellet':
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size || 2.5, 0, Math.PI * 2); ctx.fill();
        break;
      case 'cannon':
        ctx.fillStyle = '#2b2b2b';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size || 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(this.x - 1, this.y - 1, 2, 0, Math.PI * 2); ctx.fill();
        break;
      case 'grenade':
      case 'shell': {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = this.kind === 'shell' ? '#3a3f45' : '#556b2f';
        ctx.beginPath(); ctx.arc(this.x, this.y - (this.z || 0), this.size || (this.kind === 'shell' ? 6 : 4.5), 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'missile': {
        ctx.strokeStyle = 'rgba(220,220,220,0.5)'; ctx.lineWidth = 3;
        ctx.beginPath();
        this.trail.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.stroke();
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-6, -2, 10, 4);
        ctx.fillStyle = '#ff4f4f'; ctx.fillRect(4, -2, 3, 4);
        ctx.fillStyle = '#ffb300'; ctx.fillRect(-9, -1.5, 3, 3);
        ctx.restore();
        break;
      }
    }
  }
};

// ---------------------------------------------------------------------
// Minas en el camino (del Minador o colocadas por el jugador)
// ---------------------------------------------------------------------
TD.Mine = class {
  constructor(game, x, y, o) {
    this.game = game; this.x = x; this.y = y;
    this.damage = o.damage; this.radius = o.radius; this.source = o.source || null;
    this.cluster = o.cluster || 1;
    this.alive = true;
    this.armTime = 0.4;
    this.t = Math.random() * 3;
  }
  update(dt) {
    this.t += dt;
    if (this.armTime > 0) { this.armTime -= dt; return; }
    for (const e of this.game.enemies) {
      if (!e.alive || e.flying) continue;
      if (TD.U.dist2(e.x, e.y, this.x, this.y) < (e.radius + 8) * (e.radius + 8)) {
        this.detonate();
        return;
      }
    }
  }
  detonate() {
    const g = this.game;
    this.alive = false;
    for (let i = 0; i < this.cluster; i++) {
      const ox = i ? TD.U.rand(-12, 12) : 0, oy = i ? TD.U.rand(-12, 12) : 0;
      TD.explode(g, this.x + ox, this.y + oy, this.radius, this.damage, { ground: true, air: false }, this.source, false, '#ff9a3c');
    }
    g.shake(3);
    TD.Audio.play('boom');
  }
  draw(ctx) {
    ctx.fillStyle = '#3b3b3b';
    ctx.beginPath(); ctx.arc(this.x, this.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = (Math.sin(this.t * 6) > 0 || this.armTime > 0) ? '#ff3b3b' : '#6a1a1a';
    ctx.beginPath(); ctx.arc(this.x, this.y, 2.2, 0, Math.PI * 2); ctx.fill();
  }
};

// Charco de napalm: daña a los terrestres que lo pisan
TD.Puddle = class {
  constructor(game, x, y, o) {
    this.game = game; this.x = x; this.y = y;
    this.dps = o.dps; this.life = o.duration; this.maxLife = o.duration;
    this.radius = o.radius || 18; this.source = o.source; this.alive = true;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }
    for (const e of this.game.enemies) {
      if (!e.alive || e.flying) continue;
      if (TD.U.dist2(e.x, e.y, this.x, this.y) < this.radius * this.radius) e.takeDamage(this.dps * dt, this.source, true);
    }
  }
  draw(ctx) {
    const a = Math.min(1, this.life / this.maxLife) * 0.6;
    ctx.fillStyle = 'rgba(255,90,20,' + a + ')';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,60,' + a + ')';
    ctx.beginPath(); ctx.arc(this.x + Math.sin(this.life * 9) * 4, this.y, this.radius * 0.4, 0, Math.PI * 2); ctx.fill();
  }
};

// ---------------------------------------------------------------------
// Efectos visuales (no afectan a la lógica)
// ---------------------------------------------------------------------
TD.Effects = class {
  constructor() { this.list = []; this.texts = []; }

  add(e) { e.t = 0; this.list.push(e); if (this.list.length > 600) this.list.shift(); }

  flash(x, y, color, r) { this.add({ type: 'flash', x, y, color, r: r || 8, life: 0.12 }); }
  ring(x, y, r, color, life) { this.add({ type: 'ring', x, y, r, color, life: life || 0.4 }); }
  beam(x1, y1, x2, y2, color, w, life) { this.add({ type: 'beam', x1, y1, x2, y2, color, w: w || 2, life: life || 0.08 }); }

  // Rayo en zigzag entre varios puntos
  bolt(points, color, life) {
    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const n = 5, pts = [a];
      for (let k = 1; k < n; k++) {
        pts.push({ x: TD.U.lerp(a.x, b.x, k / n) + TD.U.rand(-6, 6), y: TD.U.lerp(a.y, b.y, k / n) + TD.U.rand(-6, 6) });
      }
      pts.push(b);
      segs.push(pts);
    }
    this.add({ type: 'bolt', segs, color, life: life || 0.15 });
  }

  explosion(x, y, radius, color) {
    this.add({ type: 'boom', x, y, r: radius, color, life: 0.35 });
    this.particles(x, y, 8, color, radius * 2, 0.4, 3);
  }

  particles(x, y, n, color, speed, life, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
      this.add({ type: 'part', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: life * TD.U.rand(0.6, 1.2), size: size || 2 });
    }
  }

  // Texto flotante (oro ganado, daño crítico, avisos)
  text(x, y, str, color, size) {
    this.texts.push({ x, y, str, color: color || '#fff', size: size || 14, t: 0, life: 1.1 });
    if (this.texts.length > 80) this.texts.shift();
  }

  update(dt) {
    for (const e of this.list) {
      e.t += dt;
      if (e.type === 'part') { e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 0.92; e.vy *= 0.92; }
    }
    this.list = this.list.filter(e => e.t < e.life);
    for (const t of this.texts) { t.t += dt; t.y -= 28 * dt; }
    this.texts = this.texts.filter(t => t.t < t.life);
  }

  draw(ctx) {
    for (const e of this.list) {
      const k = 1 - e.t / e.life;
      ctx.globalAlpha = Math.max(0, k);
      switch (e.type) {
        case 'flash':
          ctx.fillStyle = e.color;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1.2 - k * 0.4), 0, Math.PI * 2); ctx.fill();
          break;
        case 'ring':
          ctx.strokeStyle = e.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1 - k * 0.5), 0, Math.PI * 2); ctx.stroke();
          break;
        case 'beam':
          ctx.strokeStyle = e.color; ctx.lineWidth = e.w;
          ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke();
          break;
        case 'bolt':
          ctx.strokeStyle = e.color; ctx.lineWidth = 2.5;
          for (const pts of e.segs) {
            ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
          }
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          for (const pts of e.segs) {
            ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
          }
          break;
        case 'boom': {
          const r = e.r * (0.4 + (1 - k) * 0.7);
          ctx.fillStyle = e.color;
          ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,220,' + k + ')';
          ctx.beginPath(); ctx.arc(e.x, e.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'part':
          ctx.fillStyle = e.color;
          ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
          break;
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const k = 1 - t.t / t.life;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = 'bold ' + t.size + 'px "Trebuchet MS", sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
};

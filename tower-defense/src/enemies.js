/* =====================================================================
 * enemies.js — Zombis: movimiento por el camino (o en línea recta si
 * vuelan), estados (lento, congelado, quemado, aturdido, derribado),
 * habilidades especiales, jefes y dibujo con barra de vida.
 * ===================================================================== */
window.TD = window.TD || {};

TD.Enemy = class {
  /**
   * @param game  referencia al juego
   * @param type  clave en CONFIG.enemies
   * @param opts  { hpMul, speedMul, wave, dist, mini }
   */
  constructor(game, type, opts) {
    const def = TD.CONFIG.enemies[type];
    const S = TD.CONFIG.grid.cell;
    this.game = game;
    this.type = type;
    this.def = def;
    this.wave = opts.wave;
    this.boss = !!def.boss;
    this.mini = !!opts.mini;
    this.maxHp = def.hp * opts.hpMul * (this.mini ? TD.CONFIG.miniBossHpFactor : 1);
    this.hp = this.maxHp;
    this.baseSpeed = def.speed * opts.speedMul * S;
    this.armor = def.armor || 0;
    this.air = !!def.air;
    this.radius = def.radius * S * (this.mini ? 0.8 : 1);
    this.reward = Math.round(def.reward * (this.mini ? 0.5 : 1));
    this.lives = this.mini ? 5 : def.lives;
    this.dist = opts.dist || 0;
    this.offset = opts.offset || 0; // desplazamiento lateral para que no se amontonen
    this.alive = true;
    this.escaped = false;

    // Estados
    this.slowMul = 1; this.slowTimer = 0;
    this.freezeTimer = 0; this.stunTimer = 0;
    this.burnDps = 0; this.burnTimer = 0; this.burnSource = null;
    this.groundedTimer = 0; this.shockDps = 0;
    this.hitFlash = 0;
    this.phase = Math.random() * 10;
    this.cloaked = false;
    this.enraged = false;
    this.summonTimer = def.summon ? def.summon.every : 0;
    this.cloakTimer = def.cloak ? def.cloak.every : 0;
    this.healTimer = 0;
    this.blockedBy = null; // barricada que lo frena
    this.lastHitBy = null;
    this.updatePosition();
  }

  // Oculto = camuflado por naturaleza o por habilidad del jefe
  get hidden() { return !!this.def.hidden || this.cloaked; }
  // Volando = aéreo y no derribado por una red
  get flying() { return this.air && this.groundedTimer <= 0; }
  get pathLength() { return this.air ? this.game.map.air.len : this.game.map.length; }
  // Progreso 0..1 (para apuntar al "primero")
  get progress() { return this.dist / this.pathLength; }

  // ¿Puede una torre ver a este enemigo?
  visibleTo(detect) { return !this.hidden || detect || this.game.revealTimer > 0; }

  updatePosition() {
    const p = this.air ? this.game.map.airPointAt(this.dist) : this.game.map.pointAt(this.dist);
    const nx = -Math.sin(p.angle), ny = Math.cos(p.angle);
    this.x = p.x + nx * this.offset;
    this.y = p.y + ny * this.offset;
    this.angle = p.angle;
  }

  applySlow(mul, time) {
    if (this.def.slowResist) mul = 1 - (1 - mul) * (1 - this.def.slowResist);
    if (mul <= this.slowMul || this.slowTimer <= 0) { this.slowMul = mul; }
    this.slowTimer = Math.max(this.slowTimer, time);
  }
  freeze(time) { this.freezeTimer = Math.max(this.freezeTimer, this.boss ? time * 0.5 : time); }
  stun(time) { if (!this.boss) this.stunTimer = Math.max(this.stunTimer, time); }
  burn(dps, time, source) {
    if (dps >= this.burnDps || this.burnTimer <= 0) { this.burnDps = dps; this.burnSource = source; }
    this.burnTimer = Math.max(this.burnTimer, time);
  }
  groundIt(time, shock) {
    if (!this.air) return;
    this.groundedTimer = Math.max(this.groundedTimer, this.boss ? time * 0.3 : time);
    if (shock) this.shockDps = shock;
  }

  /**
   * Aplica daño. El blindaje resta daño plano (mínimo 25% del golpe)
   * salvo que el ataque sea perforante.
   */
  takeDamage(amount, source, pierce) {
    if (!this.alive) return 0;
    const dmg = pierce ? amount : Math.max(amount * 0.25, amount - this.armor);
    this.hp -= dmg;
    this.hitFlash = 0.08;
    if (source) this.lastHitBy = source;
    if (source && source.damageDealt !== undefined) source.damageDealt += dmg;
    if (this.hp <= 0) this.die(source);
    return dmg;
  }

  die(source) {
    if (!this.alive) return;
    this.alive = false;
    this.hp = 0;
    this.game.onEnemyKilled(this, source || this.lastHitBy);
    // Divisiones y generaciones al morir
    const split = this.def.splitInto || this.def.spawnOnDeath;
    if (split) {
      let baseDist = this.dist;
      if (this.air) baseDist = this.game.map.project(this.x, this.y).dist;
      for (let i = 0; i < split.count; i++) {
        this.game.spawnEnemy(split.type, this.wave, {
          dist: Math.max(0, baseDist - i * 10), offset: TD.U.rand(-8, 8), childOf: this
        });
      }
    }
  }

  update(dt) {
    if (!this.alive) return;
    const def = this.def;
    this.phase += dt * 8;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Daño en el tiempo
    if (this.burnTimer > 0) { this.burnTimer -= dt; this.takeDamage(this.burnDps * dt, this.burnSource, true); }
    if (this.groundedTimer > 0) {
      this.groundedTimer -= dt;
      if (this.shockDps) this.takeDamage(this.shockDps * dt, null, true);
      if (this.groundedTimer <= 0) this.shockDps = 0;
    }
    if (def.regen && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + def.regen * (this.maxHp / def.hp) * dt);
    if (!this.alive) return;

    // Chamán: cura a los cercanos
    if (def.healer) {
      this.healTimer -= dt;
      if (this.healTimer <= 0) {
        this.healTimer = 0.5;
        const R = def.healer.radius * TD.CONFIG.grid.cell;
        let healed = false;
        for (const e of this.game.enemies) {
          if (e !== this && e.alive && e.hp < e.maxHp && TD.U.dist2(e.x, e.y, this.x, this.y) < R * R) {
            e.hp = Math.min(e.maxHp, e.hp + def.healer.hps * 0.5 * (e.boss ? 3 : 1));
            healed = true;
          }
        }
        if (healed) this.game.fx.ring(this.x, this.y, R, '#7dff9a', 0.4);
      }
    }

    // Jefes
    if (def.enrage && !this.enraged && this.hp < this.maxHp * def.enrage.at) {
      this.enraged = true;
      this.game.fx.text(this.x, this.y - 30, '¡FURIA!', '#ff5a5a', 18);
      this.game.shake(8);
    }
    if (def.summon) {
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        this.summonTimer = def.summon.every;
        for (let i = 0; i < def.summon.count; i++) {
          this.game.spawnEnemy(def.summon.type, this.wave, { dist: Math.max(0, this.dist - 12 - i * 10), offset: TD.U.rand(-10, 10) });
        }
        this.game.fx.ring(this.x, this.y, 50, '#ff9a5a', 0.5);
      }
    }
    if (def.cloak) {
      this.cloakTimer -= dt;
      if (this.cloakTimer <= 0) {
        this.cloaked = !this.cloaked;
        this.cloakTimer = this.cloaked ? def.cloak.duration : def.cloak.every;
      }
    }

    // Movimiento
    if (this.slowTimer > 0) { this.slowTimer -= dt; if (this.slowTimer <= 0) this.slowMul = 1; }
    if (this.freezeTimer > 0) { this.freezeTimer -= dt; return this.updatePosition(); }
    if (this.stunTimer > 0) { this.stunTimer -= dt; return this.updatePosition(); }

    let speed = this.baseSpeed * this.slowMul * (this.enraged ? def.enrage.speedMul : 1);
    if (this.air && this.groundedTimer > 0) speed *= 0.5;

    // Barricadas: los terrestres se detienen y las golpean
    this.blockedBy = null;
    if (!this.air) {
      for (const b of this.game.barricades) {
        if (b.hp > 0 && this.dist <= b.dist && this.dist + speed * dt + this.radius >= b.dist - 10) {
          this.blockedBy = b;
          this.dist = Math.max(this.dist, b.dist - 10 - this.radius);
          b.hp -= (this.boss ? 120 : 12 * this.lives + this.maxHp * 0.02) * dt;
          break;
        }
      }
    }
    if (!this.blockedBy) this.dist += speed * dt;

    if (this.dist >= this.pathLength) {
      this.alive = false;
      this.escaped = true;
      this.game.onEnemyEscaped(this);
      return;
    }
    this.updatePosition();
  }

  // ------------------------------------------------------------------
  // Dibujo
  // ------------------------------------------------------------------
  draw(ctx) {
    const def = this.def;
    const r = this.radius;
    const revealed = this.game.revealTimer > 0;
    const ghost = this.hidden && !revealed;
    const flying = this.flying;
    const lift = flying ? 10 : 0;

    ctx.save();
    // Sombra (más separada si vuela)
    ctx.fillStyle = 'rgba(0,0,0,' + (flying ? 0.18 : 0.28) + ')';
    ctx.beginPath(); ctx.ellipse(this.x + (flying ? 6 : 2), this.y + r * 0.7 + (flying ? 8 : 0), r * 0.95, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();

    ctx.translate(this.x, this.y - lift);
    if (ghost) ctx.globalAlpha = 0.38;
    const wob = Math.sin(this.phase) * 0.12;
    let color = def.color;
    if (this.hitFlash > 0) color = '#ffffff';
    else if (this.freezeTimer > 0) color = '#bfe9ff';

    if (this.air) this.drawFlyer(ctx, r, color);
    else this.drawWalker(ctx, r, color, wob);

    // Estados visuales
    if (this.slowTimer > 0 && this.freezeTimer <= 0) {
      ctx.strokeStyle = 'rgba(120,200,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.freezeTimer > 0) {
      ctx.fillStyle = 'rgba(180,230,255,0.45)'; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
      ctx.fillRect(-r - 3, -r - 3, r * 2 + 6, r * 2 + 6); ctx.strokeRect(-r - 3, -r - 3, r * 2 + 6, r * 2 + 6);
    }
    if (this.burnTimer > 0) {
      for (let i = 0; i < 3; i++) {
        const fx = Math.sin(this.phase * 1.3 + i * 2) * r * 0.6, fy = -r * 0.6 - ((this.phase * 6 + i * 7) % 10);
        ctx.fillStyle = i % 2 ? '#ffb300' : '#ff5a1f';
        ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (this.stunTimer > 0) {
      ctx.fillStyle = '#ffe14a'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('✦ ✦', Math.sin(this.phase) * 3, -r - 4);
    }
    if (this.air && this.groundedTimer > 0) {
      ctx.strokeStyle = 'rgba(230,230,230,0.9)'; ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(i * r * 0.4, -r); ctx.lineTo(i * r * 0.4, r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r, i * r * 0.4); ctx.lineTo(r, i * r * 0.4); ctx.stroke();
      }
    }
    if (ghost) {
      ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();

    this.drawHealthBar(ctx, lift);
  }

  // Zombis que caminan
  drawWalker(ctx, r, color, wob) {
    const t = this.type;
    const dark = TD.U.shade(this.def.color, -0.35);
    ctx.rotate(this.angle);
    // Brazos extendidos hacia delante (clásico zombi)
    if (t !== 'rata' && t !== 'fantasma' && t !== 'escorpion') {
      ctx.fillStyle = dark;
      const sw = Math.sin(this.phase) * r * 0.2;
      ctx.fillRect(r * 0.2, -r * 0.75 + sw, r * 0.9, r * 0.28);
      ctx.fillRect(r * 0.2, r * 0.47 - sw, r * 0.9, r * 0.28);
    }
    if (t === 'rata') {
      ctx.strokeStyle = '#c9a0a0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(-r * 2, Math.sin(this.phase) * r, -r * 2.6, 0); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.3, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    } else if (t === 'escorpion') {
      // Cola curvada y pinzas
      ctx.strokeStyle = dark; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.quadraticCurveTo(-r * 1.8, -r * 1.2 + Math.sin(this.phase) * 4, -r * 0.6, -r * 1.3); ctx.stroke();
      ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(-r * 0.6, -r * 1.3, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(r * 1.0, -r * 0.6, r * 0.32, 0, Math.PI * 2); ctx.arc(r * 1.0, r * 0.6, r * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    } else if (t === 'fantasma') {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, true);
      for (let i = 0; i <= 3; i++) ctx.lineTo(-r - (i % 2) * 5, r - i * (r * 2 / 3));
      ctx.closePath(); ctx.fill();
    } else {
      const bodyR = t === 'hinchado' ? r * (1 + Math.sin(this.phase * 0.5) * 0.06) : r;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, bodyR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.stroke();
    }
    // Detalles por tipo
    if (t === 'hinchado') {
      ctx.fillStyle = '#d8e070';
      [[-0.3, -0.4], [0.2, 0.5], [-0.5, 0.3]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a * r, b * r, r * 0.18, 0, Math.PI * 2); ctx.fill(); });
    }
    if (t === 'mutante') {
      ctx.fillStyle = 'rgba(255,120,255,' + (0.5 + 0.4 * Math.sin(this.phase)) + ')';
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.arc(r * 0.1, r * 0.35, r * 0.15, 0, Math.PI * 2); ctx.fill();
    }
    if (t === 'chaman') {
      ctx.strokeStyle = '#7dff9a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.4 + Math.sin(this.phase) * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#6a2a5a'; ctx.beginPath(); ctx.arc(-r * 0.2, 0, r * 0.7, Math.PI / 2, -Math.PI / 2); ctx.fill();
    }
    if (this.armor > 0 && !this.air) {
      // Casco y escudo
      ctx.fillStyle = '#aab4c0';
      ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.75, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
      ctx.fillStyle = '#5b6a7a'; ctx.fillRect(r * 0.7, -r * 0.8, r * 0.25, r * 1.6);
    }
    if (t === 'granjero') {
      // Sombrero de paja
      ctx.fillStyle = '#e8c860';
      ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9a040'; ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b5452f'; ctx.fillRect(-r * 0.6, -r * 0.1, r * 1.0, r * 0.2);
    }
    // Ojos rojos brillantes
    if (t !== 'granjero') {
      ctx.fillStyle = this.boss ? '#ffea00' : '#ff3b3b';
      ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.28, Math.max(1.5, r * 0.14), 0, Math.PI * 2); ctx.arc(r * 0.45, r * 0.28, Math.max(1.5, r * 0.14), 0, Math.PI * 2); ctx.fill();
    }
  }

  // Enemigos voladores (alas batiendo)
  drawFlyer(ctx, r, color) {
    const flap = Math.sin(this.phase * 1.6);
    const dark = TD.U.shade(this.def.color, -0.35);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.type === 'dragon' ? '#9c2a16' : dark;
    const span = r * (this.boss ? 1.9 : 1.7);
    ctx.beginPath(); ctx.moveTo(-r * 0.2, 0); ctx.lineTo(-r * 0.6, -span * (0.6 + 0.4 * flap)); ctx.lineTo(r * 0.5, -r * 0.3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.2, 0); ctx.lineTo(-r * 0.6, span * (0.6 + 0.4 * flap)); ctx.lineTo(r * 0.5, r * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    // Pico / cabeza
    ctx.fillStyle = this.type === 'dragon' ? '#ffb300' : '#e0a040';
    ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.15); ctx.lineTo(r * 1.35, 0); ctx.lineTo(r * 0.9, r * 0.15); ctx.fill();
    if (this.armor > 0) {
      ctx.strokeStyle = '#c8d0da'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.type === 'portador') {
      ctx.fillStyle = '#7fb36a'; ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
    }
    if (this.type === 'dragon') {
      ctx.fillStyle = 'rgba(255,180,0,' + (0.4 + 0.3 * Math.sin(this.phase)) + ')';
      ctx.beginPath(); ctx.arc(r * 1.5, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff3b3b';
    ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.2, Math.max(1.3, r * 0.12), 0, Math.PI * 2); ctx.arc(r * 0.55, r * 0.2, Math.max(1.3, r * 0.12), 0, Math.PI * 2); ctx.fill();
  }

  drawHealthBar(ctx, lift) {
    if (this.hp >= this.maxHp && !this.boss) return;
    const w = this.boss ? 60 : Math.max(22, this.radius * 2.2);
    const h = this.boss ? 7 : 4;
    const x = this.x - w / 2, y = this.y - lift - this.radius - (this.boss ? 16 : 9);
    const f = TD.U.clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = f > 0.6 ? '#5ee06a' : f > 0.3 ? '#ffd84a' : '#ff4f4f';
    ctx.fillRect(x, y, w * f, h);
    if (this.armor > 0) {
      ctx.fillStyle = '#c8d0da';
      ctx.fillRect(x - 5, y - 1, 3, h + 2);
    }
  }
};

/* =====================================================================
 * heroes.js — Héroes: unidad especial (una por partida) que se coloca
 * gratis, sube de nivel sola con las bajas cercanas y se puede mover.
 * Reutiliza la lógica de apuntado de TD.Tower.
 * ===================================================================== */
window.TD = window.TD || {};

TD.Hero = class extends TD.Tower {
  constructor(game, heroId, c, r) {
    const h = TD.CONFIG.heroes[heroId];
    const g = TD.CONFIG.heroGrowth;
    // Se construye una definición compatible con las torres
    const def = {
      name: h.name, icon: h.icon, category: 'hero', behavior: 'hero',
      targets: h.targets, detect: h.detect, stats: h.stats,
      growth: { mul: { damage: g, rate: 1.06 }, add: { range: 0.12 } },
      look: { barrels: 1, barrelLen: 0.34, barrelW: 0.09, color: h.color }
    };
    super(game, heroId, c, r, def);
    this.heroId = heroId;
    this.heroDef = h;
    this.xp = 0;
    this.abilityCd = h.ability.every || 0;
  }

  get isHero() { return true; }
  get perk() { return null; }
  get maxed() { return this.level >= 5; }
  upgradeCost() { return Infinity; }
  sellValue() { return 0; }

  // XP necesaria para el siguiente nivel (null si está al máximo)
  nextXp() { return TD.CONFIG.heroLevels[this.level] || null; }

  addXp(v) {
    if (this.maxed) return;
    this.xp += v * (1 + TD.Profile.barracksValue('heroe'));
    while (!this.maxed && this.xp >= this.nextXp()) {
      this.level++;
      this.recalc();
      this.game.fx.text(this.x, this.y - 30, '¡' + this.heroDef.name.split(' ')[1] + ' nivel ' + this.level + '!', '#ffd84a', 15);
      this.game.fx.ring(this.x, this.y, 40, '#ffd84a', 0.6);
      TD.Audio.play('levelup');
    }
  }

  moveTo(c, r) {
    const S = TD.CONFIG.grid.cell;
    this.c = c; this.r = r;
    this.x = (c + 0.5) * S; this.y = (r + 0.5) * S;
    this.nearLava = this.game.map.nearLava(c, r) && !!this.game.map.def.lavaRateBonus;
    this.game.fx.ring(this.x, this.y, 30, this.heroDef.color, 0.5);
  }

  update(dt) {
    this.anim += dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 8);
    const h = this.heroDef, ab = h.ability, g = this.game, S = TD.CONFIG.grid.cell;

    // Doc Luna: despierta torres aturdidas cercanas
    if (ab.type === 'heal') {
      const R = h.stats.auraRange * S;
      for (const t of g.towers) if (t.stunTimer > 0 && TD.U.dist2(t.x, t.y, this.x, this.y) < R * R) t.stunTimer = 0;
    }

    // Ataque básico
    this.cooldown -= dt;
    const e = this.findTarget();
    if (e) {
      this.aimAt(e, dt);
      if (this.cooldown <= 0) {
        this.cooldown = 1 / this.rate;
        this.shoot('bullet', e, { color: h.color, size: 3 });
        TD.Audio.play('shot');
      }
    }

    // Habilidad
    if (this.level >= ab.level && ab.every) {
      this.abilityCd -= dt;
      if (this.abilityCd <= 0) {
        if (ab.type === 'grenade' && e) {
          this.abilityCd = ab.every;
          this.shoot('grenade', null, { tx: e.x, ty: e.y, damage: ab.damage * Math.pow(1.2, this.level - 3), splash: ab.splash * S, color: '#ff9a3c', size: 6 });
          g.fx.text(this.x, this.y - 26, '¡Granada!', '#ffb347', 12);
        } else if (ab.type === 'turret') {
          this.abilityCd = ab.every;
          const n = this.level >= 4 ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const spot = g.findFreeCellNear(this.c, this.r, 2);
            if (!spot) break;
            g.tempTurrets.push({
              x: (spot.c + 0.5) * S, y: (spot.r + 0.5) * S, c: spot.c, r: spot.r, life: ab.duration, cd: 0, angle: 0,
              damage: ab.damage * Math.pow(1.25, this.level - 1), rate: ab.rate, range: ab.range * S, source: this
            });
            g.fx.ring((spot.c + 0.5) * S, (spot.r + 0.5) * S, 22, '#f0c43a', 0.4);
          }
        }
      }
    }
  }

  draw(ctx) {
    const S = TD.CONFIG.grid.cell, h = this.heroDef;
    const x = this.x, y = this.y;
    // Aura
    if (h.stats.auraRange) {
      ctx.strokeStyle = TD.U.shade(h.color, 0.2); ctx.globalAlpha = 0.25; ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.arc(x, y, h.stats.auraRange * S, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // Pedestal dorado
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + S * 0.3, S * 0.36, S * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6a5520';
    ctx.beginPath(); ctx.arc(x, y + 2, S * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; ctx.stroke();
    // Cuerpo que mira al objetivo
    ctx.save(); ctx.translate(x, y); ctx.rotate(this.angle);
    ctx.fillStyle = '#2d3136'; ctx.fillRect(S * 0.05, -3, S * 0.34 * (1 - this.recoil * 0.2), 6);
    ctx.fillStyle = h.color;
    ctx.beginPath(); ctx.arc(0, 0, S * 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = TD.U.shade(h.color, -0.4); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(h.icon, x, y + 1);
    ctx.textBaseline = 'alphabetic';
    // Nivel
    ctx.fillStyle = '#ffd84a'; ctx.font = 'bold 10px sans-serif';
    ctx.fillText('Nv' + this.level, x, y - S * 0.42);
    // Barra de XP
    const nx = this.nextXp();
    if (nx) {
      const prev = TD.CONFIG.heroLevels[this.level - 1];
      const f = TD.U.clamp((this.xp - prev) / (nx - prev), 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 16, y + S * 0.42, 32, 4);
      ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - 16, y + S * 0.42, 32 * f, 4);
    }
  }
};

/* =====================================================================
 * sprites.js — Dibujo de las torres vistas desde arriba: soldados con
 * sus armas, nidos de ametralladora, morteros, tanques, lanzamisiles…
 * Cada función recibe la torre (t) y el contexto; se dibuja girada
 * hacia t.angle. Para una torre nueva basta con añadir su entrada aquí
 * (si no existe, se usa la torreta genérica de towers.js).
 * ===================================================================== */
window.TD = window.TD || {};

(function () {
  const S = () => TD.CONFIG.grid.cell;
  const SKIN = '#e0b48a';

  // Sacos terreros en anillo
  function sandbags(ctx, x, y, r, n, skip) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (skip && Math.abs(TD.U.angleDiff(a, skip)) < 0.6) continue;
      ctx.save();
      ctx.translate(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#b89a66'; ctx.strokeStyle = '#7d6440'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.36, r * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // Fogonazo en la boca del arma
  function flash(ctx, x, y, size) {
    ctx.fillStyle = '#fff3a0';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, r = i % 2 ? size * 0.4 : size;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffb300';
    ctx.beginPath(); ctx.arc(x, y, size * 0.35, 0, Math.PI * 2); ctx.fill();
  }

  // Colores del casco según el nivel (el nivel 5 luce franja dorada)
  function helmetColor(t, base) { return t.level >= 5 ? '#2e3326' : base; }

  /**
   * Soldado visto desde arriba, mirando hacia +x.
   * o: { uniform, helmet, gun:{len, w, color, x}, pack:'mochila'|'tanques'|null, beret, ghillie, scale }
   */
  function soldier(ctx, t, o) {
    const s = S() * (o.scale || 1) * 1.28;
    const rec = t.recoil * s * 0.06;
    ctx.save();
    ctx.translate(t.x, t.y);
    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(3, 4, s * 0.24, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(t.angle);
    ctx.translate(-rec, 0);

    // Equipo en la espalda
    if (o.pack === 'tanques') {
      ctx.fillStyle = '#d0582a'; ctx.strokeStyle = '#7a2a10'; ctx.lineWidth = 1.5;
      for (const yy of [-0.09, 0.09]) { ctx.beginPath(); ctx.ellipse(-s * 0.2, yy * s, s * 0.1, s * 0.075, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    } else if (o.pack === 'mochila') {
      ctx.fillStyle = TD.U.shade(o.uniform, -0.3);
      ctx.fillRect(-s * 0.27, -s * 0.11, s * 0.12, s * 0.22);
    }
    // Cuerpo (hombros)
    if (o.ghillie) {
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2;
        ctx.fillStyle = i % 2 ? '#3d5a2a' : '#56703a';
        ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.1 - s * 0.04, Math.sin(a) * s * 0.15, s * 0.09, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = o.uniform; ctx.strokeStyle = TD.U.shade(o.uniform, -0.45); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(-s * 0.04, 0, s * 0.13, s * 0.23, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Hombreras
      ctx.fillStyle = TD.U.shade(o.uniform, 0.15);
      ctx.beginPath(); ctx.arc(-s * 0.03, -s * 0.17, s * 0.055, 0, Math.PI * 2); ctx.arc(-s * 0.03, s * 0.17, s * 0.055, 0, Math.PI * 2); ctx.fill();
    }
    // Arma
    const g = o.gun;
    const gx = g.x !== undefined ? g.x * s : s * 0.02;
    ctx.fillStyle = g.color || '#2b2e33';
    ctx.fillRect(gx, s * 0.04 - (g.w * s) / 2, g.len * s, g.w * s);
    if (g.scope) { ctx.fillStyle = '#111'; ctx.fillRect(gx + g.len * s * 0.3, s * 0.04 - g.w * s * 1.1, g.len * s * 0.25, g.w * s * 0.8); }
    if (g.drum) { ctx.fillStyle = g.drum; ctx.beginPath(); ctx.arc(gx + s * 0.12, s * 0.04, g.w * s * 0.8, 0, Math.PI * 2); ctx.fill(); }
    // Brazos y manos sujetando el arma
    ctx.strokeStyle = TD.U.shade(o.uniform, -0.1); ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.02, -s * 0.16); ctx.lineTo(s * 0.13, s * 0.02); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.02, s * 0.17); ctx.lineTo(s * 0.26, s * 0.06); ctx.stroke();
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(s * 0.13, s * 0.02, s * 0.035, 0, Math.PI * 2); ctx.arc(s * 0.26, s * 0.06, s * 0.035, 0, Math.PI * 2); ctx.fill();
    // Cabeza con casco o boina
    if (o.beret) {
      ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(s * 0.01, 0, s * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = o.beret; ctx.beginPath(); ctx.ellipse(-s * 0.02, -s * 0.01, s * 0.09, s * 0.08, 0.4, 0, Math.PI * 2); ctx.fill();
    } else {
      const hc = helmetColor(t, o.helmet);
      ctx.fillStyle = hc; ctx.strokeStyle = TD.U.shade(o.helmet, -0.5); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s * 0.01, 0, s * 0.095, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(-s * 0.02, -s * 0.03, s * 0.045, 0, Math.PI * 2); ctx.fill();
      if (t.level >= 5) { ctx.fillStyle = '#ffd84a'; ctx.fillRect(-s * 0.1, -s * 0.015, s * 0.2, s * 0.03); }
    }
    // Fogonazo
    if (t.recoil > 0.55 && !g.noFlash) flash(ctx, gx + g.len * s + s * 0.04, s * 0.04, s * 0.09);
    ctx.restore();
  }

  function rotated(ctx, t, fn) {
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.angle); fn(S()); ctx.restore();
  }

  TD.drawSoldier = soldier;

  TD.SPRITES = {
    fusilero(t, ctx) {
      soldier(ctx, t, { uniform: '#5f7a3c', helmet: '#4d6532', pack: 'mochila', gun: { len: 0.4, w: 0.045 } });
    },
    escopeta(t, ctx) {
      soldier(ctx, t, { uniform: '#7a5a3a', helmet: '#5e4430', gun: { len: 0.3, w: 0.08, color: '#3a2a1c' } });
    },
    francotirador(t, ctx) {
      soldier(ctx, t, { ghillie: true, uniform: '#3d5a2a', beret: '#2a3a20', gun: { len: 0.56, w: 0.04, scope: true } });
    },
    lanzallamas(t, ctx) {
      soldier(ctx, t, { uniform: '#8a6a3a', helmet: '#555a5e', pack: 'tanques', gun: { len: 0.3, w: 0.06, color: '#44484d', noFlash: true } });
      if (t.firing) rotated(ctx, t, s => { ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.arc(s * 0.36, s * 0.04, s * 0.04 + Math.random() * 2, 0, Math.PI * 2); ctx.fill(); });
    },
    lanzagranadas(t, ctx) {
      soldier(ctx, t, { uniform: '#556b3a', helmet: '#44552f', pack: 'mochila', gun: { len: 0.32, w: 0.1, color: '#3b4a2a', drum: '#2a2a2a' } });
    },
    minador(t, ctx) {
      const s = S();
      // Caja de minas
      ctx.fillStyle = '#6b5030'; ctx.fillRect(t.x + s * 0.1, t.y + s * 0.08, s * 0.24, s * 0.18);
      ctx.strokeStyle = '#3b2a18'; ctx.lineWidth = 1; ctx.strokeRect(t.x + s * 0.1, t.y + s * 0.08, s * 0.24, s * 0.18);
      ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(t.x + s * 0.22, t.y + s * 0.17, 3, 0, Math.PI * 2); ctx.fill();
      soldier(ctx, t, { uniform: '#6f6a3a', helmet: '#e0b23a', gun: { len: 0.34, w: 0.035, color: '#8a6a44', noFlash: true }, scale: 0.9 });
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(t.mines.length + '/' + t.s.maxMines, t.x + s * 0.22, t.y + s * 0.4);
    },
    red(t, ctx) {
      soldier(ctx, t, { uniform: '#4a6a8a', helmet: '#3a5570', gun: { len: 0.3, w: 0.14, color: '#8aa0b8', noFlash: true } });
    },

    // Nido de ametralladora: sacos terreros + ametralladora en trípode + tirador
    ametralladora(t, ctx) {
      const s = S();
      sandbags(ctx, t.x, t.y, s * 0.32, 9, t.angle);
      rotated(ctx, t, s => {
        const rec = t.recoil * 2;
        ctx.translate(-rec, 0);
        // Trípode
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s * 0.12, 0); ctx.lineTo(s * 0.24, -s * 0.1); ctx.moveTo(s * 0.12, 0); ctx.lineTo(s * 0.24, s * 0.1); ctx.stroke();
        // Cañón(es) con camisa de refrigeración
        const n = t.perk ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const oy = (i - (n - 1) / 2) * s * 0.09;
          ctx.fillStyle = '#3a3f45'; ctx.fillRect(s * 0.02, oy - s * 0.045, s * 0.26, s * 0.09);
          ctx.fillStyle = '#1e2124'; ctx.fillRect(s * 0.28, oy - s * 0.02, s * 0.2, s * 0.04);
          if (t.recoil > 0.4) flash(ctx, s * 0.52, oy, s * 0.07);
        }
        // Caja de munición y cinta
        ctx.fillStyle = '#5a6a3a'; ctx.fillRect(s * 0.02, s * 0.1, s * 0.12, s * 0.09);
        ctx.fillStyle = '#d4a93a';
        for (let i = 0; i < 4; i++) ctx.fillRect(s * 0.05 + i * s * 0.025, s * 0.05, s * 0.015, s * 0.05);
        // Tirador
        ctx.fillStyle = '#5f7a3c'; ctx.strokeStyle = '#2e3a1c'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(-s * 0.12, 0, s * 0.12, s * 0.18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = helmetColor(t, '#4d6532');
        ctx.beginPath(); ctx.arc(-s * 0.1, 0, s * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#5f7a3c'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.14); ctx.lineTo(s * 0.03, -s * 0.03); ctx.moveTo(-s * 0.1, s * 0.14); ctx.lineTo(s * 0.03, s * 0.03); ctx.stroke();
      });
    },

    // Mortero: foso de sacos, tubo y artillero
    mortero(t, ctx) {
      const s = S();
      ctx.fillStyle = 'rgba(60,45,30,0.6)';
      ctx.beginPath(); ctx.arc(t.x, t.y, s * 0.3, 0, Math.PI * 2); ctx.fill();
      sandbags(ctx, t.x, t.y, s * 0.34, 10);
      rotated(ctx, t, s => {
        // Bípode y tubo inclinado
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s * 0.12, -s * 0.08); ctx.lineTo(s * 0.02, 0); ctx.lineTo(s * 0.12, s * 0.08); ctx.stroke();
        ctx.fillStyle = '#4a5058'; ctx.fillRect(-s * 0.08, -s * 0.06, s * 0.26, s * 0.12);
        ctx.fillStyle = '#15171a'; ctx.beginPath(); ctx.arc(s * 0.18, 0, s * 0.065, 0, Math.PI * 2); ctx.fill();
        if (t.recoil > 0.4) { ctx.fillStyle = 'rgba(220,220,220,0.6)'; ctx.beginPath(); ctx.arc(s * 0.22, 0, s * 0.12 * t.recoil, 0, Math.PI * 2); ctx.fill(); }
        // Artillero agachado con un proyectil
        ctx.fillStyle = '#5f6a3c';
        ctx.beginPath(); ctx.ellipse(-s * 0.16, s * 0.14, s * 0.1, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = helmetColor(t, '#4d5532'); ctx.beginPath(); ctx.arc(-s * 0.14, s * 0.14, s * 0.075, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c9a040'; ctx.fillRect(-s * 0.06, s * 0.1, s * 0.1, s * 0.04);
      });
    },

    // Tanque: casco con orugas que gira despacio y torreta con cañón largo
    tanque(t, ctx) {
      const s = S();
      if (t.hull === undefined) t.hull = t.angle;
      t.hull += TD.U.angleDiff(t.hull, t.angle) * 0.03;
      ctx.save(); ctx.translate(t.x, t.y);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-s * 0.36 + 3, -s * 0.3 + 4, s * 0.72, s * 0.6);
      ctx.rotate(t.hull);
      // Orugas
      ctx.fillStyle = '#1f2326';
      ctx.fillRect(-s * 0.38, -s * 0.33, s * 0.76, s * 0.14);
      ctx.fillRect(-s * 0.38, s * 0.19, s * 0.76, s * 0.14);
      ctx.strokeStyle = '#3a4046'; ctx.lineWidth = 1.5;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath(); ctx.moveTo(i * s * 0.1, -s * 0.33); ctx.lineTo(i * s * 0.1, -s * 0.19); ctx.moveTo(i * s * 0.1, s * 0.19); ctx.lineTo(i * s * 0.1, s * 0.33); ctx.stroke();
      }
      // Casco
      ctx.fillStyle = '#5a6b3a'; ctx.strokeStyle = '#2e3a1c'; ctx.lineWidth = 1.5;
      ctx.fillRect(-s * 0.34, -s * 0.21, s * 0.68, s * 0.42); ctx.strokeRect(-s * 0.34, -s * 0.21, s * 0.68, s * 0.42);
      ctx.fillStyle = '#4b5a30'; ctx.fillRect(-s * 0.34, -s * 0.21, s * 0.1, s * 0.42);
      ctx.restore();
      // Torreta
      rotated(ctx, t, s => {
        const rec = t.recoil * s * 0.08;
        ctx.fillStyle = '#2a2e24'; ctx.fillRect(s * 0.08 - rec, -s * 0.045, s * 0.46, s * 0.09);
        ctx.fillStyle = '#1a1c18'; ctx.fillRect(s * 0.48 - rec, -s * 0.06, s * 0.07, s * 0.12);
        ctx.fillStyle = '#687a44'; ctx.strokeStyle = '#2e3a1c'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, s * 0.19, s * 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3e4a28'; ctx.beginPath(); ctx.arc(-s * 0.06, -s * 0.04, s * 0.06, 0, Math.PI * 2); ctx.fill();
        if (t.level >= 5) { ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(-s * 0.06, s * 0.08, s * 0.03, 0, Math.PI * 2); ctx.fill(); }
        if (t.recoil > 0.5) flash(ctx, s * 0.6, 0, s * 0.13);
      });
    },

    // Lanzamisiles antiaéreo: plataforma con 4 tubos
    antiaerea(t, ctx) {
      const s = S();
      ctx.fillStyle = '#39424c'; ctx.beginPath(); ctx.arc(t.x, t.y, s * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd84a'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y, s * 0.3, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      rotated(ctx, t, s => {
        ctx.fillStyle = '#4f6f96'; ctx.strokeStyle = '#243548'; ctx.lineWidth = 1.5;
        ctx.fillRect(-s * 0.18, -s * 0.2, s * 0.44, s * 0.4); ctx.strokeRect(-s * 0.18, -s * 0.2, s * 0.44, s * 0.4);
        const n = t.perk ? 3 : 2;
        for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
          const y = (i - (n - 1) / 2) * s * 0.12, x = s * 0.2;
          ctx.fillStyle = '#1b2530'; ctx.beginPath(); ctx.arc(x, y + (j ? 0 : 0), s * 0.05, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ff4f4f'; ctx.beginPath(); ctx.arc(x, y, s * 0.028, 0, Math.PI * 2); ctx.fill();
        }
      });
    },

    // Cañón antiaéreo Flak: foso de hormigón y cuatro cañones
    flak(t, ctx) {
      const s = S();
      ctx.fillStyle = '#6a7078'; ctx.beginPath(); ctx.arc(t.x, t.y, s * 0.34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a5058'; ctx.beginPath(); ctx.arc(t.x, t.y, s * 0.26, 0, Math.PI * 2); ctx.fill();
      rotated(ctx, t, s => {
        const rec = t.recoil * s * 0.05;
        ctx.fillStyle = '#23272c';
        for (const oy of [-0.1, -0.035, 0.035, 0.1]) ctx.fillRect(s * 0.05 - rec, oy * s - s * 0.018, s * 0.42, s * 0.036);
        ctx.fillStyle = '#577ca8'; ctx.strokeStyle = '#2a3f58'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = helmetColor(t, '#3a5570'); ctx.beginPath(); ctx.arc(-s * 0.08, 0, s * 0.07, 0, Math.PI * 2); ctx.fill();
        if (t.recoil > 0.5) flash(ctx, s * 0.5, 0, s * 0.1);
      });
    },

    // Torreta láser futurista
    laser(t, ctx) {
      const s = S();
      ctx.fillStyle = '#3a3f4a';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.lineTo(t.x + Math.cos(a) * s * 0.32, t.y + Math.sin(a) * s * 0.32); }
      ctx.closePath(); ctx.fill();
      rotated(ctx, t, s => {
        ctx.fillStyle = '#c9ccd4'; ctx.fillRect(s * 0.05, -s * 0.06, s * 0.38, s * 0.12);
        ctx.fillStyle = '#ff5aa8'; ctx.fillRect(s * 0.4, -s * 0.04, s * 0.05, s * 0.08);
        ctx.fillStyle = '#e8e9ee'; ctx.strokeStyle = '#6a6d78'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, s * 0.2, s * 0.17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const g = 0.6 + 0.4 * Math.sin(t.anim * 6);
        ctx.fillStyle = 'rgba(255,90,168,' + g + ')'; ctx.shadowColor = '#ff5aa8'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      });
    }
  };
})();

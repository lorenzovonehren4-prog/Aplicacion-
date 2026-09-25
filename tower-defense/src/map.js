/* =====================================================================
 * map.js — Mapa en cuadrícula: camino terrestre, ruta aérea, casillas
 * construibles/bloqueadas/especiales y el dibujo del escenario.
 * ===================================================================== */
window.TD = window.TD || {};

TD.GameMap = class {
  constructor(def) {
    const G = TD.CONFIG.grid;
    this.def = def;
    this.cols = G.cols;
    this.rows = G.rows;
    this.cell = G.cell;
    this.width = this.cols * this.cell;
    this.height = this.rows * this.cell;

    // Tipo de cada casilla: 'grass' | 'path' | 'blocked' | 'fertil' | 'lava'
    this.tiles = [];
    for (let r = 0; r < this.rows; r++) this.tiles.push(new Array(this.cols).fill('grass'));

    // Camino terrestre en píxeles (centro de las casillas)
    this.points = def.path.map(([c, r]) => ({ x: (c + 0.5) * this.cell, y: (r + 0.5) * this.cell }));
    this.segments = [];
    let acc = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i], b = this.points[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.segments.push({ a, b, len, start: acc, angle: Math.atan2(b.y - a.y, b.x - a.x) });
      acc += len;
    }
    this.length = acc;

    // Marca las casillas del camino (los tramos son horizontales o verticales)
    for (let i = 0; i < def.path.length - 1; i++) {
      const [c1, r1] = def.path[i], [c2, r2] = def.path[i + 1];
      const steps = Math.max(Math.abs(c2 - c1), Math.abs(r2 - r1));
      for (let s = 0; s <= steps; s++) {
        const c = c1 + Math.sign(c2 - c1) * s, r = r1 + Math.sign(r2 - r1) * s;
        if (this.inside(c, r)) this.tiles[r][c] = 'path';
      }
    }

    // Casillas bloqueadas y especiales
    this.decos = [];
    for (const b of def.blocked) {
      if (!this.inside(b.c, b.r) || this.tiles[b.r][b.c] === 'path') continue;
      this.tiles[b.r][b.c] = b.type === 'lava' ? 'lava' : 'blocked';
      this.decos.push(b);
    }
    for (const s of def.special) if (this.inside(s.c, s.r) && this.tiles[s.r][s.c] === 'grass') this.tiles[s.r][s.c] = s.type;

    // Ruta aérea: línea recta desde la entrada hasta la salida
    const first = this.points[0], last = this.points[this.points.length - 1];
    this.air = { a: first, b: last, len: Math.hypot(last.x - first.x, last.y - first.y), angle: Math.atan2(last.y - first.y, last.x - first.x) };

    this.bg = null; // lienzo con el fondo pre-renderizado
  }

  inside(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }
  tile(c, r) { return this.inside(c, r) ? this.tiles[r][c] : 'out'; }
  isBuildable(c, r) { const t = this.tile(c, r); return t === 'grass' || t === 'fertil'; }
  isPath(c, r) { return this.tile(c, r) === 'path'; }
  cellCenter(c, r) { return { x: (c + 0.5) * this.cell, y: (r + 0.5) * this.cell }; }
  cellAt(x, y) { return { c: Math.floor(x / this.cell), r: Math.floor(y / this.cell) }; }

  // ¿Tiene lava en alguna de las 8 casillas vecinas?
  nearLava(c, r) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (this.tile(c + dc, r + dr) === 'lava') return true;
    return false;
  }

  // Posición sobre el camino terrestre a una distancia recorrida
  pointAt(dist) {
    dist = TD.U.clamp(dist, 0, this.length);
    let lo = 0, hi = this.segments.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (this.segments[mid].start <= dist) lo = mid; else hi = mid - 1; }
    const s = this.segments[lo];
    const t = s.len ? (dist - s.start) / s.len : 0;
    return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, angle: s.angle };
  }

  // Posición sobre la ruta aérea
  airPointAt(dist) {
    const t = TD.U.clamp(dist / this.air.len, 0, 1);
    return { x: this.air.a.x + (this.air.b.x - this.air.a.x) * t, y: this.air.a.y + (this.air.b.y - this.air.a.y) * t, angle: this.air.angle };
  }

  // Proyecta un punto sobre el camino: distancia recorrida y separación
  project(x, y) {
    let best = { dist: 0, d: Infinity };
    for (const s of this.segments) {
      const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y;
      const t = s.len ? TD.U.clamp(((x - s.a.x) * dx + (y - s.a.y) * dy) / (s.len * s.len), 0, 1) : 0;
      const px = s.a.x + dx * t, py = s.a.y + dy * t;
      const d = Math.hypot(x - px, y - py);
      if (d < best.d) best = { dist: s.start + s.len * t, d };
    }
    return best;
  }

  // ------------------------------------------------------------------
  // Dibujo
  // ------------------------------------------------------------------
  // Pre-renderiza la parte estática del mapa una sola vez
  buildBackground() {
    const cv = document.createElement('canvas');
    cv.width = this.width; cv.height = this.height;
    const ctx = cv.getContext('2d');
    const P = this.def.palette, S = this.cell;
    // Generador pseudoaleatorio con semilla (misma decoración siempre)
    let seed = this.def.id.length * 9973;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = this.tiles[r][c];
        ctx.fillStyle = (r + c) % 2 ? P.grass : P.grass2;
        ctx.fillRect(c * S, r * S, S, S);
        if (t === 'fertil') {
          ctx.fillStyle = 'rgba(120,80,30,0.55)';
          ctx.fillRect(c * S + 3, r * S + 3, S - 6, S - 6);
          ctx.strokeStyle = 'rgba(255,230,120,0.6)';
          ctx.lineWidth = 2;
          for (let k = 0; k < 3; k++) {
            ctx.beginPath(); ctx.moveTo(c * S + 8, r * S + 12 + k * 12); ctx.lineTo(c * S + S - 8, r * S + 12 + k * 12); ctx.stroke();
          }
        }
      }
    }
    // Detalles del suelo (hierba, piedritas, grietas)
    for (let i = 0; i < 260; i++) {
      const x = rnd() * this.width, y = rnd() * this.height;
      const { c, r } = this.cellAt(x, y);
      if (this.tile(c, r) !== 'grass') continue;
      ctx.fillStyle = TD.U.shade(P.grass, rnd() > 0.5 ? 0.18 : -0.18);
      if (this.def.id === 'pradera') { ctx.fillRect(x, y, 2, 5); ctx.fillRect(x + 3, y + 1, 2, 4); }
      else { ctx.beginPath(); ctx.arc(x, y, 1.5 + rnd() * 2, 0, Math.PI * 2); ctx.fill(); }
    }
    if (this.def.id === 'pradera') {
      const flowers = ['#ffd84a', '#ff8fb1', '#ffffff', '#c9a0ff'];
      for (let i = 0; i < 60; i++) {
        const x = rnd() * this.width, y = rnd() * this.height;
        const { c, r } = this.cellAt(x, y);
        if (this.tile(c, r) !== 'grass') continue;
        ctx.fillStyle = flowers[Math.floor(rnd() * flowers.length)];
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Camino: borde + relleno + textura
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = P.pathEdge; ctx.lineWidth = S * 0.92;
    this.strokePath(ctx);
    ctx.strokeStyle = P.path; ctx.lineWidth = S * 0.74;
    this.strokePath(ctx);
    for (let i = 0; i < 180; i++) {
      const d = rnd() * this.length, p = this.pointAt(d);
      ctx.fillStyle = TD.U.shade(P.path, rnd() > 0.5 ? -0.12 : 0.12);
      ctx.beginPath(); ctx.arc(p.x + (rnd() - 0.5) * S * 0.6, p.y + (rnd() - 0.5) * S * 0.6, 1.5 + rnd() * 2, 0, Math.PI * 2); ctx.fill();
    }

    // Decoración estática
    for (const d of this.decos) if (d.type !== 'lava' && d.type !== 'molino') this.drawDeco(ctx, d, rnd);

    // Flechas de entrada y salida
    const a = this.points[1], b = this.points[this.points.length - 2];
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,60,60,0.85)';
    ctx.fillText('☠', this.clampX(this.points[0].x) , a.y - S * 0.55);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('🏰', this.clampX(this.points[this.points.length - 1].x), b.y - S * 0.55);
    this.bg = cv;
  }

  clampX(x) { return TD.U.clamp(x, 14, this.width - 14); }

  strokePath(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
    ctx.stroke();
  }

  drawDeco(ctx, d, rnd) {
    const S = this.cell, x = d.c * S + S / 2, y = d.r * S + S / 2;
    if (d.type === 'arbol') {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(x + 4, y + 14, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 3, y, 6, 14);
      ctx.fillStyle = '#2f6b2a'; ctx.beginPath(); ctx.arc(x, y - 4, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3d8a36'; ctx.beginPath(); ctx.arc(x - 5, y - 8, 9, 0, Math.PI * 2); ctx.fill();
    } else if (d.type === 'roca') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x + 3, y + 10, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.def.id === 'fragua' ? '#2a2530' : '#a0492e';
      ctx.beginPath(); ctx.moveTo(x - 18, y + 10); ctx.lineTo(x - 10, y - 12); ctx.lineTo(x + 6, y - 16); ctx.lineTo(x + 18, y + 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.moveTo(x - 10, y - 12); ctx.lineTo(x + 6, y - 16); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    } else if (d.type === 'cactus') {
      ctx.fillStyle = '#3f8a4a';
      ctx.fillRect(x - 4, y - 16, 8, 30);
      ctx.fillRect(x - 13, y - 6, 6, 12); ctx.fillRect(x - 13, y - 6, 12, 5);
      ctx.fillRect(x + 7, y - 12, 6, 10); ctx.fillRect(x + 2, y - 6, 11, 5);
    } else if (d.type === 'cerca') {
      ctx.fillStyle = '#8a6a44';
      ctx.fillRect(d.c * S, y - 6, S, 4); ctx.fillRect(d.c * S, y + 4, S, 4);
      ctx.fillRect(x - 3, y - 12, 6, 24);
    }
  }

  // Dibujo por fotograma: fondo + elementos animados (lava, molino)
  draw(ctx, time) {
    if (!this.bg) this.buildBackground();
    ctx.drawImage(this.bg, 0, 0);
    const S = this.cell;
    for (const d of this.decos) {
      if (d.type === 'lava') {
        const x = d.c * S, y = d.r * S;
        const g = ctx.createLinearGradient(x, y, x + S, y + S);
        const k = 0.5 + 0.5 * Math.sin(time * 2 + d.c + d.r);
        g.addColorStop(0, '#ff3d00'); g.addColorStop(0.5 + 0.3 * k - 0.15, '#ffb300'); g.addColorStop(1, '#d32f00');
        ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
        ctx.fillStyle = 'rgba(255,240,150,' + (0.25 + 0.25 * k) + ')';
        ctx.beginPath(); ctx.arc(x + S * (0.3 + 0.4 * ((d.c * 7) % 10) / 10), y + S * 0.5 + Math.sin(time * 3 + d.c) * 6, 4, 0, Math.PI * 2); ctx.fill();
      } else if (d.type === 'molino' && d.r === Math.min(...this.decos.filter(o => o.type === 'molino').map(o => o.r))) {
        this.drawMill(ctx, d.c * S + S / 2, d.r * S + S, time);
      }
    }
  }

  drawMill(ctx, x, y, time) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x + 6, y + 40, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath(); ctx.moveTo(x - 16, y + 40); ctx.lineTo(x - 10, y - 14); ctx.lineTo(x + 10, y - 14); ctx.lineTo(x + 16, y + 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b5452f';
    ctx.beginPath(); ctx.moveTo(x - 14, y - 12); ctx.lineTo(x, y - 30); ctx.lineTo(x + 14, y - 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 5, y + 24, 10, 16);
    ctx.save(); ctx.translate(x, y - 12); ctx.rotate(time * 0.8);
    ctx.fillStyle = '#f4ecd8'; ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(2, -4, 30, 8); ctx.strokeRect(2, -4, 30, 8);
    }
    ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Dibuja una miniatura del mapa en un lienzo (para el menú)
  drawPreview(canvas) {
    if (!this.bg) this.buildBackground();
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.bg, 0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(canvas.width / this.width, canvas.height / this.height);
    this.draw(ctx, 0);
    ctx.restore();
  }
};

// Escenas ilustradas (SVG 960x600) para las carátulas del estante del inicio.
// Cada una dibuja lo que pasa en el juego, con el sujeto arriba y a la derecha:
// abajo a la izquierda va el logo que pone caratulas.mjs.
// Si un juego no tiene escena, caratulas.mjs usa su mejor captura.

// azar con semilla para que la imagen salga igual cada vez
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const svg = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600" width="960" height="600" preserveAspectRatio="xMidYMid slice"><defs>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>
  <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
  ${defs}</defs>${body}</svg>`;
const stars = (n, seed, h = 300, op = .8) => { const r = rng(seed); let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${(r() * 960).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(r() * 1.6 + .3).toFixed(2)}" fill="#fff" opacity="${(r() * op + .1).toFixed(2)}"/>`; return s; };
const streaks = (n, seed, x0, x1, y0, y1, col, op = .5) => { const r = rng(seed); let s = ''; for (let i = 0; i < n; i++) { const y = y0 + r() * (y1 - y0), x = x0 + r() * (x1 - x0), w = 60 + r() * 220; s += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${(1.5 + r() * 3).toFixed(1)}" rx="2" fill="${col}" opacity="${(r() * op + .1).toFixed(2)}"/>`; } return s; };
const wheel = (cx, cy, r, rim = '#9aa3b5', tire = '#111') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${tire}"/><circle cx="${cx}" cy="${cy}" r="${r * .58}" fill="${rim}"/><circle cx="${cx}" cy="${cy}" r="${r * .42}" fill="#2a2f3a"/><circle cx="${cx}" cy="${cy}" r="${r * .14}" fill="${rim}"/>`;
// rueda girando (borrosa)
const wheelBlur = (cx, cy, r) => `<g>${wheel(cx, cy, r)}<ellipse cx="${cx}" cy="${cy}" rx="${r * .5}" ry="${r * .5}" fill="none" stroke="#cfd5e2" stroke-width="${r * .12}" stroke-dasharray="${r * .3} ${r * .5}" opacity=".5"/></g>`;

// sedán de perfil mirando a la derecha, 340 de largo, suelo en y=118
const sedan = (body, { police = false, roof = body } = {}) => `
  <ellipse cx="170" cy="120" rx="170" ry="10" fill="#000" opacity=".45"/>
  <path d="M8 84 Q10 62 40 60 L96 56 L140 22 Q150 15 166 15 L236 15 Q252 15 264 26 L298 56 L328 62 Q340 66 340 84 L340 98 L8 98 Z" fill="${body}"/>
  ${police ? `<path d="M96 56 L298 56 L328 62 Q340 66 340 84 L340 98 L8 98 L8 84 Q10 62 40 60 Z" fill="${body}"/><rect x="104" y="58" width="184" height="36" fill="#f4f6fb"/><path d="M140 22 Q150 15 166 15 L236 15 Q252 15 264 26 L276 38 L128 38 Z" fill="${roof}"/>` : ''}
  <path d="M110 55 L146 28 L196 28 L196 55 Z" fill="#9ec7ff" opacity=".85"/><path d="M206 28 L236 28 Q246 28 253 36 L272 55 L206 55 Z" fill="#9ec7ff" opacity=".85"/>
  <path d="M112 54 L140 33 L150 33 L124 54 Z" fill="#fff" opacity=".35"/>
  <rect x="8" y="78" width="332" height="5" fill="#fff" opacity=".12"/>
  <rect x="330" y="66" width="10" height="9" rx="3" fill="#fff6c8"/><rect x="8" y="64" width="9" height="10" rx="2" fill="#ff2a3a"/>
  ${wheelBlur(78, 98, 27)}${wheelBlur(268, 98, 27)}`;

export const SCENES = {
  /* ---------------- Ápice GP: monoplaza de noche frente a la tribuna ---------------- */
  'apice-gp': () => {
    const r = rng(7); let crowd = '';
    for (let i = 0; i < 520; i++) crowd += `<circle cx="${(r() * 960).toFixed(0)}" cy="${(180 + r() * 120).toFixed(0)}" r="${(1 + r() * 1.6).toFixed(1)}" fill="${['#ff4d6a', '#ffd23f', '#fff', '#5aa9ff'][i % 4]}" opacity="${(.25 + r() * .5).toFixed(2)}"/>`;
    let curb = ''; for (let x = -20; x < 980; x += 60) curb += `<path d="M${x} 438 L${x + 30} 438 L${x + 22} 452 L${x - 8} 452 Z" fill="#ff1e3c"/><path d="M${x + 30} 438 L${x + 60} 438 L${x + 52} 452 L${x + 22} 452 Z" fill="#f4f4f4"/>`;
    return svg(`
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05030b"/><stop offset=".6" stop-color="#2a0614"/><stop offset="1" stop-color="#4a0b18"/></linearGradient>
      <linearGradient id="asf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a33"/><stop offset="1" stop-color="#0c0c10"/></linearGradient>
      <linearGradient id="car" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4058"/><stop offset=".55" stop-color="#d0102a"/><stop offset="1" stop-color="#6a0614"/></linearGradient>
      <radialGradient id="flood" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2d6"/><stop offset="1" stop-color="#fff2d6" stop-opacity="0"/></radialGradient>`,
      `<rect width="960" height="600" fill="url(#sky)"/>${stars(70, 3, 160, .6)}
      ${[120, 470, 820].map(x => `<rect x="${x - 3}" y="40" width="6" height="150" fill="#1a1020"/><rect x="${x - 34}" y="30" width="68" height="18" rx="3" fill="#fff8e6"/><circle cx="${x}" cy="40" r="120" fill="url(#flood)" opacity=".55"/>`).join('')}
      <g transform="translate(0 -110)"><path d="M0 170 L960 150 L960 310 L0 320 Z" fill="#15081a"/>${crowd}
      <rect x="0" y="300" width="960" height="26" fill="#1c0d1e"/><rect x="0" y="306" width="960" height="5" fill="#ff1e3c" opacity=".8"/>
      <rect x="0" y="326" width="960" height="112" fill="url(#asf)"/><rect x="0" y="452" width="960" height="300" fill="#08080b"/>${curb}</g>
      ${streaks(30, 11, -100, 360, 200, 330, '#ffb8a0', .6)}
      <g transform="translate(250 168) scale(1.36)">
        <ellipse cx="260" cy="118" rx="270" ry="12" fill="#000" opacity=".6"/>
        <rect x="2" y="8" width="70" height="12" rx="2" fill="#16161c"/><rect x="2" y="20" width="70" height="5" fill="#ff8a3d"/><rect x="18" y="20" width="14" height="60" fill="#16161c"/>
        <path d="M40 98 L40 64 Q66 52 130 50 L180 46 Q196 20 222 22 L246 40 L320 50 Q390 64 470 78 L520 88 L520 100 L40 100 Z" fill="url(#car)"/>
        <path d="M120 74 L300 66 Q350 70 420 82 L300 84 L120 86 Z" fill="#ff8a3d" opacity=".9"/>
        <path d="M60 64 Q100 56 150 56 L150 64 L60 70 Z" fill="#fff" opacity=".25"/>
        <circle cx="222" cy="40" r="13" fill="#ffd23f"/><rect x="214" y="35" width="20" height="7" rx="3" fill="#111"/>
        <path d="M200 44 Q222 18 262 40" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/>
        <text x="290" y="78" font-family="BoxFred" font-weight="700" font-size="24" fill="#fff" font-style="italic">7</text>
        <rect x="452" y="96" width="84" height="9" rx="2" fill="#16161c"/><rect x="520" y="84" width="8" height="22" fill="#16161c"/>
        ${wheelBlur(96, 92, 36)}${wheelBlur(430, 96, 31)}
        ${[0, 1, 2, 3, 4].map(i => `<path d="M${560 + i * 6} ${112 - i * 2} l${-30 - i * 12} ${-4 + i * 3}" stroke="#ffb020" stroke-width="2" opacity=".8"/>`).join('')}
      </g>
      <circle cx="760" cy="260" r="200" fill="#ff1e3c" opacity=".16" filter="url(#glow2)"/>`);
  },

  /* ---------------- Kartódromo: kart en la recta con semáforo ---------------- */
  karting: () => {
    let curb = ''; for (let x = -40; x < 1000; x += 56) curb += `<rect x="${x}" y="350" width="28" height="16" fill="#ff4d3d"/><rect x="${x + 28}" y="350" width="28" height="16" fill="#fff"/>`;
    let trees = ''; const r = rng(5); for (let i = 0; i < 22; i++) { const x = i * 46 + r() * 20 - 10, s = 30 + r() * 26; trees += `<rect x="${x - 4}" y="${300 - s * .3}" width="8" height="${s * .6}" fill="#6b4a2a"/><circle cx="${x}" cy="${300 - s}" r="${s * .7}" fill="${['#2f9e44', '#37b24d', '#2b8a3e'][i % 3]}"/>`; }
    const kart = (main, suit, helm) => `
      <ellipse cx="180" cy="152" rx="190" ry="12" fill="#000" opacity=".35"/>
      <rect x="20" y="78" width="70" height="40" rx="6" fill="#4a4f5c"/><rect x="26" y="70" width="40" height="12" rx="4" fill="#2a2f3a"/>
      <rect x="30" y="118" width="320" height="12" rx="6" fill="#2a2f3a"/>
      <path d="M110 124 L118 92 Q124 84 140 84 L236 84 Q250 84 252 96 L256 124 Z" fill="${main}"/>
      <path d="M262 124 L270 96 Q300 92 340 104 L352 124 Z" fill="${main}"/><circle cx="318" cy="112" r="10" fill="#fff"/><text x="318" y="117" text-anchor="middle" font-family="BoxFred" font-weight="700" font-size="14" fill="#111">1</text>
      <path d="M124 92 L150 38 L196 44 L204 92 Z" fill="${suit}"/>
      <path d="M186 58 L246 82" stroke="${suit}" stroke-width="14" stroke-linecap="round"/><circle cx="246" cy="82" r="9" fill="#222"/><path d="M236 60 L252 100" stroke="#222" stroke-width="6" stroke-linecap="round"/>
      <path d="M196 92 L262 108" stroke="${suit}" stroke-width="16" stroke-linecap="round"/>
      <circle cx="170" cy="28" r="30" fill="${helm}"/><path d="M178 14 Q204 18 200 40 L176 36 Z" fill="#1b2433"/><path d="M150 10 Q170 -2 190 6" stroke="#fff" stroke-width="5" fill="none" opacity=".6"/>
      ${wheelBlur(70, 124, 34)}${wheelBlur(300, 128, 28)}`;
    return svg(`
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3aa0ff"/><stop offset="1" stop-color="#bfe6ff"/></linearGradient>
      <linearGradient id="asf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a5f6b"/><stop offset="1" stop-color="#2a2d35"/></linearGradient>`,
      `<rect width="960" height="600" fill="url(#sky)"/>
      <circle cx="840" cy="80" r="46" fill="#fff6c8"/><circle cx="840" cy="80" r="90" fill="#fff6c8" opacity=".35" filter="url(#glow2)"/>
      ${[[150, 90, 1], [470, 60, .8], [640, 130, .7]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".9"><ellipse cx="0" cy="0" rx="60" ry="22"/><ellipse cx="40" cy="-14" rx="40" ry="24"/><ellipse cx="-40" cy="-6" rx="34" ry="18"/></g>`).join('')}
      <g transform="translate(0 -90)"><rect x="0" y="250" width="960" height="70" fill="#3fbf55"/>${trees}
      <rect x="0" y="300" width="960" height="50" fill="#3fbf55"/>
      <rect x="0" y="310" width="960" height="14" fill="#1e3a8a"/>${Array.from({ length: 12 }, (_, i) => `<text x="${i * 90 + 10}" y="321" font-family="BoxFred" font-weight="700" font-size="11" fill="#fff" opacity=".85">KARTÓDROMO</text>`).join('')}
      ${curb}<rect x="0" y="366" width="960" height="234" fill="url(#asf)"/>
      <rect x="0" y="470" width="960" height="6" fill="#fff" opacity=".5"/><rect x="0" y="560" width="960" height="140" fill="#2a2d35"/></g>
      <g transform="translate(300 30)"><rect x="-6" y="40" width="12" height="80" fill="#222"/><rect x="-80" y="0" width="160" height="56" rx="12" fill="#14141a"/>${[-48, 0, 48].map((x, i) => `<circle cx="${x}" cy="28" r="18" fill="${i < 2 ? '#ff3b30' : '#3a1414'}"/>${i < 2 ? `<circle cx="${x}" cy="28" r="26" fill="#ff3b30" opacity=".5" filter="url(#glow)"/>` : ''}`).join('')}</g>
      ${streaks(22, 9, -60, 420, 290, 380, '#fff', .45)}
      <g transform="translate(120 230) scale(.6)">${kart('#2a6bff', '#ffd23f', '#ffffff')}</g>
      <g transform="translate(450 132) scale(1.3)">${kart('#ff4d3d', '#1e40af', '#ffb020')}</g>`);
  },

  /* ---------------- Código Rojo: patrullero persiguiendo al ladrón de noche ---------------- */
  'codigo-rojo': () => {
    const r = rng(21); let city = '';
    for (let x = -10; x < 980;) { const w = 50 + r() * 70, h = 90 + r() * 170; city += `<rect x="${x.toFixed(0)}" y="${(330 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${['#0f1224', '#141833', '#0b0e1c'][Math.floor(r() * 3)]}"/>`; for (let wy = 330 - h + 12; wy < 315; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 16) if (r() < .35) city += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="8" height="10" fill="#ffd27a" opacity="${(.4 + r() * .5).toFixed(2)}"/>`; x += w + 4; }
    return svg(`
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050816"/><stop offset="1" stop-color="#1b1035"/></linearGradient>
      <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".7"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>`,
      `<rect width="960" height="600" fill="url(#sky)"/>${stars(60, 2, 150)}
      <circle cx="160" cy="80" r="34" fill="#e8ecff"/><circle cx="148" cy="72" r="34" fill="#050816" opacity=".0"/><circle cx="160" cy="80" r="70" fill="#c9d3ff" opacity=".2" filter="url(#glow2)"/>
      ${city}<rect x="0" y="330" width="960" height="270" fill="#14151c"/>
      <rect x="0" y="330" width="960" height="8" fill="#2a2c38"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 120 - 20}" y="452" width="70" height="7" fill="#e8e8e8" opacity=".55"/>`).join('')}
      <circle cx="300" cy="290" r="230" fill="#ff1a2e" opacity=".28" filter="url(#glow2)"/><circle cx="440" cy="290" r="200" fill="#1a5bff" opacity=".3" filter="url(#glow2)"/>
      ${streaks(30, 4, -80, 520, 250, 340, '#9fb4ff', .5)}
      <polygon points="940,280 1200,220 1200,360" fill="url(#beam)"/>
      <g transform="translate(530 196) scale(1.22)">${sedan('#c3122a')}<rect x="128" y="34" width="22" height="16" rx="3" fill="#111" opacity=".6"/></g>
      <g transform="translate(110 206) scale(1.05)">${sedan('#14172a', { police: true, roof: '#14172a' })}
        <rect x="160" y="2" width="36" height="12" rx="3" fill="#ff1a2e"/><rect x="196" y="2" width="36" height="12" rx="3" fill="#1a5bff"/>
        <circle cx="176" cy="8" r="34" fill="#ff1a2e" opacity=".8" filter="url(#glow)"/><circle cx="214" cy="8" r="34" fill="#1a5bff" opacity=".8" filter="url(#glow)"/>
        <text x="200" y="84" text-anchor="middle" font-family="BoxFred" font-weight="700" font-size="20" fill="#14172a">POLICÍA</text></g>`);
  },

  /* ---------------- Drive In The Serrín: carretera de montaña al atardecer ---------------- */
  cornisa: () => {
    const r = rng(12), tri = (pts, c) => `<polygon points="${pts}" fill="${c}"/>`;
    let far = '', mid = '';
    for (let i = 0; i < 9; i++) { const x = i * 130 - 60, h = 140 + r() * 120; far += tri(`${x},300 ${x + 90},${300 - h} ${x + 200},300`, '#5a2f6e') + tri(`${x + 90},${300 - h} ${x + 200},300 ${x + 120},300`, '#4a2560') + tri(`${x + 70},${300 - h + 40} ${x + 90},${300 - h} ${x + 110},${300 - h + 40}`, '#f3e6ff'); }
    for (let i = 0; i < 7; i++) { const x = i * 170 - 80, h = 120 + r() * 110; mid += tri(`${x},380 ${x + 110},${380 - h} ${x + 240},380`, ['#8a3b2a', '#9a4a2e', '#7a3324'][i % 3]) + tri(`${x + 110},${380 - h} ${x + 240},380 ${x + 150},380`, '#5e2618'); }
    return svg(`
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1550"/><stop offset=".55" stop-color="#ff6a3d"/><stop offset="1" stop-color="#ffc56b"/></linearGradient>
      <linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3036"/><stop offset="1" stop-color="#1e181c"/></linearGradient>`,
      `<rect width="960" height="600" fill="url(#sky)"/>
      <circle cx="430" cy="210" r="70" fill="#fff0b0"/><circle cx="430" cy="210" r="150" fill="#ffd27a" opacity=".5" filter="url(#glow2)"/>
      ${far}${mid}
      <path d="M0 600 L0 420 L180 380 L960 360 L960 600 Z" fill="#4a1e14"/>
      <path id="ruta" d="M980 470 C820 470 620 420 640 350 C655 300 760 300 840 286 C900 276 900 250 850 236" fill="none" stroke="#2c2328" stroke-width="96" stroke-linecap="round"/>
      <path d="M980 422 C840 424 676 390 688 352 C696 326 790 326 846 318" fill="none" stroke="#e8e8e8" stroke-width="4" opacity=".7"/>
      <path d="M980 470 C820 470 620 420 640 350 C655 300 760 300 840 286 C900 276 900 250 850 236" fill="none" stroke="#ffd23f" stroke-width="5" stroke-dasharray="18 16"/>
      ${Array.from({ length: 9 }, (_, i) => `<rect x="${600 + i * 7}" y="${380 - i * 9}" width="5" height="16" fill="#ddd" opacity=".8"/>`).join('')}
      <path d="M0 600 L0 520 Q300 470 620 600 Z" fill="#1a0c0a"/>
      <g transform="translate(770 330) scale(1.15)">
        <ellipse cx="0" cy="58" rx="78" ry="10" fill="#000" opacity=".5"/>
        <rect x="-74" y="34" width="22" height="26" rx="5" fill="#111"/><rect x="52" y="34" width="22" height="26" rx="5" fill="#111"/>
        <path d="M-70 40 L-62 6 Q-58 -6 -44 -6 L44 -6 Q58 -6 62 6 L70 40 Z" fill="#ff7a2f"/>
        <path d="M-46 -6 L-38 -34 Q-34 -40 -26 -40 L26 -40 Q34 -40 38 -34 L46 -6 Z" fill="#e8622a"/><path d="M-34 -10 L-28 -32 L28 -32 L34 -10 Z" fill="#1c2433"/>
        <rect x="-64" y="14" width="22" height="9" rx="3" fill="#ff2030"/><rect x="42" y="14" width="22" height="9" rx="3" fill="#ff2030"/>
        <circle cx="-53" cy="18" r="16" fill="#ff2030" opacity=".6" filter="url(#glow)"/><circle cx="53" cy="18" r="16" fill="#ff2030" opacity=".6" filter="url(#glow)"/>
        <rect x="-22" y="20" width="44" height="12" rx="2" fill="#f4f4f4"/><rect x="-72" y="36" width="144" height="8" fill="#2a1a14"/>
      </g>`);
  },

  /* ---------------- Combi Rush: combi limeña en la avenida ---------------- */
  'combi-rush': () => {
    const r = rng(33); let bld = '';
    for (let x = -10; x < 980;) { const w = 80 + r() * 90, h = 120 + r() * 140, c = ['#e9b44c', '#d96c6c', '#7fb3d5', '#a3c97a', '#e7d3a8', '#c58fd1'][Math.floor(r() * 6)]; bld += `<rect x="${x.toFixed(0)}" y="${(340 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${c}"/><rect x="${x.toFixed(0)}" y="${(340 - h).toFixed(0)}" width="${w.toFixed(0)}" height="8" fill="#000" opacity=".15"/>`; for (let wy = 340 - h + 20; wy < 320; wy += 34) for (let wx = x + 12; wx < x + w - 24; wx += 30) bld += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="18" height="20" fill="#3a4a5c" opacity=".7"/>`; x += w + 2; }
    const head = (x, y, c) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}"/><rect x="${x - 15}" y="${y + 12}" width="30" height="20" rx="8" fill="#555"/>`;
    return svg(`
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9b7c4"/><stop offset="1" stop-color="#f1d6b0"/></linearGradient>
      <linearGradient id="combi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe3ea"/></linearGradient>`,
      `<rect width="960" height="600" fill="url(#sky)"/>${bld}
      <rect x="0" y="330" width="960" height="30" fill="#c9c3b6"/><rect x="0" y="360" width="960" height="240" fill="#3d3f47"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 140 - 30}" y="470" width="80" height="8" fill="#fff" opacity=".7"/>`).join('')}
      ${streaks(24, 8, -60, 420, 370, 470, '#fff', .45)}
      <g transform="translate(400 110) scale(1.24)">
        <ellipse cx="215" cy="178" rx="220" ry="12" fill="#000" opacity=".4"/>
        <path d="M8 160 L8 58 Q8 36 32 36 L326 36 Q348 36 362 58 L412 116 Q420 126 420 142 L420 160 Z" fill="url(#combi)"/>
        <rect x="8" y="112" width="412" height="12" fill="#ff2d8a"/><rect x="8" y="126" width="412" height="7" fill="#ffd23f"/><rect x="8" y="135" width="412" height="5" fill="#2a6bff"/>
        ${[22, 90, 158, 226].map(x => `<rect x="${x}" y="50" width="58" height="50" rx="5" fill="#26384d"/>`).join('')}
        ${head(51, 72, '#8a5a3c')}${head(119, 74, '#5a3a24')}${head(187, 70, '#b07a52')}${head(255, 73, '#6a4630')}
        <path d="M300 50 L330 50 Q342 50 350 60 L392 108 L300 108 Z" fill="#9ec7ff"/>
        <rect x="294" y="44" width="5" height="116" fill="#bbb"/>
        <rect x="70" y="10" width="220" height="30" rx="4" fill="#ffd23f"/><text x="180" y="32" text-anchor="middle" font-family="BoxFred" font-weight="700" font-size="20" fill="#111">JAVIER PRADO</text>
        <rect x="402" y="128" width="16" height="10" rx="3" fill="#fff6c8"/><rect x="8" y="80" width="8" height="18" fill="#ff2a3a"/>
        <circle cx="-14" cy="66" r="14" fill="#a06a44"/><path d="M-14 80 L-14 120" stroke="#2a6bff" stroke-width="16" stroke-linecap="round"/><path d="M-10 86 L-46 66" stroke="#a06a44" stroke-width="8" stroke-linecap="round"/><path d="M-6 88 L10 94" stroke="#a06a44" stroke-width="7" stroke-linecap="round"/>
        ${wheelBlur(92, 160, 32)}${wheelBlur(340, 160, 32)}
      </g>`);
  },

  /* ---------------- Fuga Urbana: carro derrapando visto desde arriba ---------------- */
  'fuga-urbana': () => {
    const r = rng(41); let blocks = '';
    for (const [x, y, w, h] of [[0, 0, 300, 170], [420, 0, 260, 170], [800, 0, 200, 170], [0, 300, 300, 320], [800, 300, 200, 320]]) {
      blocks += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2a3350"/>`;
      for (let i = 0; i < 6; i++) { const bx = x + 14 + r() * (w - 90), by = y + 14 + r() * (h - 90), bw = 40 + r() * 50, bh = 40 + r() * 50; blocks += `<rect x="${bx.toFixed(0)}" y="${by.toFixed(0)}" width="${bw.toFixed(0)}" height="${bh.toFixed(0)}" fill="${['#3a4466', '#46507a', '#323b5a'][i % 3]}" stroke="#151a2c" stroke-width="3"/><rect x="${(bx + 6).toFixed(0)}" y="${(by + 6).toFixed(0)}" width="10" height="10" fill="${['#ff3d71', '#00d4ff', '#ffb800'][i % 3]}" opacity=".8"/>`; }
    }
    const topCar = (c, police) => `<rect x="-36" y="-70" width="72" height="140" rx="20" fill="${c}"/><rect x="-28" y="-40" width="56" height="30" rx="8" fill="#0d1420"/><rect x="-26" y="22" width="52" height="24" rx="7" fill="#0d1420"/><rect x="-26" y="-8" width="52" height="28" rx="6" fill="${police ? '#f4f6fb' : c}" opacity="${police ? 1 : .8}"/>
      <rect x="-30" y="-72" width="14" height="6" rx="2" fill="#fff6c8"/><rect x="16" y="-72" width="14" height="6" rx="2" fill="#fff6c8"/><rect x="-30" y="66" width="14" height="6" rx="2" fill="#ff2a3a"/><rect x="16" y="66" width="14" height="6" rx="2" fill="#ff2a3a"/>
      ${police ? '<rect x="-24" y="-2" width="24" height="10" fill="#ff1a2e"/><rect x="0" y="-2" width="24" height="10" fill="#1a5bff"/><circle cx="-12" cy="3" r="38" fill="#ff1a2e" opacity=".55" filter="url(#glow)"/><circle cx="12" cy="3" r="38" fill="#1a5bff" opacity=".55" filter="url(#glow)"/>' : ''}`;
    return svg(`<radialGradient id="cone" cx="0" cy=".5" r="1"><stop offset="0" stop-color="#fff6c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>`,
      `<rect width="960" height="600" fill="#3a3f4e"/>${blocks}
      ${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 90}" y="232" width="50" height="6" fill="#ffd23f" opacity=".7"/>`).join('')}
      ${Array.from({ length: 6 }, (_, i) => `<rect x="737" y="${i * 110 - 20}" width="6" height="56" fill="#ffd23f" opacity=".7"/>`).join('')}
      ${[0, 1, 2].map(i => `<rect x="${300 + i * 40}" y="176" width="22" height="118" fill="#fff" opacity=".18"/>`).join('')}
      <path d="M200 236 Q420 236 560 250 Q680 270 700 380 L702 600" fill="none" stroke="#000" stroke-width="12" opacity=".5"/>
      <path d="M200 266 Q420 266 548 280 Q650 300 668 400 L670 600" fill="none" stroke="#000" stroke-width="12" opacity=".5"/>
      <g opacity=".5" filter="url(#blur)">${[0, 1, 2, 3, 4].map(i => `<circle cx="${560 - i * 40}" cy="${250 + i * 2}" r="${30 + i * 8}" fill="#cfd5e2" opacity="${.5 - i * .08}"/>`).join('')}</g>
      <g transform="translate(600 250) rotate(-62) scale(1.3)"><polygon points="0,-70 -90,-330 90,-330" fill="url(#cone)"/>${topCar('#ffb800')}</g>
      <g transform="translate(300 250) rotate(-90) scale(1.1)">${topCar('#14172a', true)}</g>
      <g transform="translate(775 110) rotate(10) scale(1.05)">${topCar('#14172a', true)}</g>
      <circle cx="640" cy="270" r="200" fill="#ffb800" opacity=".12" filter="url(#glow2)"/>`);
  },

  /* ---------------- Sazón Tycoon: lomo saltado humeante en la cocina ---------------- */
  sazon: () => {
    const r = rng(55); let fries = '', meat = '', tom = '', pars = '';
    for (let i = 0; i < 16; i++) { const x = 560 + r() * 230, y = 300 + r() * 70, a = r() * 180 - 90; fries += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="70" height="14" rx="4" fill="${i % 2 ? '#ffcf4a' : '#ffbf2a'}" stroke="#d9901a" stroke-width="2" transform="rotate(${a.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`; }
    for (let i = 0; i < 12; i++) { const x = 600 + r() * 190, y = 270 + r() * 60, a = r() * 120 - 60; meat += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="58" height="20" rx="9" fill="${i % 2 ? '#7a3b1e' : '#8f4a26'}" transform="rotate(${a.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`; }
    for (let i = 0; i < 7; i++) { const x = 600 + r() * 190, y = 262 + r() * 70; tom += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} a20 20 0 0 1 40 0 Z" fill="#e8322a"/>`; }
    for (let i = 0; i < 26; i++) pars += `<circle cx="${(590 + r() * 220).toFixed(0)}" cy="${(260 + r() * 100).toFixed(0)}" r="${(2 + r() * 2.5).toFixed(1)}" fill="#3a9d4a"/>`;
    let tiles = ''; for (let y = 0; y < 330; y += 40) for (let x = (y / 40 % 2) * 20 - 20; x < 980; x += 40) tiles += `<rect x="${x}" y="${y}" width="38" height="38" rx="3" fill="#ffe9cf" opacity=".09"/>`;
    return svg(`
      <radialGradient id="bg" cx=".7" cy=".4" r=".8"><stop offset="0" stop-color="#ffb347"/><stop offset=".5" stop-color="#e2541f"/><stop offset="1" stop-color="#7a1d0c"/></radialGradient>
      <linearGradient id="table" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a34"/><stop offset="1" stop-color="#4a2c16"/></linearGradient>
      <radialGradient id="plate" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9dde6"/></radialGradient>`,
      `<rect width="960" height="600" fill="url(#bg)"/>${tiles}
      <rect x="0" y="320" width="960" height="280" fill="url(#table)"/><rect x="0" y="320" width="960" height="8" fill="#000" opacity=".25"/>
      <g transform="translate(0 -60)"><ellipse cx="690" cy="400" rx="290" ry="40" fill="#000" opacity=".35"/>
      <ellipse cx="690" cy="330" rx="280" ry="96" fill="url(#plate)"/><ellipse cx="690" cy="326" rx="220" ry="72" fill="#f3f5fa"/>
      <path d="M500 330 Q500 250 570 250 Q640 250 640 330 Z" fill="#fff" stroke="#e6e8ef" stroke-width="3"/>
      ${fries}${meat}${tom}${pars}
      </g>${[620, 700, 780].map((x, i) => `<path d="M${x} 170 C${x - 30} 130 ${x + 30} 100 ${x} 60 C${x - 26} 30 ${x + 20} 0 ${x} -30" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="${.35 - i * .06}" filter="url(#soft)"/>`).join('')}
      <g transform="translate(860 120) rotate(14)"><rect x="-46" y="10" width="92" height="40" rx="6" fill="#fff"/><circle cx="-28" cy="0" r="30" fill="#fff"/><circle cx="10" cy="-14" r="34" fill="#fff"/><circle cx="40" cy="4" r="26" fill="#fff"/><rect x="-46" y="38" width="92" height="12" fill="#e6e8ef"/></g>
      ${[[130, 120], [210, 90], [300, 140]].map(([x, y], i) => `<g transform="translate(${x} ${y}) rotate(${i * 12 - 10})"><circle r="30" fill="#ffd23f" stroke="#d99a16" stroke-width="5"/><text y="9" text-anchor="middle" font-family="BoxFred" font-weight="700" font-size="24" fill="#b57a0a">S/</text></g>`).join('')}`);
  },

  /* ---------------- Modo Carrera Fútbol: estadio de noche, golazo ---------------- */
  futbol: () => {
    const r = rng(66); let crowd = '';
    for (let i = 0; i < 900; i++) crowd += `<circle cx="${(r() * 960).toFixed(0)}" cy="${(120 + r() * 170).toFixed(0)}" r="${(1.2 + r() * 1.8).toFixed(1)}" fill="${['#22c55e', '#facc15', '#fff', '#ef4444', '#60a5fa'][i % 5]}" opacity="${(.25 + r() * .55).toFixed(2)}"/>`;
    let net = ''; for (let i = 0; i <= 12; i++) net += `<path d="M${640 + i * 22} 170 L${660 + i * 22} 380" stroke="#fff" stroke-width="1.5" opacity=".5"/>`; for (let j = 0; j <= 10; j++) net += `<path d="M${640 + j * 2} ${170 + j * 21} L${904 + j * 2} ${170 + j * 21}" stroke="#fff" stroke-width="1.5" opacity=".5"/>`;
    let stripes = ''; for (let i = 0; i < 8; i++) stripes += `<polygon points="${-200 + i * 170},600 ${-30 + i * 170},600 ${180 + i * 120},300 ${60 + i * 120},300" fill="#000" opacity="${i % 2 ? .1 : 0}"/>`;
    return svg(`
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617"/><stop offset="1" stop-color="#0f2a1a"/></linearGradient>
      <linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f8a3c"/><stop offset="1" stop-color="#0e4d20"/></linearGradient>
      <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
      `<rect width="960" height="600" fill="url(#sky)"/>
      ${[100, 860].map(x => `<polygon points="${x - 40},40 ${x + 40},40 ${x + 260 * (x < 480 ? 1 : -1)},600 ${x - 160 * (x < 480 ? 1 : -1)},600" fill="url(#beam)" opacity=".35"/><rect x="${x - 3}" y="40" width="6" height="110" fill="#333"/><rect x="${x - 42}" y="22" width="84" height="26" rx="4" fill="#fff"/><circle cx="${x}" cy="35" r="70" fill="#fff" opacity=".5" filter="url(#glow2)"/>`).join('')}
      <path d="M0 110 L960 110 L960 300 L0 300 Z" fill="#0b1220"/>${crowd}
      <rect x="0" y="290" width="960" height="14" fill="#facc15"/>${Array.from({ length: 10 }, (_, i) => `<text x="${i * 100 + 6}" y="301" font-family="BoxFred" font-weight="700" font-size="10" fill="#111">GOOOL ·</text>`).join('')}
      <rect x="0" y="304" width="960" height="296" fill="url(#pitch)"/>${stripes}
      <path d="M0 470 Q480 430 960 470" fill="none" stroke="#fff" stroke-width="4" opacity=".6"/>
      <rect x="630" y="160" width="290" height="10" fill="#f4f4f4"/><rect x="630" y="160" width="10" height="226" fill="#f4f4f4"/><rect x="910" y="160" width="10" height="226" fill="#f4f4f4"/>${net}
      <path d="M90 520 Q400 220 780 230" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" opacity=".18" filter="url(#soft)"/>
      <path d="M300 380 Q520 240 760 232" fill="none" stroke="#facc15" stroke-width="6" stroke-linecap="round" opacity=".7"/>
      <g transform="translate(790 236)"><circle r="54" fill="#fff" opacity=".35" filter="url(#glow)"/><circle r="40" fill="#fff"/>
        <polygon points="0,-14 13,-4 8,12 -8,12 -13,-4" fill="#111"/><path d="M0 -14 L0 -40 M13 -4 L37 -12 M8 12 L22 33 M-8 12 L-22 33 M-13 -4 L-37 -12" stroke="#111" stroke-width="3"/>
        <circle r="40" fill="none" stroke="#000" stroke-width="2" opacity=".3"/></g>
      ${[[700, 150], [880, 120], [930, 220], [680, 300]].map(([x, y]) => `<path d="M${x} ${y} l14 -14 M${x + 4} ${y + 10} l20 0 M${x} ${y + 20} l14 14" stroke="#facc15" stroke-width="4" stroke-linecap="round"/>`).join('')}`);
  },

  /* ---------------- Reino en Guardia: torre del castillo contra la horda ---------------- */
  'tower-defense': () => {
    const r = rng(77); let horde = '';
    const zombie = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-12 0 L-10 -40 Q-10 -52 0 -52 Q10 -52 10 -40 L12 0 L4 0 L2 -18 L-2 -18 L-4 0 Z" fill="${c}"/><path d="M-6 -44 L-40 -40 M6 -44 L-36 -32" stroke="${c}" stroke-width="7" stroke-linecap="round"/><circle cx="0" cy="-62" r="12" fill="${c}"/><circle cx="-5" cy="-63" r="2.6" fill="#b6ff3a"/><circle cx="4" cy="-63" r="2.6" fill="#b6ff3a"/></g>`;
    const list = []; for (let i = 0; i < 24; i++) list.push([300 + r() * 330, 230 + r() * 100]); list.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of list) { const s = .9 + (y - 230) / 100 * .6; horde += zombie(x.toFixed(0), y.toFixed(0), s.toFixed(2), y > 290 ? '#2d5a33' : '#3d6b42'); }
    return svg(`
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0a1f"/><stop offset=".7" stop-color="#3a1f3f"/><stop offset="1" stop-color="#7a3a2a"/></linearGradient>
      <linearGradient id="stone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a8fa0"/><stop offset="1" stop-color="#5a5f70"/></linearGradient>`,
      `<rect width="960" height="600" fill="url(#sky)"/>${stars(90, 6, 260)}
      <circle cx="160" cy="110" r="64" fill="#fff4d6"/><circle cx="160" cy="110" r="140" fill="#ffd27a" opacity=".3" filter="url(#glow2)"/>
      <path d="M0 250 Q240 210 480 240 Q720 220 960 200 L960 600 L0 600 Z" fill="#2e2236"/>
      <path d="M640 600 L690 300 Q780 250 900 280 L960 300 L960 600 Z" fill="#1a1420"/>
      <g transform="translate(800 30)">
        <rect x="-70" y="40" width="140" height="230" fill="url(#stone)"/>
        ${[-70, -34, 2, 38].map(x => `<rect x="${x}" y="20" width="26" height="26" fill="#8a8fa0"/>`).join('')}
        ${Array.from({ length: 6 }, (_, i) => `<path d="M-70 ${70 + i * 34} H70" stroke="#000" stroke-width="2" opacity=".25"/>`).join('')}
        <path d="M-16 270 L-16 220 Q0 200 16 220 L16 270 Z" fill="#2a1a10"/>
        <rect x="-10" y="100" width="20" height="34" rx="10" fill="#ffb347"/><circle cx="0" cy="117" r="30" fill="#ffb347" opacity=".5" filter="url(#glow)"/>
        <rect x="-2" y="-60" width="4" height="82" fill="#ddd"/><path d="M2 -60 L60 -46 L2 -30 Z" fill="#ef4444"/>
        <rect x="-110" y="150" width="40" height="16" rx="4" fill="#3a3f4c"/><circle cx="-112" cy="158" r="10" fill="#222"/>
      </g>
      <path d="M680 160 Q560 60 420 250" fill="none" stroke="#ffd23f" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round"/>
      <circle cx="420" cy="262" r="50" fill="#ff7a1a" opacity=".85" filter="url(#glow)"/><circle cx="420" cy="262" r="24" fill="#ffe08a"/>
      ${horde}
      <path d="M690 200 L600 250" stroke="#e8e8e8" stroke-width="3"/><path d="M600 250 l12 -2 l-6 10 z" fill="#e8e8e8"/>
      <rect x="0" y="0" width="960" height="600" fill="#5aff3a" opacity=".04"/>`);
  },

  /* ---------------- Don't Look Up: escalador saltando entre plataformas ---------------- */
  escalada: () => {
    const plat = (x, y, w, c, top) => `<rect x="${x}" y="${y}" width="${w}" height="26" rx="10" fill="${c}"/><rect x="${x}" y="${y}" width="${w}" height="9" rx="5" fill="${top}"/>`;
    return svg(`
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1a4a"/><stop offset=".55" stop-color="#2f6fd6"/><stop offset="1" stop-color="#9fd8ff"/></linearGradient>`,
      `<rect width="960" height="600" fill="url(#sky)"/>${stars(60, 9, 160, .7)}
      <path d="M560 70 L620 20 L680 70 Z" fill="#e8f2ff"/><rect x="618" y="-10" width="4" height="34" fill="#fff"/><path d="M622 -10 L650 -2 L622 6 Z" fill="#ffd700"/>
      ${plat(540, 70, 160, '#6b7aa8', '#e8f2ff')}
      ${plat(330, 180, 150, '#8a6a4a', '#5ad15a')}${plat(700, 250, 140, '#5aa9e6', '#d6f0ff')}
      ${plat(470, 330, 170, '#8a6a4a', '#5ad15a')}${plat(150, 300, 120, '#9a5adf', '#e0c8ff')}
      ${plat(760, 420, 130, '#8a6a4a', '#5ad15a')}
      <rect x="226" y="280" width="18" height="20" rx="4" fill="#ff4d6a"/><path d="M220 280 Q235 262 250 280" fill="#ff8a9e"/>
      ${[[420, 140], [560, 290], [780, 210], [250, 250]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="15" fill="#ffd700" stroke="#c9a400" stroke-width="3"/><rect x="-3" y="-8" width="6" height="16" rx="2" fill="#c9a400"/></g>`).join('')}
      <path d="M560 320 Q600 190 680 150" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="4 12" stroke-linecap="round" opacity=".8"/>
      <g transform="translate(690 140) rotate(12) scale(1.5)">
        <ellipse cx="0" cy="8" rx="44" ry="40" fill="#38bdf8"/><ellipse cx="-10" cy="-8" rx="22" ry="14" fill="#fff" opacity=".35"/>
        <ellipse cx="-12" cy="4" rx="9" ry="12" fill="#fff"/><ellipse cx="14" cy="4" rx="9" ry="12" fill="#fff"/><circle cx="-10" cy="7" r="5" fill="#0b1a4a"/><circle cx="16" cy="7" r="5" fill="#0b1a4a"/>
        <path d="M-8 26 Q2 32 12 26" stroke="#0b1a4a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path d="M-30 -24 Q0 -50 30 -24 L26 -16 Q0 -34 -26 -16 Z" fill="#ff4d6a"/>
      </g>
      <g opacity=".95">${[[80, 520, 1.4], [330, 560, 1.2], [600, 540, 1.5], [880, 560, 1.3], [200, 470, .9], [720, 480, .8]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff"><ellipse cx="0" cy="0" rx="90" ry="30"/><ellipse cx="50" cy="-20" rx="60" ry="34"/><ellipse cx="-50" cy="-10" rx="50" ry="26"/></g>`).join('')}</g>
      <g transform="translate(920 100)"><rect x="0" y="0" width="10" height="440" rx="5" fill="#fff" opacity=".25"/>${Array.from({ length: 11 }, (_, i) => `<rect x="-8" y="${i * 44}" width="${i % 5 ? 10 : 20}" height="3" fill="#fff" opacity=".7"/>`).join('')}<text x="-16" y="12" text-anchor="end" font-family="BoxFred" font-weight="700" font-size="24" fill="#ffd700">1000 m</text></g>`);
  },

  /* ---------------- Mind Escape: la puerta de salida en un cuarto lleno de acertijos ---------------- */
  'mind-escape': () => {
    const r = rng(88); let circ = '';
    for (let i = 0; i < 18; i++) { let x = r() * 960, y = r() * 600, d = `M${x.toFixed(0)} ${y.toFixed(0)}`; for (let k = 0; k < 4; k++) { if (k % 2) y += (r() - .5) * 200; else x += (r() - .5) * 260; d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; } circ += `<path d="${d}" fill="none" stroke="${i % 2 ? '#00d4ff' : '#7c3aed'}" stroke-width="2" opacity=".35"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="4" fill="${i % 2 ? '#00d4ff' : '#a78bfa'}"/>`; }
    const sud = [[5, '', 3], ['', 7, ''], [1, '', 9]];
    return svg(`
      <radialGradient id="bg" cx=".68" cy=".45" r=".7"><stop offset="0" stop-color="#2a1a5e"/><stop offset=".6" stop-color="#0d0b24"/><stop offset="1" stop-color="#05040f"/></radialGradient>
      <linearGradient id="light" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bff4ff"/><stop offset="1" stop-color="#00d4ff"/></linearGradient>
      <linearGradient id="spill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00d4ff" stop-opacity=".5"/><stop offset="1" stop-color="#00d4ff" stop-opacity="0"/></linearGradient>`,
      `<rect width="960" height="600" fill="url(#bg)"/>${circ}
      <polygon points="560,420 760,420 960,600 380,600" fill="url(#spill)"/>
      <g transform="translate(560 90)">
        <rect x="-16" y="-16" width="232" height="352" rx="10" fill="#00d4ff" opacity=".6" filter="url(#glow2)"/>
        <rect x="0" y="0" width="200" height="330" rx="6" fill="url(#light)"/>
        <path d="M0 0 L130 30 L130 350 L0 330 Z" fill="#14123a"/><path d="M0 0 L130 30 L130 350 L0 330 Z" fill="none" stroke="#7c3aed" stroke-width="4"/>
        <circle cx="110" cy="190" r="8" fill="#ffd23f"/>
        <text x="62" y="170" text-anchor="middle" font-family="BoxFred" font-weight="700" font-size="90" fill="#7c3aed" opacity=".9">?</text>
      </g>
      <g transform="translate(830 120)"><rect x="0" y="0" width="100" height="134" rx="12" fill="#14123a" stroke="#00d4ff" stroke-width="3"/>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => `<rect x="${12 + (i % 3) * 27}" y="${14 + Math.floor(i / 3) * 27}" width="22" height="22" rx="5" fill="${n === 7 ? '#00d4ff' : '#24205a'}"/><text x="${23 + (i % 3) * 27}" y="${30 + Math.floor(i / 3) * 27}" text-anchor="middle" font-family="BoxFred" font-weight="700" font-size="13" fill="#fff">${n}</text>`).join('')}<rect x="12" y="98" width="76" height="22" rx="5" fill="#0a0a1a"/><text x="50" y="114" text-anchor="middle" font-family="BoxFred" font-weight="700" font-size="14" fill="#00ff9c">4 7 _ _</text></g>
      <g transform="translate(330 70) rotate(-8)" opacity=".9"><rect x="0" y="0" width="150" height="150" rx="10" fill="#14123a" stroke="#7c3aed" stroke-width="3"/>${sud.map((row, j) => row.map((v, i) => `<rect x="${8 + i * 46}" y="${8 + j * 46}" width="42" height="42" rx="6" fill="#24205a"/>${v !== '' ? `<text x="${29 + i * 46}" y="${38 + j * 46}" text-anchor="middle" font-family="BoxFred" font-weight="700" font-size="24" fill="#c4b5fd">${v}</text>` : ''}`).join('')).join('')}</g>
      ${[['#ef4444', 260, 330], ['#3b82f6', 330, 300], ['#22c55e', 420, 340]].map(([c, x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="${c}"/><circle cx="${x}" cy="${y}" r="26" fill="${c}" opacity=".4" filter="url(#glow)"/>`).join('')}
      <path d="M260 330 Q295 280 330 300 Q380 330 420 340" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="6 8" opacity=".6"/>`);
  },

  /* ---------------- Brújula Política: la brújula con los 4 cuadrantes ---------------- */
  'brujula-politica': () => {
    const C = [700, 260], R = 200, q = (a, b, c) => `<path d="M${C[0]} ${C[1]} L${C[0] + R * Math.cos(a)} ${C[1] + R * Math.sin(a)} A${R} ${R} 0 0 1 ${C[0] + R * Math.cos(b)} ${C[1] + R * Math.sin(b)} Z" fill="${c}"/>`;
    const P = Math.PI; let ticks = '';
    for (let i = 0; i < 72; i++) { const a = i / 72 * 2 * P, l = i % 9 ? 10 : 22; ticks += `<path d="M${C[0] + (R + 14) * Math.cos(a)} ${C[1] + (R + 14) * Math.sin(a)} L${C[0] + (R + 14 + l) * Math.cos(a)} ${C[1] + (R + 14 + l) * Math.sin(a)}" stroke="#fff" stroke-width="${i % 9 ? 2 : 4}" opacity=".6"/>`; }
    const r = rng(99); let dots = ''; for (let i = 0; i < 16; i++) { const a = r() * 2 * P, d = r() * R * .85; dots += `<circle cx="${(C[0] + d * Math.cos(a)).toFixed(0)}" cy="${(C[1] + d * Math.sin(a)).toFixed(0)}" r="6" fill="#fff" opacity=".7"/>`; }
    return svg(`
      <radialGradient id="bg" cx=".7" cy=".45" r=".75"><stop offset="0" stop-color="#155e63"/><stop offset=".6" stop-color="#0f1b3a"/><stop offset="1" stop-color="#070b18"/></radialGradient>`,
      `<rect width="960" height="600" fill="url(#bg)"/>${stars(50, 13, 600, .4)}
      <circle cx="${C[0]}" cy="${C[1]}" r="${R + 60}" fill="#14b8a6" opacity=".18" filter="url(#glow2)"/>
      <circle cx="${C[0]}" cy="${C[1]}" r="${R + 44}" fill="#0b1226" stroke="#c9a227" stroke-width="6"/>${ticks}
      ${q(P, 1.5 * P, '#dc2626')}${q(1.5 * P, 2 * P, '#2563eb')}${q(.5 * P, P, '#16a34a')}${q(0, .5 * P, '#9333ea')}
      <path d="M${C[0] - R} ${C[1]} H${C[0] + R} M${C[0]} ${C[1] - R} V${C[1] + R}" stroke="#fff" stroke-width="4" opacity=".8"/>${dots}
      ${['AUTORIDAD', 'LIBERTAD', 'IZQ.', 'DER.'].map((t, i) => { const [x, y] = [[C[0], C[1] - R + 34], [C[0], C[1] + R - 18], [C[0] - R + 46, C[1] - 12], [C[0] + R - 40, C[1] - 12]][i]; return `<text x="${x}" y="${y}" text-anchor="middle" font-family="BoxFred" font-weight="700" font-size="22" fill="#fff">${t}</text>`; }).join('')}
      <g transform="translate(${C[0]} ${C[1]}) rotate(32)"><path d="M0 -180 L22 0 L-22 0 Z" fill="#f43f5e"/><path d="M0 180 L22 0 L-22 0 Z" fill="#f4f4f4"/><circle r="22" fill="#c9a227"/><circle r="9" fill="#0b1226"/></g>
      <circle cx="${C[0] + 70}" cy="${C[1] - 60}" r="16" fill="#fff" stroke="#0b1226" stroke-width="6"/>`);
  },
};

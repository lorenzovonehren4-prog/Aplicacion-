// Verificación matemática de los niveles cuya validez depende de que su
// solución sea única. Si alguno falla, el nivel está roto por diseño.
let ok = true;
const check = (n, cond, d='') => { ok = ok && cond; console.log(`${cond?'PASS':'FAIL'}  ${n}${d?' — '+d:''}`); };

// ── Nivel 15: ¿tiene el Sudoku solución única con las pistas dadas? ──
const SOL = [[2,3,4,1],[1,4,3,2],[3,2,1,4],[4,1,2,3]];
const GIVENS = [[0,1],[0,2],[1,0],[1,3],[2,0],[2,3],[3,1],[3,2]];
const given = new Set(GIVENS.map(([r,c])=>`${r},${c}`));
const grid = SOL.map((row,r)=>row.map((v,c)=>given.has(`${r},${c}`)?v:0));

// El propio Sudoku debe ser válido
const validLatin = (g) => {
  for (let i=0;i<4;i++){
    if (new Set(g[i]).size!==4) return false;
    if (new Set(g.map(r=>r[i])).size!==4) return false;
  }
  for (let br=0;br<4;br+=2) for (let bc=0;bc<4;bc+=2){
    const box=[g[br][bc],g[br][bc+1],g[br+1][bc],g[br+1][bc+1]];
    if (new Set(box).size!==4) return false;
  }
  return true;
};
check('L15: la solución de referencia es un Sudoku válido', validLatin(SOL));

let solutions = 0;
const legal = (g,r,c,v) => {
  for (let i=0;i<4;i++) if (g[r][i]===v || g[i][c]===v) return false;
  const br=r-r%2, bc=c-c%2;
  for (let i=0;i<2;i++) for (let j=0;j<2;j++) if (g[br+i][bc+j]===v) return false;
  return true;
};
const solve = (g) => {
  for (let r=0;r<4;r++) for (let c=0;c<4;c++) if (!g[r][c]) {
    for (let v=1;v<=4;v++) if (legal(g,r,c,v)) { g[r][c]=v; solve(g); g[r][c]=0; }
    return;
  }
  solutions++;
};
solve(grid.map(r=>[...r]));
check('L15: el Sudoku tiene solución única', solutions===1, `soluciones=${solutions}`);
check('L15: ninguna pista cae en la diagonal',
  GIVENS.every(([r,c])=>r!==c));
check('L15: la diagonal da el código 2413 (el 2-4-1-3 del documento)', SOL.map((r,i)=>r[i]).join('')==='2413', SOL.map((r,i)=>r[i]).join(''));

// ── Nivel 16: ¿determinan las reglas un único cableado? ──
const perms = (arr) => arr.length<=1?[arr]:arr.flatMap((x,i)=>
  perms([...arr.slice(0,i),...arr.slice(i+1)]).map(p=>[x,...p]));
const cables = ['rojo','azul','verde','amarillo'];
const rules16 = (m) => m.azul===1 && m.rojo%2===1
  && (m.verde===2||m.verde===4) && m.amarillo!==4;
const valid16 = perms([1,2,3,4]).map(p=>Object.fromEntries(cables.map((c,i)=>[c,p[i]])))
  .filter(rules16);
check('L16: el cableado es único', valid16.length===1, `válidos=${valid16.length}`);
check('L16: coincide con Azul→1, Amarillo→2, Rojo→3, Verde→4',
  JSON.stringify(valid16[0])===JSON.stringify({rojo:3,azul:1,verde:4,amarillo:2}),
  JSON.stringify(valid16[0]));

// ── Nivel 20: ¿deja la puerta 4 exactamente una afirmación verdadera? ──
const says = {
  1: s=>s===2, 2: s=>s!==1, 3: s=>s===3, 4: s=>s!==4, 5: s=>s===1,
};
const counts = [1,2,3,4,5].map(s=>[s, [1,2,3,4,5].filter(d=>says[d](s)).length]);
console.log('   verdades por puerta:', counts.map(([s,n])=>`${s}→${n}`).join(' '));
check('L20: sólo la puerta 4 deja una única verdad',
  counts.filter(([,n])=>n===1).length===1 && counts.find(([s])=>s===4)[1]===1);

// ── Nivel 19: ¿aceptan las relaciones sólo A-B-E-C-D y A-B-E-D-C? ──
const rules19 = (p) => p.A<p.B && p.B<p.C && Math.abs(p.C-p.D)===1 && p.E>p.B && p.E<p.C;
const valid19 = perms(['A','B','C','D','E'])
  .filter(o=>rules19(Object.fromEntries(o.map((id,i)=>[id,i]))))
  .map(o=>o.join(''));
check('L19: sólo son válidos los dos órdenes con C y D intercambiados',
  valid19.length===2 && valid19.includes('ABECD') && valid19.includes('ABEDC'),
  valid19.join(' '));
const start19 = Object.fromEntries(['C','E','D','A','B'].map((id,i)=>[id,i]));
check('L19: el orden inicial NO es válido', !rules19(start19));

// ── Nivel 13: ¿existe la solución de referencia y cubre las 25 celdas? ──
const paths13 = {
  rojo:  [[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[3,1],[2,1],[1,1],[0,1]],
  azul:  [[0,2],[0,3],[0,4],[1,4],[1,3],[1,2],[2,2],[2,3],[2,4]],
  verde: [[3,2],[3,3],[3,4],[4,4],[4,3],[4,2]],
};
const ends13 = { rojo:[[0,0],[0,1]], azul:[[0,2],[2,4]], verde:[[3,2],[4,2]] };
const seen = new Set(); let adjacencyOk = true; let endsOk = true;
for (const [color,path] of Object.entries(paths13)) {
  for (let i=0;i<path.length;i++){
    const k=path[i].join(',');
    if (seen.has(k)) adjacencyOk=false;
    seen.add(k);
    if (i>0 && Math.abs(path[i][0]-path[i-1][0])+Math.abs(path[i][1]-path[i-1][1])!==1) adjacencyOk=false;
  }
  const [a,b]=ends13[color]; const f=path[0], l=path[path.length-1];
  const same=(p,q)=>p[0]===q[0]&&p[1]===q[1];
  if (!((same(f,a)&&same(l,b))||(same(f,b)&&same(l,a)))) endsOk=false;
}
check('L13: los caminos son contiguos y no se pisan', adjacencyOk);
check('L13: cada camino une sus dos puntos', endsOk);
check('L13: la solución cubre las 25 celdas', seen.size===25, `celdas=${seen.size}`);

// ── Nivel 14: ¿basta un movimiento? ──
const START=[[0,1],[0,2],[1,0],[1,1],[1,2],[2,1],[3,1]].map(p=>p.join(','));
const TARGET=[[0,1],[1,0],[1,1],[1,2],[2,1],[3,1],[3,2]].map(p=>p.join(','));
const extra=START.filter(p=>!TARGET.includes(p));
const missing=TARGET.filter(p=>!START.includes(p));
check('L14: exactamente una pieza sobra y un hueco falta',
  extra.length===1 && missing.length===1, `sobra=${extra} falta=${missing}`);

console.log(ok ? '\nTODAS las comprobaciones lógicas OK' : '\nHAY FALLOS');
process.exit(ok?0:1);

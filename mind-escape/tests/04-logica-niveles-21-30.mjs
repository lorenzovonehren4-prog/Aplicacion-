// Comprobación matemática de los niveles 21-30 cuya validez depende de que su
// solución sea única o de que un patrón exista de verdad.
let ok = true;
const check = (n, c, d='') => { ok = ok && c; console.log(`${c?'PASS':'FAIL'}  ${n}${d?' — '+d:''}`); };
const perms = a => a.length<=1?[a]:a.flatMap((x,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).map(p=>[x,...p]));

// ── L21: cada señuelo falla en una sola propiedad ──
const ANSWER={color:0,number:9,shape:0};
const OPTS=[{...ANSWER,color:1},{...ANSWER},{...ANSWER,number:11},{...ANSWER,shape:1}];
const diffs = OPTS.map(o=>['color','number','shape'].filter(k=>o[k]!==ANSWER[k]).length);
check('L21: exactamente una opción es correcta', diffs.filter(d=>d===0).length===1);
check('L21: cada señuelo falla en una única propiedad',
  diffs.filter(d=>d===1).length===3, `diferencias=${diffs}`);

// ── L23: la espiral cubre las 25 celdas sin repetir ──
function buildSpiral(size){
  const c0=Math.floor(size/2); const order=[[c0,c0]];
  const dirs=[[0,1],[1,0],[0,-1],[-1,0]];
  let r=c0,c=c0,step=1,dir=0,guard=0;
  while(order.length<size*size && (guard+=1)<size*size*4){
    for(let t=0;t<2 && order.length<size*size;t++){
      for(let i=0;i<step;i++){ r+=dirs[dir][0]; c+=dirs[dir][1];
        if(r>=0&&r<size&&c>=0&&c<size) order.push([r,c]); }
      dir=(dir+1)%4;
    }
    step+=1;
  }
  return order;
}
const sp=buildSpiral(5);
check('L23: la espiral recorre 25 celdas', sp.length===25, `celdas=${sp.length}`);
check('L23: sin repetir ninguna', new Set(sp.map(p=>p.join(','))).size===25);
check('L23: empieza en el centro', sp[0][0]===2 && sp[0][1]===2);
const MSG='CADAPUERTAESCONDEUNAMENTE';
check('L23: el mensaje tiene 25 letras', MSG.length===25, `${MSG.length}`);

// ── L25 y candado 3 del L30: la solución "sin cabos sueltos" es única ──
function looseCount(size, rot){
  const D=[[-1,0],[0,1],[1,0],[0,-1]], OPP=[2,3,0,1];
  const base=(r,c)=>D.map((d,i)=>({i,r:r+d[0],c:c+d[1]}))
    .filter(o=>o.r>=0&&o.r<size&&o.c>=0&&o.c<size).map(o=>o.i);
  const at=(r,c)=>base(r,c).map(d=>(d+rot[r][c])%4);
  let loose=0;
  for(let r=0;r<size;r++) for(let c=0;c<size;c++)
    for(const d of at(r,c)){
      const nr=r+D[d][0], nc=c+D[d][1];
      if(nr<0||nr>=size||nc<0||nc>=size||!at(nr,nc).includes(OPP[d])){ loose++; break; }
    }
  return loose;
}
// Fuerza bruta sobre todas las rotaciones de un tablero 2x2 (4^4 = 256)
let solutions2=0;
for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++)for(let d=0;d<4;d++)
  if(looseCount(2,[[a,b],[c,d]])===0) solutions2++;
check('L30 candado 3: la rotación correcta es única', solutions2===1, `soluciones=${solutions2}`);
check('L30 candado 3: la rotación inicial NO está resuelta', looseCount(2,[[1,2],[3,1]])>0);
// 3x3: el centro es una cruz, invariante → 4 soluciones equivalentes
let solutions3=0;
const rots=[0,1,2,3];
for(const p of perms([0,1,2,3,4,5,6,7])){ /* no exhaustivo */ break; }
let count3=0;
const grid=[[0,0,0],[0,0,0],[0,0,0]];
(function rec(i){
  if(i===9){ if(looseCount(3,grid)===0) count3++; return; }
  const r=Math.floor(i/3), c=i%3;
  for(const v of rots){ grid[r][c]=v; rec(i+1); }
})(0);
check('L25: sólo la cruz central admite varias rotaciones (4 soluciones equivalentes)',
  count3===4, `soluciones=${count3}`);

// ── L30 candado 1: el orden de colores es único ──
const rules30 = m => m[0]==='verde' && m.indexOf('rojo')+1===m.indexOf('azul') && m[3]!=='amarillo';
const valid30 = perms(['rojo','azul','verde','amarillo']).filter(rules30);
check('L30 candado 1: el orden de colores es único', valid30.length===1, valid30.map(v=>v.join('-')).join(' '));
check('L30 candado 1: es verde-amarillo-rojo-azul',
  valid30[0]?.join('-')==='verde-amarillo-rojo-azul');

// ── L30 candado 2: sólo una placa deja una única verdad ──
const says30 = { X:s=>s==='Z', Y:s=>s!=='Z', Z:s=>s!=='Y' };
const counts30 = ['X','Y','Z'].map(s=>[s,['X','Y','Z'].filter(p=>says30[p](s)).length]);
console.log('   verdades por placa:', counts30.map(([s,n])=>`${s}→${n}`).join(' '));
check('L30 candado 2: sólo Y deja una única verdad',
  counts30.filter(([,n])=>n===1).length===1 && counts30.find(([s])=>s==='Y')[1]===1);

console.log(ok ? '\nTODAS las comprobaciones lógicas OK' : '\nHAY FALLOS');
process.exit(ok?0:1);

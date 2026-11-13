const BOT=(x,y,s=1)=>{c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#c8201e';c.strokeStyle='#0b0806';c.lineWidth=6;c.beginPath();c.roundRect(-50,-200,100,200,16);c.fill();c.stroke();c.fillRect(-26,-260,52,60);c.strokeRect(-26,-260,52,60);c.fillStyle='#f4f1ea';c.fillRect(-40,-150,80,80);c.fillStyle='#e8e0d0';c.fillRect(-30,-290,60,34);c.strokeRect(-30,-290,60,34);c.restore();};
AUTO({hot:/^(kétchup|medicina|1834|tomates|médico|bennett|curaba|indigestión|diarrea|recetas|remedio|miles|pastillas|éxito|imitadores|1850|hundió|nada|gusto|farmacia|papas|fritas)$/i,
 titulo:['¿SABÍAS QUE...?','EL KÉTCHUP ERA UNA MEDICINA'], final:['DE LA FARMACIA','A LAS PAPAS FRITAS','150px'],
 P:{D:{top:'#2a2a3a',top2:'#1a1a24',hair:'short',hairCol:'#6a4a2a',beard:'#6a4a2a',h:530},M:{top:'#6a2a2a',top2:'#4a1a1a',hat:'cowboy',hatCol:'#2a2a2a',mustache:'#1d140e',h:520},C:{top:'#5a6a3a',hair:'bob',hairCol:'#6a3a1e',robe:'#5a6a3a',h:470},N:{top:'#c8a03a',hair:'short',hairCol:'#2a1a10',h:420}},
 fechas:[[1,2,'1834'],[7,7,'c. 1850']], nombres:[[2,'DR. JOHN COOK BENNETT','MÉDICO DE OHIO'],[5,'ARCHIBALD MILES','VENDEDOR']], golpes:[7],
 escenas:[
  {bg:'ket_farmacia',cam:'in',chars:[{p:'D',x:320,cara:'s',brazos:'senala',s:1.5,hold:(x,y)=>BOT(x+10,y+40,.8)}]},
  {bg:'ket_mercado',chars:[{p:'C',x:400,cara:'f',brazos:'pensar',s:1.5}],extra:t=>{ for(let i=0;i<5;i++){ c.fillStyle='#d8302a'; c.strokeStyle='#0b0806'; c.lineWidth=5; c.beginPath(); c.arc(640+i*80,1640+(i%2)*40,44,0,7); c.fill(); c.stroke(); c.fillStyle='#3a8a3a'; c.fillRect(634+i*80,1586+(i%2)*40,12,16); } }},
  {bg:'ket_farmacia',chars:[{p:'D',x:540,cara:'s',habla:true,brazos:'arriba',s:1.6}]},
  {bg:'ket_farmacia',cam:'in',chars:[{p:'D',x:330,cara:'s',habla:true,brazos:'senala',s:1.5},{p:'C',x:800,look:-1,cara:'o',s:1.3}]},
  {bg:'ket_cocina',chars:[{p:'C',x:360,cara:'s',s:1.5,hold:(x,y)=>BOT(x+10,y+40,.8)}],extra:t=>papel(800,900,300,380,.06)},
  {bg:'ket_mercado',chars:[{p:'M',x:360,cara:'m',habla:true,brazos:'senala',s:1.5}],extra:t=>{ for(let i=0;i<8;i++){ c.fillStyle='#e04a3a'; c.strokeStyle='#0b0806'; c.lineWidth=4; c.beginPath(); c.ellipse(660+(i%4)*80,1500+Math.floor(i/4)*70,30,18,0,0,7); c.fill(); c.stroke(); } }},
  {bg:'ket_mercado',cam:'out',chars:[{p:'M',x:220,cara:'s',s:1.2},{p:'M',x:540,cara:'m',s:1.2,seed:5},{p:'M',x:860,cara:'s',s:1.2,look:-1,seed:9}],sello:{t:'SIN TOMATE',y:560,size:80,en:.6}},
  {bg:'ket_farmacia',chars:[{p:'M',x:540,cara:'f',brazos:'pensar',s:1.6}],texto:{t:'📉',y:560,size:180}},
  {bg:'ket_cocina',chars:[{p:'N',x:330,cara:'g',s:1.5},{p:'C',x:780,look:-1,cara:'s',s:1.5}]},
  {bg:'ket_cocina',cam:'in',chars:[{p:'N',x:400,cara:'g',brazos:'arriba',s:1.6}],extra:t=>{ BOT(800,1700,1.4); }}]});

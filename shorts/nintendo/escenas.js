const CARTA=(x,y,s,i)=>{c.save();c.translate(x,y);c.rotate((i-1)*.15);c.scale(s,s);c.fillStyle='#14110e';c.strokeStyle='#0b0806';c.lineWidth=5;c.beginPath();c.roundRect(-50,-80,100,160,10);c.fill();c.stroke();c.fillStyle=['#c8102e','#e8c03a','#3a8a5a'][i%3];c.beginPath();c.arc(0,-10,30,0,7);c.fill();c.fillStyle='#f4f1ea';c.beginPath();c.arc(14,-24,10,0,7);c.fill();c.restore();};
AUTO({hot:/^(nintendo|avión|kioto|1889|yamauchi|tienda|videojuegos|cartas|hanafuda|décadas|sesenta|taxis|arroz|juguetes|nada|yokoi|millón|1981|donkey|kong|1985|mario|mundo)$/i,
 titulo:['¿SABÍAS QUE...?','NINTENDO ES MÁS ANTIGUA QUE EL AVIÓN'], final:['DESDE 1889','DE LAS CARTAS A LOS VIDEOJUEGOS','170px'],
 P:{Y:{skin:'#e8c8a0',top:'#2a2a3a',robe:'#2a2a3a',hair:'short',hairCol:'#1d140e',mustache:'#1d140e',h:520},C:{skin:'#e8c8a0',top:'#8a3a3a',robe:'#8a3a3a',hair:'bob',hairCol:'#1d140e',h:470},J:{skin:'#e8c8a0',top:'#3a3a44',hair:'short',hairCol:'#3a3a3a',h:520},G:{skin:'#e8c8a0',top:'#f4f4f4',hair:'short',hairCol:'#1d140e',h:510},N:{skin:'#e8c8a0',top:'#c8102e',hair:'short',hairCol:'#1d140e',h:420}},
 fechas:[[1,3,'KIOTO · 1889'],[4,6,'AÑOS 60'],[8,8,'1981 · 1985']], nombres:[[1,'FUSAJIRO YAMAUCHI','FUNDADOR'],[7,'GUNPEI YOKOI','INGENIERO']], golpes:[4,7],
 escenas:[
  {bg:'nin_tienda',cam:'out',chars:[{p:'Y',x:330,cara:'s',s:1.5,hold:(x,y)=>CARTA(x+30,y-40,1.2,0)}]},
  {bg:'nin_calle',chars:[{p:'Y',anda:[200,480],cara:'s',s:1.4}]},
  {bg:'nin_tienda',cam:'in',chars:[{p:'Y',x:300,cara:'s',habla:true,s:1.5}],extra:t=>{ for(let i=0;i<3;i++) CARTA(660+i*130,1300+Math.sin(t*3+i)*14,1.6,i); }},
  {bg:'nin_tienda',chars:[{p:'Y',x:300,cara:'g',s:1.4},{p:'C',x:660,look:-1,cara:'s',s:1.3},{p:'C',x:900,look:-1,cara:'g',s:1.3,seed:3}]},
  {bg:'nin_oficina',chars:[{p:'J',x:540,cara:'f',brazos:'pensar',s:1.6}],texto:{t:'📉',y:560,size:180}},
  {bg:'nin_oficina',cam:'der',chars:[{p:'J',x:300,cara:'s',habla:true,brazos:'senala',s:1.4}],extra:(t,k)=>{ ['🚕','🍚','🧸'].forEach((e,i)=>{ const q=k01(k,.15+i*.25,.3+i*.25); if(q>0){ c.save(); c.globalAlpha=q; c.font='150px serif'; c.textAlign='center'; c.fillText(e,640+i*130,1100+i*120); c.restore(); } }); }},
  {bg:'nin_oficina',cam:'in',chars:[{p:'J',x:540,cara:'d',s:1.6}],sello:{t:'FRACASO',y:560,size:90}},
  {bg:'nin_taller',chars:[{p:'G',x:360,cara:'g',s:1.5,hold:(x,y)=>{c.strokeStyle='#e8c03a';c.lineWidth=10;const n=5,L=40+Math.abs(Math.sin(TT*4))*30;for(let i=0;i<n;i++){c.beginPath();c.moveTo(x+i*L,y-20);c.lineTo(x+(i+1)*L,y+20);c.moveTo(x+i*L,y+20);c.lineTo(x+(i+1)*L,y-20);c.stroke();}}}]},
  {bg:'nin_sala',chars:[{p:'N',x:330,cara:'g',brazos:'arriba',s:1.5}],extra:t=>{ c.fillStyle='#2a2a30'; c.strokeStyle='#0b0806'; c.lineWidth=8; c.fillRect(580,1000,400,320); c.strokeRect(580,1000,400,320); c.fillStyle='#3a6ad0'; c.fillRect(600,1020,360,280); c.fillStyle='#c8102e'; c.fillRect(740+Math.sin(t*5)*80,1200-Math.abs(Math.sin(t*5))*90,40,50); c.fillStyle='#8a5a2a'; c.fillRect(600,1250,360,50); }},
  {bg:'nin_tienda',cam:'out',chars:[{p:'Y',x:540,cara:'s',s:1.5}]}]});

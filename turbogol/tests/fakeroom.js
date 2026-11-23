// Sala falsa para pruebas: imita join/presence/onPeers de la capacidad "room" con BroadcastChannel
(()=>{const mk=name=>{const ch=new BroadcastChannel('fr-'+name),me='p'+Math.random().toString(36).slice(2,9);let pres={};const others=new Map(),ls=[];let alive=true;
  const list=()=>[{peer:me,presence:Object.freeze({...pres}),isMe:true,sameTab:true,kind:'viewer',guest:false,by:null,updatedAt:Date.now()},...others.values()];
  const fire=(left=[])=>{const pl=list();for(const f of ls)try{f({peers:pl,joined:[],left,updated:[]})}catch(e){console.error(e)}};
  ch.onmessage=e=>{const m=e.data;if(m.t==='p'){others.set(m.peer,{peer:m.peer,presence:Object.freeze(m.presence),isMe:false,sameTab:false,kind:'viewer',guest:false,by:null,updatedAt:Date.now()});fire();}
    else if(m.t==='hello'){ch.postMessage({t:'p',peer:me,presence:pres});}else if(m.t==='bye'){const p=others.get(m.peer);others.delete(m.peer);fire(p?[p]:[]);}};
  ch.postMessage({t:'hello'});
  return {name,presence:async patch=>{if(!alive)return;for(const k in patch){if(patch[k]===null)delete pres[k];else pres[k]=patch[k];}ch.postMessage({t:'p',peer:me,presence:JSON.parse(JSON.stringify(pres))});},
    peers:list,onPeers:(f)=>{ls.push(f);setTimeout(()=>f({peers:list(),joined:list(),left:[],updated:[]}),0);return()=>{const i=ls.indexOf(f);if(i>=0)ls.splice(i,1);};},
    emit:async()=>{},on:()=>()=>{},connected:()=>true,onConnection:f=>{setTimeout(()=>f(true),0);return()=>{};},
    leave:async()=>{alive=false;ch.postMessage({t:'bye',peer:me});ch.close();}};};
  // la sala raíz es el vestíbulo que comparten todos; join(nombre) abre una sala aparte
  const rooms={};const lobby=mk('__vestibulo');const room=Object.assign({},lobby,{join:async n=>rooms[n]||(rooms[n]=mk(n))});
  window.claude={use:async n=>n==='room'?room:null};})();

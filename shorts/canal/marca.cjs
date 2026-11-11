const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
const p=await b.newPage({viewport:{width:800,height:800}});await p.goto('file://'+__dirname+'/marca.html');await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:__dirname+'/cosmo-ia-perfil.png'});
await p.setViewportSize({width:2560,height:1440});await p.evaluate(()=>{document.getElementById('a').style.display='none';document.getElementById('b').style.display='block'});
await p.screenshot({path:__dirname+'/cosmo-ia-banner.png'});await b.close();})();

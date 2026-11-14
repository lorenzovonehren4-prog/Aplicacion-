# Genera carpetas de episodios AUTO desde EPIS (ver ep1.py, ep2.py). Uso: GAP=.25 python3 herramientas/gen.py herramientas/fichas/<tanda>.py
import json,os,sys,re
import os
SH=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','')
def ch(s):
    a=s.split(); d={'p':a[0],'x':int(a[1])}
    for w in a[2:]:
        if w in 'omsfgend' and len(w)==1: d['cara']=w
        elif w in('arriba','senala','pensar','baila'): d['brazos']=w
        elif w=='habla': d['habla']=True
        elif w=='L': d['look']=-1
        elif w=='quieto': d['quieto']=True
        elif w.startswith('anda:'): x0,x1=w[5:].split('>'); d['anda']=[int(x0),int(x1)]
        elif w.startswith('s'): d['s']=float(w[1:])
        elif w.startswith('y'): d['y']=int(w[1:])
    return d
exec(open(sys.argv[1]).read())
allp={}
for d,E in EPIS.items():
    os.makedirs(SH+d,exist_ok=True)
    lines=[x[0] for x in E['esc']]
    g=[{'id':f's{i}','t':t,'gap':.25 if i==0 else (.5 if i==len(lines)-1 else float(os.environ.get('GAP','.12')))} for i,t in enumerate(lines)]
    try:
        old={x['id']:x for x in json.load(open(SH+d+'/guion.json'))}
        for x in g:
            if x['id'] in old and old[x['id']]['t']==x['t'] and 'dur' in old[x['id']]: x['dur']=old[x['id']]['dur']
    except Exception: pass
    json.dump(g,open(SH+d+'/guion.json','w'),ensure_ascii=False,indent=1)
    esc=[]
    for x in E['esc']:
        e={'bg':E['pre']+'_'+x[1]} if x[1] else {}
        if x[2]: e['cam']=x[2]
        if x[3]: e['chars']=[ch(c) for c in x[3]]
        if len(x)>4 and x[4]: e.update(x[4])
        pr=E['fondos'].get(x[1],'').lower() if x[1] else ''
        import re as _re
        for k,rx in [('nieve',r'snow|blizzard|arctic'),('lluvia',r'rain|storm'),('brasas',r'fire|torch|candle|ember|lava'),('niebla',r'fog|mist|smoke'),('polvo',r'desert|sand|dust|canyon|dry'),('hojas',r'forest|jungle|rainforest|autumn|trees'),('luces',r'night|stars|starry|moon')]:
            if _re.search(rx,pr): e.setdefault('aire',k); break
        i=len(esc)
        if 'texto' in e and (i==0 or any(f[0]<=i<=f[1] and f[2].replace(' ','').endswith(e['texto']['t'].replace(' ','')) for f in E.get('fechas',[]))): del e['texto']
        if 'texto' in e and any(f[0]<=i<=f[1] for f in E.get('fechas',[]))  and e['texto'].get('y',560)<700: e['texto']['y']=700
        if 'texto' in e and any(f[0]==i for f in E.get('cifras',[])): e['texto']['y']=760
        esc.append(e)
    cfg={'tipo':2,'titulo':E['titulo'],'final':E['final'],'fechas':E.get('fechas',[]),'cifras':E.get('cifras',[]),'nombres':E.get('nombres',[]),'golpes':E.get('golpes',[]),'escenas':esc}
    words=sorted(set(w.lower() for w in re.findall(r"[\wáéíóúñü']+",' '.join(E.get('hot','').split('|')))))
    js="// Episodio generado con motor AUTO (ver PLAN.md)\nAUTO(Object.assign("+json.dumps(cfg,ensure_ascii=False)+",{hot:/^("+'|'.join(words)+")$/i}));\n"
    open(SH+d+'/escenas.js','w').write(js)
    open(SH+d+'/escena.html','w').write(open(SH+'cleopatra/escena.html').read())
    fp={E['pre']+'_'+k:v for k,v in E['fondos'].items()}
    json.dump(fp,open(SH+d+'/fondos_prompts.json','w'),ensure_ascii=False,indent=1); allp.update(fp)
    n=len(lines)-1; mid=max(2,n//2)
    json.dump({"duck":0.72,"bed":0.75,"plan":[[0,"END","pad",{"chord":E.get('acorde',[0.5,0.6,0.9]),"key":E.get('tono','re')}],["T:s1",f"T:s{mid}","ostinato",{"bpm":104,"amp":.04,"key":E.get('tono','re')}],[f"T:s{mid}",f"T:s{n-1}","drums",{"bpm":124,"pat":"BtbtBtbb"}],[f"T:s{n-1}","END","clock",{"gain":.35}]],
      "cues":[["T:s0","riser",.5],["T:s1","whoosh",.5],[f"T:s{mid}","tom",.7],[f"T:s{n-1}","boom",.8],[f"T:s{n}","bell",.4,{"f":196}],[f"E:s{n}","boom",.6]]},open(SH+d+'/pista.json','w'))
    json.dump(E.get('fuentes',[]),open(SH+d+'/fuentes.json','w'),ensure_ascii=False)
print(len(EPIS),'episodios',len(allp),'fondos:',' '.join(EPIS))

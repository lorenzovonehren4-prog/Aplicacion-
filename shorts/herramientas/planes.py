# Escribe PLAN.md de cada episodio a partir de EPIS y guion.json. Uso: python3 herramientas/planes.py herramientas/fichas/<tanda>.py
import json,sys
import os
SH=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','')
exec(open(sys.argv[1]).read())
CAM={'in':'dolly in lento','out':'dolly out de cierre','crash':'crash zoom','sube':'pan vertical ascendente','baja':'pan vertical descendente','whip':'whip pan','orbit':'órbita con giro suave','detalle':'primer plano de detalle','lejos':'plano general que se abre','sigue':'tracking lateral','izq':'pan a la izquierda','der':'pan a la derecha'}
for d,E in EPIS.items():
    g=json.load(open(SH+d+'/guion.json')); t=0; rows=[]; sb=[]
    for i,(x,s) in enumerate(zip(E['esc'],g)):
        a=t; t+=s.get('dur',0)+s['gap']
        rows.append(f"| {a:.1f}–{t:.1f} s | «{x[0]}» |")
        ex=x[4] if len(x)>4 and x[4] else {}
        el=[]
        if 'texto' in ex and i>0: el.append('texto «'+ex['texto']['t']+'»')
        if 'emoji' in ex: el.append('iconos '+' '.join(m['e'] for m in ex['emoji']))
        if 'dibujos' in ex: el.append('dibujo: '+', '.join(o['tipo'] for o in ex['dibujos']))
        if 'barcos' in ex: el.append(f"{len(ex['barcos'])} barco(s)")
        if 'animales' in ex: el.append('emús')
        if 'linea' in ex: el.append('línea de tiempo '+ex['linea']['a']+' → '+ex['linea']['b'])
        sb.append(f"| {i+1} | `{E['pre']}_{x[1]}` | {CAM.get(x[2],x[2])} | {'; '.join(c.split()[0] for c in x[3]) or '—'} | {'; '.join(el) or '—'} |")
    fp=json.load(open(SH+d+'/fondos_prompts.json'))
    md=f"""# {E['titulo'][1].capitalize()} — plan de producción ({t:.0f} s, 9:16)

Narración del dueño del canal, usada tal cual (una toma por frase). Se genera con `AUTO` en `motor/motor.js` a partir de `escenas.js`.

## Narración
| Tiempo | Frase |
| --- | --- |
"""+'\n'.join(rows)+"""

## Storyboard
| # | Fondo | Cámara | Personajes | Elementos |
| --- | --- | --- | --- | --- |
"""+'\n'.join(sb)+f"""

Título de entrada: {E['titulo'][0]} / {E['titulo'][1]}. Cierre: {E['final'][0]} / {E['final'][1]}.
Tipografía: Anton (títulos) y Montserrat ExtraBold (subtítulos, dos líneas como máximo, palabra activa en amarillo).

## Fondos (SD-Turbo, `motor/fondos.py`, sin personas ni texto)
"""+'\n'.join(f"- `{k}`: {v}" for k,v in fp.items())+"""

## Audio
Voz Piper `es_MX-claude-high` (velocidad 0,86). Música y efectos en `pista.json` (colchón, ostinato, percusión, reloj final; golpes en cada giro).

## Fuentes (listadas; pendientes de contrastar una a una)
"""+'\n'.join('- '+f for f in E.get('fuentes',[]))+"\n"
    open(SH+d+'/PLAN.md','w').write(md)
print('ok')

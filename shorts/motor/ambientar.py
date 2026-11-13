# Añade a pista.json de un episodio AUTO el ambiente de cada escena según su fondo, y una capa de tensión hacia el final.
# Uso: python3 motor/ambientar.py <carpeta> [...]
import json, re, sys
MAPA = [('storm', r'storm|rain|thunder'), ('sea', r'ocean|sea\b|ship|harbor|coast|beach|river|wave|fjord|canyon'), ('fire', r'fire|torch|candle|forge|cave|furnace'),
        ('crowd', r'market|street|plaza|square|festival|court|theater|premiere|battle|village|camp|cafe|banquet|coliseum|station|city'),
        ('wind', r'desert|mountain|field|plain|valley|outback|cliff|hill|countryside|ruins|wall|sky|moon|farm|forest'),
        ('room', r'room|office|laborator|library|museum|hall|palace|temple|cabin|workshop|study|interior|bunker|classroom|chamber|press|map')]
GAN = dict(storm=1.0, sea=.9, fire=.8, crowd=.45, wind=.7, room=.9)
for d in sys.argv[1:]:
    js = open(f'{d}/escenas.js').read(); m = re.search(r'AUTO\(Object\.assign\((\{.*\}),\{hot:', js, re.S)
    if m: esc = json.loads(m.group(1))['escenas']
    else:  # ficha escrita a mano: un fondo por escena, en orden
        n0 = len(json.load(open(f'{d}/guion.json'))); bgs = re.findall(r"bg:'(\w+)'", js); esc = [{'bg': bgs[min(i, len(bgs) - 1)]} for i in range(n0)] if bgs else []
    if not esc: print('sin escenas', d); continue
    pr = json.load(open(f'{d}/fondos_prompts.json')); P = json.load(open(f'{d}/pista.json'))
    P['plan'] = [x for x in P['plan'] if x[2] not in GAN and x[2] != 'drone']; n = len(esc); ks = []
    for e in esc:
        t = pr.get(e.get('bg', ''), '').lower(); ks.append(next((k for k, r in MAPA if re.search(r, t)), 'room'))
    i = 0
    while i < n:
        j = i
        while j + 1 < n and ks[j + 1] == ks[i]: j += 1
        P['plan'].append([0 if i == 0 else f'T:s{i}', 'END' if j == n - 1 else f'T:s{j + 1}', ks[i], {'gain': GAN[ks[i]]}]); i = j + 1
    P['plan'].append([f'T:s{max(2, n // 2)}', 'END', 'drone', {'gain': .3}]); P['reverb'] = .22
    json.dump(P, open(f'{d}/pista.json', 'w'), ensure_ascii=False); print(d, ' '.join(ks))

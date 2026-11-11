import json, numpy as np, soundfile as sf
from scipy import signal
SR=44100
g=json.load(open('guion.json'))
GAP={'h1':.25,'h2':.35,'s1a':.15,'s1b':.15,'s1c':.4,'s2a':.1,'s2b':.15,'s2c':.4,'s3a':.1,'s3b':.15,'s3c':.45,'f1':.15,'f2':.3}
t=0.25
for s in g:
    s['start']=round(t,3); t+=s['dur']+GAP[s['id']]
TOTAL=round(t,3)
json.dump({'total':TOTAL,'segs':g},open('timeline.json','w'),ensure_ascii=False,indent=1)
T={s['id']:s['start'] for s in g}
N=int(TOTAL*SR); tt=np.arange(N)/SR
rng=np.random.default_rng(7)
def bp(x,lo,hi):
    sos=signal.butter(2,[lo,hi],'bandpass',fs=SR,output='sos'); return signal.sosfilt(sos,x)
def lp(x,f):
    return signal.sosfilt(signal.butter(2,f,'low',fs=SR,output='sos'),x)
def hp(x,f):
    return signal.sosfilt(signal.butter(2,f,'high',fs=SR,output='sos'),x)
def put(buf,x,at,g=1.0):
    i=int(at*SR); 
    if i>=N: return
    x=x[:N-i]; buf[i:i+len(x)]+=x*g
def env(n,a,d):
    e=np.ones(n); na=int(a*SR); e[:na]=np.linspace(0,1,na); k=np.arange(n-na)/SR; e[na:]=np.exp(-k/d); return e
def boom(size=1.0):
    n=int(3.2*SR); k=np.arange(n)/SR
    f=28+70*np.exp(-k*6); ph=2*np.pi*np.cumsum(f)/SR
    x=np.sin(ph)*np.exp(-k/ (0.9*size))
    x+=lp(rng.standard_normal(n),220)*np.exp(-k/0.7)*1.5
    x+=bp(rng.standard_normal(n),300,2500)*np.exp(-k/0.12)*0.5
    return np.tanh(x*1.6)*0.9
def whoosh(d=0.5):
    n=int(d*SR); k=np.linspace(0,1,n)
    x=rng.standard_normal(n); out=np.zeros(n)
    # barrido de filtro por tramos
    for j in range(8):
        a,b=int(j*n/8),int((j+1)*n/8); fc=300+2600*((j+.5)/8)**2
        out[a:b]=bp(x,fc*0.6,fc*1.6)[a:b]
    return out*np.sin(np.pi*k)**2*0.5
def siren(d):
    n=int(d*SR); k=np.arange(n)/SR
    f=780+330*signal.sawtooth(2*np.pi*k/1.15,0.5)   # ulular de bomberos
    ph=2*np.pi*np.cumsum(f)/SR
    x=np.sign(np.sin(ph))*0.5+np.sin(ph)*0.5
    return lp(x,2600)*0.22
def klaxon(d):
    n=int(d*SR); k=np.arange(n)/SR
    x=(np.sin(2*np.pi*440*k)+np.sin(2*np.pi*554*k)+0.5*np.sign(np.sin(2*np.pi*880*k)))
    gate=(np.mod(k,0.42)<0.24).astype(float); gate=lp(gate,60)
    return lp(x,3000)*gate*0.10
def glass():
    n=int(1.8*SR); k=np.arange(n)/SR
    x=hp(rng.standard_normal(n),3500)*np.exp(-k/0.18)*0.8
    for _ in range(46):
        at=rng.uniform(0.02,1.3); f=rng.uniform(2500,9000); m=int(0.12*SR); kk=np.arange(m)/SR
        p=np.sin(2*np.pi*f*kk)*np.exp(-kk/rng.uniform(0.01,0.05))*rng.uniform(.1,.4)*np.exp(-at/0.6)
        i=int(at*SR); x[i:i+m]+=p[:n-i]
    return x*0.5
def riser(d):
    n=int(d*SR); k=np.linspace(0,1,n)
    f=120*2**(k*2.2); ph=2*np.pi*np.cumsum(f)/SR
    x=np.sin(ph)*0.3+bp(rng.standard_normal(n),800,5000)*0.35
    return x*k**2.5*0.5
music=np.zeros(N); fx=np.zeros(N); voice=np.zeros(N)
# colchón oscuro en re menor
for f,a in [(36.7,.5),(73.4,.5),(110,.25),(146.8,.2),(174.6,.16),(220.0,.08)]:
    music+=a*np.sin(2*np.pi*f*tt+0.6*np.sin(2*np.pi*0.11*tt+f))*(0.75+0.25*np.sin(2*np.pi*0.07*tt+f))
music=lp(music,900)*0.16
# pulso de tensión (corchea grave) desde el título
bpm=124; step=60/bpm/2
k=np.arange(int(0.22*SR))/SR
kick=np.sin(2*np.pi*(46+90*np.exp(-k*40))*k)*np.exp(-k/0.07)
tick=hp(rng.standard_normal(len(k)),6000)*np.exp(-k/0.012)*0.25
i=0; at=T['h2']
while at<TOTAL-0.3:
    inten=0.55 if at<T['s2a'] else (0.75 if at<T['s3a'] else (1.0 if at<T['f1'] else 0.45))
    put(music,kick,at,0.42*inten*(1.0 if i%4==0 else 0.55))
    if i%2==1: put(music,tick,at,0.5*inten)
    at+=step; i+=1
# cuerdas en trémolo que suben en cada tamaño
def strings(d,f0):
    n=int(d*SR); k=np.arange(n)/SR; x=np.zeros(n)
    for m,a in [(1,.5),(1.5,.3),(2,.3),(2.4,.2)]:
        x+=a*signal.sawtooth(2*np.pi*f0*m*k+m)
    trem=0.6+0.4*np.sign(np.sin(2*np.pi*9*k))
    return lp(x*trem,1800)*np.minimum(1,k/0.4)*np.minimum(1,(d-k)/0.3)*0.07
put(music,strings(T['s2a']-T['s1b'],146.8),T['s1b'])
put(music,strings(T['s3a']-T['s2a'],174.6),T['s2a'])
put(music,strings(T['f1']-T['s3a'],220.0),T['s3a'],1.25)
# efectos
put(fx,siren(T['h2']+0.6)*np.linspace(1,0.55,int((T['h2']+0.6)*SR)),0.0)
put(fx,klaxon(1.7),0.0)
put(fx,boom(.6),0.0,0.6)
put(fx,whoosh(.45),T['h1']+1.45)
put(fx,whoosh(.5),T['h2']-0.3)
put(fx,riser(1.2),T['s1b']-1.2); put(fx,boom(1.0),T['s1b'],0.95)
put(fx,glass(),T['s1c']+0.05,0.9); put(fx,boom(.5),T['s1c'],0.45)
put(fx,riser(1.1),T['s2a']-1.1); put(fx,boom(1.2),T['s2a'],1.0)
put(fx,boom(.7),T['s2c'],0.5)
put(fx,riser(1.3),T['s3a']-1.3); put(fx,boom(1.2),T['s3a'],0.9); put(fx,boom(1.6),T['s3b'],1.15)
put(fx,whoosh(.6),T['f1']-0.35)
put(fx,siren(TOTAL-T['f2'])*np.linspace(0.3,1,int((TOTAL-T['f2'])*SR)),T['f2'],0.8)
put(fx,riser(TOTAL-T['f2']),T['f2'],1.2)
# crepitar del fuego en la ciudad
n=int((T['s3a']-T['s2a'])*SR); cr=(rng.random(n)>0.9993)*rng.uniform(.3,1,n); cr=bp(signal.lfilter([1],[1,-0.92],cr),700,6000)
cr+=lp(rng.standard_normal(n),400)*0.03
put(fx,cr*np.minimum(1,np.arange(n)/SR/0.5),T['s2a'],0.55)
# voz
for s in g:
    v,sr=sf.read(f"voz/{s['id']}.wav"); v=signal.resample_poly(v,SR,sr)
    put(voice,v,s['start'])
voice=hp(voice,90); voice+=0.25*bp(voice,2500,6000)      # presencia
voice=np.tanh(voice*2.6)/np.tanh(2.6)*0.9
# la música se agacha cuando habla
e=lp(np.abs(voice),6); duck=1-0.5*np.clip(e/ (e.max()+1e-9)*4,0,1)
mix=voice*1.0+ (music*1.15+fx*0.75)*duck
# estéreo simple: efectos algo abiertos
d=int(0.011*SR); wide=np.concatenate([np.zeros(d),(fx*0.25*duck)[:-d]])
L=mix+wide; R=mix-wide
out=np.stack([L,R],1); fade=int(0.25*SR); out[-fade:]*=np.linspace(1,0.0,fade)[:,None]
out=np.tanh(out*1.15); out/=np.abs(out).max()/0.97
sf.write('audio.wav',out,SR); print('total',TOTAL)

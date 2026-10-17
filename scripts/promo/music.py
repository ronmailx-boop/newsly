import numpy as np, wave
np.random.seed(7)
SR=48000; DUR=29.9; N=int(SR*DUR); t=np.arange(N)/SR
out=np.zeros(N)
bpm=104; beat=60/bpm
def note(f): return 440*2**((f-69)/12)
# progression: Am F C G (one chord per 2 bars)
chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]
bar=beat*4
for k in range(int(DUR/(bar*1))+1):
    ch=chords[k%4]; s=int(k*bar*SR); e=min(N,int((k+1)*bar*SR))
    if s>=N: break
    tt=np.arange(e-s)/SR
    env=np.minimum(1,tt/0.4)*np.minimum(1,(e-s)/SR-tt+0.05)/1
    for m in ch:
        f=note(m)
        out[s:e]+=0.05*env*(np.sin(2*np.pi*f*tt)+0.3*np.sin(2*np.pi*2*f*tt)+0.15*np.sin(2*np.pi*f*1.003*tt))
    # bass
    fb=note(ch[0]-12)
    out[s:e]+=0.09*env*np.sin(2*np.pi*fb*tt)
# kick on each beat + hat on offbeats
nb=int(DUR/beat)
for b in range(nb):
    s=int(b*beat*SR); L=int(0.35*SR); tt=np.arange(min(L,N-s))/SR
    f=50+80*np.exp(-tt*30)
    out[s:s+len(tt)]+=0.32*np.exp(-tt*9)*np.sin(2*np.pi*np.cumsum(f)/SR)
    hs=int((b+0.5)*beat*SR)
    if hs<N:
        L=min(int(0.05*SR),N-hs); n=np.random.randn(L); n=np.diff(np.concatenate([[0],n]))
        out[hs:hs+L]+=0.035*n*np.exp(-np.arange(L)/SR*80)
    # arp pluck
    ch=chords[int(b*beat/bar)%4]; m=ch[(b)%3]+12
    L=int(0.3*SR); tt=np.arange(min(L,N-s))/SR
    out[s:s+len(tt)]+=0.03*np.exp(-tt*10)*np.sin(2*np.pi*note(m)*tt)
# end: ring out at 26.2s impact (logo end card)
imp=int(26.2*SR); tt=np.arange(N-imp)/SR
out[imp:]+=0.25*np.exp(-tt*2.5)*np.sin(2*np.pi*note(45)*tt)+0.08*np.exp(-tt*1.5)*np.sin(2*np.pi*note(69)*tt)
fade=np.ones(N); fi=int(0.5*SR); fade[:fi]=np.linspace(0,1,fi); fo=int(1.5*SR); fade[-fo:]=np.linspace(1,0,fo)
out*=fade; out/=np.max(np.abs(out))*1.1
st=(np.stack([out,out],1)*32767).astype(np.int16)
w=wave.open('audio/music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()

"""앱과 같은 규칙(data/*.json)으로 조합을 합성하고 400% 크롭을 만든다. 1 스테이지 단위 = 4px 이므로 원본 해상도 크롭 = 400%."""
import json,glob,os,sys
from PIL import Image
D='siha-dress-book/src/sticker/data/'; P='siha-dress-book/public/sticker/'
LAY=json.load(open(D+'layers.json')); Z={k:(i+1)*100 for i,k in enumerate(LAY['order'])}
CH=json.load(open(D+'characters/siha.json')); R=CH['res']
PART={json.load(open(f))['id']:json.load(open(f)) for f in glob.glob(D+'parts/*.json')}
def compose_alpha(ids,accs=()):
    return compose(ids,accs,bg=None)
def compose(ids,accs=(),bg=(255,253,248)):
    worn={}
    for i in ids:
        p=PART[i]
        for s in p['occlusion']['clearsSlots']: worn.pop(s,None)
        worn[p['slot']]=i
    hidden={k for i in worn.values() for k in PART[i]['occlusion']['hideCharacterPieces']}
    L=[]
    rep={k:v for i in worn.values() for k,v in PART[i]['occlusion'].get('replaceCharacterPieces',{}).items()}
    for n,p in enumerate(CH['pieces']):
        if p['key'] not in hidden: L.append((Z[p['layer']]+n,dict(p,src=rep.get(p['key'],p['src']))))
    for i in worn.values():
        part=PART[i]
        for n,pc in enumerate(part['pieces']):
            if pc.get('onlyWith') and pc['onlyWith'] not in worn.values(): continue
            if pc.get('unlessSlot') and pc['unlessSlot'] in worn: continue
            q=dict(pc)
            if 'alt' in pc and pc['alt']['when'] in worn: q.update(pc['alt'])
            L.append((Z[pc.get('layer',part['layer'])]+10+n,q))
    for n,(aid,anc) in enumerate(accs):
        part=PART[aid]; a=CH['anchors'][anc]; w=part['size']['w']*a['size']; h=part['size']['h']*a['size']
        L.append((Z[a['layer']]+50+n,{'src':part['pieces'][0]['src'],'x':a['x']-w/2,'y':a['y']-h/2,'w':w,'h':h}))
    c=Image.new('RGBA',(CH['stage']['w']*R,CH['stage']['h']*R),(bg+(255,)) if bg else (0,0,0,0))
    for _,p in sorted(L,key=lambda t:t[0]):
        im=Image.open(P+p['src']).convert('RGBA'); tw,th=round(p['w']*R),round(p['h']*R)
        if im.size!=(tw,th): im=im.resize((tw,th),Image.LANCZOS)
        lay=Image.new('RGBA',c.size,(0,0,0,0)); lay.paste(im,(round(p['x']*R),round(p['y']*R))); c.alpha_composite(lay)
    return c
ZONES={'feet':(95,495,300,615),'neck':(150,175,250,250),'hiphand':(225,250,345,350),'wavehand':(40,110,140,220),'waist':(110,290,300,400),'hem':(80,360,300,440),'head':(110,30,280,140)}
def crops(c,name,out,zones=ZONES):
    os.makedirs(out,exist_ok=True); c.save(f'{out}/{name}_full.png')
    for z,(x0,y0,x1,y1) in zones.items(): c.crop((x0*R,y0*R,x1*R,y1*R)).save(f'{out}/{name}_{z}_400.png')

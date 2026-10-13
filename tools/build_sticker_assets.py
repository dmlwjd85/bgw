"""시하 스티커북 에셋 빌드 (v2)
원본(STICKER_SRC, 기본 /workspace/sticker_upload)은 읽기만 하고, 가공한 복사본과 부품별 JSON 을 만든다.
  python3 tools/build_sticker_assets.py
처리: 원본 해상도 손질(속바지 밑단, 양말 연장, 손 떼기) → Real-ESRGAN anime 4배 → 흰 칼선 테두리 제거(AA 유지)
     → 배치 배율로 축소(Lanczos, 확대 없음) → public/sticker/x4/*.png, src/sticker/data/parts/*.json
새 옷 추가: 아래 PARTS 에 한 줄 추가하거나, 이미 4배 PNG 가 있으면 data/parts/<id>.json 하나만 손으로 써도 된다."""
import json,os,shutil,sys
import numpy as np
from PIL import Image, ImageFilter
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,os.path.join(HERE,'sticker_fit'))
import esr,rim,fixes,hands,bgfill
os.chdir(os.path.dirname(HERE))
SRC=os.environ.get('STICKER_SRC','/workspace/sticker_upload/')
fit=json.load(open(os.path.join(HERE,'sticker_fit/fit.json')))
RES=4                 # 저장 해상도 = 스테이지 1단위당 4px (DPR 3 폰에서 몸 350css px → 1050px 필요, 1200px 제공)
OX,OY,SW,SH=30,40,360,650
PUB='siha-dress-book/public/sticker'; DATA='siha-dress-book/src/sticker/data'
for d in (PUB,DATA): shutil.rmtree(d,ignore_errors=True)
os.makedirs(PUB+'/x4'); os.makedirs(PUB+'/bg'); os.makedirs(DATA+'/parts'); os.makedirs(DATA+'/characters'); os.makedirs(DATA+'/backgrounds')
L='4e40d8/'
def load(f):
    """'경로|flip' 이면 좌우 뒤집어 읽음(원본 파일은 그대로)."""
    a=np.array(Image.open(SRC+f.split('|')[0]).convert('RGBA'))
    return a[:,::-1].copy() if f.endswith('|flip') else a
HAND_BOX=(0,70,120,165)   # 흔드는 손 영역(원본 몸 좌표)
def process(arr,scale,name,solid=False,stroke=True,save=True,feetwhite=None,shrink=3,cut=None,heel=False,sharp=False,smooth=False):
    """원본 배열 → 4배 선명 + 흰 테두리 제거 → 배치 크기의 RES 배로 저장. 반환: 저장 파일, 스테이지 w,h"""
    up=esr.up_rgba(arr).astype(np.uint8)
    u=rim.strip_rim(up)
    u=rim.restore_holes(u,up)
    if solid: u=rim.solid_outline(u)
    if feetwhite is not None: u=rim.strip_white_connected(u,feetwhite*RES*u.shape[0]//(arr.shape[0]*RES) if False else int(feetwhite*u.shape[0]/arr.shape[0]))
    if cut is not None:   # 위로 솟은 뒤축 등 잘라냄: (x0,y0,x1,y1) 비율 선 위쪽, x0 오른쪽
        H_,W_=u.shape[:2]; X,Y=np.meshgrid(np.arange(W_)/W_,np.arange(H_)/H_)
        x0c,y0c,x1c,y1c=cut; lineY=y0c+(X-x0c)*(y1c-y0c)/(x1c-x0c); u=u.copy(); u[(X>x0c)&(Y<lineY)]=0
    if feetwhite is not None:   # 흔드는 손 영역만(원본 몸 기준 x 0~120, y 70~165) 손가락 사이 흰 배경 제거
        k=u.shape[0]/arr.shape[0]; u=rim.strip_white_box(u,tuple(int(v*k) for v in HAND_BOX))
    if heel:   # heel = 입구 높이 아래로 더 깎을 비율. 발목 뒤로 솟은 뒤축을 입구 높이로 둥글게 깎음(뒤축이 발목 뒤로 감싸 보이게)
        A_=u[...,3]>128; H_,W_=A_.shape; cols=np.where(A_.any(0))[0]; c0,c1=cols.min(),cols.max(); r=c1-c0
        top=np.array([np.argmax(A_[:,x]) if A_[:,x].any() else H_ for x in range(W_)])
        mid=top[int(c0+0.35*r):int(c0+0.65*r)]; c=int(np.median(mid))       # 신발 입구(가운데) 높이
        X,Y=np.meshgrid(np.arange(W_),np.arange(H_))
        side=np.minimum(np.abs(X-(c0+0.5*r))/(0.5*r),1.0)                    # 가운데 0 → 양끝 1
        lim=c+heel*H_                                                         # 입구 높이보다 위로 솟은 부분만 깎음(신발 몸통은 그대로)
        u=u.copy(); u[(side>0.4)&(Y<lim)]=0
    if sharp:
        im_=Image.fromarray(u); rgb_=im_.convert('RGB').filter(ImageFilter.UnsharpMask(radius=2,percent=140,threshold=1)); u=np.dstack([np.array(rgb_),u[...,3]])
    u=rim.defringe(u,shrink=shrink)
    if stroke: u=rim.restroke(u,smooth_from=(0 if smooth else None) if feetwhite is None else int(feetwhite*u.shape[0]/arr.shape[0]),sigma2=(5.0 if smooth else 7.0))
    im=Image.fromarray(u)
    w=arr.shape[1]*scale; h=arr.shape[0]*scale
    tw,th=round(w*RES),round(h*RES)
    if (tw,th)!=im.size: im=im.resize((tw,th),Image.LANCZOS)
    if not save: return im,tw/RES,th/RES
    p=f'x4/{name}.png'; im.save(f'{PUB}/{p}',optimize=True)
    return p,tw/RES,th/RES
def F(k,i=0): r=fit[k][i]; return (L+k,r['x'],r['y'],r['scale'])
def at(f,cx,top,s): w=Image.open(SRC+f).width; return (f,cx-w*s/2,top,s)
def shoe(f,cx,bot,w):
    im=Image.open(SRC+f.split('|')[0]); s=w/im.width; return (f,cx-w/2,bot-im.height*s,s)

# ── 캐릭터: 시하 ─────────────────────────────────────────────
FEET_Y=512
base=fixes.shorten_shorts(load(L+'pink-haired-anime-girl/pink-haired-anime-girl-2.png'),new_hem=348)
top=base.copy(); top[FEET_Y:]=0; feet=base.copy(); feet[:FEET_Y-6]=0   # 발 조각은 6px 겹쳐 이음매 없음
char={'id':'siha','name':'시하','stage':{'w':SW,'h':SH},'res':RES,
 'note':'몸은 한 장짜리 원본이라 뒷머리·얼굴·앞머리는 몸 레이어에 포함. 속바지(흰 반바지)는 몸에 그려져 있고 가장 짧은 치마 밑단(y≈399)보다 위(y≈388)에서 끝나게 다시 칠함.',
 'pieces':[],
 'anchors':{
  'crown':{'x':180,'y':52,'size':1.0,'layer':'hair_acc','label':'정수리'},
  'side':{'x':236,'y':86,'size':0.6,'layer':'hair_acc','label':'옆머리'},
  'neck':{'x':180,'y':192,'size':0.42,'layer':'hair_acc','label':'목'},
  'waist':{'x':180,'y':306,'size':0.5,'layer':'hair_acc','label':'허리'},
  'shoe_l':{'x':122,'y':578,'size':0.3,'layer':'hair_acc','label':'왼쪽 신발'},
  'shoe_r':{'x':250,'y':575,'size':0.3,'layer':'hair_acc','label':'오른쪽 신발'},
  'hand':{'x':60,'y':150,'size':0.55,'layer':'hand_prop','label':'손'}}}
_full,_w,_h=process(base,1.0,'siha-full',save=False,feetwhite=360); _full=np.array(_full)
_t=_full.copy(); _t[FEET_Y*RES:]=0; _f=_full.copy(); _f[:(FEET_Y-6)*RES]=0
for key,arr in (('body',_t),('feet',_f)):
    p=f'x4/siha-{key}.png'; Image.fromarray(arr).save(f'{PUB}/{p}',optimize=True)
    char['pieces'].append({'key':key,'src':p,'layer':'body','x':OX,'y':OY,'w':_w,'h':_h})
json.dump(char,open(f'{DATA}/characters/siha.json','w'),ensure_ascii=False,indent=1)

def fit_socks_to_legs(pieces):
    """긴 양말 폭·위치를 몸의 다리 폭에 맞춘다(양말 옆으로 다리 피부가 비치지 않게). 세로 크기는 그대로."""
    body=np.array(Image.open(f"{PUB}/{char['pieces'][0]['src']}"))[...,3]
    for pc in pieces:
        a=np.array(Image.open(f"{PUB}/{pc['src']}"))[...,3]
        x0=(pc['x']-OX)*RES; y0=round((pc['y']-OY)*RES); sx=pc['w']*RES/a.shape[1]
        dc=[];rs=[]
        for fy in (0.25,0.5,0.75):
            yy=int(a.shape[0]*fy); xs=np.where(a[yy]>128)[0]
            sl,sr=x0+xs.min()*sx,x0+xs.max()*sx
            lo=int(max(0,sl-80)); seg=np.where(body[y0+yy,lo:int(sr+80)]>128)[0]+lo
            # 이 양말 쪽 다리만: 양말 중심을 포함하는 연속 구간
            c=(sl+sr)/2; runs=np.split(seg,np.where(np.diff(seg)>1)[0]+1); run=min(runs,key=lambda r:abs((r[0]+r[-1])/2-c))
            dc.append((run[0]+run[-1])/2-c); rs.append((run[-1]-run[0]+2*RES)/(sr-sl))
        k=min(1.12,max(1.0,float(np.median(rs)))); d=float(np.mean(dc))/RES
        cx=pc['x']+pc['w']/2+d; pc['w']=round(pc['w']*k,2); pc['x']=round(cx-pc['w']/2,2)
        if 'alt' in pc: pc['alt']['w']=pc['w']
        print('  양말 맞춤',round(d,1),'px, 폭x',round(k,3))
def sock_foot(pid,pieces):
    """몸의 발 모양을 양말 색으로 다시 칠한 조각(양말 레이어). 신발 뒤로 보이는 뒤꿈치가 피부가 아니라 양말이 된다."""
    F=np.zeros((570*RES,300*RES,4),np.float32)
    for cp in char['pieces']:
        im=np.array(Image.open(f"{PUB}/{cp['src']}").convert('RGBA')).astype(np.float32); F=np.where(im[...,3:4]>F[...,3:4],im,F)
    y0=round((max(pc['y']+pc['h'] for pc in pieces)-OY-10)*RES)
    F[:max(0,y0)]=0
    lum=F[...,:3]@np.array([0.3,0.59,0.11]); skin=np.median(lum[F[...,3]>200])
    g=np.clip(lum*(246/skin),0,255)
    sock=np.array([246,246,250],np.float32)/246
    F[...,:3]=np.clip(g[...,None]*sock,0,255)
    ys,xs=np.where(F[...,3]>0); x0,y1,x1,y2=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    p=f'x4/{pid}-foot.png'; Image.fromarray(F[y1:y2,x0:x1].astype(np.uint8)).save(f'{PUB}/{p}',optimize=True)
    return {'src':p,'layer':'socks','x':OX+x0/RES,'y':OY+y1/RES,'w':(x1-x0)/RES,'h':(y2-y1)/RES,'from':'몸의 발 모양을 양말 색으로'}
def leg_sock(pid,pieces,short):
    """양말을 다리 모양 그대로 새로 그린다: 몸(다리·발) 실루엣을 그대로 알파로 쓰고, 피부를 흰 양말 색으로 다시 칠함.
    알파가 다리와 똑같아 옆으로 피부가 비치지 않고, 한 장이라 발목 이음선도 없다. 윗단은 자두색 AA 선 한 줄(짧은 양말은 물결 프릴)."""
    from scipy import ndimage
    F=np.zeros((570*RES,300*RES,4),np.float32)
    for cp in char['pieces']:
        im=np.array(Image.open(f"{PUB}/{cp['src']}").convert('RGBA')).astype(np.float32); F=np.where(im[...,3:4]>F[...,3:4],im,F)
    H,W=F.shape[:2]; yy=np.arange(H)[:,None].astype(np.float32); xx=np.arange(W)[None,:].astype(np.float32)
    top=np.zeros(W,np.float32)
    for xa,xb in ((0,W//2),(W//2,W)):
        ps=[pc for pc in pieces if xa<= (pc['x']+pc['w']/2-OX)*RES <xb]
        t=(min(pc['y'] for pc in ps)-OY)*RES if (ps and not short) else (538-OY)*RES
        top[xa:xb]=t+(6 if not short else 0)
    if short: top=top+3*np.sin(xx[0]/9.0)          # 프릴 물결
    a=F[...,3]/255; rgb=F[...,:3]
    line=np.array(rim.LINE,np.float32)
    edge=ndimage.distance_transform_edt(a>0.02)<7
    isline=edge&((np.abs(rgb-line).sum(-1)<150)|(rgb.sum(-1)<420))   # 몸의 바깥 윤곽선 → 그대로 둠
    lum=rgb@np.array([0.3,0.59,0.11]); skin=np.median(lum[(a>0.9)&~isline&(yy[:,0:1].repeat(W,1)>top[None,:])])
    shade=np.clip(lum/skin,0.80,1.0)
    sock=np.array([250,250,253],np.float32)*shade[...,None]
    inner_line=(~isline)&(lum<skin*0.80)                       # 발가락 선 등 안쪽 선 → 연한 회보라
    sock=np.where(inner_line[...,None],np.array([200,190,205],np.float32),sock)
    out=np.where(isline[...,None],rgb,sock)
    d=yy-top[None,:]
    cov=np.clip(d+0.5,0,1)                                   # 윗단 AA
    band=np.clip(1-np.abs(d-2.0)/2.5,0,1)                    # 윗단 선(두께 ~4px, 몸 선과 비슷)
    out=out*(1-band[...,None])+line*band[...,None]
    cb=(d>4)&(d<(14 if short else 22)); out=np.where(cb[...,None],out*0.965,out)   # 고무단 살짝 그늘
    cuff=np.clip(1-np.abs(d-(14 if short else 22))/1.2,0,1)*0.55
    out=out*(1-cuff[...,None])+np.array([205,190,210],np.float32)*cuff[...,None]
    A=a*cov
    R=np.dstack([np.clip(out,0,255),A*255]).astype(np.uint8)
    ys,xs=np.where(R[...,3]>0); x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    pth=f'x4/{pid}.png'; Image.fromarray(R[y0:y1,x0:x1]).save(f'{PUB}/{pth}',optimize=True)
    return [{'src':pth,'x':OX+x0/RES,'y':OY+y0/RES,'w':(x1-x0)/RES,'h':(y1-y0)/RES,'from':'몸 다리 실루엣을 양말로 다시 칠함','unlessSlot':'shoes'}]
def merge_socks(pid,pieces):
    """양말 발(아래) + 양말 조각(위)을 스테이지 4배 캔버스에 합쳐 하나의 조각으로 만들고 바깥 윤곽선을 다시 그린다 → 양말·발 이음선 없음."""
    H,W=SH*RES,SW*RES; C=Image.new('RGBA',(W,H),(0,0,0,0))
    for pc in pieces:
        im=Image.open(f"{PUB}/{pc['src']}").convert('RGBA'); tw,th=round(pc['w']*RES),round(pc['h']*RES)
        if im.size!=(tw,th): im=im.resize((tw,th),Image.LANCZOS)
        L_=Image.new('RGBA',C.size,(0,0,0,0)); L_.paste(im,(round(pc['x']*RES),round(pc['y']*RES))); C.alpha_composite(L_)
    a=rim.restroke(np.array(C)); ys,xs=np.where(a[...,3]>0); x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    p=f'x4/{pid}.png'; Image.fromarray(a[y0:y1,x0:x1]).save(f'{PUB}/{p}',optimize=True)
    return [{'src':p,'x':x0/RES,'y':y0/RES,'w':(x1-x0)/RES,'h':(y1-y0)/RES,'from':'양말 조각 + 몸 발 모양(양말색) 합침','unlessSlot':'shoes'}]
def shoe_keep(pieces,margin=0):
    """신발을 신었을 때 남길 영역(스테이지 4배 좌표): 신발 입구(가장 높은 점) 위쪽 + 신발 안쪽(2px 줄임)."""
    from scipy import ndimage
    H,W=SH*RES,SW*RES; S=np.zeros((H,W),np.float32)
    for pc in pieces:
        if pc.get('patch'): continue
        a=np.array(Image.open(f"{PUB}/{pc['src']}").convert('RGBA'))[...,3]
        x0=round(pc['x']*RES); y0=round(pc['y']*RES)
        S[y0:y0+a.shape[0],x0:x0+a.shape[1]]=np.maximum(S[y0:y0+a.shape[0],x0:x0+a.shape[1]],a)
    shoe=S>128; inner=ndimage.binary_erosion(shoe,iterations=2)
    keep=np.ones((H,W),bool)
    for xa,xb in ((0,W//2),(W//2,W)):
        cols=np.where(shoe[:,xa:xb].any(0))[0]
        if not len(cols): continue
        tops={c:int(np.argmax(shoe[:,xa+c])) for c in cols}; top=min(tops.values())+RES+margin*RES
        keep[top:,xa:xb]=False                      # 신발 폭 밖: 신발 입구 아래는 모두 숨김
        for c,t in tops.items(): keep[:t+RES,xa+c]=True   # 신발 폭 안: 그 열의 신발 윗선 위는 보임(발목·양말)
    return keep|inner
def masked_piece(pc,keep,name,stroke=False):
    im=np.array(Image.open(f"{PUB}/{pc['src']}").convert('RGBA')); x0=round(pc['x']*RES); y0=round(pc['y']*RES)
    k=keep[y0:y0+im.shape[0],x0:x0+im.shape[1]]; im=im.copy(); im[~k]=0
    if stroke: im=rim.restroke(im)
    p=f'x4/{name}.png'; Image.fromarray(im).save(f'{PUB}/{p}',optimize=True); return p
def feet_for_shoes(pid,pieces):
    """신발 밖으로 비치는 발(뒤꿈치·발끝)만 지운 발 조각. 신발 윗선 위쪽 발목은 남겨 구멍이 생기지 않게 한다."""
    from scipy import ndimage
    fp=next(p for p in char['pieces'] if p['key']=='feet'); F=np.array(Image.open(f"{PUB}/{fp['src']}").convert('RGBA'))
    H,W=F.shape[:2]; S=np.zeros((H,W),np.float32)
    for pc in pieces:
        im=Image.open(f"{PUB}/{pc['src']}").convert('RGBA'); a=np.array(im)[...,3]
        x0=round((pc['x']-OX)*RES); y0=round((pc['y']-OY)*RES)
        ys,xs=slice(max(0,y0),min(H,y0+a.shape[0])),slice(max(0,x0),min(W,x0+a.shape[1]))
        S[ys,xs]=np.maximum(S[ys,xs],a[ys.start-y0:ys.stop-y0,xs.start-x0:xs.stop-x0])
    shoe=ndimage.binary_dilation(S>128,iterations=3)
    keep=np.ones((H,W),bool)
    for xa,xb in ((0,W//2),(W//2,W)):
        cols=np.where(shoe[:,xa:xb].any(0))[0]
        if not len(cols): continue
        tops=[np.argmax(shoe[:,xa+c]) for c in cols]; ank=int(np.median(tops))+8*RES
        keep[ank:,xa:xb]=False
    keep|=shoe
    F[~keep]=0; p=f'x4/siha-feet-{pid}.png'; Image.fromarray(F).save(f'{PUB}/{p}',optimize=True); return p
# ── 옷·장식 (id, 이름, 분류, 슬롯, 레이어, 조각들, 가림 규칙) ─────────
fo=fit['purple-bear-onesie.png'][0]; fd=fit['blue-frilly-dress.png'][0]
PARTS=[
 ('top_yellow','노란 크롭 상의','top','top','top',[F('yellow-crop-top/yellow-crop-top-2.png')],{}),
 ('skirt_denim','청치마','bottom','bottom','bottom',[F('denim-skirt/denim-skirt-2.png')],{}),
 ('skirt_denim2','청치마 2','bottom','bottom','bottom',[F('denim-skirt/denim-skirt-1.png')],{}),
 ('skirt_navy','남색 주름치마','bottom','bottom','bottom',[F('blue-skirt/blue-skirt-1.png')],{}),
 ('dress_blue','하늘 프릴 드레스','dress','dress','top',[F('blue-frilly-dress.png'),('HAND',7,'4e40d8/blue-frilly-dress.png',fd,(255,285,306,345),(fd['x'],fd['y'],fd['scale']))],{'clears':['top','bottom']}),
 ('dress_pink','분홍 프릴 드레스','dress','dress','top',[at(L+'pink-frilly-dress/pink-frilly-dress-1.png',152,138,1.15)],{'clears':['top','bottom']}),
 ('onesie_bear','보라 곰 우주복','dress','dress','outer',[(L+'purple-bear-onesie.png',fo['x'],fo['y'],fo['scale']),('HAND',9,'4e40d8/purple-bear-onesie.png',fo,(235,285,294,345),(fo['x'],fo['y'],fo['scale']))],{'clears':['top','bottom'],'hide':['feet'],'hideSlots':['shoes','socks']}),
 ('socks_long','긴 양말','socks','socks','socks',[F('white-socks/white-socks-2.png'),F('white-socks/white-socks-1.png')],{}),
 ('socks_short','프릴 양말','socks','socks','socks',[F('white-socks/white-socks-10.png'),F('white-socks/white-socks-12.png')],{}),
 ('shoes_red','빨간 운동화','shoes','shoes','shoes',[F('red-sneakers/red-sneakers-6.png'),F('red-sneakers/red-sneakers-4.png')],{'hide':['feet']}),
 ('shoes_loafer','검정 로퍼','shoes','shoes','shoes',[shoe(L+'black-loafers/black-loafers-1.png',94,568,62),shoe(L+'black-loafers/black-loafers-4.png',219,566,62)],{'hide':['feet']}),
 ('shoes_pink','분홍 구두','shoes','shoes','shoes',[shoe(L+'pink-shoes/pink-shoes-2.png|flip',97,568,60),shoe(L+'pink-shoes/pink-shoes-2.png',219,566,58)],{'hide':['feet']}),
 ('hb_blue','하늘 레이스 머리띠','head','head','hair_acc',[F('blue-headband/blue-headband-2.png',1)],{}),
 ('tiara_gold','하트 티아라','head','head','hair_acc',[at('adb08a/tiara.png',151,-8,0.62)],{}),
 ('devil_horns','악마 뿔','head','head','hair_acc',[at('8d0099/tiara/tiara-10.png',151,-10,0.85)],{}),
 ('hb_rose','검은 장미 머리띠','head','head','hair_acc',[at('8d0099/black-rose-headband/black-rose-headband-2.png',151,-14,1.0)],{}),
 ('hat_straw','밀짚모자','head','head','hair_acc',[at('8d0099/straw-hat.png',150,-28,1.0)],{}),
 ('headphones','헤드폰','head','head','hair_acc',[at('8d0099/headphones.png',150,0,1.0)],{}),
 ('choker','초커 목걸이','neck','neck','outer',[at('adb08a/choker-necklace.png',150,140,0.55)],{}),
]
# 여러 자리에 붙는 장식: (id, 이름, 분류, 원본, 정수리 기준 폭(스테이지 px), 앵커들)
SHOE_CUT={('shoes_red',1):(0.50,0.10,1.0,0.30)}   # 빨간 운동화 오른쪽 뒤축 뿔 잘라냄
ACC_OFFSET={'bow_blue_gem':{'crown':{'dx':0,'dy':10}}}  # 꼬리 사이로 머리와 틈이 생기지 않게 정수리에서 10 내림
RIB=['crown','side','neck','waist','shoe_l','shoe_r']; FLO=['side','hand']
ACCS=[
 ('bow_pink','분홍 큰 리본','ribbon',L+'pink-bow/pink-bow-1.png',96,RIB),
 ('bow_pink_small','분홍 작은 리본','ribbon',L+'pink-bow/pink-bow-3.png',80,RIB),
 ('bow_blue','파란 리본','ribbon','8d0099/blue-bow/blue-bow-1.png',80,RIB),
 ('ribbon_pink','분홍 긴 리본','ribbon','adb08a/pink-ribbon/pink-ribbon-1.png',80,RIB),
 ('bow_blue_gem','파란 보석 리본','ribbon','adb08a/blue-bow/blue-bow-2.png',96,RIB),
 ('flower_blue','파란 꽃','flower','8d0099/blue-flower-hair-accessory/blue-flower-hair-accessory-1.png',64,FLO),
 ('sunflower','해바라기','flower','8d0099/sunflower.png',72,FLO),
 ('rose','빨간 장미','flower','8d0099/red-rose/red-rose-1.png',60,FLO),
 ('lollipop','무지개 막대사탕','charm','8d0099/rainbow-swirl-lollipop.png',100,['hand']),
 ('heart','하트 보석','charm','adb08a/pink-heart-gem/pink-heart-gem-1.png',60,['hand','neck','waist']),
 ('pendant','하트 펜던트','charm','adb08a/pink-gem-pendant.png',60,['neck','hand']),
]
order=[]
for pid,name,cat,slot,layer,pieces,occ in PARTS:
    out=[]
    for n,pc in enumerate(pieces):
        if pc[0]=='HAND':
            _,ci,pf,fr,box,plc=pc; arr,(x,y,s)=hands.hand(ci,pf,fr,box,plc)
            p,w,h=process(arr,s,f'{pid}-hand',stroke=False); out.append({'src':p,'layer':'arms','x':round(x+OX,2),'y':round(y+OY,2),'w':w,'h':h,'from':pf+' (손, 시트 '+str(ci)+')'})
            continue
        f,x,y,s=pc; arr=load(f)
        p,w,h=process(arr,s,f'{pid}-{n}',stroke=(slot!='socks'),shrink=(6 if slot=='shoes' else 3),cut=SHOE_CUT.get((pid,n)),heel={'shoes_pink':0.13,'shoes_loafer':0.10}.get(pid,0),sharp=False,smooth=(slot=='shoes'))
        e={'src':p,'x':round(x+OX,2),'y':round(y+OY,2),'w':w,'h':h,'from':f}
        if occ.get('altWhen')=='shoes':
            ext=fixes.extend_bottom(arr,rows=12)
            pa,wa,ha=process(ext,s,f'{pid}-{n}-inshoe'); e['alt']={'when':'shoes','src':pa,'w':wa,'h':ha}
        out.append(e)
    j={'id':pid,'name':name,'category':cat,'slot':slot,'layer':layer,'pieces':out,
       'occlusion':{'hideCharacterPieces':occ.get('hide',[]),'clearsSlots':occ.get('clears',[]),**({'hideSlots':occ['hideSlots']} if 'hideSlots' in occ else {})}}
    if pid=='socks_long': fit_socks_to_legs(out)
    if slot=='socks': out=leg_sock(pid,out,short=(pid=='socks_short')); j['pieces']=out
    if slot=='shoes':
        kp=shoe_keep(out); kps=shoe_keep(out,margin=10); fp=next(p for p in char['pieces'] if p['key']=='feet')
        j['occlusion']['replaceCharacterPieces']={'feet':masked_piece(fp,kp,f'siha-feet-{pid}')}; j['occlusion']['hideCharacterPieces']=[]
        for sid in [x for x in order if x.startswith('socks')]:
            sj=json.load(open(f'{DATA}/parts/{sid}.json')); base_pc=next(x for x in sj['pieces'] if x.get('unlessSlot'))
            v=dict(base_pc); v.pop('unlessSlot'); v['onlyWith']=pid; v['src']=masked_piece(base_pc,kp,f'{sid}-in-{pid}')
            sj['pieces'].append(v); json.dump(sj,open(f'{DATA}/parts/{sid}.json','w'),ensure_ascii=False,indent=1)
    json.dump(j,open(f'{DATA}/parts/{pid}.json','w'),ensure_ascii=False,indent=1); order.append(pid); print('part',pid,flush=True)
for aid,name,cat,f,crownW,anchors in ACCS:
    arr=load(f); s=min(1.0,crownW/arr.shape[1])      # 정수리 크기에서도 확대하지 않음
    p,w,h=process(arr,s,aid)
    j={'id':aid,'name':name,'category':cat,'slot':None,'layer':'hair_acc','multi':True,'anchors':anchors,'freePlacement':True,
       'size':{'w':w,'h':h},'pieces':[{'src':p,'w':w,'h':h,'from':f}],'occlusion':{'hideCharacterPieces':[],'clearsSlots':[]}}
    if aid in ACC_OFFSET: j['anchorOffset']=ACC_OFFSET[aid]
    json.dump(j,open(f'{DATA}/parts/{aid}.json','w'),ensure_ascii=False,indent=1); order.append(aid); print('acc',aid,flush=True)
LAYERS=['back_hair','body','underwear','socks','shoes','bottom','top','outer','arms','face','front_hair','hair_acc','hand_prop']
json.dump({'order':LAYERS,'labels':{'back_hair':'뒷머리','body':'몸','underwear':'속옷','socks':'양말','shoes':'신발','bottom':'하의','top':'상의·원피스','outer':'겉옷','arms':'팔·소매','face':'얼굴','front_hair':'앞머리','hair_acc':'머리장식','hand_prop':'손 소품'},
 'categories':[{'id':'dress','label':'원피스'},{'id':'top','label':'상의'},{'id':'bottom','label':'하의'},{'id':'socks','label':'양말'},{'id':'shoes','label':'신발'},{'id':'head','label':'머리'},{'id':'ribbon','label':'리본'},{'id':'flower','label':'꽃'},{'id':'neck','label':'목'},{'id':'charm','label':'소품'}],
 'partOrder':order},open(f'{DATA}/layers.json','w'),ensure_ascii=False,indent=1)
# ── 틈 메우기 조각: 부품을 몸에 입혔을 때 몸과 부품 사이에 갇힌 배경(틈)을 가까운 색으로 메운다 ──
sys.path.insert(0,os.path.join(HERE,'sticker_fit'))
import importlib, qa_compose
from scipy import ndimage
def enclosed(img):
    a=np.array(img)[...,3]<200; lab,n=ndimage.label(a)
    border=np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]); m=(lab>0)&~np.isin(lab,border)
    return m
def make_patch(ids,name):
    importlib.reload(qa_compose)
    img=qa_compose.compose_alpha(ids); m=enclosed(img)
    if m.sum()==0: return None
    arr=np.array(img); idx=ndimage.distance_transform_edt(arr[...,3]<200,return_distances=False,return_indices=True)
    fill=arr[idx[0],idx[1]]; out=np.zeros_like(arr); out[m]=fill[m]; out[m,3]=255
    md=ndimage.binary_dilation(m,iterations=2); out[md&~m]=np.where(arr[md&~m][:,3:4]<255,fill[md&~m],0)  # 가장자리 반투명도 메움
    ys,xs=np.where(out[...,3]>0); x0,y0,x1,y1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    p=f'x4/patch-{name}.png'; Image.fromarray(out[y0:y1,x0:x1]).save(f'{PUB}/{p}',optimize=True)
    return {'src':p,'layer':'underwear','x':x0/RES,'y':y0/RES,'w':(x1-x0)/RES,'h':(y1-y0)/RES,'from':'자동 틈 메우기','patch':True}
for pid in order:
    j=json.load(open(f'{DATA}/parts/{pid}.json'))
    if j.get('multi'): continue
    pt=make_patch([pid],pid)
    if pt:
        j['pieces'].append(pt); json.dump(j,open(f'{DATA}/parts/{pid}.json','w'),ensure_ascii=False,indent=1); print('patch',pid,round(pt['w']*pt['h']))
# 양말+신발처럼 두 부품이 만날 때만 생기는 틈은 양말 쪽에 '함께 입을 때만' 조각으로
for sid in [p for p in order if p.startswith('socks')]:
    j=json.load(open(f'{DATA}/parts/{sid}.json'))
    for sh in [p for p in order if p.startswith('shoes')]:
        pt=make_patch([sid,sh],f'{sid}-{sh}')
        if pt: pt['onlyWith']=sh; j['pieces'].append(pt); print('patch',sid,sh)
    json.dump(j,open(f'{DATA}/parts/{sid}.json','w'),ensure_ascii=False,indent=1)
# ── 배경: 올린 모눈종이 PNG 의 구멍을 같은 모눈으로 메워 사용 ────────────
bgs=[('grid_blue','하늘 모눈종이','4e40d8/grid-paper-background.png',39),('grid_soft','연한 모눈종이','8d0099/grid-background.png',58)]
for bid,name,f,P in bgs:
    tmp=f'{PUB}/bg/{bid}_full.png'; bgfill.fill(SRC+f,tmp,P)
    im=Image.open(tmp); os.remove(tmp)
    tw=im.width; th=round(tw*SH/SW)
    if th>im.height: th=im.height; tw=round(th*SW/SH)
    l=(im.width-tw)//2; t=(im.height-th)//2
    im.crop((l,t,l+tw,t+th)).convert('RGB').save(f'{PUB}/bg/{bid}.jpg',quality=92)
    json.dump({'id':bid,'name':name,'src':f'bg/{bid}.jpg','from':f},open(f'{DATA}/backgrounds/{bid}.json','w'),ensure_ascii=False,indent=1)
print('done',len(order))

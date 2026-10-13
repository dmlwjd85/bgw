import cv2,numpy as np,glob,json,os
from PIL import Image
R='/workspace/sticker_upload/4e40d8/'
def load(f):
    a=np.array(Image.open(f).convert('RGBA')).astype(np.float32); return a
base=load(R+'pink-haired-anime-girl/pink-haired-anime-girl-2.png')
comps={i:load(R+f'pink-haired-anime-girl/pink-haired-anime-girl-{i}.png') for i in range(1,10)}
def match(tpl,img,scales):
    best=None
    for s in scales:
        w=int(tpl.shape[1]*s);h=int(tpl.shape[0]*s)
        if w<8 or h<8 or w>=img.shape[1] or h>=img.shape[0]: continue
        t=cv2.resize(tpl,(w,h),interpolation=cv2.INTER_AREA)
        m=(t[:,:,3]>200).astype(np.float32)
        if m.sum()<30: continue
        r=cv2.matchTemplate(img[:,:,:3],t[:,:,:3],cv2.TM_SQDIFF,mask=np.dstack([m]*3))
        r=r/(m.sum()*3)
        v,_,loc,_=cv2.minMaxLoc(r)
        if best is None or v<best[0]: best=(v,s,loc[0],loc[1])
    return best
# register composites to base using head (top 230px)
reg={}
head=base[0:230,40:260]
for i,c in comps.items():
    # match comp head into base: use comp head template
    ch=c[0:int(230*c.shape[0]/570)]
    b=match(head,c,np.arange(0.85,1.15,0.01))
    # head of base at (40,0) appears in comp at loc with scale s -> comp = s*base + off
    v,s,x,y=b; reg[i]=dict(s=float(s),ox=float(x-40*s),oy=float(y),err=float(v))
    print('reg',i,reg[i])
json.dump(reg,open('tools/sticker_fit/reg.json','w'))

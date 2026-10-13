"""스티커 에셋을 저장소용으로 복사하고 위치 메타데이터를 만든다. 원본은 읽기만 한다.
python3 tools/build_sticker_assets.py  (박스 /workspace/sb 의 맞춤 결과를 사용)"""
import json,os,shutil,sys
sys.path.insert(0,'/workspace/sb')
exec(open(os.path.join(os.path.dirname(__file__),'sticker_fit/items_extra.py')).read())
OUT='siha-dress-book/public/sticker'
OX,OY,W,H=30,40,360,650   # 몸(300x570)을 스테이지(360x650) 안 (30,40)에 둔다
shutil.rmtree(OUT,ignore_errors=True); os.makedirs(OUT+'/parts')
FEET_Y=512  # 이 줄 아래(발)는 따로 떼어 신발을 신으면 숨긴다 → 신발 밑으로 맨발이 비치지 않음
_b=Image.open(BASE).convert('RGBA'); _t=_b.copy(); _f=_b.copy()
_t.paste((0,0,0,0),(0,FEET_Y,_b.width,_b.height)); _f.paste((0,0,0,0),(0,0,_b.width,FEET_Y))
_t.save(OUT+'/body.png'); _f.save(OUT+'/feet.png')
CAT={'top':'상의','bottom':'하의','dress':'원피스','socks':'양말','shoes':'신발','head':'머리','neck':'목','prop':'소품'}
meta={'stage':{'w':W,'h':H},'body':{'src':'body.png','x':OX,'y':OY,'w':300,'h':570},'feet':{'src':'feet.png','x':OX,'y':OY,'w':300,'h':570},
 'note':'몸에 흰 민소매·흰 반바지가 그려져 있어 어떤 조합도 노출이 생기지 않음','categories':[{'id':k,'label':v} for k,v in CAT.items()],'items':[]}
for iid,(name,slot,z,pieces) in ITEMS.items():
    ps=[]
    for n,(f,x,y,s) in enumerate(pieces):
        im=Image.open(S+f); dst=f'parts/{iid}-{n}.png'; shutil.copy(S+f,OUT+'/'+dst)
        ps.append(dict(src=dst,orig=f,x=round(x+OX,1),y=round(y+OY,1),w=round(im.width*s,1),h=round(im.height*s,1),scale=round(s,3)))
    if iid in ('bow_blue','flower_blue','bow_pink_side'): slot_='pin'
    else: slot_=slot
    meta['items'].append(dict(id=iid,name=name,slot=slot_,category=slot,z=z,pieces=ps))
for iid,(name,f,s) in PROPS.items():
    im=Image.open(S+f); dst=f'parts/{iid}.png'; shutil.copy(S+f,OUT+'/'+dst)
    meta['items'].append(dict(id=iid,name=name,slot='prop',category='prop',z=90,free=True,pieces=[dict(src=dst,orig=f,x=0,y=0,w=round(im.width*s,1),h=round(im.height*s,1),scale=s)]))
for it in meta['items']:
    if it['id'] in ('bow_blue','flower_blue','bow_pink_side'): it['category']='pin'
json.dump(meta,open('siha-dress-book/src/sticker/stickers.json','w'),ensure_ascii=False,indent=1)
print(len(meta['items']),'items')

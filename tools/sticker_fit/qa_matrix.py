"""모든 부품 단독 + 치마·양말·신발·상의 조합을 합성해 구멍(바깥과 이어지지 않은 투명 영역) 수를 센다."""
import sys,os,itertools,json
sys.path.insert(0,os.path.dirname(__file__))
import numpy as np
from scipy import ndimage
import qa_compose as q
def holes(img):
    a=np.array(img)[...,3]<200
    lab,n=ndimage.label(a)
    border=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))
    sizes=ndimage.sum(a,lab,range(1,n+1))
    return [(i,int(s)) for i,s in zip(range(1,n+1),sizes) if i not in border and s>=4]
res={}
singles=[[p] for p,v in q.PART.items() if not v.get('multi')]
tops=[[],['top_yellow']]; bots=[['skirt_denim'],['skirt_denim2'],['skirt_navy']]; socks=[[],['socks_long'],['socks_short']]; shoes=[[],['shoes_red'],['shoes_loafer'],['shoes_pink']]
combos=[sum(c,[]) for c in itertools.product(tops,bots,socks,shoes)]
combos+=[sum(c,[]) for c in itertools.product([['dress_blue'],['dress_pink'],['onesie_bear']],socks,shoes)]
accs=[(a,anc) for a,v in q.PART.items() if v.get('multi') for anc in v['anchors']]
bad=0
for ids in [[]]+singles+combos:
    c=q.compose(ids,bg=None) if False else q.compose(ids,bg=(0,0,0)) if False else None
    from PIL import Image
    img=q.compose(ids,bg=(0,0,0)); # 배경 없이 알파만 보려고 아래에서 다시 계산
    img=q.compose_alpha(ids) if hasattr(q,'compose_alpha') else None
    h=holes(img); res['+'.join(ids) or 'base']=h; bad+=bool(h)
for a,anc in accs:
    img=q.compose_alpha([],[(a,anc)]); h=holes(img); res[f'acc:{a}@{anc}']=h; bad+=bool(h)
json.dump(res,open('/workspace/sb/qa2/holes.json','w'),ensure_ascii=False,indent=0)
print('조합',len(res),'구멍 있는 조합',bad)
for k,v in res.items():
    if v: print(k,v[:5])

"""옷 원본 시트(옷을 입은 전신 그림)에서 소매 밖으로 나온 손만 떼어 '팔·소매' 레이어 조각으로 만든다."""
import json,os,numpy as np
from PIL import Image
from scipy import ndimage
_SRC=os.environ.get('STICKER_SRC', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'archive/siha-sticker-original/'))
SRC=_SRC if _SRC.endswith(os.sep) else _SRC+os.sep
HERE=os.path.dirname(__file__)
reg=json.load(open(os.path.join(HERE,'reg.json')))
def hand(comp_i,piece_file,fitrec,box,placement):
    comp=np.array(Image.open(f'{SRC}4e40d8/pink-haired-anime-girl/pink-haired-anime-girl-{comp_i}.png').convert('RGBA'))
    g=reg[str(comp_i)]; kc=fitrec['scale']*g['s']; xc=fitrec['x']*g['s']+g['ox']; yc=fitrec['y']*g['s']+g['oy']
    pc=Image.open(SRC+piece_file).convert('RGBA'); pc=pc.resize((round(pc.width*kc),round(pc.height*kc)),Image.LANCZOS)
    M=Image.new('L',(comp.shape[1],comp.shape[0]),0); M.paste(pc.getchannel('A'),(round(xc),round(yc)))
    m=np.array(M)>128; m=ndimage.binary_erosion(m,iterations=3)   # 소매 안쪽 3px 겹침 → 틈 없음
    x0,y0,x1,y1=box; sel=np.zeros(m.shape,bool); sel[y0:y1,x0:x1]=True
    out=comp.copy(); out[~(sel&~m)]=0
    crop=out[y0:y1,x0:x1]
    px,py,ks=placement; r=ks/kc
    return crop,(px+(x0-xc)*r,py+(y0-yc)*r,r)

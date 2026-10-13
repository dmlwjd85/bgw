import sys,os;sys.path.insert(0,os.path.dirname(__file__))
import numpy as np, qa_compose as q
from scipy import ndimage
from PIL import Image
def find(ids,accs=()):
    img=q.compose_alpha(ids,accs); a=np.array(img)[...,3]<200
    lab,n=ndimage.label(a); border=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))
    out=[]
    for i,sl in enumerate(ndimage.find_objects(lab),1):
        if i in border or (lab[sl]==i).sum()<4: continue
        out.append((sl[1].start,sl[0].start,sl[1].stop,sl[0].stop))
    return img,out
def sheet(cases,path,pad=40):
    tiles=[]
    for ids,accs in cases:
        img,hs=find(ids,accs)
        comp=Image.new('RGBA',img.size,(0,200,0,255)); comp.alpha_composite(img)
        for x0,y0,x1,y1 in hs:
            t=comp.crop((x0-pad,y0-pad,x1+pad,y1+pad)); tiles.append(t)
    W=sum(t.width for t in tiles)+10*len(tiles); H=max(t.height for t in tiles)
    c=Image.new('RGB',(W,H),'white'); x=0
    for t in tiles: c.paste(t,(x,0)); x+=t.width+10
    c.save(path); return len(tiles)

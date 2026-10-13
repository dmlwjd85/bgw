"""배경 PNG(모눈종이)의 스티커 구멍을 같은 간격·색의 모눈으로 메운다. 원본은 읽기만."""
import numpy as np
from PIL import Image
def _prof(line,op,axis):
    s=(line*op).sum(axis); n=op.sum(axis); return np.where(n>20,s/np.maximum(n,1),0)
def _fit(v,P0):
    v=v-np.median(v); t=v.max()*0.35
    pk=np.array([i for i in range(2,len(v)-2) if v[i]>t and v[i]>v[i-1] and v[i]>=v[i+1]],float)
    k=np.round((pk-pk[0])/P0); (P,off),*_=np.linalg.lstsq(np.vstack([k,np.ones_like(k)]).T,pk,rcond=None)
    return float(P),float(off%P)
def fill(src,dst,P0):
    a=np.array(Image.open(src).convert('RGBA')).astype(np.float32)
    op=(a[...,3]>250).astype(np.float32); line=np.clip(a[...,2]-a[...,0],0,None)
    px,ox=_fit(_prof(line,op,0),P0); py,oy=_fit(_prof(line,op,1),P0)
    m=op>0
    paper=np.median(a[m&(line<3)][:,:3],0); lc=np.median(a[m&(line>np.percentile(line[m],98))][:,:3],0)
    H,W=m.shape; X=np.arange(W); Y=np.arange(H)
    dx=np.abs(((X-ox+px/2)%px)-px/2); dy=np.abs(((Y-oy+py/2)%py)-py/2)
    w=np.maximum(np.clip(1.0-dx/1.2,0,1)[None,:],np.clip(1.0-dy/1.2,0,1)[:,None])[...,None]
    syn=paper*(1-w)+lc*w
    from scipy import ndimage
    hole=ndimage.binary_dilation(a[...,3]<250,iterations=3)
    A=np.where(hole,0,1.0)[...,None]; out=a[...,:3]*A+syn*(1-A)
    Image.fromarray(np.clip(out,0,255).astype(np.uint8)).save(dst,optimize=True)
    return dict(px=px,py=py)

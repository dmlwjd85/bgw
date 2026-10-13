"""원본 해상도에서 하는 손질(복사본에만). 모두 numpy RGBA uint8."""
import numpy as np
def runs(row_alpha,x0,x1,minw=15):
    on=row_alpha[x0:x1]>200; out=[];s=None
    for i,v in enumerate(list(on)+[False]):
        if v and s is None: s=i
        if not v and s is not None:
            if i-s>=minw: out.append((x0+s,x0+i-1))
            s=None
    return out
def trim(img_row,l,r):
    px=img_row[:, :3].astype(int)
    white=lambda x:(px[x].min()>238 and px[x].max()-px[x].min()<12)
    while l<r and white(l): l+=1
    while r>l and white(r): r-=1
    return l,r
def shorten_shorts(b,new_hem=348,old_band=(364,371),fill_to=374,src_rows=(376,377),x0=85,x1=230):
    """흰 반바지 밑단을 new_hem 까지 올리고 아래를 허벅지로 다시 칠한다(가로 폭 맞춰 행 복사)."""
    o=b.copy()
    def copy_row(dst_y,src_y):
        d=runs(b[dst_y,:,3],x0,x1); s=runs(b[src_y,:,3],x0,x1)
        if len(d)!=len(s): return False
        for (l,r),(l2,r2) in zip(d,s):
            l,r=trim(b[dst_y],l,r); l2,r2=trim(b[src_y],l2,r2)
            xs=np.arange(l,r+1); src=np.round(l2+(xs-l)*(r2-l2)/max(1,r-l)).astype(int)
            o[dst_y,l:r+1]=b[src_y,src]
        return True
    # 새 밑단 선: 반바지 옆선 색으로 2px(+AA 1px) 가로선
    line=np.array([150,122,132],np.float32)
    for y,a in ((new_hem,0.5),(new_hem+1,0.85),(new_hem+2,0.3)):
        for l,r in runs(b[y,:,3],x0,x1,5):
            l,r=trim(b[y],l,r); l+=1; r-=1
            seg=o[y,l:r+1,:3].astype(np.float32); o[y,l:r+1,:3]=(seg*(1-a)+line*a).astype(np.uint8)
    new_hem=new_hem+2
    n=fill_to-new_hem
    for i in range(n):
        y=new_hem+1+i; sy=src_rows[0]+int(i*(src_rows[1]-src_rows[0])/max(1,n-1))
        copy_row(y,sy)
    return o
def extend_bottom(p,rows=12,ref=8):
    """양말 아래를 ref 행 위의 단면 한 줄로 rows 만큼 늘린다(신발 안쪽으로 들어가 뒤꿈치 피부 틈을 막음)."""
    a=p[...,3]; ys=np.where(a.max(1)>128)[0]; bot=ys.max()
    h,w,_=p.shape; o=np.zeros((h+rows,w,4),np.uint8); o[:h]=p
    row=p[bot-ref].copy()
    for y in range(bot-ref+1,bot+rows+1): o[y]=row
    return o

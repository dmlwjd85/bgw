"""흰 칼선 테두리 제거: 바깥 투명 영역에서 이어진 밝은 무채색 띠만 지우고, 선 쪽 경계는 흰색을 빼서 AA 유지."""
import numpy as np
from scipy import ndimage
def strip_rim(rgba,max_px=14,lo=242,sat=12):
    rgb=rgba[...,:3].astype(np.float32); A=rgba[...,3].astype(np.float32)
    L=rgb.min(2); S=rgb.max(2)-L
    outside=A<24
    bright=(L>=lo)&(S<=sat)
    near=ndimage.distance_transform_edt(~outside)<=max_px
    cand=(outside|bright)&near
    lab,_=ndimage.label(cand)
    keep=np.unique(lab[outside]); keep=keep[keep>0]
    R=np.isin(lab,keep)&~outside
    f=np.clip((255-L)/(255-lo),0,1)
    f=np.where(R,f,1.0)
    # 경계 1px 바깥 흰 블렌드도 빼기 위해 R 이웃의 반투명 픽셀 처리
    newA=A*f
    with np.errstate(divide='ignore',invalid='ignore'):
        c=np.where(R[...,None]&(f[...,None]>0.02),(rgb-(1-f[...,None])*255)/np.maximum(f[...,None],1e-3),rgb)
    out=np.dstack([np.clip(c,0,255),np.clip(newA,0,255)]).astype(np.uint8)
    out[newA<4]=0
    return out

def restore_holes(u,up):
    """테두리 제거로 조각 안쪽에 새로 생긴 구멍(바깥과 안 이어진 투명 영역)은 원래 픽셀로 되돌린다."""
    a=u[...,3]<200
    lab,n=ndimage.label(a)
    border=np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]])
    hole=(lab>0)&~np.isin(lab,border)
    hole&=up[...,3]>=200          # 원본 그림 자체의 빈 곳은 그대로
    o=u.copy(); o[hole]=up[hole]; return o
def smooth_edge(u,sigma=2.2,band=7):
    """계단·점선 외곽을 매끈한 AA 윤곽으로: 알파는 가우시안 후 가파른 램프(폭 ~2px)로 다시 만들고,
    윤곽 띠(band px) 색은 5×5 중앙값으로 점선을 고른다. 안쪽 그림은 건드리지 않는다."""
    A=u[...,3].astype(np.float32)/255
    g=ndimage.gaussian_filter(A,sigma)
    newA=np.clip((g-0.5)*2.6+0.5,0,1)
    inside=ndimage.distance_transform_edt(A>0.5)
    edge=(inside<=band)&(A>0.02)
    rgb=u[...,:3].copy()
    med=np.stack([ndimage.median_filter(rgb[...,c],size=5) for c in range(3)],-1)
    rgb[edge]=med[edge]
    A2=np.where(inside>band,A,np.minimum(np.maximum(newA,0),1))
    # 바깥쪽으로 새로 생긴 픽셀은 가장 가까운 안쪽 색
    idx=ndimage.distance_transform_edt(A<0.5,return_distances=False,return_indices=True)
    grow=(A2>0.02)&(A<0.5)
    rgb[grow]=rgb[idx[0],idx[1]][grow]
    out=np.dstack([rgb,(A2*255).astype(np.uint8)])
    return out
def solid_outline(u,band=6,win=11):
    """원본 외곽이 1px 계단·점선이라 확대하면 점선으로 보이는 부품용: 바깥 band px 를 주변에서 가장 진한 선 색으로 이어 칠한다."""
    A=u[...,3]
    inside=ndimage.distance_transform_edt(A>128)
    edge=(inside<=band)&(A>8)
    lum=u[...,:3].astype(np.float32)@np.array([.3,.59,.11])
    lum_m=np.where(edge,lum,999)
    mn=ndimage.minimum_filter(lum_m,size=win)
    # 창 안 최소 휘도 픽셀의 색을 찾기 위해 위치 인덱스 사용
    idx=np.arange(lum.size).reshape(lum.shape)
    best=ndimage.generic_filter(np.where(edge,lum,999),lambda v:np.argmin(v),size=win,mode='nearest') if False else None
    o=u.copy()
    dark=edge&(lum_m<=mn+1)
    di=ndimage.distance_transform_edt(~dark,return_distances=False,return_indices=True)
    src=u[di[0],di[1]]
    o[edge,:3]=src[edge,:3]
    return o

"""Real-ESRGAN anime 6B (ONNX, 4배) 업스케일. 모델: STICKER_ESR_MODEL (기본 /workspace/sb/models/esr.onnx)
https://huggingface.co/deepghs/imgutils-models/resolve/main/real_esrgan/RealESRGAN_x4plus_anime_6B.onnx (sha256 2648cab4…)"""
import os,numpy as np,onnxruntime as ort
from scipy import ndimage
_S=None
def sess():
    global _S
    if _S is None:
        o=ort.SessionOptions(); o.intra_op_num_threads=6
        _S=ort.InferenceSession(os.environ.get('STICKER_ESR_MODEL','/workspace/sb/models/esr.onnx'),o)
    return _S
def up_rgb(rgb,tile=96,pad=10):
    h,w,_=rgb.shape; out=np.zeros((h*4,w*4,3),np.float32); s=sess(); n=s.get_inputs()[0].name
    x=rgb.astype(np.float32)/255
    for y0 in range(0,h,tile):
        for x0 in range(0,w,tile):
            ya,xa=max(0,y0-pad),max(0,x0-pad); yb,xb=min(h,y0+tile+pad),min(w,x0+tile+pad)
            t=x[ya:yb,xa:xb].transpose(2,0,1)[None]
            r=s.run(None,{n:t})[0][0].transpose(1,2,0)
            oy,ox=(y0-ya)*4,(x0-xa)*4; th,tw=min(tile,h-y0)*4,min(tile,w-x0)*4
            out[y0*4:y0*4+th,x0*4:x0*4+tw]=r[oy:oy+th,ox:ox+tw]
    return np.clip(out*255,0,255)
def bleed(rgba):
    """투명 영역 색을 가장 가까운 불투명 색으로 채워 업스케일 테두리 번짐을 막는다."""
    a=rgba[:,:,3]; m=a<8
    if not m.any(): return rgba[:,:,:3]
    idx=ndimage.distance_transform_edt(m,return_distances=False,return_indices=True)
    return rgba[:,:,:3][idx[0],idx[1]]
def up_rgba(rgba):
    rgb=up_rgb(bleed(rgba))
    a=np.repeat(rgba[:,:,3:4],3,2)
    A=up_rgb(a).mean(2)
    return np.dstack([rgb,A])

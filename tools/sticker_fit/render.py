import json,sys
from PIL import Image
import os
S=os.environ.get('STICKER_SRC','/workspace/sticker_upload/')
BASE=S+'4e40d8/pink-haired-anime-girl/pink-haired-anime-girl-2.png'
fit=json.load(open('tools/sticker_fit/fit.json'))
def place(f,x,y,s):
    im=Image.open(S+f).convert('RGBA')
    if abs(s-1)>1e-3: im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    return im,(round(x),round(y))
def compose(items,pad=0,bg=(200,230,200,255)):
    b=Image.open(BASE).convert('RGBA')
    c=Image.new('RGBA',(b.width+2*pad,b.height+2*pad),bg); c.alpha_composite(b,(pad,pad))
    for f,x,y,s in items:
        im,(px,py)=place(f,x,y,s)
        L=Image.new('RGBA',c.size,(0,0,0,0)); L.paste(im,(px+pad,py+pad)); c.alpha_composite(L)
    return c

exec(open('tools/sticker_fit/match.py').read().split('# register')[0])
import json
reg=json.load(open('tools/sticker_fit/reg.json'))
folders={'blue-frilly-dress.png':[7],'purple-bear-onesie.png':[9],'blue-skirt':[3],'denim-skirt':[4,6],'yellow-crop-top':[4,6],'black-loafers':[3,5,8],'red-sneakers':[4,6,7],'white-socks':[3,4,5,6,7,8],'blue-headband':[4,6,7],'pink-frilly-dress':[5,8],'pink-bow':[5,8],'pink-shoes':[5,8],'white-tank-top':[2],'white-shorts':[2],'bare-feet':[2]}
out={}
for fo,cs in folders.items():
    fs=[R+fo] if fo.endswith('.png') else sorted(glob.glob(R+fo+'/*.png'))
    for f in fs:
        t=load(f); res=[]
        for ci in cs:
            c=comps[ci]; g=reg[str(ci)]
            smax=min(c.shape[1]/t.shape[1],c.shape[0]/t.shape[0])*0.99
            b=match(t,c,np.linspace(0.2,min(1.3,smax),45))
            if not b: continue
            v,s,x,y=b
            # comp coords -> base coords
            bs=s/g['s']; bx=(x-g['ox'])/g['s']; by=(y-g['oy'])/g['s']
            res.append(dict(err=float(v),comp=ci,scale=float(bs),x=float(bx),y=float(by),w=float(t.shape[1]*bs),h=float(t.shape[0]*bs)))
        res.sort(key=lambda r:r['err'])
        out[f.replace(R,'')]=res
        print(f.replace(R,''),t.shape[1],t.shape[0],[(r['comp'],int(r['err']),round(r['scale'],2),int(r['x']),int(r['y'])) for r in res[:3]],flush=True)
json.dump(out,open('tools/sticker_fit/fit.json','w'),indent=1)

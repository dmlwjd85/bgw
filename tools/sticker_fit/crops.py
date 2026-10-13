import json,os
from PIL import Image
R='siha-dress-book/public/sticker/'
m=json.load(open('siha-dress-book/src/sticker/stickers.json')); I={i['id']:i for i in m['items']}
looks={'denim':['socks_short','shoes_red','top_yellow','skirt_denim','hb_blue'],'pink':['socks_long','shoes_loafer','dress_pink','bow_pink'],'blue':['shoes_pink','dress_blue','tiara_gold','flower_blue'],'navy':['socks_long','shoes_red','skirt_navy','choker'],'onesie':['onesie_bear'],'base':[]}
zones={'feet':(80,520,300,620),'neck':(130,160,240,240),'hiphand':(190,250,290,340),'wavehand':(30,90,120,190),'waist':(90,270,280,350),'head':(90,20,270,120)}
out='/workspace/sb/crops/'; os.makedirs(out,exist_ok=True)
for k,ids in looks.items():
  c=Image.new('RGBA',(360,650),(255,253,248,255))
  c.alpha_composite(Image.open(R+'body.png').convert('RGBA'),(30,40))
  if not any(I[i]['slot']=='shoes' for i in ids): c.alpha_composite(Image.open(R+'feet.png').convert('RGBA'),(30,40))
  for it in sorted((I[i] for i in ids),key=lambda x:x['z']):
    for p in it['pieces']:
      im=Image.open(R+p['src']).convert('RGBA')
      if abs(p['scale']-1)>1e-3: im=im.resize((round(p['w']),round(p['h'])),Image.LANCZOS)
      L=Image.new('RGBA',c.size,(0,0,0,0)); L.paste(im,(round(p['x']),round(p['y']))); c.alpha_composite(L)
  c.save(out+f'{k}_full.png')
  for z,(x0,y0,x1,y1) in zones.items():
    c.crop((x0,y0,x1,y1)).resize(((x1-x0)*4,(y1-y0)*4),Image.NEAREST).save(out+f'{k}_{z}_400.png')

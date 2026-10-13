exec(open('tools/sticker_fit/items.py').read())
del ITEMS['hb_lace']
ITEMS['tiara_blue']=('악마 뿔','head',84,ITEMS['tiara_blue'][3])
PROPS={
 'lollipop':('무지개 막대사탕','8d0099/rainbow-swirl-lollipop.png',0.8),
 'sunflower':('해바라기','8d0099/sunflower.png',1.0),
 'rose':('빨간 장미','8d0099/red-rose/red-rose-1.png',1.0),
 'heart':('하트 보석','adb08a/pink-heart-gem/pink-heart-gem-1.png',1.0),
 'ribbon':('분홍 리본','adb08a/pink-ribbon/pink-ribbon-1.png',0.6),
 'bluebow':('파란 보석 리본','adb08a/blue-bow/blue-bow-2.png',0.5),
 'pendant':('하트 펜던트','adb08a/pink-gem-pendant.png',1.0),
}

# 긴 양말을 5px 내려 신발 입구와 겹치게 함(발목 피부 틈 제거)
ITEMS['socks_long']=(ITEMS['socks_long'][0],'socks',20,[(f,x,y+5,sc) for f,x,y,sc in ITEMS['socks_long'][3]])

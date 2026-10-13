exec(open('tools/sticker_fit/manual.py').read())
def F(k,i=0): r=fit[k][i]; return (L+k,r['x'],r['y'],r['scale'])
# id: (name_ko, category, z, [pieces])
ITEMS={
 'top_yellow':('노란 크롭 상의','top',40,[F('yellow-crop-top/yellow-crop-top-2.png')]),
 'skirt_denim':('청치마','bottom',50,[F('denim-skirt/denim-skirt-2.png')]),
 'skirt_denim2':('청치마 2','bottom',50,[F('denim-skirt/denim-skirt-1.png')]),
 'skirt_navy':('남색 주름치마','bottom',50,[F('blue-skirt/blue-skirt-1.png')]),
 'dress_blue':('하늘 프릴 드레스','dress',60,[F('blue-frilly-dress.png')]),
 'dress_pink':('분홍 프릴 드레스','dress',60,[at(L+'pink-frilly-dress/pink-frilly-dress-1.png',152,138,s=1.15)]),
 'onesie_bear':('보라 곰 우주복','dress',65,[at(L+'purple-bear-onesie.png',150,-30,s=1.06)]),
 'socks_long':('긴 양말','socks',20,[F('white-socks/white-socks-2.png'),F('white-socks/white-socks-1.png')]),
 'socks_short':('프릴 양말','socks',20,[F('white-socks/white-socks-10.png'),F('white-socks/white-socks-12.png')]),
 'shoes_red':('빨간 운동화','shoes',30,[F('red-sneakers/red-sneakers-6.png'),F('red-sneakers/red-sneakers-4.png')]),
 'shoes_loafer':('검정 로퍼','shoes',30,[shoe(L+'black-loafers/black-loafers-1.png',94,568,62),shoe(L+'black-loafers/black-loafers-4.png',219,566,62)]),
 'shoes_pink':('분홍 구두','shoes',30,[shoe(L+'pink-shoes/pink-shoes-1.png',94,568,60),shoe(L+'pink-shoes/pink-shoes-2.png',219,566,58)]),
 'hb_blue':('하늘 레이스 머리띠','head',80,[F('blue-headband/blue-headband-2.png',1)]),
 'bow_pink':('분홍 큰 리본','head',82,[at(L+'pink-bow/pink-bow-1.png',150,-14,s=1.0)]),
 'bow_pink_side':('분홍 옆 리본','head',82,[at(L+'pink-bow/pink-bow-3.png',205,40,s=1.0)]),
 'tiara_gold':('하트 티아라','head',84,[at('adb08a/tiara.png',151,-8,s=0.62)]),
 'tiara_blue':('파란 보석 티아라','head',84,[at('8d0099/tiara/tiara-10.png',151,-10,s=0.85)]),
 'hb_rose':('검은 장미 머리띠','head',80,[at('8d0099/black-rose-headband/black-rose-headband-2.png',151,-14,s=1.0)]),
 'hb_lace':('검은 레이스 머리띠','head',80,[at('8d0099/black-lace-headband/black-lace-headband-2.png',151,-14,s=1.0)]),
 'hat_straw':('밀짚모자','head',86,[at('8d0099/straw-hat.png',150,-28,s=1.0)]),
 'headphones':('헤드폰','head',86,[at('8d0099/headphones.png',150,0,s=1.0)]),
 'bow_blue':('파란 리본 핀','head',82,[at('8d0099/blue-bow/blue-bow-1.png',200,30,s=1.0)]),
 'flower_blue':('파란 꽃 핀','head',82,[at('8d0099/blue-flower-hair-accessory/blue-flower-hair-accessory-1.png',205,40,s=1.0)]),
 'choker':('초커 목걸이','neck',45,[at('adb08a/choker-necklace.png',150,140,s=0.55)]),
}

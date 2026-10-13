exec(open('tools/sticker_fit/render.py').read())
def shoe(f,cx,bot,w):
    im=Image.open(S+f); s=w/im.width; return (f,cx-w/2,bot-im.height*s,s)
def at(f,cx,top,w=None,s=None):
    im=Image.open(S+f); s=s or w/im.width; return (f,cx-im.width*s/2,top,s)
L='4e40d8/'
manual={
 'loafers':[shoe(L+'black-loafers/black-loafers-1.png',94,568,60),shoe(L+'black-loafers/black-loafers-4.png',219,566,60)],
 'pinkshoes':[shoe(L+'pink-shoes/pink-shoes-1.png',94,568,58),shoe(L+'pink-shoes/pink-shoes-2.png',219,566,56)],
 'pinkdress':[at(L+'pink-frilly-dress/pink-frilly-dress-1.png',152,148,s=1.0)],
 'bow':[at(L+'pink-bow/pink-bow-1.png',150,-14,s=1.0)],
 'tiara':[at('8d0099/tiara/tiara-1.png',152,4,s=1.0)],
 'onesie':[at(L+'purple-bear-onesie.png',150,-30,s=1.06)],
}

import glob,re
from PIL import Image,ImageDraw
fs=sorted(glob.glob('frames/s*.png'),key=lambda f:float(re.search(r's([\d_]+)\.png',f).group(1).replace('_','.')))
w,h=270,480;cols=6;rows=(len(fs)+cols-1)//cols
im=Image.new('RGB',(cols*w,rows*h))
d=ImageDraw.Draw(im)
for i,f in enumerate(fs):
    t=Image.open(f).convert('RGB').resize((w,h));im.paste(t,((i%cols)*w,(i//cols)*h));d.text(((i%cols)*w+4,(i//cols)*h+4),f[8:-4],fill=(255,255,0))
im.save('stills.jpg',quality=85)

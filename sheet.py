import json,sys
from PIL import Image, ImageDraw
A=json.load(open('assets.json'))
per=30; cols=6; w=200; h=200
for s in range(0,len(A),per):
    ch=A[s:s+per]; rows=(len(ch)+cols-1)//cols
    im=Image.new('RGB',(cols*w,rows*h),(20,20,20)); d=ImageDraw.Draw(im)
    for i,k in enumerate(ch):
        try:
            t=Image.open('th/'+k['file'].rsplit('.',1)[0]+'.jpg'); t.thumbnail((w-4,h-4)); im.paste(t,((i%cols)*w+2,(i//cols)*h+2))
        except Exception as e: pass
        d.rectangle([(i%cols)*w,(i//cols)*h,(i%cols)*w+62,(i//cols)*h+14],fill=(0,0,0)); d.text(((i%cols)*w+2,(i//cols)*h+2),str(s+i),fill=(255,255,0))
    im.save(f'sheet_{s//per}.jpg',quality=80)
print(len(A))

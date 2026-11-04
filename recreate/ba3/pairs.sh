#!/usr/bin/env bash
# Reference | ours pairs for a list of times: shoots the live page (tools/shoot.mjs), cuts the same times from the
# reference after panel, and tiles them in rows of pairs (each 270x480, labelled).
# usage: recreate/ba3/pairs.sh <name> <t1,t2,...>   → data/grabs/ba3/<name>.png
name=$1; times=$2; d=data/grabs/ba3; tmp=$d/_shots
node tools/shoot.mjs "url=http://127.0.0.1:4700/recreate/ba3/index.html?mute=1" out=$d/_tmp.jpg times=$times w=270 tmp=$tmp >/dev/null
python - "$d" "$times" "$name" <<'PY'
import sys,subprocess,io
from PIL import Image,ImageDraw
d,times,name=sys.argv[1],sys.argv[2].split(','),sys.argv[3]
cols=4; W,H=270,480; rows=(len(times)+cols-1)//cols
im=Image.new('RGB',(cols*2*W+(cols-1)*10,rows*H),(20,18,16))
for i,t in enumerate(times):
    raw=subprocess.run(['ffmpeg','-v','error','-ss',t,'-i',f'{d}/ref/after1080.mp4','-frames:v','1','-f','image2pipe','-vcodec','png','-'],capture_output=True).stdout
    r=Image.open(io.BytesIO(raw)).convert('RGB').resize((W,H)); o=Image.open(f'{d}/_shots/s{i:03d}.png').convert('RGB').resize((W,H))
    x=(i%cols)*(2*W+10); y=(i//cols)*H
    im.paste(r,(x,y)); im.paste(o,(x+W,y))
    g=ImageDraw.Draw(im); g.rectangle((x,y,x+70,y+18),fill=(0,0,0)); g.text((x+3,y+3),'ref '+t,fill=(255,220,0)); g.rectangle((x+W,y,x+W+70,y+18),fill=(0,0,0)); g.text((x+W+3,y+3),'ours '+t,fill=(0,220,255))
im.save(f'{d}/{name}.png'); print(f'{d}/{name}.png')
PY

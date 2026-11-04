#!/usr/bin/env python3
# Before / After layout for Creator Mix (like the first reference reel): the raw cut (grey, smaller, behind) beside the finished edit,
# chips "Before" / "After" above, and a visible "Edited by Meta" line below. Pure PIL + ffmpeg, no AI.
# usage: ba-wrap.py <after.mp4> <before.mp4> <out.mp4> [--accent #e5333d] [--title "EDITED BY"] [--sub "..."]
import sys, subprocess, json, os, tempfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter
a = sys.argv[1:]
after, before, out = a[0], a[1], a[2]
opt = lambda k, d: a[a.index(k) + 1] if k in a else d
accent = opt('--accent', '#e5333d'); sub = opt('--sub', 'Auto-edited with Meta Muse Spark  |  Creator Mix')
W, H = 1080, 1920
BG = (244, 243, 239)
bw, bh, bx, by = 470, 836, 64, 380
aw, ah, ax, ay = 648, 1152, 380, 250
def font(size):
    for p in ['/home/user/.local/share/fonts/Inter.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(p):
            f = ImageFont.truetype(p, size)
            try: f.set_variation_by_name('Black')
            except Exception: pass
            return f
    return ImageFont.load_default()
def rr(w, h, r):
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255); return m
tmp = tempfile.mkdtemp(prefix='ba_', dir='/dev/shm' if os.path.isdir('/dev/shm') else None)
bg = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(bg)
# soft shadow for the before card
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((bx + 6, by + 22, bx + bw + 6, by + bh + 22), 36, fill=(0, 0, 0, 70)); sh = sh.filter(ImageFilter.GaussianBlur(22)); bg.paste(sh, (0, 0), sh)
def chip(x, y, text, fill, fg):
    f = font(40); w = int(d.textlength(text, font=f)) + 56
    d.rounded_rectangle((x, y, x + w, y + 70), 35, fill=fill); d.text((x + 28, y + 35), text, font=f, fill=fg, anchor='lm')
chip(bx + 6, by - 100, 'Before', (255, 255, 255), (20, 20, 20)); chip(ax + 6, ay - 100, 'After', accent, (255, 255, 255))
# the "Edited by Meta" line (always visible), Meta in its blue
f1 = font(104); t1, t2 = 'EDITED BY ', 'META'; w1 = d.textlength(t1, font=f1); w2 = d.textlength(t2, font=f1); x0 = (W - w1 - w2) / 2
d.text((x0, 1560), t1, font=f1, fill=(18, 18, 18), anchor='lm'); d.text((x0 + w1, 1560), t2, font=f1, fill=(8, 102, 255), anchor='lm')
d.text((W / 2, 1664), sub, font=font(38), fill=(110, 110, 110), anchor='mm')
bgp = os.path.join(tmp, 'bg.png'); bg.save(bgp)
mb = os.path.join(tmp, 'mb.png'); rr(bw, bh, 34).save(mb)
ma = os.path.join(tmp, 'ma.png'); rr(aw, ah, 40).save(ma)
sa = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sa).rounded_rectangle((ax + 8, ay + 26, ax + aw + 8, ay + ah + 26), 44, fill=(0, 0, 0, 95)); sa = sa.filter(ImageFilter.GaussianBlur(26)); sap = os.path.join(tmp, 'sa.png'); sa.save(sap)
fc = (f"[1:v]scale={bw}:{bh},hue=s=0,eq=contrast=0.95:brightness=0.03,format=yuva420p[b0];[3:v]format=gray[mb];[b0][mb]alphamerge[b];"
      f"[2:v]scale={aw}:{ah},format=yuva420p[a0];[4:v]format=gray[ma];[a0][ma]alphamerge[a];"
      f"[0:v][b]overlay={bx}:{by}[o1];[o1][5:v]overlay=0:0[o2];[o2][a]overlay={ax}:{ay}:shortest=1,format=yuv420p[v]")
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', after], capture_output=True, text=True).stdout)
cmd = ['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-framerate', '30', '-i', bgp, '-i', before, '-i', after, '-loop', '1', '-i', mb, '-loop', '1', '-i', ma, '-loop', '1', '-i', sap,
       '-filter_complex', fc, '-map', '[v]', '-map', '2:a?', '-t', f'{dur:.3f}', '-c:v', 'libx264', '-crf', '21', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', out]
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode: print(r.stderr[-1500:]); sys.exit(1)
print(json.dumps({'out': out, 'duration': dur}))

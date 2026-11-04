#!/usr/bin/env python3
"""Coverage sheet: one labeled frame per Card Studio edit type (all 9), taken from a finished MP4 at the time
spec.card.json says that type is on screen. usage: python3 tools/coverage_sheet.py data/clips/<clip> out.mp4 sheet.jpg"""
import json, subprocess, sys, os, tempfile
from PIL import Image, ImageDraw, ImageFont
clip, mp4, out = sys.argv[1:4]
spec = json.load(open(os.path.join(clip, 'spec.card.json')))
NAMES = [('face', '1 face card + jump zoom'), ('graphic', '2 graphic card, wash + wipe'), ('orbit', '3 zoom-out, orbiting icons'),
         ('topsquare', '4 face-top square, pale base'), ('split', '5 split, picture changes'), ('list', '6 bullet list'),
         ('post', '7 app/post card, cursor tap'), ('wide', '8 wide card, big serif words'), ('textbehind', '9 text behind the person')]
font = ImageFont.load_default()
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 19)
except Exception: pass
W, H = 360, 640
sheet = Image.new('RGB', (W * 3, (H + 70) * 3), 'white'); d = ImageDraw.Draw(sheet)
for n, (t, label) in enumerate(NAMES):
    segs = [g for g in spec['segments'] if g['type'] == t]
    if t == 'face': segs = [g for g in segs if g['t0'] > 0.5] or segs
    x, y = (n % 3) * W, (n // 3) * (H + 70)
    if not segs:
        d.text((x + 10, y + 10), label + ' MISSING', fill='red', font=font); continue
    g = segs[0]; ts = round(g['t0'] + (g['t1'] - g['t0']) * 0.6, 2)
    with tempfile.NamedTemporaryFile(suffix='.png') as f:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ts), '-i', mp4, '-frames:v', '1', f.name], check=True)
        im = Image.open(f.name).convert('RGB').resize((W, H))
    sheet.paste(im, (x, y + 70))
    d.text((x + 8, y + 6), label, fill='black', font=font)
    d.text((x + 8, y + 36), f"t = {ts:.2f}s  ({g['t0']:.1f}-{g['t1']:.1f})", fill=(90, 90, 90), font=font)
sheet.save(out, quality=88)
print('types on screen:', {t: [(round(g['t0'], 2), round(g['t1'], 2)) for g in spec['segments'] if g['type'] == t] for t, _ in NAMES})

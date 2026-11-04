# Storyboard sketches for ba5: pencil line art of a shot's key frame, the way the reference's "Storyboard" card draws
# each shot (contour lines, 45° hatching on the darks, cream paper, a hand-drawn "Text" box where the caption sits).
# Drawn in code from our own A-roll at the shot's camera (same numbers as player.js cam()). Output: 588x1046 PNG
# (2x the reference's 294x523 card). usage: python -I recreate/ba5/sketch.py
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

import os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace(os.sep, '/')
CLIP = ROOT + '/data/clips/ba5c/aroll.mp4'
OUT = ROOT + '/data/clips/ba5c/sb/'
W, H = 588, 1046
KALAM = ROOT + '/assets/fonts/Kalam-Regular.ttf'
POP = ROOT + '/assets/fonts/Poppins-Bold.ttf'

def frame(t):
    cap = cv2.VideoCapture(CLIP); cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000); ok, f = cap.read(); return f

import json
FACE = json.load(open(ROOT + '/data/clips/ba5c/face.json'))
# reference camera (REF.md): (t, face width, centre x, centre y) on the inner 1080x1920 frame
REFCAM = [(0, 742, 533, 659), (.067, 684, 538, 680), (.133, 650, 539, 683), (.2, 630, 537, 689), (.267, 616, 540, 698),
          (.333, 604, 544, 700), (.467, 592, 550, 714), (.6, 576, 556, 722), (.8, 552, 558, 730), (1.07, 540, 554, 722),
          (1.33, 532, 554, 726), (1.53, 520, 557, 719), (1.8, 530, 553, 731), (2.0, 532, 554, 730), (2.13, 532, 560, 744)]
def interp(rows, t, i): return float(np.interp(t, [r[0] for r in rows], [r[i] for r in rows]))
def cam(t):
    # same as player.js cam(): zoom follows the reference's face width (x1.2: our raw is framed tighter), the face is held on
    # the reference's face position (minus 145 px: our raw has no headroom), then clamped so the video always covers
    if t < 3.8: k = 1.2 * interp(REFCAM, t, 1) / 525; fx, fy = interp(REFCAM, t, 2), interp(REFCAM, t, 3) - 145
    else: k, fx, fy = 1.15, 600, 670 - 145
    i = min(len(FACE['x']) - 1, int(round(t / FACE['dt'])))
    tx, ty = fx - FACE['x'][i] * k, fy - FACE['y'][i] * k
    return k, min(0, max(1080 - 1080 * k, tx)), min(0, max(1920 - 1920 * k, ty))

def place(f, k, tx, ty):
    # the inner 1080x1920 edit frame: video scaled k about the origin, then translated
    M = np.float32([[k, 0, tx], [0, k, ty]])
    return cv2.warpAffine(f, M, (1080, 1920), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)

def paper():
    y = np.linspace(0, 1, H)[:, None, None]
    top, bot = np.array([234, 241, 246]), np.array([223, 229, 232])   # BGR of (246,241,234) → (232,229,223)
    return np.broadcast_to(top * (1 - y) + bot * y, (H, W, 3)).astype(np.float32)

def lineart(img):
    g = cv2.cvtColor(cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32)
    g = cv2.bilateralFilter(g, 7, 30, 5)
    # XDoG contours
    a, b = cv2.GaussianBlur(g, (0, 0), 1.1), cv2.GaussianBlur(g, (0, 0), 1.1 * 1.6)
    d = a - 0.985 * b
    lines = np.clip(1 - np.maximum(0, -d - 0.45) / 1.6, 0, 1)          # 1 paper, 0 ink
    # 45° hatching on the darks (hair, shadows), a second pass crossing on the darkest
    yy, xx = np.mgrid[0:H, 0:W]
    h1 = ((xx + yy) % 9 < 1.1) & (g < 48)
    h2 = ((xx - yy) % 9 < 1.1) & (g < 26)
    ink = np.minimum(lines, 1 - 0.6 * h1)
    ink = np.minimum(ink, 1 - 0.65 * h2)
    return ink

def compose(ink, box=None, label='Text'):
    p = paper() * ink[..., None] + np.array([30, 28, 30]) * (1 - ink[..., None])
    im = Image.fromarray(cv2.cvtColor(p.astype(np.uint8), cv2.COLOR_BGR2RGB))
    if box:
        d = ImageDraw.Draw(im); x0, y0, x1, y1 = box
        d.rectangle(box, fill=(250, 248, 244), outline=(25, 25, 28), width=2)
        f = ImageFont.truetype(KALAM, int((y1 - y0) * .62))
        tw = d.textlength(label, font=f); d.text(((x0 + x1 - tw) / 2, y0 + (y1 - y0) * .12), label, font=f, fill=(25, 25, 28))
    return im

def shot(name, t, box):
    f = place(frame(t), *cam(t))
    compose(lineart(f), box).save(OUT + name + '.png')

def card_sketch(name, title):
    # the title card drawn as a sketch: outlined title, scribbled phone with hatching, squiggle lines for the small text
    im = Image.new('RGB', (W, H)); ink = np.ones((H, W), np.float32)
    im = compose(ink)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(POP, 64)
    y = 95
    for line in title:
        d.text((40, y), line, font=f, fill=None, stroke_width=2, stroke_fill=(185, 182, 178)); y += 62
    # squiggles (small text block, right)
    for i, w in enumerate([46, 34, 30, 120, 118]):
        x1 = 560; yy = 300 + i * 12
        d.line([(x1 - w, yy), (x1, yy)], fill=(120, 118, 115), width=2)
    # phone: tilted rounded rectangle with a doubled, wobbly pencil outline and hatching inside
    cx, cy, pw, ph, a = 250, 760, 260, 560, np.radians(-16)
    R = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
    def poly(pw, ph, r, jit):
        pts = []
        for qx, qy, s0 in [(1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)]:
            ox, oy = qx * (pw / 2 - r), qy * (ph / 2 - r)
            for s in range(0, 91, 10):
                ang = np.radians(s0 + s); pts.append((ox + r * np.cos(ang), oy + r * np.sin(ang)))
        rng = np.random.default_rng(jit)
        return [tuple((R @ np.array(p)) + [cx, cy] + rng.normal(0, 1.4, 2)) for p in pts]
    for j in range(2):
        pl = poly(pw, ph, 46, j); d.line(pl + [pl[0]], fill=(30, 30, 32), width=2)
    sc = poly(pw - 34, ph - 34, 36, 7); d.line(sc + [sc[0]], fill=(60, 60, 62), width=1)
    # icon outlines on the screen, 3x3, and hatch
    for r_ in range(3):
        for c_ in range(3):
            ox, oy = -70 + c_ * 70, -150 + r_ * 110
            q = [tuple(R @ np.array(p) + [cx, cy]) for p in [(ox - 24, oy - 24), (ox + 24, oy - 24), (ox + 24, oy + 24), (ox - 24, oy + 24)]]
            d.line(q + [q[0]], fill=(70, 70, 72), width=2)
    arr = np.array(im).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    loc = np.stack([xx - cx, yy - cy], -1) @ R            # into the phone's frame
    inside = (np.abs(loc[..., 0]) < pw / 2 - 20) & (np.abs(loc[..., 1]) < ph / 2 - 20)
    hatch = inside & (((xx + yy) % 9) < 1.3) & ((loc[..., 1] < -220) | (loc[..., 1] > 180))
    arr[hatch] = arr[hatch] * .35 + np.array([40, 40, 42]) * .65
    Image.fromarray(arr.astype(np.uint8)).save(OUT + name + '.png')

if __name__ == '__main__':
    import os; os.makedirs(OUT, exist_ok=True)
    # box: the caption area in sketch px (inner frame × 588/1080)
    s = W / 1080
    shot('s1', 0.9, (int(150 * s), int(1150 * s), int(930 * s), int(1215 * s)))
    card_sketch('s2', ['Christian', 'community.'])
    shot('s3', 4.0, (int(420 * s), int(1150 * s), int(660 * s), int(1192 * s)))
    print('ok')

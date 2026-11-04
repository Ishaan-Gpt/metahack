#!/usr/bin/env python3
"""Polyester prep: the user's photos -> the 11 cut-out slots the renderer reads. No API calls: cut-outs run locally (U2-Net human
segmentation through engine/person_matte.py, two passes: whole photo, then the subject's box for finer edges).
usage: python3 tools/polyester/prep.py <poly dir>
the poly dir holds poly.json  { "people": [ {"name": "VIGNESH", "photos": ["a.jpg", ...]}, {"name": "ISHAAN", "photos": [...]} ], "videos": ["clip.mp4"] }
and writes work/photos/pNN.jpg, work/assets_final/pNN.png + pNN_plate.jpg (+ p03L / p03R), work/vidframes/*.jpg
Slots (from the reference's shot list): person A fills p03R p05 p06 p07 p08 p09, person B fills p01 p02 p03L p04 p10; with one
person only, B's slots reuse A's photos."""
import json, os, sys, glob, subprocess
import cv2, numpy as np
from PIL import Image, ImageOps
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..', 'engine'))
from person_matte import Onnx
D = os.path.abspath(sys.argv[1]); os.chdir(D)
cfg = json.load(open('poly.json'))
for d in ('work/photos', 'work/assets_final', 'work/vidframes'): os.makedirs(d, exist_ok=True)
SEG = Onnx('u2net_human_seg')
A_SLOTS = ['p05', 'p06', 'p07', 'p08', 'p09']; B_SLOTS = ['p01', 'p02', 'p04', 'p10']
def say(s): print(s, flush=True)

def load(path):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB'); im.thumbnail((1600, 1600)); return np.array(im)
def alpha(rgb):
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR); a = SEG(bgr); h, w = a.shape
    ys, xs = np.where(a > 0.5)
    if len(ys):
        pad = int(0.06 * max(w, h)); x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + pad); y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + pad)
        a2 = SEG(bgr[y0:y1, x0:x1]); full = a.copy(); full[y0:y1, x0:x1] = a2; a = a * 0.35 + full * 0.65
    return (np.clip(a, 0, 1) * 255).astype(np.uint8)
def biggest(a, k=1):
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 40).astype(np.uint8))
    if n <= 1: return a
    order = np.argsort(-st[1:, cv2.CC_STAT_AREA])[:k] + 1
    return (a * cv2.dilate(np.isin(lab, order).astype(np.uint8), np.ones((7, 7), np.uint8))).astype(np.uint8)
def smooth(a):
    a = cv2.morphologyEx(a, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    f = cv2.GaussianBlur(a.astype(np.float32) / 255, (0, 0), 1.4)
    return (np.clip((f - 0.5) * 1.8 + 0.5, 0, 1) * 255).astype(np.uint8)
def plate(rgb, a):   # the photo's background with the person painted out (low-res inpaint), for shots that keep the real background
    h, w = a.shape; s = 4
    m = cv2.dilate((a > 20).astype(np.uint8) * 255, np.ones((41, 41), np.uint8))
    small = cv2.resize(rgb, (max(8, w // s), max(8, h // s)), interpolation=cv2.INTER_AREA); ms = cv2.resize(m, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    inp = cv2.GaussianBlur(cv2.inpaint(small, ms, 12, cv2.INPAINT_TELEA), (0, 0), 6); big = cv2.resize(inp, (w, h), interpolation=cv2.INTER_CUBIC)
    mf = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 8)[..., None]
    return (rgb * (1 - mf) + big * mf).astype(np.uint8)
def save(name, rgb, a):
    Image.fromarray(rgb).save(f'work/photos/{name}.jpg', quality=95)
    Image.fromarray(plate(rgb, a)).save(f'work/assets_final/{name}_plate.jpg', quality=95)
    Image.fromarray(np.dstack([rgb, a])).save(f'work/assets_final/{name}.png')

people = [p for p in cfg['people'] if p.get('photos')]
if not people: raise SystemExit('no photos')
A = people[0]; B = people[1] if len(people) > 1 else people[0]
cuts = {}   # path -> (rgb, alpha)
def cut(path):
    if path not in cuts:
        rgb = load(os.path.join(D, path)); cuts[path] = (rgb, smooth(biggest(alpha(rgb)))); say(f'cut {os.path.basename(path)}')
    return cuts[path]
for who, slots in ((A, A_SLOTS), (B, B_SLOTS)):
    for i, s in enumerate(slots):
        rgb, a = cut(who['photos'][i % len(who['photos'])]); save(s, rgb, a)
# p03: the pair shot (B on the left of a split, A on the right). Built from the two cut-outs on a soft background of A's photo.
ra, aa = cut(A['photos'][0]); rb, ab = cut(B['photos'][0])
CW, CH = 1280, 960
bg = cv2.GaussianBlur(cv2.resize(ra, (CW, int(ra.shape[0] * CW / ra.shape[1]))), (0, 0), 14)
bg = bg[max(0, (bg.shape[0] - CH) // 2):][:CH]
if bg.shape[0] < CH: bg = cv2.resize(bg, (CW, CH))
canvas = bg.copy(); union = np.zeros((CH, CW), np.uint8); L = np.zeros((CH, CW), np.uint8); R = np.zeros((CH, CW), np.uint8)
def paste(rgb, a, cx, side):
    ys, xs = np.where(a > 128)
    if not len(ys): return
    crop = (rgb[ys.min():ys.max() + 1, xs.min():xs.max() + 1], a[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    s = min(0.78 * CH / crop[0].shape[0], 0.52 * CW / crop[0].shape[1]); w, h = int(crop[0].shape[1] * s), int(crop[0].shape[0] * s)
    im = cv2.resize(crop[0], (w, h), interpolation=cv2.INTER_AREA); al = cv2.resize(crop[1], (w, h), interpolation=cv2.INTER_AREA)
    x0 = int(cx - w / 2); y0 = CH - h; x0 = max(0, min(CW - w, x0))
    sl = (slice(y0, y0 + h), slice(x0, x0 + w)); f = (al.astype(np.float32) / 255)[..., None]
    canvas[sl] = (canvas[sl] * (1 - f) + im * f).astype(np.uint8)
    for t in (union, side): t[sl] = np.maximum(t[sl], al)
paste(rb, ab, 330, L); paste(ra, aa, 940, R)
Image.fromarray(canvas).save('work/photos/p03.jpg', quality=95); Image.fromarray(plate(canvas, union)).save('work/assets_final/p03_plate.jpg', quality=95)
Image.fromarray(np.dstack([canvas, L])).save('work/assets_final/p03L.png'); Image.fromarray(np.dstack([canvas, R])).save('work/assets_final/p03R.png')
# background montage material: every 3rd frame of the user's videos (the renderer also uses all photos)
k = 0
for v in cfg.get('videos', []):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(D, v), '-vf', "select=not(mod(n\\,3)),scale=1280:-2", '-vsync', 'vfr', '-q:v', '3', '-frames:v', '80', f'work/vidframes/v{k:02d}_%03d.jpg']); k += 1
if not glob.glob('work/vidframes/*.jpg'):   # no video: the photos themselves stand in so the renderer always has a pool
    for i, f in enumerate(sorted(glob.glob('work/photos/p*.jpg'))): cv2.imwrite(f'work/vidframes/s{i:02d}.jpg', cv2.imread(f))
# face size per slot (YuNet, local): the renderer scales each photo so faces land at a similar size, so close-up selfies are not blown up
YUNET = os.path.join(HERE, '..', '..', 'assets', 'vision', 'face_detection_yunet_2023mar.onnx')
meta = {}
def face_frac(path, side=None):
    im = cv2.imread(path); h, w = im.shape[:2]
    try:
        det = cv2.FaceDetectorYN.create(YUNET, '', (w, h), 0.6, 0.3, 50); _, fs = det.detect(im)
    except Exception: fs = None
    if fs is None or not len(fs): return None
    if side == 'L': fs = [f for f in fs if f[0] + f[2] / 2 < w * 0.527] or list(fs)
    if side == 'R': fs = [f for f in fs if f[0] + f[2] / 2 >= w * 0.527] or list(fs)
    f = max(fs, key=lambda f: f[2] * f[3]); return round(float(f[2]) / w, 4)
for s in ['p01', 'p02', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09', 'p10']: meta[s] = face_frac(f'work/photos/{s}.jpg')
meta['p03L'] = face_frac('work/photos/p03.jpg', 'L'); meta['p03R'] = face_frac('work/photos/p03.jpg', 'R'); meta['p03'] = meta['p03R']
json.dump(meta, open('work/assets_final/faces.json', 'w')); say('faces ' + json.dumps(meta))
say('prep done')

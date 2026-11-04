"""Polyester template: a frame-accurate rebuild of the look and timing of the 'Polyester Spiderman Edit (Original by foryouamv)'
(YouTube youtu.be/zswT92VzOYM, uploaded by BlackRob183; credit to @foryouamv on TikTok), filled with the user's own photos. Only the recipe is used:
no footage, audio, watermark or character from the original is in this code or its output.
The two person slots are called VIGNESH (person A) and ISHAAN (person B) inside the code, the names on screen come from POLY_NAMES.

Usage:
  python -I tools/render.py sheets [first last]   -> numbered contact sheets in work/review/
  python -I tools/render.py frame N               -> single full-size frame work/review/fNNN.png
  python -I tools/render.py video                 -> out/polyester_vignesh_ishaan.mp4 (+ _silent)

Frame numbers follow reference/breakdown.md (30 fps, 579 frames).
"""
import cv2, numpy as np, os, sys, math, glob, subprocess
from PIL import Image, ImageDraw, ImageFont

os.chdir(os.environ['POLY_DIR'])   # the job's polyester work folder: work/photos, work/assets_final, work/vidframes
W, H, FPS, N = 1280, 720, 30, 579
CUTDIR = os.environ.get('CUTDIR', 'work/assets_final')


def _impact():
    f = ImageFont.truetype('/home/user/.local/share/fonts/Oswald.ttf', 400)
    try: f.set_variation_by_name('Bold')
    except Exception: pass
    return f

# ----------------------------------------------------------------- loading
def rgba(n):
    return np.array(Image.open(f'{CUTDIR}/{n}.png').convert('RGBA'))
def rgb(p):
    return np.array(Image.open(p).convert('RGB'))

CUT_NAMES = ['p01', 'p02', 'p03L', 'p03R', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09', 'p10']
PH_NAMES = ['p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09', 'p10']
A = {n: rgba(n) for n in CUT_NAMES}
PLATE = {n: rgb(f'{CUTDIR}/{n}_plate.jpg') for n in PH_NAMES}
PHOTO = {n: rgb(f'work/photos/{n}.jpg') for n in PH_NAMES}
PLATE_OF = {n: n[:3] for n in CUT_NAMES}
VID = [rgb(f) for f in sorted(glob.glob('work/vidframes/*.jpg'))]

def head_meta(a):
    m = a[..., 3] > 128
    ys, xs = np.where(m)
    y0 = ys.min()
    band = m[y0:y0 + max(8, int(0.06 * m.shape[0]))]
    return float(np.where(band.any(0))[0].mean()), float(y0)
META = {n: head_meta(A[n]) for n in CUT_NAMES}

# ----------------------------------------------------------------- helpers
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
def f32(x): return x.astype(np.float32) / 255.0
def lerp(a, b, t): return a + (b - a) * min(1.0, max(0.0, t))
def ease(t): t = min(1, max(0, t)); return t * t * (3 - 2 * t)
def cover(shape): return max(W / shape[1], H / shape[0])

def warp(img, M, border=cv2.BORDER_REFLECT_101):
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=border)

try: import json as _j; FACES = _j.load(open(f'{CUTDIR}/faces.json'))
except Exception: FACES = {}
FACE_REF = float(os.environ.get('POLY_FACE_REF', 0.17))   # face width as a fraction of the photo that the shot list's zooms were tuned for
def zfix(n):
    ff = FACES.get(n) or FACES.get(n[:3])
    return 1.0 if not ff else float(np.clip(FACE_REF / ff, 0.45, 1.25))   # big selfie faces are pulled back, small full-body ones nudged in
def place_M(n, X, Y, z, clamp):
    h, w = A[n].shape[:2]
    s = cover((h, w)) * z * zfix(n)
    hx, hy = META[n]
    tx, ty = X * W - s * hx, Y * H - s * hy
    if clamp:
        tx = min(0, max(W - s * w, tx)); ty = min(0, max(H - s * h, ty))
    return np.float32([[s, 0, tx], [0, s, ty]])

def layer(n, X, Y, z, plate=False):
    """Cut-out n placed with its head top at (X*W, Y*H). Returns (bg or None, fg, alpha)."""
    M = place_M(n, X, Y, z, clamp=plate)
    c = warp(A[n], M, cv2.BORDER_CONSTANT)
    fg, a = f32(c[..., :3]), f32(c[..., 3:4])
    bg = f32(warp(PLATE[PLATE_OF[n]], M)) if plate else None
    return bg, fg, a

def fit(img, z=1.0, cx=0.5, cy=0.5):
    h, w = img.shape[:2]; s = cover((h, w)) * z
    M = np.float32([[s, 0, W / 2 - s * cx * w], [0, s, H / 2 - s * cy * h]])
    return f32(warp(img, M))

_cache = {}
def backdrop(key, img, z, blur, gain, tint):
    k = (key, z, blur, gain, tint)
    if k not in _cache:
        b = fit(img, z)
        if blur: b = cv2.GaussianBlur(b, (0, 0), blur)
        _cache[k] = np.clip(b * np.float32(tint) * gain, 0, 1)
    return _cache[k]

CUR = [0]
RIM = [(0.35, 0.9, 1.0), (1.0, 0.95, 0.95), (1.0, 0.3, 0.4), (0.4, 0.55, 1.0)]
def compose(base, fg, a, shadow=0.45):
    a2 = a[..., 0] if a.ndim == 3 else a
    ed = np.clip(cv2.GaussianBlur(a2, (0, 0), 7) - a2 * 0.55, 0, 1)[..., None]
    base = base + ed * np.float32(RIM[(CUR[0] // 3) % len(RIM)]) * 0.55          # rim light that changes colour every 3 frames
    if shadow:
        sh = cv2.GaussianBlur(a, (0, 0), 14)
        if sh.ndim == 2: sh = sh[..., None]
        base = base * (1 - sh * shadow)
    return base * (1 - a) + fg * a

def white(level=0.985):
    return np.full((H, W, 3), level, np.float32)

def fade_white(img, f, start, n):
    t = (f - start + 1) / float(n)
    if t >= 1: return img
    t = max(0.0, t) ** 0.85
    return img * t + (1 - t)

def invert_glitch(img):
    g = 1 - img
    g = g * 0.5 + 0.5
    out = g.copy()
    out[..., 0] = np.roll(g[..., 0], 18, axis=1)
    out[..., 2] = np.roll(g[..., 2], -18, axis=1)
    out = out * np.float32([0.92, 1.0, 1.04])
    return np.clip(out, 0, 1)

def rgb_split(img, px):
    px = int(px)
    if px == 0: return img
    out = img.copy()
    out[..., 0] = np.roll(img[..., 0], px, axis=1)
    out[..., 2] = np.roll(img[..., 2], -px, axis=1)
    return out

# ----------------------------------------------------------------- grading
GRADES = {
    #        sat   mul                 contrast gain
    'teal':  (0.85, (0.93, 1.00, 1.07), 1.18, 1.00),
    'night': (0.80, (0.86, 0.97, 1.12), 1.25, 0.88),
    'dark':  (0.72, (0.88, 0.95, 1.10), 1.30, 0.74),
    'bright': (0.95, (0.98, 1.00, 1.03), 1.10, 1.04),
    'blue':  (0.55, (0.70, 0.86, 1.28), 1.25, 0.92),
    'warm':  (1.10, (1.16, 0.97, 0.76), 1.22, 1.00),
}
def grade(img, mode='teal'):
    sat, mul, con, gain = GRADES[mode]
    lum = (img @ np.float32([0.299, 0.587, 0.114]))[..., None]
    img = lum + (img - lum) * sat
    img = img * np.float32(mul) * gain
    img = 0.5 + (img - 0.5) * con
    img = (img - 0.03) / 0.97
    lum = np.clip((img @ np.float32([0.299, 0.587, 0.114]))[..., None], 0, 1)
    img = img + (1 - lum) ** 2 * np.float32([-0.025, 0.0, 0.045])
    return np.clip(img, 0, 1)

VIG = (1 - 0.32 * (((XX - W / 2) / (W / 2)) ** 2 + ((YY - H / 2) / (H / 2)) ** 2) / 2)[..., None]

def finish(img, f):
    bl = cv2.GaussianBlur(img, (0, 0), 1.3)
    img = img + 0.55 * (img - bl)                       # sharpen
    hi = np.clip(img - 0.72, 0, 1)
    img = img + 0.22 * cv2.GaussianBlur(hi, (0, 0), 14)  # bloom
    img = img * VIG
    r = np.random.default_rng(10_000 + f)
    img = img + r.normal(0, 0.016, (H, W, 1)).astype(np.float32)  # grain
    return np.clip(img, 0, 1)

# ----------------------------------------------------------------- montage pool
def radial_blur(img, cx, cy, amt, n=9):
    acc = np.zeros_like(img)
    for i in range(n):
        s = 1 + amt * i / (n - 1)
        M = np.float32([[s, 0, cx * (1 - s)], [0, s, cy * (1 - s)]])
        acc += cv2.warpAffine(img, M, (img.shape[1], img.shape[0]), borderMode=cv2.BORDER_REFLECT_101)
    return acc / n

def motion_blur(img, L, ang):
    k = np.zeros((L, L), np.float32); k[L // 2, :] = 1
    R = cv2.getRotationMatrix2D((L / 2 - 0.5, L / 2 - 0.5), ang, 1)
    k = cv2.warpAffine(k, R, (L, L)); k /= k.sum()
    return cv2.filter2D(img, -1, k)

def build_pool(count=150, seed=3):
    r = np.random.default_rng(seed)
    PW, PHh = 960, 540
    srcs = [PHOTO[n] for n in PH_NAMES] * 3 + [PLATE[n] for n in PH_NAMES] + VID[::4]
    pool = []
    for i in range(count):
        src = srcs[r.integers(len(srcs))]
        h, w = src.shape[:2]
        z = r.uniform(1.15, 2.4)
        s = max(PW / w, PHh / h) * z
        cx, cy = r.uniform(0.25, 0.75) * w, r.uniform(0.25, 0.75) * h
        ang = r.uniform(-10, 10)
        M = cv2.getRotationMatrix2D((cx, cy), ang, s)
        M[0, 2] += PW / 2 - cx; M[1, 2] += PHh / 2 - cy
        im = f32(cv2.warpAffine(src, M, (PW, PHh), borderMode=cv2.BORDER_REFLECT_101))
        if r.random() < 0.5: im = im[:, ::-1].copy()
        if r.random() < 0.65:
            im = radial_blur(im, r.uniform(0.3, 0.7) * PW, r.uniform(0.3, 0.7) * PHh, r.uniform(0.12, 0.38))
        else:
            im = motion_blur(im, int(r.integers(35, 95)), r.uniform(0, 180))
        lum = (im @ np.float32([0.299, 0.587, 0.114]))[..., None]
        t = r.choice(['teal', 'mono', 'cyan', 'red', 'dark'], p=[0.3, 0.25, 0.2, 0.1, 0.15])
        if t == 'teal': im = (lum + (im - lum) * 0.6) * np.float32([0.8, 0.95, 1.1])
        elif t == 'mono': im = lum * np.float32([0.9, 0.95, 1.05])
        elif t == 'cyan': im = im * np.float32([0.55, 1.0, 1.3]) + np.float32([0, 0.03, 0.08])
        elif t == 'red':
            rm = np.clip((im[..., 0:1] - np.maximum(im[..., 1:2], im[..., 2:3])) * 5, 0, 1)
            im = lum * (1 - rm) + im * rm * np.float32([1.3, 0.5, 0.5])
        else: im = im * 0.5 * np.float32([0.8, 0.9, 1.2])
        im = 0.5 + (im - 0.5) * 1.2
        im = im * r.uniform(0.65, 1.1)
        if r.random() < 0.3:  # speed lines
            sl = np.zeros((PHh, PW), np.float32)
            ox, oy = r.uniform(0.35, 0.65) * PW, r.uniform(0.35, 0.65) * PHh
            for _ in range(70):
                a = r.uniform(0, 2 * math.pi); r0 = r.uniform(0.15, 0.4) * PW
                p0 = (int(ox + math.cos(a) * r0), int(oy + math.sin(a) * r0))
                p1 = (int(ox + math.cos(a) * PW), int(oy + math.sin(a) * PW))
                cv2.line(sl, p0, p1, float(r.uniform(0.3, 1)), int(r.integers(1, 3)), cv2.LINE_AA)
            sl = cv2.GaussianBlur(sl, (0, 0), 1.2)[..., None]
            im = 1 - (1 - np.clip(im, 0, 1)) * (1 - sl * 0.45)
        pool.append((np.clip(im, 0, 1) * 255).astype(np.uint8))
    return pool

POOL = build_pool()
_order = np.random.default_rng(11).permutation(np.tile(np.arange(len(POOL)), 5))
def mont(f, gain=1.0):
    return cv2.resize(f32(POOL[_order[f]]), (W, H), interpolation=cv2.INTER_LINEAR) * gain

# ----------------------------------------------------------------- effects
def bolt(p0, p1, disp, depth, r):
    pts = [np.array(p0, np.float32), np.array(p1, np.float32)]
    for _ in range(depth):
        new = [pts[0]]
        for a, b in zip(pts[:-1], pts[1:]):
            m = (a + b) / 2 + r.normal(0, disp, 2).astype(np.float32)
            new += [m, b]
        pts = new; disp *= 0.55
    return np.array(pts).astype(np.int32)

def lightning(f, origin, n, length, spread, color=(0.55, 0.45, 1.0), seed=0):
    r = np.random.default_rng(f * 7 + seed)
    L = np.zeros((H, W), np.float32)
    for _ in range(n):
        ang = r.uniform(*spread); ln = length * r.uniform(0.6, 1.25)
        p1 = (origin[0] + math.cos(ang) * ln, origin[1] + math.sin(ang) * ln)
        pts = bolt(origin, p1, ln * 0.16, 7, r)
        cv2.polylines(L, [pts], False, 1.0, 2, cv2.LINE_AA)
        for _ in range(3):
            i = int(r.integers(len(pts) // 5, len(pts) - 1)); q = pts[i]
            a2 = ang + r.uniform(-0.9, 0.9); l2 = ln * r.uniform(0.15, 0.4)
            p2 = (q[0] + math.cos(a2) * l2, q[1] + math.sin(a2) * l2)
            cv2.polylines(L, [bolt(q, p2, l2 * 0.2, 5, r)], False, 0.8, 1, cv2.LINE_AA)
    glow = cv2.GaussianBlur(L, (0, 0), 5) * 1.6 + cv2.GaussianBlur(L, (0, 0), 20) * 1.4
    return np.clip(L[..., None] + glow[..., None] * np.float32(color), 0, 1)

def screen(a, b): return 1 - (1 - a) * (1 - np.clip(b, 0, 1))

def para_mask(cx, width, ang_deg):
    t = math.tan(math.radians(ang_deg))
    pts = np.array([[cx - width / 2 - t * H / 2, 0], [cx + width / 2 - t * H / 2, 0],
                    [cx + width / 2 + t * H / 2, H], [cx - width / 2 + t * H / 2, H]], np.int32)
    m = np.zeros((H, W), np.float32); cv2.fillPoly(m, [pts], 1.0, cv2.LINE_AA)
    return m[..., None]

def white_poly(img, pts):
    m = np.zeros((H, W), np.float32); cv2.fillPoly(m, [np.array(pts, np.int32)], 1.0, cv2.LINE_AA)
    return img * (1 - m[..., None]) + m[..., None]

def white_rows(img, y0, y1):
    img = img.copy(); img[max(0, int(y0)):max(0, int(y1))] = 0.985; return img

def white_cols(img, x0, x1):
    img = img.copy(); img[:, max(0, int(x0)):max(0, int(x1))] = 0.985; return img

def silhouette(img, a, rect=None):
    m = (a > 0.4).astype(np.float32)
    if rect is not None:
        x0, y0, x1, y1 = rect; r = np.zeros_like(m); r[int(y0):int(y1), int(x0):int(x1)] = 1; m = m * r
    return img * (1 - m) + m * 0.985

def embers(f, n=140, seed=5):
    r = np.random.default_rng(seed)
    E = np.zeros((H, W), np.float32)
    x0 = r.uniform(0, W, n); y0 = r.uniform(0, H, n); sp = r.uniform(6, 22, n); dr = r.uniform(-4, 4, n)
    sz = r.integers(1, 4, n)
    for i in range(n):
        x = (x0[i] + dr[i] * f) % W; y = (y0[i] - sp[i] * f) % H
        cv2.line(E, (int(x), int(y)), (int(x - dr[i] * 0.8), int(y + sp[i] * 0.8)), 1.0, int(sz[i]), cv2.LINE_AA)
    glow = cv2.GaussianBlur(E, (0, 0), 3) * 1.5 + E
    return np.clip(glow[..., None] * np.float32([1.0, 0.55, 0.15]), 0, 1)

FIRE_GLOW = np.clip((1 - np.sqrt(((XX - W * 0.3) / W) ** 2 + ((YY - H * 1.05) / H) ** 2) * 1.4), 0, 1)[..., None] * np.float32([1.0, 0.45, 0.08])

# ---- aura (glowing outline rings behind the subject)
def aura(a, f):
    r = np.random.default_rng(900 + f)
    m = (a[..., 0] > 0.5).astype(np.uint8)
    if m.sum() == 0: return np.zeros((H, W, 3), np.float32)
    dist = cv2.distanceTransform(1 - m, cv2.DIST_L2, 5)
    ys, xs = np.nonzero(m); cy, cx = ys.mean(), xs.mean()
    theta = np.arctan2(YY - cy, XX - cx)
    out = np.zeros((H, W), np.float32)
    for k, rad in enumerate([16, 38, 64]):
        rj = rad * (1 + 0.18 * r.normal())
        w = 3.5 + 1.5 * k
        ring = np.exp(-((dist - rj) / w) ** 2)
        arcs = (np.sin(theta * (5 + 2 * k) + r.uniform(0, 6.28)) > -0.25).astype(np.float32)
        out += ring * arcs * (1 - 0.22 * k)
    pal = [(0.95, 0.97, 1.0), (0.25, 0.85, 1.0), (0.3, 0.55, 1.0), (1.0, 0.25, 0.35), (0.75, 0.8, 0.9)]
    col = np.float32(pal[r.integers(len(pal))])
    glow = cv2.GaussianBlur(out, (0, 0), 6) * 1.3
    return np.clip((out[..., None] * 0.9 + glow[..., None]) * col, 0, 1)

# ---- glitch title text behind the subject
def make_text_mask(txt):
    font = _impact()
    im = Image.new('L', (3000, 700), 0); d = ImageDraw.Draw(im)
    d.text((20, 20), txt, font=font, fill=255)
    bb = im.getbbox(); im = im.crop(bb)
    tw, th = int(W * 0.94), int(H * 0.46)
    im = im.resize((tw, th), Image.LANCZOS)
    m = np.zeros((H, W), np.float32)
    x0, y0 = (W - tw) // 2, int(H * 0.30)
    m[y0:y0 + th, x0:x0 + tw] = np.array(im, np.float32) / 255
    r = np.random.default_rng(len(txt))
    tex = cv2.GaussianBlur(r.random((H, W)).astype(np.float32), (0, 0), 2.2)
    tex = np.clip((tex - 0.44) * 9, 0, 1)                       # gritty distress
    scratch = np.ones((H, W), np.float32)
    for _ in range(40):
        y = int(r.integers(y0, y0 + th)); scratch[y:y + int(r.integers(1, 3))] = 0.15
    return m * (0.35 + 0.65 * tex) * scratch
NAME_A, NAME_B = (os.environ.get('POLY_NAMES', 'VIGNESH|ISHAAN').upper().split('|') + ['', ''])[:2]
TEXT = {'VIGNESH': make_text_mask(NAME_A), 'ISHAAN': make_text_mask(NAME_B or NAME_A)}   # keys are the template's two person slots, A and B

def glitch_text(base, name, f):
    r = np.random.default_rng(300 + f)
    m = TEXT[name].copy()
    for _ in range(int(r.integers(1, 4))):  # slice displacement
        y = int(r.integers(int(H * 0.3), int(H * 0.76))); h = int(r.integers(10, 60))
        m[y:y + h] = np.roll(m[y:y + h], int(r.integers(-40, 40)), axis=1)
    pal = [(0.9, 0.92, 0.96), (0.35, 0.9, 1.0), (1.0, 0.25, 0.3), (0.55, 0.6, 0.7), (0.2, 0.45, 1.0)]
    col = np.float32(pal[r.choice(len(pal), p=[0.4, 0.2, 0.12, 0.18, 0.1])])
    dx = int(r.integers(4, 16))
    out = base.copy()
    out[..., 0] = out[..., 0] * (1 - np.roll(m, dx, 1) * 0.9) + np.roll(m, dx, 1) * col[0] * 0.9
    out[..., 1] = out[..., 1] * (1 - m * 0.9) + m * col[1] * 0.9
    out[..., 2] = out[..., 2] * (1 - np.roll(m, -dx, 1) * 0.9) + np.roll(m, -dx, 1) * col[2] * 0.9
    glow = cv2.GaussianBlur(m, (0, 0), 10)[..., None] * col * 0.35
    return np.clip(out + glow, 0, 1)

# ----------------------------------------------------------------- shots
def s1(f):  # 0-142  Vignesh low-angle close-up, montage band closing to a slit
    bg, fg, a = layer('p08', 0.47, 0.10, 1.16 + 0.10 * f / 142, plate=True)
    if f <= 95: hh = lerp(0.52, 0.13, ease(f / 95)) * H
    elif f <= 127: hh = lerp(0.065, 0.0, (f - 96) / 31) * H
    else: hh = 0
    if hh > 0:
        mm = np.clip((hh - np.abs(YY - 0.44 * H)) / 2.0, 0, 1)[..., None]
        bg = bg * (1 - mm) + mont(f, 0.95) * mm
    img = compose(bg, fg, a)
    if f >= 128:
        _, fg2, a2 = layer('p01', 0.43, 0.06, 1.0, plate=True)
        if f in (129, 134, 139): img = silhouette(img, a2)
        elif f >= 130: k = lerp(0, 0.8, (f - 130) / 12); img = img * (1 - a2 * k) + fg2 * a2 * k
    return grade(img, 'teal')

def s2(f):  # 145-189  Ishaan at night, diagonal montage band
    bg, fg, a = layer('p01', 0.43, 0.06, 1.0 + 0.05 * (f - 145) / 44, plate=True)
    if f >= 147:
        t = (f - 147) / 40
        m = para_mask(lerp(0.36, 0.58, t) * W, lerp(0.06, 0.52, ease(t)) * W, lerp(12, 34, t))
        bg = bg * (1 - m) + mont(f, 0.9) * m
    img = compose(bg, fg, a)
    if f == 187: img = white_cols(img, 0, 0.07 * W)
    if f == 189: img = white_cols(img, 0.02 * W, 0.11 * W)
    return grade(img, 'night')

def s2b(f):  # 190-199  Vignesh face close-up, montage panel + sliding white bar
    bg, fg, a = layer('p06', 0.36, -0.03, 1.30 + 0.015 * (f - 190), plate=True)
    x = lerp(0.64, 0.9, (f - 190) / 9) * W
    bg = bg.copy(); bg[:, int(x):] = mont(f)[:, int(x):]
    img = compose(bg, fg, a)
    img = white_cols(img, x - 0.03 * W, x)
    return grade(img, 'teal')

def s3(f):  # 202-242  Ishaan dark close-up over montage
    _, fg, a = layer('p04', 0.5, 0.05, 0.95 + 0.06 * (f - 202) / 52)
    img = compose(mont(f, 0.8), fg, a, 0.6)
    img[:int(0.075 * H)] *= 0.12
    return grade(img, 'dark')

def s3b(f):  # sitting Vignesh (bottom split / full)
    bgd = backdrop('p09', PLATE['p09'], 1.1, 8, 0.55, (0.75, 0.85, 1.1))
    _, fg, a = layer('p09', 0.53, 0.05, 0.43 + 0.01 * (f - 243) / 14)
    return grade(compose(bgd, fg, a), 'night')

def s4(f):  # 260-314  Ishaan with tunnel, then Vignesh appears
    bgd = backdrop('p10', PLATE['p10'], 1.2, 10, 0.35, (0.6, 0.75, 1.2))
    _, fg, a = layer('p10', 0.5, 0.04, 0.55 + 0.05 * (f - 260) / 54)
    if f <= 281:
        rad = lerp(0.22 * H, 0.8 * W, ease((f - 260) / 21))
        d = np.sqrt((XX - W / 2) ** 2 + (YY - 0.45 * H) ** 2)
        c = np.clip((rad - d) / 6, 0, 1)[..., None]
        base = bgd * (1 - c) + mont(f) * c
        base = screen(base, np.exp(-((d - rad) / 5) ** 2)[..., None] * np.float32([0.6, 0.85, 1.0]))
    else:
        base = mont(f)
    if f >= 302:
        _, fg2, a2 = layer('p05', 0.30, 0.10, 0.85)
        if f >= 307: base = compose(base, fg2, a2)
    img = compose(base, fg, a)
    if f >= 302 and f in (304, 306, 308, 310, 312):
        r = np.random.default_rng(f)
        x0 = r.uniform(0.1, 0.4) * W; y0 = r.uniform(0.3, 0.7) * H
        img = silhouette(img, a2, (x0, y0, x0 + r.uniform(0.15, 0.3) * W, y0 + r.uniform(0.1, 0.25) * H))
    return grade(img, 'teal')

def s5(f):  # 317-325  Vignesh by the sea (fade from white)
    bg, fg, a = layer('p05', 0.30, 0.07, 1.0 + 0.04 * (f - 317) / 8, plate=True)
    return fade_white(grade(compose(bg, fg, a, 0.25), 'bright'), f, 317, 5)

def s6(f):  # 327-335  Ishaan upside-down + lightning
    bg, fg, a = layer('p02', 0.5, 0.18, 1.12 + 0.03 * (f - 327) / 8, plate=True)
    img = compose(bg, fg, a)[::-1].copy()
    img = grade(img, 'teal')
    img = screen(img, lightning(f, (0, H * 0.88), 3, W * 1.1, (-0.25, 0.1)))
    return fade_white(img, f, 327, 6)

def s7_top(f):
    bg, fg, a = layer('p07', 0.42, 0.08, 1.25 + 0.05 * (f - 337) / 26, plate=True)
    return grade(compose(bg, fg, a)[::-1].copy(), 'teal')

def s7(f):  # 337-363  upside-down Vignesh, Ishaan's face rising from below
    top = s7_top(f)
    if f <= 343: return fade_white(top, f, 337, 7)
    ys = lerp(0.72 * H, 0.0, (f - 344) / 17)
    bg, fg, a = layer('p01', 0.43, 0.0 - 0.10 * (1 - (f - 344) / 19), 1.55, plate=True)
    bot = grade(compose(bg, fg, a), 'night')
    img = top.copy(); img[int(ys):] = bot[int(ys):]
    if f in (345, 350, 355, 360): img = white_rows(img, ys - 0.035 * H, ys + 0.035 * H)
    return img

def s8(f):  # 366-370  Vignesh close-up in front of the office tower
    bg, fg, a = layer('p03R', 0.55, 0.02, 1.7 + 0.04 * (f - 366) / 4, plate=True)
    img = grade(compose(bg, fg, a), 'teal')
    if f == 370:
        _, _, a2 = layer('p02', 0.42, 0.04, 1.45)
        img = silhouette(img, a2)
    return img

def s9_core(f):
    _, fg, a = layer('p02', 0.42, 0.04, 1.45 + 0.06 * (f - 371) / 46)
    return grade(compose(mont(f, 0.9), fg, a, 0.55), 'teal')

SHARDS = None
def shards():
    global SHARDS
    if SHARDS is None:
        r = np.random.default_rng(42); tris = []
        for i in range(16):
            cx, cy = r.uniform(0, W), r.uniform(0, H); s = r.uniform(0.35, 0.7) * W
            a0 = r.uniform(0, 2 * math.pi)
            tris.append([(cx + math.cos(a0 + k * 2.1 + r.uniform(-.3, .3)) * s, cy + math.sin(a0 + k * 2.1) * s * 0.6) for k in range(3)])
        SHARDS = tris
    return SHARDS

def wide(f):
    return grade(fit(PHOTO['p03'], 1.0 + 0.05 * (f - 418) / 10, 0.55, 0.55), 'teal')

def s9(f):  # 371-428  Ishaan over montage, shard wipe to the two of you
    if f <= 416:
        img = s9_core(f)
        if f == 375: img = rgb_split(img, 22)
        return img
    if f == 417:
        return white_poly(s9_core(f), [(0, 0), (0.18 * W, 0), (W, 0.85 * H), (W, H), (0.85 * W, H), (0, 0.15 * H)])
    if f >= 428: return wide(f)
    if f == 427: return white_rows(wide(f), 0.74 * H, 0.84 * H)
    p = (f - 418) / 8.0
    m = np.zeros((H, W), np.float32)
    for i, t in enumerate(shards()):
        if i / 16 <= p: cv2.fillPoly(m, [np.array(t, np.int32)], 1.0, cv2.LINE_AA)
    m = m[..., None]
    img = s9_core(f) * (1 - m) + wide(f) * m
    if f == 419: img = white_poly(img, [(0.55 * W, H), (0.7 * W, H), (W, 0), (0.85 * W, 0)])
    if f == 423: img = white_poly(img, [(0.62 * W, H), (0.72 * W, H), (0.98 * W, 0), (0.88 * W, 0)])
    if f == 425: img = white_poly(img, [(0.25 * W, 0), (0.33 * W, 0), (0.62 * W, H), (0.54 * W, H)])
    return img

def s10_title(f):
    if f < 455: name, n, z = 'VIGNESH', 'p06', 0.95
    else: name, n, z = 'ISHAAN', 'p04', 0.92
    bgd = backdrop(n + 't', PLATE[n], 1.3, 18, 0.55, (0.55, 0.75, 1.25))
    t0 = 432 if f < 455 else 455
    _, fg, a = layer(n, 0.5, 0.07, z + 0.04 * (f - t0) / 22)
    img = glitch_text(bgd, name, f)
    return grade(compose(img, fg, a, 0.5), 'blue')

def s10_top(f):
    v = VID[min(len(VID) - 1, 100 + (f - 474) * 3)]
    img = grade(fit(v, 1.25, 0.5, 0.45), 'blue')
    return screen(img, lightning(f, (W * 0.5, -10), 4, H * 1.2, (0.6, 2.5), seed=3))

def s10(f):  # 432-487  title cards with your names + lightning split
    if f >= 486: return s10_top(f)
    img = s10_title(f)
    if f >= 474:
        ys = int(0.38 * H)
        top = s10_top(f); img = img.copy(); img[:ys] = top[:ys]
        if f == 474: img[:ys] = 0.985
        if f == 480: img = white_rows(img, ys, 0.6 * H)
        if f == 485: img = white_rows(img, ys, H)
    return img

def s11(f):  # 490-532  glowing aura (Vignesh, then Ishaan on the beat)
    if f < 511:
        bgd = backdrop('p09a', PLATE['p09'], 1.15, 6, 0.6, (0.95, 0.95, 1.0)); n, X, Y, z, t0 = 'p09', 0.5, 0.05, 0.42, 490
    else:
        bgd = backdrop('p02a', PLATE['p02'], 1.15, 6, 0.6, (0.95, 0.95, 1.0)); n, X, Y, z, t0 = 'p02', 0.5, 0.07, 0.56, 511
    _, fg, a = layer(n, X, Y, z + 0.02 * (f - t0) / 21)
    base = screen(bgd, aura(a, f))
    img = grade(compose(base, fg, a, 0.5), 'teal')
    if f in (490, 511): img = rgb_split(img, 16)
    return img

def s12(f):  # 533-555  the two of you, warm "explosion" grade with embers
    v = VID[min(len(VID) - 1, 20 + (f - 533) * 3)]
    img = fit(v, 1.18 + 0.004 * (f - 533), 0.5, 0.5)
    img = grade(img, 'warm')
    img = screen(img, FIRE_GLOW * (0.75 + 0.25 * math.sin(f * 1.7)))
    img = screen(img, embers(f))
    return img

BAR_KEYS = [(533, 0.03), (535, 0.2), (537, 0.32), (539, 0.65), (541, 0.75), (543, 0.9), (545, 1.06)]
def s11b(f):
    xs = np.interp(f, [k for k, _ in BAR_KEYS], [v for _, v in BAR_KEYS]) * W
    img = s11(f) if xs < W else None
    left = s12(f)
    if img is None: return left
    img = img.copy(); img[:, :int(xs)] = left[:, :int(xs)]
    if f % 2 == 1: img = white_cols(img, xs, xs + 0.055 * W)
    return img

def s13(f):  # 557-565  Ishaan electric
    bgd = backdrop('p10e', PLATE['p10'], 1.2, 12, 0.3, (0.5, 0.6, 1.3))
    M = place_M('p10', 0.5, 0.05, 0.56, False)
    _, fg, a = layer('p10', 0.5, 0.05, 0.56)
    hand = (M[0, 0] * 476 + M[0, 2], M[1, 1] * 570 + M[1, 2])
    img = compose(bgd, fg, a)
    img = grade(img, 'blue')
    img = screen(img, lightning(f, hand, 6, W * 0.6, (-math.pi, math.pi), color=(0.6, 0.5, 1.0), seed=9))
    return fade_white(img, f, 557, 4)

def s14(f):  # 567-578  Vignesh eye close-up (end)
    img = fit(PHOTO['p06'], 2.6 + 0.25 * (f - 567) / 11, 430 / 1024, 368 / 1024)
    return fade_white(grade(img, 'teal'), f, 567, 7)

# ----------------------------------------------------------------- timeline
WHITE = {143, 200, 258, 315, 316, 326, 336, 364, 365, 373, 429, 430, 488, 546, 547, 556, 566}
INV = {144: 145, 201: 202, 259: 260, 374: 375, 431: 432, 489: 490}
HITS = [10, 15, 20, 37, 46, 51, 61, 66, 75, 90, 133, 138, 142, 172, 191, 198, 208, 222, 229, 248, 253,
        287, 306, 325, 335, 344, 354, 359, 369, 403, 434, 439, 455, 460, 479, 518, 537]

def core(f):
    if f <= 142: return s1(f)
    if f <= 189: return s2(f)
    if f <= 199: return s2b(f)
    if f <= 242: return s3(f)
    if f <= 257:
        if f >= 255: return s3b(f)
        img = s3(f); ys = int(0.64 * H); b = s3b(f); img = img.copy(); img[ys:] = b[ys:]
        if f in (243, 249, 254): img[ys:] = 0.985
        return img
    if f <= 314: return s4(f)
    if f <= 325: return s5(f)
    if f <= 335: return s6(f)
    if f <= 363: return s7(f)
    if f <= 370: return s8(f)
    if f <= 428: return s9(f)
    if f <= 487: return s10(f)
    if f <= 532: return s11(f)
    if f <= 545: return s11b(f)
    if f <= 555: return fade_white(s12(f), f, 548, 4)
    if f <= 565: return s13(f)
    return s14(f)

def camera(img, f):
    last = max([h for h in HITS if h <= f], default=-99); d = f - last
    if d <= 1: img = np.clip(img * 1.16 + 0.03, 0, 1)        # strobe: bright on the hit,
    elif d == 2: img = img * 0.9                              # then dipped
    if d > 6:                                                 # between hits: never static, a slow breathing drift
        s = 1 + 0.012 * math.sin(f / 7.0); dx, dy = 6 * math.sin(f / 11.0), 4 * math.cos(f / 9.0)
        return cv2.warpAffine(img, np.float32([[s, 0, W / 2 * (1 - s) + dx], [0, s, H / 2 * (1 - s) + dy]]), (W, H), borderMode=cv2.BORDER_REFLECT_101)
    p = 0.07 * math.exp(-d / 2.2)
    r = np.random.default_rng(f)
    dx, dy = r.normal(0, 1, 2) * p * 90
    s = 1 + p
    M = np.float32([[s, 0, W / 2 * (1 - s) + dx], [0, s, H / 2 * (1 - s) + dy]])
    img = cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT_101)
    return rgb_split(img, p * 160)

def aberrate(img):   # chromatic aberration: red and blue channels at slightly different scales
    out = img.copy()
    for c, s in ((0, 1.006), (2, 0.994)):
        out[..., c] = cv2.warpAffine(img[..., c], np.float32([[s, 0, W / 2 * (1 - s)], [0, s, H / 2 * (1 - s)]]), (W, H), borderMode=cv2.BORDER_REFLECT_101)
    return out

def frame(f):
    CUR[0] = f
    if f in WHITE: return white()
    if f in INV: return finish(invert_glitch(core(INV[f])), f)
    return finish(aberrate(camera(core(f), f)), f)

def to8(img): return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)

# ----------------------------------------------------------------- CLI
if __name__ == '__main__':
    mode = sys.argv[1]
    os.makedirs('work/review', exist_ok=True)
    if mode == 'frame':
        for a in sys.argv[2:]:
            Image.fromarray(to8(frame(int(a)))).save(f'work/review/f{int(a):03d}.png')
    elif mode == 'sheets':
        a0 = int(sys.argv[2]) if len(sys.argv) > 2 else 0
        a1 = int(sys.argv[3]) if len(sys.argv) > 3 else N - 1
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
        for page in range(a0 // 48, a1 // 48 + 1):
            sheet = Image.new('RGB', (1920, 810))
            for k in range(48):
                f = page * 48 + k
                if f >= N: break
                t = Image.fromarray(to8(frame(f))).resize((240, 135), Image.BILINEAR)
                d = ImageDraw.Draw(t); d.rectangle((0, 0, 40, 20), fill='black'); d.text((3, 1), str(f), fill='yellow', font=font)
                sheet.paste(t, ((k % 8) * 240, (k // 8) * 135))
            sheet.save(f'work/review/sheet_{page + 1:02d}.png'); print('sheet', page + 1, flush=True)
    elif mode == 'video':
        os.makedirs('out', exist_ok=True)
        tmp = 'work/review/video_noaudio.mp4'
        p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                              '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
                              '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp], stdin=subprocess.PIPE)
        for f in range(N):
            p.stdin.write(to8(frame(f)).tobytes())
            if f % 50 == 0: print('frame', f, flush=True)
        p.stdin.close(); p.wait()
        aud = os.environ.get('POLY_AUDIO')
        if aud and os.path.exists(aud):   # the user's own track, trimmed to the 19.3 s edit; no audio is shipped with the template
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-i', aud, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', 'out/polyester.mp4'], check=True)
        else:
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-c:v', 'copy', '-an', 'out/polyester.mp4'], check=True)
        print('done')

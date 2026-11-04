# Person matte by plain local code (no AI credits, no network at render time): a per-frame alpha matte of the person for the
# Card Studio "text-behind" edit. Free local model on CPU, chosen in this order (first that loads wins):
#   1. u2net_human_seg  (U2-Net human segmentation, Apache-2.0 weights, run with onnxruntime, ~0.15 s a frame on 16 cores)
#   2. mediapipe selfie segmentation (only when the mediapipe package with its legacy solutions is installed)
#   3. u2netp  (4.7 MB U2-Net, Apache-2.0, lower quality, faster)
#   4. OpenCV GrabCut seeded from the YuNet face box in engine/faces.py's model (no download at all)
# Only the frames inside --ranges are processed (the text-behind segments), at 30 fps to match the renderer.
# Output: <out>/<clipsha12>-<model>/m00123.png (RGBA, white with the matte as alpha) + index.json. A re-run only computes
# frames that are missing, so a repeat costs nothing. Edges: model output is upsampled, sharpened with a smoothstep,
# unioned with a face ellipse (YuNet) so the head top never gets a hole, smoothed over 3 frames (small blend, no ghosts)
# and feathered by 2 px.
# usage: python3 engine/person_matte.py <video> --out <dir> --ranges 5.0-7.4,12-14 [--fps 30] [--model auto|u2net_human_seg|u2netp|mediapipe|grabcut]
# weights cache: $MATTE_WEIGHTS_DIR (default ~/.cache/card-studio-matte); downloaded once, never into the repo.
import argparse, hashlib, json, os, subprocess, sys, time, urllib.request
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
YUNET = os.path.join(HERE, '..', 'assets', 'vision', 'face_detection_yunet_2023mar.onnx')
URLS = {
    'u2net_human_seg': 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx',
    'u2netp': 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
}
ORDER = ['u2net_human_seg', 'mediapipe', 'u2netp', 'grabcut']

def weights(name):
    d = os.environ.get('MATTE_WEIGHTS_DIR') or os.path.join(os.path.expanduser('~'), '.cache', 'card-studio-matte')
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, name + '.onnx')
    if not os.path.exists(p) or os.path.getsize(p) < 1_000_000:
        tmp = p + '.part'
        import socket; socket.setdefaulttimeout(30)   # a stalled download fails in 30 s and the next model is tried, never a hang
        urllib.request.urlretrieve(URLS[name], tmp)
        os.replace(tmp, p)
    return p

class Onnx:
    def __init__(self, name, size=320):
        import onnxruntime as ort
        so = ort.SessionOptions(); so.intra_op_num_threads = max(1, (os.cpu_count() or 4))
        self.s = ort.InferenceSession(weights(name), so, providers=['CPUExecutionProvider'])
        self.inp = self.s.get_inputs()[0].name; self.size = size; self.name = name
    def __call__(self, bgr):
        h, w = bgr.shape[:2]
        x = cv2.resize(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), (self.size, self.size), interpolation=cv2.INTER_AREA).astype(np.float32)
        x = x / max(float(x.max()), 1e-6)
        x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
        y = self.s.run(None, {self.inp: x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0, 0]
        y = (y - y.min()) / max(float(y.max() - y.min()), 1e-6)
        return cv2.resize(y, (w, h), interpolation=cv2.INTER_CUBIC).clip(0, 1)

class MediaPipeSeg:
    name = 'mediapipe'
    def __init__(self):
        import mediapipe as mp
        self.m = mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0)
    def __call__(self, bgr):
        r = self.m.process(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        return r.segmentation_mask.astype(np.float32).clip(0, 1)

def refine(bgr, raw, sc=0.5, band=14):
    """snap the model's soft, slightly generous edge to the real picture edge: GrabCut on a half-size copy with a trimap
    made from the model matte (sure foreground = eroded, sure background = beyond the dilated band)"""
    h, w = bgr.shape[:2]
    small = cv2.resize(bgr, None, fx=sc, fy=sc); r = cv2.resize(raw, (small.shape[1], small.shape[0]))
    b = max(2, int(band * sc * min(w, h) / 1080))
    m = (r > 0.5).astype(np.uint8)
    if m.sum() < 50: return raw
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * b + 1, 2 * b + 1))
    mask = np.full(m.shape, cv2.GC_BGD, np.uint8)
    mask[cv2.dilate(m, k) > 0] = cv2.GC_PR_BGD; mask[m > 0] = cv2.GC_PR_FGD; mask[cv2.erode(m, k) > 0] = cv2.GC_FGD
    try:
        cv2.grabCut(small, mask, None, np.zeros((1, 65)), np.zeros((1, 65)), 3, cv2.GC_INIT_WITH_MASK)
    except Exception:
        return raw
    out = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1.0, 0.0).astype(np.float32)
    c = max(1, int(round(4 * min(w, h) / 1080)))
    out = cv2.erode(out, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * c + 1, 2 * c + 1)))   # choke about 8 px at 1080 wide: source edges are soft, the model edge is generous: no pale rim of the old background
    return cv2.resize(out, (w, h), interpolation=cv2.INTER_LINEAR)

class FaceSeed:
    def __init__(self):
        self.det = None
    def box(self, bgr):
        h, w = bgr.shape[:2]
        if self.det is None or self.sz != (w, h):
            self.det = cv2.FaceDetectorYN.create(YUNET, '', (w, h), 0.6, 0.3, 50); self.sz = (w, h)
        _, res = self.det.detect(bgr)
        if res is None or not len(res):
            return None
        x, y, bw, bh = max(res, key=lambda r: r[2] * r[3])[:4]
        return float(x), float(y), float(bw), float(bh)

class GrabCutSeg:
    name = 'grabcut'
    def __init__(self, seed):
        self.seed = seed
    def __call__(self, bgr):
        h, w = bgr.shape[:2]; sc = 0.5
        small = cv2.resize(bgr, None, fx=sc, fy=sc)
        sh, sw = small.shape[:2]
        mask = np.full((sh, sw), cv2.GC_BGD, np.uint8)
        fb = self.seed.box(bgr)
        if fb:
            x, y, bw, bh = [v * sc for v in fb]; cx = x + bw / 2
            # body prior: a trapezoid under the head (shoulders about 2.6 face widths), probable foreground
            body = np.array([[cx - bw * 1.3, y + bh * 1.2], [cx + bw * 1.3, y + bh * 1.2], [cx + bw * 1.7, sh], [cx - bw * 1.7, sh]], np.int32)
            cv2.fillPoly(mask, [body], cv2.GC_PR_FGD)
            cv2.ellipse(mask, (int(cx), int(y + bh / 2)), (int(bw * 0.85), int(bh * 0.95)), 0, 0, 360, cv2.GC_PR_FGD, -1)
            cv2.ellipse(mask, (int(cx), int(y + bh / 2)), (int(bw * 0.5), int(bh * 0.55)), 0, 0, 360, cv2.GC_FGD, -1)
        else:
            mask[:] = cv2.GC_PR_BGD; mask[int(sh * 0.2):, int(sw * 0.2):int(sw * 0.8)] = cv2.GC_PR_FGD
        bg, fg = np.zeros((1, 65)), np.zeros((1, 65))
        cv2.grabCut(small, mask, None, bg, fg, 4, cv2.GC_INIT_WITH_MASK)
        m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1.0, 0.0).astype(np.float32)
        return cv2.resize(m, (w, h), interpolation=cv2.INTER_LINEAR)

def load_model(want, seed):
    names = ORDER if want == 'auto' else [want]
    errs = []
    for n in names:
        try:
            if n in ('u2net_human_seg', 'u2netp'): return Onnx(n), errs
            if n == 'mediapipe': return MediaPipeSeg(), errs
            if n == 'grabcut': return GrabCutSeg(seed), errs
        except Exception as e:
            errs.append(f'{n}: {type(e).__name__}: {str(e)[:120]}')
    raise RuntimeError('no matte model could load: ' + '; '.join(errs))

def sha12(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 22), b''): h.update(b)
    return h.hexdigest()[:12]

def parse_ranges(s, fps, nmax):
    fr = set()
    for part in s.split(','):
        if not part.strip(): continue
        a, b = part.split('-'); a, b = float(a), float(b)
        for n in range(max(0, int(round(a * fps))), min(nmax, int(round(b * fps))) + 1): fr.add(n)
    return sorted(fr)

def read_frames(video, fps, wanted, W, H):
    """decode at the renderer's rate (ffmpeg fps filter, same as tools/render-card.mjs) and keep the wanted frame numbers"""
    want = set(wanted); lo, hi = min(wanted), max(wanted)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-nostdin', '-i', video, '-vf', f'fps={fps},select=between(n\\,{lo}\\,{hi})', '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE)
    n = lo; fb = W * H * 3
    while True:
        buf = p.stdout.read(fb)
        if len(buf) < fb: break
        if n in want: yield n, np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()
        n += 1
    p.stdout.close(); p.wait()

def smooth(x, lo=0.12, hi=0.88):
    x = ((x - lo) / (hi - lo)).clip(0, 1)
    return x * x * (3 - 2 * x)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video'); ap.add_argument('--out', required=True); ap.add_argument('--ranges', required=True)
    ap.add_argument('--fps', type=float, default=30.0); ap.add_argument('--model', default='auto')
    a = ap.parse_args()
    t0 = time.time()
    cap = cv2.VideoCapture(a.video); W = int(cap.get(3)); H = int(cap.get(4)); nsrc = int(cap.get(7)); sfps = cap.get(5) or 30.0; cap.release()
    nmax = int(nsrc / sfps * a.fps) + 1
    frames = parse_ranges(a.ranges, a.fps, nmax)
    if not frames: raise SystemExit('no frames in --ranges')
    seed = FaceSeed()
    model, errs = load_model(a.model, seed)
    # frame numbers are per fps, so the fps is part of the cache key (a 30 fps cache must never answer for 15 fps frames)
    out = os.path.join(a.out, f'{sha12(a.video)}-{model.name}-v4' + ('' if a.fps == 30 else f'-{a.fps:g}fps'))
    os.makedirs(out, exist_ok=True)
    fn = lambda n: os.path.join(out, f'm{n:05d}.png')
    todo = [n for n in frames if not os.path.exists(fn(n))]
    # raw model output per frame; smoothing needs the neighbours, so run raw first, then post-process
    raw, imgs, faces = {}, {}, {}
    need = sorted(set(todo) | {n + d for n in todo for d in (-1, 1) if n + d in set(frames)})
    for n, bgr in (read_frames(a.video, a.fps, need, W, H) if need else []):
        r0 = model(bgr).astype(np.float32); faces[n] = seed.box(bgr)
        raw[n] = refine(bgr, r0) if model.name != 'grabcut' else r0
    k = max(1, int(round(min(W, H) / 270)))  # feather scale: 2 px at 540 wide, more on bigger sources
    for n in todo:
        cur = raw[n]
        prv = raw[n - 1] if n - 1 in raw else cur
        nxt = raw[n + 1] if n + 1 in raw else cur
        m = 0.12 * prv + 0.76 * cur + 0.12 * nxt
        big = np.abs(cur - 0.5 * (prv + nxt)) > 0.5      # fast motion: trust the current frame (no ghost)
        m = np.where(big, cur, m)
        fb = faces.get(n) or faces.get(n - 1) or faces.get(n + 1)
        if fb and model.name != 'grabcut':
            x, y, bw, bh = fb; e = np.zeros((H, W), np.float32)
            cv2.ellipse(e, (int(x + bw / 2), int(y + bh * 0.52)), (int(bw * 0.40), int(bh * 0.50)), 0, 0, 360, 1.0, -1)
            m = np.maximum(m, cv2.GaussianBlur(e, (0, 0), 2 * k) * 0.98)
        m = cv2.GaussianBlur(m, (0, 0), 0.6 * k)          # 2 to 3 px feather
        al = (m.clip(0, 1) * 255 + 0.5).astype(np.uint8)
        rgba = np.dstack([np.full((H, W), 255, np.uint8)] * 3 + [al])
        cv2.imwrite(fn(n) + '.tmp.png', rgba, [cv2.IMWRITE_PNG_COMPRESSION, 6]); os.replace(fn(n) + '.tmp.png', fn(n))
    idx = {'video_sha12': sha12(a.video), 'model': model.name, 'fps': a.fps, 'w': W, 'h': H, 'frames': frames, 'tried_errors': errs}
    json.dump(idx, open(os.path.join(out, 'index.json'), 'w'))
    dt = time.time() - t0
    print(json.dumps({'matte_dir': out, 'model': model.name, 'frames': len(frames), 'computed': len(todo), 'seconds': round(dt, 1), 'ms_per_frame': round(1000 * dt / max(1, len(todo)))}))

if __name__ == '__main__':
    main()

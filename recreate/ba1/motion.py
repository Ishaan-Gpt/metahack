# Per-region motion check: frame-to-frame displacement of fixed regions (phase correlation, 1080x1920 frames at 60 fps),
# and its second difference (jerk). A smooth camera move gives a smooth displacement curve; jitter shows up as large
# second differences or sign flips while the region should be still or moving one way.
# usage: python recreate/ba1/motion.py <frames dir or ref:<a>:<b>> <region x,y,w,h> [<region> ...]
import sys, os, glob, json
import numpy as np, cv2

def frames_from(src):
    if src.startswith('ref:'):
        _, a, b = src.split(':'); a, b = float(a), float(b)
        d = 'data/refs/edit-ba1/f60'
        for i in range(round(a * 60) + 1, round(b * 60) + 1):
            f = cv2.imread(f'{d}/{i:04d}.png', cv2.IMREAD_GRAYSCALE)
            yield cv2.resize(f, (1080, 1932))[:1920]
    else:
        for f in sorted(glob.glob(os.path.join(src, 'ours_*.png')), key=lambda p: float(p.split('_')[-1][:-4])):
            yield cv2.imread(f, cv2.IMREAD_GRAYSCALE)

def region(img, r):
    x, y, w, h = r
    return np.float32(img[y:y + h, x:x + w])

src, regs = sys.argv[1], [tuple(int(v) for v in a.split(',')) for a in sys.argv[2:]]
prev = None; series = {r: [] for r in regs}
win = None
for img in frames_from(src):
    if prev is not None:
        for r in regs:
            a, b = region(prev, r), region(img, r)
            if win is None or win.shape != a.shape: win = cv2.createHanningWindow(a.shape[::-1], cv2.CV_32F)
            (dx, dy), resp = cv2.phaseCorrelate(a, b, win)
            series[r].append((dx, dy, resp))
    prev = img
out = {}
for r, s in series.items():
    d = np.array([[x, y] for x, y, _ in s]); resp = np.array([q for *_, q in s])
    sp = np.hypot(d[:, 0], d[:, 1])
    jerk = np.hypot(*np.diff(d, n=2, axis=0).T) if len(d) > 2 else np.array([0])
    flips = int(np.sum(np.sign(d[1:, 1]) * np.sign(d[:-1, 1]) < 0 & (np.abs(d[1:, 1]) > 0.5)))
    out[str(r)] = {'frames': len(s), 'mean_px_per_frame': round(float(sp.mean()), 2), 'max_px_per_frame': round(float(sp.max()), 2),
                   'jerk_p95': round(float(np.percentile(jerk, 95)), 2), 'jerk_max': round(float(jerk.max()), 2), 'y_sign_flips': flips,
                   'conf_mean': round(float(resp.mean()), 2), 'dy': [round(float(v), 1) for v in d[:, 1]]}
print(json.dumps(out, indent=1))

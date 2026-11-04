# Person matte keyframes for master.mp4 (rembg isnet-general-use, interior holes filled), every <stride>-th frame first
# (the machine is shared; the in-between frames are interpolated by fill.py). Adapted from recreate/ba1/matte.py.
# usage: python recreate/ba2/matte.py <clip dir> <worker> <workers> [stride=3]
import sys, os, numpy as np, cv2
os.environ.setdefault('OMP_NUM_THREADS', '2')
from rembg import new_session, remove
from PIL import Image
d, k, n = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); stride = int(sys.argv[4]) if len(sys.argv) > 4 else 3
out = os.path.join(d, 'matte'); os.makedirs(out, exist_ok=True)
frames = os.path.join(d, 'frames')
names = sorted(f for f in os.listdir(frames) if f.endswith('.png'))
keys = [i for i in range(len(names)) if i % stride == 0 or i == len(names) - 1]
s = new_session('isnet-general-use')
for j, i in enumerate(keys):
    if j % n != k: continue
    f = names[i]; o = os.path.join(out, 'm' + f[1:])
    if os.path.exists(o): continue
    im = Image.open(os.path.join(frames, f)).convert('RGB')
    a = np.asarray(remove(im, session=s, only_mask=True), dtype=np.uint8)
    b = (a > 127).astype(np.uint8) * 255
    h, w = b.shape; ff = b.copy(); m = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, m, (0, 0), 128)
    holes = (ff == 0).astype(np.uint8) * 255
    cv2.imwrite(o, np.maximum(a, holes))
    print(k, i, flush=True)

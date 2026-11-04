# Person matte for every frame of master.mp4 (rembg isnet-general-use, interior holes filled), written as
# matte/m00001.png ... at the master's resolution. usage: python recreate/ba1/matte.py <clip dir> <worker> <workers>
import sys, os, subprocess, numpy as np, cv2
os.environ.setdefault('OMP_NUM_THREADS', '2')
from rembg import new_session, remove
from PIL import Image
d, k, n = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
out = os.path.join(d, 'matte'); os.makedirs(out, exist_ok=True)
frames = os.path.join(d, 'frames')
names = sorted(f for f in os.listdir(frames) if f.endswith('.png'))
s = new_session('isnet-general-use')
for i, f in enumerate(names):
    if i % n != k: continue
    o = os.path.join(out, 'm' + f[1:])
    if os.path.exists(o): continue
    im = Image.open(os.path.join(frames, f)).convert('RGB')
    a = np.asarray(remove(im, session=s, only_mask=True), dtype=np.uint8)
    b = (a > 127).astype(np.uint8) * 255
    h, w = b.shape; ff = b.copy(); m = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, m, (0, 0), 128)            # background reachable from the corner
    holes = (ff == 0).astype(np.uint8) * 255      # not person, not reachable: an interior hole
    a = np.maximum(a, holes)
    cv2.imwrite(o, a)
    print(k, i, flush=True)

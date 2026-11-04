# Fill the matte frames between keyframes by linear blending of the neighbouring keys (static camera, 0.1 s apart).
# usage: python recreate/ba2/fill.py <clip dir>
import sys, os, cv2, numpy as np
d = sys.argv[1]; fr = sorted(f for f in os.listdir(os.path.join(d, 'frames')) if f.endswith('.png'))
md = os.path.join(d, 'matte'); have = {int(f[1:6]) for f in os.listdir(md) if f.endswith('.png')}
idx = [int(f[1:6]) for f in fr]; keys = sorted(have); filled = 0
for i in idx:
    if i in have: continue
    a = max([k for k in keys if k < i], default=None); b = min([k for k in keys if k > i], default=None)
    if a is None: a = b
    if b is None: b = a
    A = cv2.imread(os.path.join(md, 'm%05d.png' % a), 0).astype(np.float32); B = cv2.imread(os.path.join(md, 'm%05d.png' % b), 0).astype(np.float32)
    w = 0 if b == a else (i - a) / (b - a)
    cv2.imwrite(os.path.join(md, 'm%05d.png' % i), np.clip(A * (1 - w) + B * w, 0, 255).astype(np.uint8)); filled += 1
print('filled', filled, 'from', len(keys), 'keys')

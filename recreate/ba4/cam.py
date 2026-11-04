# Camera of the reference's after panel relative to its raw (the before panel), per frame: ORB + RANSAC similarity.
# usage: python recreate/ba4/cam.py <ref.mp4> <out.json>
# after(x) = s * before(x) + (tx, ty), both in 1080x1920 units of their own panel. s = zoom vs the raw.
import sys, json, cv2, numpy as np
cap = cv2.VideoCapture(sys.argv[1]); orb = cv2.ORB_create(3000); bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
out = []; i = 0
while True:
    ok, f = cap.read()
    if not ok: break
    b = cv2.resize(f[625:1213, 75:405], (1080, 1924), interpolation=cv2.INTER_CUBIC)
    a = cv2.resize(f[429:1382, 441:977], (1080, 1920), interpolation=cv2.INTER_CUBIC)
    gb, ga = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY), cv2.cvtColor(a, cv2.COLOR_BGR2GRAY)
    gb, ga = cv2.equalizeHist(gb), cv2.equalizeHist(ga)
    kb, db = orb.detectAndCompute(gb, None); ka, da = orb.detectAndCompute(ga, None)
    r = None
    if db is not None and da is not None and len(kb) > 20 and len(ka) > 20:
        m = bf.match(db, da)
        if len(m) > 12:
            P = np.float32([kb[x.queryIdx].pt for x in m]); Q = np.float32([ka[x.trainIdx].pt for x in m])
            M, inl = cv2.estimateAffinePartial2D(P, Q, method=cv2.RANSAC, ransacReprojThreshold=4, maxIters=4000)
            if M is not None and inl.sum() > 15:
                s = float(np.hypot(M[0, 0], M[1, 0])); rot = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
                r = dict(s=round(s, 4), tx=round(float(M[0, 2]), 1), ty=round(float(M[1, 2]), 1), rot=round(rot, 2), n=int(inl.sum()))
    out.append(dict(t=round(i / 30, 3), **(r or {})))
    i += 1
json.dump(out, open(sys.argv[2], 'w'))
for o in out[::6]: print(o)

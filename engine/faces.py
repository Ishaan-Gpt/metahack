# Face boxes by plain code (OpenCV Haar cascade, CPU, no model download, no AI credits).
# usage: python3 engine/faces.py <video> <out.json> [fps=5]
#   writes {"fps":5,"w":W,"h":H,"boxes":[[t,cx,cy,fw,fh] | [t,null...]], "median":[cx,cy,fw,fh]} normalized to 0..1
#        python3 engine/faces.py --center-x <video>   prints the median face centre x (0..1) for face-aware cropping in prep
import json, os, sys
import cv2
import numpy as np

def scan(path, fps=5.0, max_side=480):
    cap = cv2.VideoCapture(path)
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    step = max(1, int(round(src_fps / fps)))
    # YuNet: OpenCV's tiny local face detector (230 KB ONNX in assets/vision, CPU, free; no API, no credits)
    model = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'vision', 'face_detection_yunet_2023mar.onnx')
    sc = min(1.0, max_side / max(W, H))
    boxes, i, det, det_size = [], 0, None, None
    while True:
        ok = cap.grab()
        if not ok:
            break
        if i % step == 0:
            ok, fr = cap.retrieve()
            if not ok:
                break
            small = cv2.resize(fr, None, fx=sc, fy=sc)
            gh, gw = small.shape[:2]
            det = cv2.FaceDetectorYN.create(model, '', (gw, gh), 0.6, 0.3, 50) if i == 0 or det_size != (gw, gh) else det
            det_size = (gw, gh)
            _, res = det.detect(small)
            f = [] if res is None else [r[:4] for r in res if r[14] > 0.6]
            t = round(i / src_fps, 3)
            if len(f):
                x, y, w, h = max(f, key=lambda b: b[2] * b[3])
                boxes.append([t, round(float((x + w / 2) / gw), 4), round(float((y + h / 2) / gh), 4), round(float(w / gw), 4), round(float(h / gh), 4)])
            else:
                boxes.append([t, None, None, None, None])
        i += 1
    cap.release()
    return W, H, boxes

def median_box(boxes):
    v = np.array([b[1:] for b in boxes if b[1] is not None], dtype=float)
    if len(v) == 0:
        return [0.5, 0.38, 0.3, 0.17]
    # reject outliers (far from the median centre) so a stray detection never moves the frame
    med = np.median(v, 0)
    keep = v[np.abs(v[:, 0] - med[0]) < 0.15]
    return [round(float(x), 4) for x in np.median(keep if len(keep) else v, 0)]

if __name__ == '__main__':
    if sys.argv[1] == '--center-x':
        W, H, b = scan(sys.argv[2], 2.0)
        print(median_box(b)[0])
        sys.exit(0)
    path, out = sys.argv[1], sys.argv[2]
    fps = float(sys.argv[3]) if len(sys.argv) > 3 else 5.0
    W, H, b = scan(path, fps)
    found = sum(1 for x in b if x[1] is not None)
    tmp = out + '.tmp'
    json.dump({'fps': fps, 'w': W, 'h': H, 'boxes': b, 'median': median_box(b), 'found': found, 'n': len(b)}, open(tmp, 'w'))
    os.replace(tmp, out)
    print(f'faces: {found}/{len(b)} samples with a face, median {median_box(b)}')

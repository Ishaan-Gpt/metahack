'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * The live preview: the edit drawn in the browser, frame by frame, by the same Canvas 2D module the MP4 renderer uses
 * (player/card-studio.js or player/creator-mix.js, loaded at runtime from /api/player), over a hidden <video> of the
 * clip's graded.mp4 that carries the sound and the clock. A prompt edit bumps `version`: the spec and the merged template
 * are fetched again and the next frame shows the change, no render. A click on the picture is hit-tested against what is
 * on screen at that moment (caption card and word, beat, effect, badge/handle/CTA) and handed up as a chat target.
 */

export type Target =
  | { kind: 'caption'; i: number } | { kind: 'word'; i: number; j: number } | { kind: 'segment'; i: number }
  | { kind: 'fx'; i: number } | { kind: 'photo'; key: string } | { kind: 'chrome'; part: 'badge' | 'handle' | 'cta' | 'storyboard' };
export type Pick = { target: Target; label: string; box: [number, number, number, number] };

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Mod = { drawFrame: (ctx: CanvasRenderingContext2D, t: number, spec: Any, T: Any, res: Any) => void; buildLayers?: (spec: Any, T: Any, res: Any, mk: (w: number, h: number) => HTMLCanvasElement) => Any };
type Prev = { engine: string; spec: Any; T: Any; video: string };

const W = 1080, H = 1920;
const clipUrl = (id: string, p: string) => `/api/jobs/${id}/clip?p=${encodeURIComponent(p.replace(/\\/g, '/'))}`;
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const LAYOUT_NAME: Record<string, string> = { face: 'You', graphic: 'Photo card', split: 'Photo + you', list: 'List', post: 'Post card', wide: 'Words beside', orbit: 'Icon orbit', topsquare: 'You on top', textbehind: 'Word behind' };
const fontsLoaded = new Set<string>();

export function LivePreview({ jobId, version, videoRef, onTime, onFail, onPick, picked }: {
  jobId: string; version: string; videoRef: RefObject<HTMLVideoElement | null>;
  onTime: (t: number) => void; onFail: (why: string) => void; onPick: (p: Pick) => void; picked: Pick | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const st = useRef<{ mod?: Mod; prev?: Prev; res?: Any; dirty: boolean; lastT: number }>({ dirty: true, lastT: -1 });
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState('Loading the live preview…');
  const matte = useRef<{ dir: string; fps: number; set: Set<number> | null; cache: Map<number, HTMLImageElement | null> } | null>(null);

  // load (or reload after a prompt edit) the spec, the template, the drawing module, fonts, photos and the matte index
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const r = await fetch(`/api/jobs/${jobId}/preview`, { cache: 'no-store' });
        if (!r.ok) throw new Error('the edit plan is not ready');
        const p = await r.json() as Prev;
        const file = p.engine === 'creator-mix' ? 'creator-mix.js' : 'card-studio.js';
        const url = `/api/player/${file}?v=${encodeURIComponent(version)}`;
        const mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url) as Mod;
        if (typeof mod.drawFrame !== 'function') throw new Error('the drawing module did not load');
        // fonts: the same files the renderer registers (assets/renderer/fonts, served through the /assets rewrite)
        // plus any caption restyled on its own (a targeted edit carries its font file)
        const capFonts = ((p.spec?.captions ?? []) as { font?: string; fontFile?: string }[]).filter(c => c.font && c.fontFile).map(c => ({ family: c.font!, file: c.fontFile! }));
        await Promise.all([...Object.values((p.T.fonts ?? {}) as Record<string, { family: string; file: string; style?: string }>), ...capFonts].map(async (f: { family: string; file: string; style?: string }) => {
          const k = `${f.family}|${f.file}`; if (fontsLoaded.has(k)) return;
          try { const ff = new FontFace(f.family, `url(/assets/renderer/fonts/${f.file})`, { style: f.style ?? 'normal', weight: '100 900' }); document.fonts.add(await ff.load()); fontsLoaded.add(k); } catch { /* the canvas falls back to a system face */ }
        }));
        const v = videoRef.current; if (!v) throw new Error('no video');
        const vsrc = clipUrl(jobId, p.video);
        if (!v.src.endsWith(vsrc)) {
          v.src = vsrc;
          await new Promise<void>((ok, no) => { v.addEventListener('loadeddata', () => ok(), { once: true }); v.addEventListener('error', () => no(new Error(`${p.video} did not load`)), { once: true }); });
        }
        const spec = p.spec, images: Record<string, HTMLImageElement> = { ...(st.current.res?.images ?? {}) };
        const paths = new Set<string>([...Object.values((spec.images ?? {}) as Record<string, string>), ...((spec.storyboard ?? []) as string[]), ...((spec.segments ?? []) as Any[]).map(s => s.img).filter(Boolean)]);
        await Promise.all([...paths].filter(x => !images[x]).map(x => new Promise<void>(ok => { const im = new Image(); im.onload = () => { images[x] = im; ok(); }; im.onerror = () => ok(); im.src = clipUrl(jobId, x); })));
        const res: Any = { video: v, vw: v.videoWidth, vh: v.videoHeight, images };
        if (p.engine === 'creator-mix') { res.make = mk; res.pc = mk(v.videoWidth, v.videoHeight); }
        else if (mod.buildLayers) res.layers = mod.buildLayers(spec, p.T, res, mk);
        // person matte frames (text-behind and colour worlds), fetched a few frames ahead of the playhead
        if (spec.matte?.dir) {
          const dir = String(spec.matte.dir).replace(/\\/g, '/'), fps = spec.matte.fps ?? 30;
          let set: Set<number> | null = null;
          try { const ix = await (await fetch(clipUrl(jobId, `${dir}/index.json`))).json(); if (Array.isArray(ix.frames)) set = new Set(ix.frames as number[]); } catch { set = null; }
          matte.current = { dir, fps, set, cache: matte.current?.dir === dir ? matte.current.cache : new Map() };
          res.matteAt = (t: number) => { const m = matte.current; if (!m) return null; const im = m.cache.get(Math.round(t * m.fps)); return im && im.complete && im.naturalWidth ? im : null; };
        } else matte.current = null;
        if (stop) return;
        st.current = { mod, prev: p, res, dirty: true, lastT: -1 };
        setReady(true); setLoading('');
      } catch (e) {
        if (!stop) { setLoading(''); onFail((e as Error).message || 'it did not load'); }
      }
    })();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, version]);

  // the draw loop: one frame whenever the clock moves (or the plan changed)
  useEffect(() => {
    if (!ready) return;
    let raf = 0, failed = false;
    const ctx = canvas.current?.getContext('2d');
    const loop = () => {
      const s = st.current, v = videoRef.current;
      if (ctx && v && s.mod && s.prev && s.res && !failed) {
        const t = v.currentTime;
        const m = matte.current;
        if (m) for (let k = 0; k < 6; k++) {
          const n = Math.round(t * m.fps) + k;
          if (!m.cache.has(n) && (!m.set || m.set.has(n))) { const im = new Image(); im.src = clipUrl(jobId, `${m.dir}/m${String(n).padStart(5, '0')}.png`); m.cache.set(n, im); im.onerror = () => m.cache.set(n, null); }
          if (m.cache.size > 90) m.cache.delete(m.cache.keys().next().value!);
        }
        if (s.dirty || t !== s.lastT || !v.paused) {
          try { s.mod.drawFrame(ctx, Math.min(t, (s.prev.spec.duration ?? t) - 0.001), s.prev.spec, s.prev.T, s.res); }
          catch (e) { failed = true; onFail(`a frame could not be drawn (${(e as Error).message})`); return; }
          s.dirty = false; s.lastT = t; onTime(t); setTime(t);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, jobId]);

  function click(e: React.MouseEvent<HTMLCanvasElement>) {
    const s = st.current, v = videoRef.current, c = canvas.current; if (!s.prev || !v || !c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    const hit = s.prev.engine === 'creator-mix' ? hitMix(c, s.prev, v.currentTime, x, y) : hitCard(c, s.prev, v.currentTime, x, y);
    if (hit) onPick(hit);
  }
  const toggle = () => { const v = videoRef.current; if (!v) return; if (v.paused) void v.play().catch(() => {}); else v.pause(); };
  const D = st.current.prev?.spec.duration ?? 0;

  return (
    <div className="lp">
      <div className="lp__frame">
        <canvas ref={canvas} width={W} height={H} onClick={click} title="Click anything in the picture to change it in the chat" />
        {picked && <i className="lp__hit" style={{ left: `${picked.box[0] / W * 100}%`, top: `${picked.box[1] / H * 100}%`, width: `${picked.box[2] / W * 100}%`, height: `${picked.box[3] / H * 100}%` }} />}
        {loading && <span className="lp__load">{loading}</span>}
      </div>
      <video ref={videoRef} playsInline preload="auto" style={{ display: 'none' }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <div className="lp__bar">
        <button onClick={toggle} disabled={!ready} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
        <input type="range" min={0} max={1000} value={D ? Math.round(time / D * 1000) : 0} disabled={!ready} aria-label="Seek"
          onChange={e => { const v = videoRef.current; if (v && D) { v.currentTime = +e.target.value / 1000 * D; st.current.dirty = true; } }} />
        <span>{time.toFixed(1)} s</span>
      </div>
    </div>
  );
}

const at = <X extends { t0: number; t1: number }>(xs: X[] | undefined, t: number) => (xs ?? []).findIndex(x => t >= x.t0 && t < x.t1);
const inBox = (x: number, y: number, b: [number, number, number, number]) => x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3];
const quote = (s: string) => `“${s.length > 28 ? s.slice(0, 27) + '…' : s}”`;

/** which word of a centred line was clicked: measure the line with the font the player draws it in */
function wordAt(c: HTMLCanvasElement, words: string[], font: string, cx: number, x: number) {
  const g = c.getContext('2d')!; g.save(); g.font = font;
  const full = words.join(' '), w = g.measureText(full).width; let left = cx - w / 2, hit = -1;
  for (let k = 0; k < words.length; k++) { const ww = g.measureText(words[k] + (k < words.length - 1 ? ' ' : '')).width; if (x >= left && x < left + ww) { hit = k; break; } left += ww; }
  g.restore(); return hit;
}
function capPick(spec: Any, i: number, j: number, box: [number, number, number, number]): Pick {
  const cap = spec.captions[i], text = cap.words.map((w: Any) => w.w).join(' ');
  return j >= 0 ? { target: { kind: 'word', i, j }, label: `Word · ${quote(cap.words[j].w)} in caption ${i + 1}`, box } : { target: { kind: 'caption', i }, label: `Caption ${i + 1} · ${quote(text)}`, box };
}

/** Card Studio: the studio page (badge, handle, CTA, storyboard), the card, the caption block inside it (T.layout) */
function hitCard(c: HTMLCanvasElement, p: Prev, t: number, x: number, y: number): Pick | null {
  const { spec, T } = p, L = T.layout ?? {}, C = L.card ?? { x: 0, y: 0, w: W, h: H }, chrome = T.chrome !== false;
  const si = at(spec.segments, t), seg = spec.segments?.[si];
  const ci = at(spec.captions, t);
  // caption block: centred at yFrac of the card (split beats: on the seam), small words / hero word / small words
  if (ci >= 0 && seg && !['graphic', 'post', 'wide', 'orbit'].includes(seg.type)) {
    const CL = L.caption ?? { yFrac: 0.66, smallSize: 34, heroSize: 96, lineGap: 6 }, cap = spec.captions[ci];
    let cy = C.y + C.h * (seg.capY ?? CL.yFrac);
    if (seg.type === 'split' && L.split) cy = C.y + L.split.border + (C.h - 2 * L.split.border - L.split.gap) * L.split.topFrac + L.split.gap / 2;
    const hi = cap.words.findIndex((w: Any) => w.hero), sH = CL.smallSize + CL.lineGap, hH = hi >= 0 ? CL.heroSize * 0.9 : 0;
    const before = hi < 0 ? cap.words.map((_: Any, k: number) => k) : cap.words.map((_: Any, k: number) => k).slice(0, hi), after = hi < 0 ? [] : cap.words.map((_: Any, k: number) => k).slice(hi + 1);
    const total = (before.length ? sH : 0) + hH + (after.length ? sH : 0), top = cy - total / 2 - 24;
    const box: [number, number, number, number] = [C.x + 8, top, C.w - 16, total + 48];
    if (inBox(x, y, box)) {
      const cx = C.x + C.w / 2, sans = `700 ${CL.smallSize}px "${T.fonts?.sans?.family ?? 'Inter Tight'}"`;
      let yy = cy - total / 2, j = -1;
      const line = (ix: number[]) => { const k = wordAt(c, ix.map(n => String(cap.words[n].w).toUpperCase()), sans, cx, x); return k >= 0 ? ix[k] ?? -1 : -1; };
      if (before.length) { if (y < yy + sH) j = line(before); yy += sH; }
      if (j < 0 && hi >= 0 && y >= yy - 10 && y < yy + hH + 10) j = hi; else if (hi >= 0) yy += hH;
      if (j < 0 && after.length && y >= yy) j = line(after);
      return capPick(spec, ci, j, box);
    }
  }
  if (inBox(x, y, [C.x, C.y, C.w, C.h]) && seg) {
    // the stickers in the card's top right corner belong to the beat
    const photo = seg.img ? Object.entries((spec.images ?? {}) as Record<string, string>).find(([, v]) => v === seg.img)?.[0] ?? seg.query : null;
    const what = seg.type === 'graphic' && photo ? `Photo · ${seg.title ?? photo}` : `${LAYOUT_NAME[seg.type] ?? seg.type}${seg.title ? ` · ${seg.title}` : seg.word ? ` · ${seg.word}` : ''}`;
    return { target: { kind: 'segment', i: si }, label: `${what} at ${seg.t0.toFixed(1)} s`, box: [C.x, C.y, C.w, C.h] };
  }
  if (!chrome) return null;
  if (L.badge && inBox(x, y, [L.badge.x, L.badge.y, 460, L.badge.h])) return { target: { kind: 'chrome', part: 'badge' }, label: `Badge · ${quote(String(spec.badge ?? ''))}`, box: [L.badge.x, L.badge.y, 460, L.badge.h] };
  if (L.handle && inBox(x, y, [L.handle.xRight - 360, L.handle.y - 50, 380, 70])) return { target: { kind: 'chrome', part: 'handle' }, label: `Handle · ${String(spec.handle ?? '')}`, box: [L.handle.xRight - 360, L.handle.y - 50, 380, 70] };
  if (L.cta && y >= L.cta.y1 - 30 && y <= L.cta.y2 + 30) return { target: { kind: 'chrome', part: 'cta' }, label: `Call to action${spec.cta ? ` · ${quote(String(spec.cta))}` : ''}`, box: [80, L.cta.y1 - 30, W - 160, L.cta.y2 - L.cta.y1 + 60] };
  if (L.storyboard && inBox(x, y, [L.storyboard.x, L.storyboard.pillY ?? L.storyboard.y, L.storyboard.w, L.storyboard.y + L.storyboard.h - (L.storyboard.pillY ?? L.storyboard.y)])) return { target: { kind: 'chrome', part: 'storyboard' }, label: 'Storyboard card', box: [L.storyboard.x, L.storyboard.pillY ?? L.storyboard.y, L.storyboard.w, L.storyboard.y + L.storyboard.h - (L.storyboard.pillY ?? L.storyboard.y)] };
  return null;
}

/** Creator Mix: full frame; captions sit low (or beside the face in a tight shot), effects own the frame while they run */
const OWNS_CAPTION = new Set([25, 26, 23, 24, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21]);
function hitMix(c: HTMLCanvasElement, p: Prev, t: number, x: number, y: number): Pick | null {
  const { spec, T } = p, fi = at(spec.fx, t), fx = spec.fx?.[fi], ci = at(spec.captions, t);
  if (ci >= 0 && !(fx && OWNS_CAPTION.has(fx.id) && fx.id !== 22)) {
    const cam = (spec.cam ?? []).find((k: Any) => t >= k.t0 && t < k.t1);
    let cx = W / 2, cy = H * 0.74, maxW = W * 0.86;
    if (cam?.textSide) { cx = cam.textSide > 0 ? W * 0.74 : W * 0.26; cy = H * 0.5; maxW = W * 0.44; }
    const box: [number, number, number, number] = [cx - maxW / 2, cy - 190, maxW, 300];
    if (inBox(x, y, box)) {
      const cap = spec.captions[ci], hi = cap.words.findIndex((w: Any) => w.hero && w.t <= t);
      let j = -1;
      if (hi >= 0 && y > cy - 80) j = hi;
      else { const ix = cap.words.map((_: Any, k: number) => k).filter((k: number) => !cap.words[k].hero && cap.words[k].t <= t); const k = wordAt(c, ix.map((n: number) => String(cap.words[n].w).toUpperCase()), `800 ${cam?.textSide ? 40 : 52}px "${T.fonts?.ui?.family ?? 'Inter'}"`, cx, x); if (k >= 0) j = ix[k]; }
      return capPick(spec, ci, j, box);
    }
  }
  if (fx) return { target: { kind: 'fx', i: fi }, label: `Effect · ${fx.name ?? T.effectNames?.[fx.id] ?? `#${fx.id}`}${fx.word ? ` on ${quote(fx.word)}` : ''}`, box: [24, 24, W - 48, H - 48] };
  const si = at(spec.segments, t), seg = spec.segments?.[si];
  if (seg) return { target: { kind: 'segment', i: si }, label: `Shot at ${seg.t0.toFixed(1)} s · ${LAYOUT_NAME[seg.type] ?? seg.type}`, box: [24, 24, W - 48, H - 48] };
  return null;
}

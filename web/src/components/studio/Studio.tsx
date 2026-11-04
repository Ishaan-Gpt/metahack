'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HaloMark, Wordmark } from '@/components/ui/Logo';
import { IconArrow, IconClose, IconSend, IconUpload } from '@/components/ui/icons';
import { CaptionEditor, useCaptionDraft, type Op } from './CaptionEditor';
import { CaptionLane, WordTools, useTimelineShortcuts } from './TimelineTools';

/**
 * The studio as an editor: footage bin on the left, the preview in the middle, Edit Easy's chat on the right where you
 * change the finished edit in words ("zoom out", "funkier captions", "change governate to governorate"), a Captions tab
 * to fix words and timing by hand, and a timeline at the bottom with the cut (beats, caption cards you can drag,
 * effects, voice). Prompts are matched to the edit dictionary on the server (engine/edits.mjs): no model call, so a
 * change costs nothing but the re-render. The job id lives in the URL (?job=) so a reload reopens the same edit.
 */

type Stage = { id: string; label: string; detail: string; state: 'pending' | 'running' | 'done' | 'error' | 'skipped'; seconds?: number };
type Ev = { t: number; kind: string; text: string };
type JobErr = { code: string; human: string; detail?: string };
type Status = {
  id: string; finished?: string; state: 'queued' | 'running' | 'done' | 'error'; pct: number; stage?: string; stages: Stage[]; events: Ev[];
  style?: string; styleLabel?: string; ahead?: number; error?: JobErr; seconds?: number; duration?: number; raw?: string;
  choice?: { by: string; style: string; why: string };
  plan?: { segments: number; layouts: string[]; planner?: string; captions: number; photos: number };
  meta?: { calls?: { call: string; model: string; cache: boolean; seconds: number | null; tokens: number | null; standin: boolean }[] };
  outputs?: { edit: string; beforeAfter: string | null; raw: string; template?: string; show?: string; download?: string | null; downloadName?: string };
};
type Spec = { engine?: string; captionPreset?: string | null; captionsHidden?: boolean; edits?: number; duration: number; segments: { type: string; t0: number; t1: number; label: string | null }[]; captions: { t0: number; t1: number; text: string; hero: string | null; words?: { w: string; t: number; e?: number; hero: boolean }[] }[]; sfx: { t: number; k: string }[] };
type Health = { meta: 'live' | 'test' | 'claude' | 'missing'; ffmpeg: boolean; queue: number };
type Msg = { who: 'you' | 'moovi'; text: string; kind?: string };
type EditRes = { applied: { op: string; said: string }[]; unmatched: string[]; rendering: boolean };
const TRY = ['zoom out a little', 'make the captions funkier', 'captions a bit bigger and higher', 'add a b-roll of a city at 6s', 'change governate to governorate', 'lower the music', 'no sound effects', 'warmer colour'];

const MIN_S = 5, MAX_S = 75, MAX_MB = 400;
const LAYOUT: Record<string, { name: string; c: string }> = {
  face: { name: 'You', c: '#7DB7EA' }, graphic: { name: 'Photo card', c: '#E3B65C' }, split: { name: 'Photo + you', c: '#9AD3B8' },
  list: { name: 'List', c: '#B9A6FF' }, post: { name: 'Post card', c: '#F29C8F' }, wide: { name: 'Words beside', c: '#F6C06E' },
  orbit: { name: 'Icon orbit', c: '#8FD0E8' }, topsquare: { name: 'You on top', c: '#A8C3E8' }, textbehind: { name: 'Word behind', c: '#5394DA' },
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let r: Response;
  // every call is bounded: one request that never answers must not freeze the polling loop
  try { r = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(init?.method === 'POST' ? 60000 : 10000) }); } catch { throw { code: 'OFFLINE', human: 'We cannot reach the studio. Check your connection; we will keep trying.' } satisfies JobErr; }
  const j = await r.json().catch(() => null);
  if (!r.ok) throw (j?.error ?? { code: `HTTP_${r.status}`, human: 'The studio answered with an error. Try again in a moment.' });
  return j as T;
}

function takeHandoff(): Promise<{ file: File; style: string; note?: string } | null> {
  return new Promise(ok => {
    if (typeof indexedDB === 'undefined') return ok(null);
    const req = indexedDB.open('moovi-handoff', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('take');
    req.onerror = () => ok(null);
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction('take', 'readwrite'), st = tx.objectStore('take'), g = st.get('latest');
        g.onsuccess = () => { const v = g.result ?? null; if (v) st.delete('latest'); ok(v && v.file ? v : null); };
        g.onerror = () => ok(null);
      } catch { ok(null); }
    };
  });
}

function checkFile(f: File): Promise<{ ok: true; url: string } | { ok: false; err: JobErr }> {
  return new Promise(res => {
    if (!/^video\//.test(f.type) && !/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name)) return res({ ok: false, err: { code: 'NOT_VIDEO', human: 'That file is not a video. Drop an MP4, MOV or WEBM.' } });
    if (f.size > MAX_MB * 1024 * 1024) return res({ ok: false, err: { code: 'TOO_BIG', human: `That file is over ${MAX_MB} MB. Export a smaller version (1080p is plenty).` } });
    const url = URL.createObjectURL(f), v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true; v.src = url;
    const t = setTimeout(() => res({ ok: true, url }), 5000);
    v.onloadedmetadata = () => {
      clearTimeout(t); const s = v.duration;
      if (Number.isFinite(s) && s < MIN_S) return res({ ok: false, err: { code: 'TOO_SHORT', human: `That take is ${s.toFixed(1)} s. Give me at least ${MIN_S} seconds of talking.` } });
      if (Number.isFinite(s) && s > MAX_S + 0.5) return res({ ok: false, err: { code: 'TOO_LONG', human: `That take is ${Math.round(s)} s. I edit up to ${MAX_S} s for now: trim it to your best ${MAX_S} seconds.` } });
      res({ ok: true, url });
    };
    v.onerror = () => { clearTimeout(t); res({ ok: true, url }); };
  });
}

function upload(f: File, style: string, onPct: (p: number) => void): Promise<{ id: string }> {
  return new Promise((ok, no) => {
    const x = new XMLHttpRequest();
    x.open('POST', '/api/jobs');
    x.setRequestHeader('x-file-name', encodeURIComponent(f.name || 'take.mp4'));
    x.setRequestHeader('x-style', style);
    x.upload.onprogress = e => e.lengthComputable && onPct(e.loaded / e.total);
    x.onload = () => {
      let j: { id?: string; error?: JobErr } | null = null; try { j = JSON.parse(x.responseText); } catch { /* not json */ }
      if (x.status >= 200 && x.status < 300 && j?.id) ok({ id: j.id }); else no(j?.error ?? { code: `HTTP_${x.status}`, human: 'The upload did not go through. Try again.' });
    };
    x.onerror = () => no({ code: 'OFFLINE', human: 'The upload was cut off. Check your connection and try again.' });
    x.send(f);
  });
}

type Sample = { id: string; name: string; line: string; seconds: number; shape: string; credit: string; licence: string };

export function Studio() {
  const params = useSearchParams(), router = useRouter();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  // no style picker: uploads take turns between the two engines; prompts change the edit afterwards
  const style = 'auto';
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [upPct, setUpPct] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(params.get('job'));
  const [st, setSt] = useState<Status | null>(null);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [conn, setConn] = useState<'ok' | 'retrying'>('ok');
  const [drag, setDrag] = useState(false);
  const [view, setView] = useState<'edit' | 'split'>('edit');
  const [touched, setTouched] = useState(false);   // the user picked a view themselves; until then the engine's show video plays (Creator Mix: its Before/After)
  const [msgs, setMsgs] = useState<Msg[]>([{ who: 'moovi', text: 'Drop your video, or pick a sample on the left. I edit it, then you tell me what to change in plain words: "zoom out", "funkier captions", "add a b-roll of a city", or fix a word: "change governate to governorate".' }]);
  const [tab, setTab] = useState<'chat' | 'captions'>('chat');
  const [selected, setSelected] = useState<number | null>(null);
  /** timeline zoom (Captions Easy: 1 = the whole video fits, up to 40x); words show from about 2-3x */
  const [zoom, setZoom] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [pollKey, setPollKey] = useState(0);
  // a prompt typed before the first cut is done is kept and applied the moment the edit is ready
  const pending = useRef<string | null>(null);
  const [draft, setDraft] = useState('');
  const [t, setT] = useState(0);
  const vid = useRef<HTMLVideoElement>(null);
  const seen = useRef(0);
  const say = useCallback((m: Msg) => setMsgs(x => [...x, m]), []);

  useEffect(() => {
    api<{ samples: Sample[] }>('/api/samples').then(r => setSamples(r.samples)).catch(() => setSamples([]));
    api<Health>('/api/health').then(setHealth).catch(() => setHealth(null));
  }, []);
  useEffect(() => {
    if (jobId) return;
    // a take handed over from the landing; its note is the first prompt (a named style is used for the first cut)
    takeHandoff().then(h => {
      if (!h) return;
      void pick(h.file);
      if (h.note) { say({ who: 'you', text: h.note }); pending.current = h.note; say({ who: 'moovi', text: 'Noted. I will make that change as soon as the first cut is ready.' }); }
    });
    if (params.get('sample')) void startSample(params.get('sample') === '1' ? undefined : params.get('sample')!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = useCallback((id: string | null) => {
    setJobId(id); setSt(null); setSpec(null); seen.current = 0;
    router.replace(`/studio${id ? `?job=${id}` : ''}`, { scroll: false });
  }, [router]);

  // poll the job; turn its new events into chat lines
  useEffect(() => {
    if (!jobId) return;
    let stop = false, wait = 900, timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const s = await api<Status>(`/api/jobs/${jobId}`);
        if (stop) return;
        setSt(s); setConn('ok'); wait = 900;
        const fresh = s.events.slice(seen.current); seen.current = s.events.length;
        for (const e of fresh) if (e.kind !== 'info' || /chose|heard|beats|Done/i.test(e.text)) say({ who: 'moovi', text: e.text, kind: e.kind });
        if (s.plan && !spec) api<Spec>(`/api/jobs/${jobId}/spec`).then(setSpec).catch(() => {});
        if (s.state === 'done') {
          api<Spec>(`/api/jobs/${jobId}/spec`).then(setSpec).catch(() => {});
          const p = pending.current; if (p) { pending.current = null; void edit({ prompt: p }); }
          return;
        }
        if (s.state === 'error') { say({ who: 'moovi', text: s.error?.human ?? 'That edit stopped.', kind: 'error' }); return; }
      } catch (e) {
        const err = e as JobErr;
        if (err.code === 'NOT_FOUND' || err.code === 'BAD_ID') { setSt({ id: jobId, state: 'error', pct: 0, stages: [], events: [], error: err }); return; }
        setConn('retrying'); wait = Math.min(8000, wait * 1.6);
      }
      if (!stop) timer = setTimeout(tick, wait);
    };
    void tick();
    return () => { stop = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, pollKey]);

  async function pick(f: File) {
    const r = await checkFile(f);
    if (!r.ok) { say({ who: 'moovi', text: r.err.human, kind: 'error' }); return; }
    setFile(f); setPreview(r.url); go(null);
    say({ who: 'moovi', text: `Got ${f.name}. Press Edit, or tell me how it should look.` });
  }
  async function start() {
    if (!file) { say({ who: 'moovi', text: 'Drop a take first, or try the sample.', kind: 'error' }); return; }
    setUpPct(0);
    try { const { id } = await upload(file, style, setUpPct); setUpPct(null); go(id); say({ who: 'moovi', text: 'Watching your take. I pick the look; tell me what to change when it is done.' }); }
    catch (e) { setUpPct(null); say({ who: 'moovi', text: (e as JobErr).human, kind: 'error' }); }
  }
  async function startSample(sid?: string) {
    const smp = samples.find(x => x.id === sid);
    setFile(null); setPreview(null);
    try { const { id } = await api<{ id: string }>(`/api/sample?style=auto${sid ? `&id=${encodeURIComponent(sid)}` : ''}`, { method: 'POST' }); go(id); say({ who: 'moovi', text: smp ? `Editing ${smp.name}'s take (${smp.credit}, ${smp.licence}).` : 'Editing a sample take.' }); }
    catch (e) { say({ who: 'moovi', text: (e as JobErr).human, kind: 'error' }); }
  }
  /** start over from the same upload (after an error) */
  async function again() {
    if (!jobId) return;
    try { await api(`/api/jobs/${jobId}/retry`, { method: 'POST' }); seen.current = 0; setSt(null); setSpec(null); setPollKey(k => k + 1); }
    catch (e) { say({ who: 'moovi', text: (e as JobErr).human, kind: 'error' }); }
  }
  /** change the finished edit: a prompt is matched to the edit dictionary on the server; ops come from the Captions tab */
  async function edit(body: { prompt: string } | { ops: Op[] }) {
    if (!jobId) return;
    setEditing(true);
    try {
      const r = await api<EditRes>(`/api/jobs/${jobId}/edit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.applied.length) say({ who: 'moovi', text: `${r.applied.map(a => a.said.replace(/\.+$/, '')).join('. ')}.${r.rendering ? ' Re-rendering now; the last cut keeps playing until the new one is in.' : ''}` });
      if (r.unmatched.length) say({ who: 'moovi', kind: r.applied.length ? 'info' : 'error', text: `I could not match "${r.unmatched.join('", "')}" to an edit I know. Try one like "${TRY[msgs.length % TRY.length]}".` });
      if (!r.applied.length && !r.unmatched.length) say({ who: 'moovi', text: 'That is already how the edit looks, so nothing changed.' });
      if (r.rendering) { setSt(x => x ? { ...x, state: 'queued', pct: 0 } : x); setPollKey(k => k + 1); }
    } catch (e) { say({ who: 'moovi', text: (e as JobErr).human, kind: 'error' }); }
    finally { setEditing(false); }
  }
  function applyOps(ops: Op[], said: string) {
    if (!ops.length) return;
    say({ who: 'you', text: said || 'Apply my caption changes' });
    void edit({ ops });
  }
  function send() {
    const text = draft.trim(); if (!text) return;
    setDraft(''); say({ who: 'you', text });
    if (!jobId) {
      pending.current = text;
      say({ who: 'moovi', text: file ? 'Noted. Press Edit my video; I will make that change as soon as the first cut is ready.' : 'Noted. Drop a take or pick a sample, and I will make that change once it is edited.' });
      return;
    }
    if (st && (st.state === 'running' || st.state === 'queued')) { pending.current = text; say({ who: 'moovi', text: 'Still cutting. I will make that change the moment this cut is done.' }); return; }
    if (st?.state === 'error') { say({ who: 'moovi', text: 'This edit stopped, so there is nothing to change yet. Press Try again first.', kind: 'error' }); return; }
    void edit({ prompt: text });
  }

  const phase = !jobId ? 'pick' : !st ? 'loading' : st.state;
  const file$ = (n: string, dl = false) => `/api/jobs/${jobId}/file/${n}${dl ? '?dl=1' : ''}`;
  // show = what plays (Card Studio: the full frame; Creator Mix: the Before/After) until the user picks a view; the
  // download is file$(<any>, true), which the server answers with the Zoom file only (Vignesh, docs/TEMPLATES.md).
  // While a prompt edit re-renders, the last cut keeps playing; ?v= changes when a new cut lands so the player reloads it.
  const cut = phase === 'done' || (!!st?.outputs?.edit && phase !== 'error');
  const v = encodeURIComponent(st?.finished ?? '');
  const shown = st?.outputs?.show && !touched ? st.outputs.show : view === 'edit' ? 'edit.mp4' : 'before-after.mp4';
  const src = cut ? `${file$(shown)}?v=${v}` : jobId ? file$(st?.raw ?? 'input.mp4') : preview;
  const D = spec?.duration ?? st?.duration ?? 0;
  const label = st?.styleLabel ?? (jobId ? 'Choosing the engine' : 'Card Studio or Creator Mix');
  const capSpec = useMemo(() => spec ? { duration: spec.duration, captions: spec.captions } : null, [spec]);
  const capDraft = useCaptionDraft(capSpec);
  const busy = editing || phase === 'running' || phase === 'queued';
  useTimelineShortcuts({ video: vid, draft: capDraft, selected, onSelect: setSelected, onApply: () => applyOps(capDraft.ops, capDraft.said), zoom, onZoom: setZoom, enabled: phase === 'done' && !busy });
  const seek = (x: number) => { if (vid.current) vid.current.currentTime = x; };
  // zoomed in, the timeline follows the playhead so the words being said stay in view (Captions Easy)
  useEffect(() => {
    const el = scroller.current; if (!el || zoom <= 1 || !D) return;
    const x = t / D * el.scrollWidth, pad = el.clientWidth * 0.15;
    if (x < el.scrollLeft + pad || x > el.scrollLeft + el.clientWidth - pad) el.scrollLeft = Math.max(0, x - el.clientWidth * 0.3);
  }, [t, zoom, D]);
  const ruleStep = zoom >= 8 ? 0.5 : zoom >= 3 ? 1 : 2;

  return (
    <div className="ed">
      <header className="ed__top">
        <a href="/" className="ed__brand" aria-label="Edit Easy home"><Wordmark /></a>
        <span className="ed__proj">{file?.name ?? (jobId ? `Edit ${jobId}` : 'Untitled edit')}<i>{label}</i></span>
        <span className="ed__sp" />
        {conn === 'retrying' && <span className="ed__conn">Reconnecting…</span>}
        {health && <span className={`ed__meta ed__meta--${health.meta}`}><i />{health.meta === 'live' ? 'Muse Spark live' : health.meta === 'claude' ? 'Claude Sonnet directing' : health.meta === 'test' ? 'Test mode' : 'Meta key missing'}</span>}
        <a className={`ed__export ${phase === 'done' ? '' : 'is-off'}`} href={phase === 'done' ? file$('edit.mp4', true) : undefined} aria-disabled={phase !== 'done'}>Export</a>
      </header>

      <aside className="ed__bin">
        <span className="ed__lab">Footage</span>
        <label className={`ed__drop ${drag ? 'is-drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) void pick(f); }}>
          <input type="file" accept="video/*,.mp4,.mov,.m4v,.webm" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ''; }} />
          {file ? <span className="ed__clip"><video src={preview ?? undefined} muted /><span>{file.name}<i>{st?.state === 'done' ? 'edited' : jobId ? 'analysing' : 'ready'}</i></span></span>
            : <span className="ed__drop-in"><IconUpload width={22} height={22} />Drop raw footage<em>{MIN_S}–{MAX_S} s, talking to camera</em></span>}
        </label>
        <button className="ed__go" onClick={start} disabled={!file || upPct !== null || phase === 'running' || phase === 'queued'}>
          {upPct !== null ? `Uploading ${Math.round(upPct * 100)}%` : phase === 'running' || phase === 'queued' ? 'Editing…' : <>Edit my video <IconArrow width={18} height={18} /></>}
        </button>
        <span className="ed__lab">Or try a sample</span>
        <div className="ed__samples" role="list" aria-label="Sample takes">
          {samples.map(x => (
            <button key={x.id} role="listitem" className="ed__sample" onClick={() => startSample(x.id)} disabled={phase === 'running' || phase === 'queued'} title={`${x.credit}, ${x.licence}`}>
              <img src={`/api/samples/${x.id}/poster`} alt="" />
              <span><b>{x.name}</b><em>{x.line} · {x.seconds} s</em></span>
            </button>
          ))}
          {!samples.length && <p className="ed__ph">Loading sample takes…</p>}
        </div>
      </aside>

      <section className="ed__stage">
        <div className="ed__tabs">
          <span className="ed__lab">Preview</span>
          {phase === 'done' && st?.outputs?.beforeAfter && <span className="ed__seg"><button aria-pressed={view === 'edit'} onClick={() => { setTouched(true); setView('edit'); }}>Edit</button><button aria-pressed={view === 'split'} onClick={() => { setTouched(true); setView('split'); }}>Before / after</button></span>}
        </div>
        <div className="ed__screen">
          {src ? <video key={src} ref={vid} src={src} controls={cut} autoPlay={phase === 'done'} muted={phase !== 'done'} loop={phase !== 'done'} playsInline onTimeUpdate={e => setT(e.currentTarget.currentTime)} />
            : <div className="ed__empty"><HaloMark size={54} /><p>Your edit plays here.</p></div>}
          {(phase === 'running' || phase === 'queued' || phase === 'loading') && st && (
            <div className="ed__busy">
              <HaloMark size={30} spin />
              <b>{st.state === 'queued' ? (st.ahead ? `${st.ahead} ahead of you` : 'Starting') : st.stages.find(x => x.id === st.stage)?.label ?? 'Working'}</b>
              <span>{st.stages.find(x => x.id === st.stage)?.detail}</span>
              <span className="ed__pct"><i style={{ transform: `scaleX(${Math.max(.02, st.pct / 100)})` }} /></span>
            </div>
          )}
          {phase === 'error' && st?.error && (
            <div className="ed__busy ed__busy--err" role="alert">
              <b>That edit stopped.</b><span>{st.error.human}</span>
              <span className="ed__row">
                {!['NOT_VIDEO', 'NO_PICTURE', 'NO_SOUND', 'TOO_SHORT', 'TOO_LONG', 'NO_SPEECH', 'NOT_FOUND', 'BAD_ID'].includes(st.error.code) && <button className="ed__go" onClick={again}>Try again</button>}
                <button className="ed__textbtn" onClick={() => { setFile(null); setPreview(null); go(null); }}>Use another take</button>
              </span>
              <code>{st.error.code} · {st.id}</code>
            </div>
          )}
        </div>
      </section>

      <aside className="ed__chat">
        <div className="ed__chat-h"><HaloMark size={20} spin={busy} /><b>Edit Easy</b>
          <span className="ed__seg" role="tablist" aria-label="Chat or captions"><button role="tab" aria-pressed={tab === 'chat'} onClick={() => setTab('chat')}>Chat</button><button role="tab" aria-pressed={tab === 'captions'} onClick={() => setTab('captions')} disabled={!spec}>Captions</button></span>
        </div>
        {tab === 'captions' && jobId && spec ? (
          <div className="ed__capx"><CaptionEditor jobId={jobId} spec={capSpec} draft={capDraft} onApply={applyOps} busy={busy || phase !== 'done'} selected={selected} onSelect={setSelected} currentTime={t} onSeek={seek} /></div>
        ) : <>
        <ol className="ed__msgs" ref={el => { el?.scrollTo({ top: el.scrollHeight }); }}>
          {msgs.map((m, i) => <li key={i} className={`is-${m.who} ${m.kind ? `is-${m.kind}` : ''}`}>{m.text}</li>)}
          {phase === 'done' && st && <li className="is-moovi is-card">
            <b>{st.styleLabel}</b>{st.choice ? ` · ${st.choice.by}: ${st.choice.why}` : ''}
            {st.plan && <span>{st.plan.segments} beats · {st.plan.captions} captions · {st.plan.photos} photos · made in {Math.round(st.seconds ?? 0)} s</span>}
            {st.meta?.calls?.map(c => <code key={c.call}>{c.model} · {c.call}{c.cache ? ' · cached' : c.seconds ? ` · ${c.seconds}s` : ''}{c.standin ? ' · test' : ''}</code>)}
          </li>}
        </ol>
        {phase === 'done' && !busy && <div className="ed__try" aria-label="Try saying">{TRY.slice(0, 4).map(x => <button key={x} onClick={() => setDraft(x)}>{x}</button>)}</div>}
        <form className="ed__ask" onSubmit={e => { e.preventDefault(); send(); }}>
          <textarea value={draft} rows={2} placeholder={phase === 'done' ? 'Zoom out, funkier captions, fix a word…' : 'Tell me what you want changed…'} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button aria-label="Send" disabled={!draft.trim() || editing}><IconSend width={18} height={18} /></button>
        </form>
        </>}
      </aside>

      <section className="ed__tl" aria-label="Timeline">
        <div className="ed__tl-h"><span className="ed__lab">Timeline</span><span className="ed__time">{fmt(t)} / {fmt(D)}</span>{spec && <span className="ed__legend">{[...new Set(spec.segments.map(s => s.type))].map(k => <i key={k} style={{ ['--c' as string]: LAYOUT[k]?.c }}>{LAYOUT[k]?.name ?? k}</i>)}</span>}{spec && phase === 'done' && <WordTools draft={capDraft} zoom={zoom} onZoom={setZoom} />}</div>
        <div className="ed__tracks" onClick={e => { if (!D || !vid.current || phase !== 'done') return; const r = (e.currentTarget.querySelector('.ed__lanes') as HTMLElement).getBoundingClientRect(); const k = (e.clientX - r.left) / r.width; if (k >= 0 && k <= 1) vid.current.currentTime = k * D; }}>
          <div className="ed__names"><span>Ruler</span><span>V1 · Beats</span><span>T1 · Captions</span><span>FX</span><span>A1 · Voice</span></div>
          <div className="ed__scroll" ref={scroller}>
          <div className="ed__lanes" style={zoom > 1 ? { width: `${zoom * 100}%` } : undefined}>
            <div className="ed__ruler">{D ? Array.from({ length: Math.floor(D / ruleStep) + 1 }, (_, i) => <i key={i} style={{ left: `${(i * ruleStep / D) * 100}%` }}>{+(i * ruleStep).toFixed(1)}s</i>) : null}</div>
            <div className="ed__lane">{spec ? spec.segments.map((s, i) => <b key={i} title={`${LAYOUT[s.type]?.name ?? s.type}${s.label ? `: ${s.label}` : ''}`} style={{ left: `${s.t0 / D * 100}%`, width: `${(s.t1 - s.t0) / D * 100}%`, ['--c' as string]: LAYOUT[s.type]?.c }}>{LAYOUT[s.type]?.name ?? s.type}</b>) : <em className="ed__ph">{jobId ? 'Planning the beats…' : 'Beats appear when your edit is planned'}</em>}</div>
            <div className="ed__lane ed__lane--cap" onClick={e => e.stopPropagation()}>{spec && D > 0 ? <CaptionLane draft={capDraft} duration={D} selected={selected} onSelect={i => { setSelected(i); if (i !== null) setTab('captions'); }} onSeek={seek} currentTime={t} /> : null}</div>
            <div className="ed__lane ed__lane--fx">{spec?.sfx.map((x, i) => <i key={i} title={x.k} style={{ left: `${x.t / D * 100}%` }} />)}</div>
            <div className="ed__lane ed__lane--a">{D ? <span className="ed__wave" /> : null}</div>
            {D > 0 && <span className="ed__head" style={{ left: `${Math.min(1, t / D) * 100}%` }} />}
          </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
void IconClose;

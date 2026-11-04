# Free word timings: local faster-whisper on CPU (no API key, no credits).
# usage: python3 engine/hear_local.py <voice.wav> <words.raw.json> [model=small]
# Writes the same shape prep.mjs writes from Groq: [{word, t, end, p?}] with trailing punctuation in p.
import json, os, re, sys
from faster_whisper import WhisperModel

wav, out = sys.argv[1], sys.argv[2]
size = sys.argv[3] if len(sys.argv) > 3 else os.environ.get('WHISPER_MODEL', 'small')
model = WhisperModel(size, device='cpu', compute_type='int8', cpu_threads=max(1, (os.cpu_count() or 4) - 1),
                     download_root=os.environ.get('WHISPER_CACHE') or None)
segs, info = model.transcribe(wav, language=os.environ.get('WHISPER_LANG', 'en'), word_timestamps=True,
                              vad_filter=False, beam_size=5, condition_on_previous_text=False)
words = []
for s in segs:
    for w in (s.words or []):
        raw = w.word.strip()
        if not raw:
            continue
        m = re.search(r'[.?!,;:]+$', raw)
        bare = re.sub(r'[.?!,;:]+$', '', raw).strip('"')
        if not bare:
            if m and words:
                words[-1]['p'] = m.group(0)
            continue
        e = {'word': bare, 't': round(w.start, 3), 'end': round(max(w.end, w.start + 0.05), 3)}
        if m:
            e['p'] = m.group(0)
        words.append(e)
with open(out, 'w') as f:
    json.dump(words, f, indent=1)
print(f'{len(words)} words, model {size}, language {info.language}')

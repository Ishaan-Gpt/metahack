// Test stand-in for the Gemini generateContent API (NOT Gemini). It accepts the exact request shapes engine/meta.mjs sends to Gemini
// (audio inlineData transcription, JSON-schema plan), answers in Gemini's response shape, and borrows the answers from the Meta stand-in
// (tools/meta-standin.mjs) so the whole pipeline can be tested without a Gemini key. It only proves OUR Gemini wire code, not Gemini's answers.
// usage: node tools/meta-standin.mjs 8801 &   node tools/gemini-standin.mjs 8802   then   GEMINI_API_BASE=http://127.0.0.1:8802/v1beta GEMINI_API_KEY=standin (no MODEL_API_KEY)
import http from 'node:http';
const PORT = +(process.argv[2] ?? 8802), META = process.env.META_STANDIN ?? 'http://127.0.0.1:8801/v1';
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'x-meta-standin': '1' }); res.end(JSON.stringify(obj)); };
http.createServer(async (req, res) => {
  let b = ''; for await (const c of req) b += c;
  if (req.method !== 'POST' || !/:generateContent$/.test(req.url.split('?')[0])) return send(res, 404, { error: { code: 404, message: 'not found' } });
  if (!req.headers['x-goog-api-key']) return send(res, 403, { error: { code: 403, message: 'API key missing' } });
  const j = JSON.parse(b); const parts = j.contents?.[0]?.parts ?? [];
  const audio = parts.find(p => p.inlineData);
  try {
    if (audio) {
      const fd = new FormData(); fd.append('request', new Blob([JSON.stringify({ model: 'muse-voice-transcribe-1.0', audioEncoding: 'WAV', mode: 'ENDPOINTING' })], { type: 'application/json' }));
      fd.append('audio', new Blob([Buffer.from(audio.inlineData.data, 'base64')], { type: 'audio/wav' }), 'voice.wav');
      const r = await fetch(`${META}/asr/transcribe?sessionId=g`, { method: 'POST', headers: { Authorization: 'Bearer standin' }, body: fd }); const m = await r.json();
      return send(res, 200, { candidates: [{ content: { parts: [{ text: JSON.stringify({ transcript: m.transcript, turns: m.turns }) }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 } });
    }
    const sys = j.systemInstruction.parts[0].text, user = parts[0].text;
    const body = { model: 'muse-spark-1.3', messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], response_format: { type: 'json_schema', json_schema: { name: 'plan', schema: JSON.parse(JSON.stringify(j.generationConfig.responseSchema).replace(/"type":"(OBJECT|ARRAY|STRING|INTEGER|NUMBER|BOOLEAN)"/g, (_, t) => `"type":"${t.toLowerCase()}"`)) } } };
    const r = await fetch(`${META}/chat/completions`, { method: 'POST', headers: { Authorization: 'Bearer standin', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const m = await r.json();
    return send(res, 200, { candidates: [{ content: { parts: [{ text: m.choices[0].message.content }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: m.usage?.prompt_tokens ?? 0, candidatesTokenCount: m.usage?.completion_tokens ?? 0, totalTokenCount: m.usage?.total_tokens ?? 0 } });
  } catch (e) { send(res, 500, { error: { code: 500, message: String(e.message) } }); }
}).listen(PORT, () => console.log(`gemini stand-in on ${PORT} (not Gemini)`));

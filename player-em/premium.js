/**
 * One accent → the whole lit key line (fill ramp, bloom layers): Premium Caption 1 takes its colour from the video
 * it sits on instead of a fixed green or red. Pure (no DOM), inlined by the gallery and the MP4 path like draw.ts.
 */
const hex = (c) => '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const rgb = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
function toHsl([r, g, b]) {
    r /= 255;
    g /= 255;
    b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d)
        return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
}
function fromHsl([h, s, l]) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const WHITE = [255, 255, 255];
/** The key line lit in `accent`: a top-lit fill ramp and a bloom from a deeper, hue-shifted halo to a near-white core. */
function litKey(accent) {
    const [h, s] = toHsl(rgb(accent));
    // the accent pushed to a lit, saturated mid (any video colour reads as light, not paint)
    const mid = fromHsl([h, Math.max(s, 0.85), 0.56]);
    const deep = fromHsl([h, Math.max(s, 0.9), 0.44]);
    const halo = fromHsl([(h + 345) % 360, 1, 0.46]);
    return {
        fill: [hex(mix(mid, WHITE, 0.75)), hex(mix(mid, WHITE, 0.3)), hex(mid), hex(deep)],
        glow: {
            color: hex(mid),
            layers: [
                { r: 0.06, a: 0.3, c: hex(halo) },
                { r: 0.024, a: 0.45, c: hex(mid) },
                { r: 0.008, a: 0.5, c: hex(mix(mid, WHITE, 0.2)) },
                { r: 0.003, a: 0.4, c: hex(mix(mid, WHITE, 0.7)) },
            ],
        },
    };
}
/**
 * The video's own accent: the strongest saturated hue in a frame's pixels (RGBA), weighted by saturation, lifted to
 * a lit colour. Skin and walls are low-saturation and mostly fall out; null when the frame has no colour to take.
 */
function accentFromPixels(px) {
    const bins = new Array(24).fill(0), sums = new Array(24).fill(0);
    for (let i = 0; i < px.length; i += 16) {
        const [h, s, l] = toHsl([px[i], px[i + 1], px[i + 2]]);
        if (s < 0.4 || l < 0.15 || l > 0.85)
            continue;
        const b = Math.floor(h / 15) % 24, w = s * s;
        bins[b] += w;
        sums[b] += h * w;
    }
    let best = 0;
    bins.forEach((v, i) => { if (v > bins[best])
        best = i; });
    if (!bins[best])
        return null;
    return hex(fromHsl([sums[best] / bins[best], 0.9, 0.56]));
}
/** The key line as metal (Premium Caption 2's gold): a bright top light falling to the accent and a deeper base, no bloom. */
function metalKey(accent) {
    const [h, s] = toHsl(rgb(accent));
    const mid = fromHsl([h, Math.max(s, 0.7), 0.62]);
    const deep = fromHsl([(h + 352) % 360, Math.max(s, 0.75), 0.46]);
    // subtle: the top light only lifts the accent a little (the ref reads as gold, not as white fading to gold)
    return [hex(mix(mid, WHITE, 0.38)), hex(mix(mid, WHITE, 0.14)), hex(mid), hex(deep)];
}
/** A glossy display word (Premium Caption 4's red): a lit top, the accent, a deep base, and the shades of its 3D block. */
function glossKey(accent) {
    const [h, s] = toHsl(rgb(accent));
    // deep and saturated (the ref's red reads as lacquer, not salmon): a small lift at the top, a dark base
    const mid = fromHsl([h, Math.max(s, 0.88), 0.44]);
    return {
        fill: [hex(mix(mid, WHITE, 0.1)), hex(mid), hex(fromHsl([h, Math.max(s, 0.9), 0.34]))],
        side: hex(fromHsl([h, Math.max(s, 0.85), 0.22])),
        dark: hex(fromHsl([h, Math.max(s, 0.7), 0.1])),
    };
}

/**
 * Premium caption presets (caption mastery, 2026-10-18): one preset per reference Ishaan sends, approved by him.
 * Each preset is two things that describe the same caption: a captionseasy look (a base look number plus `--set`
 * overrides, valid keys only) and the Moovi player spec that `draw.ts` paints on a canvas, the same code in the live
 * preview and in the MP4 path (Chromium). None of these is a product default; wiring them into types comes later.
 */

/** The entry decoded from the reference reel (c02, 30 fps): ~5 frames from 1.22x and soft to sharp, a small bounce. */
/** The entry decoded from the reference reel (c02, 30 fps): ~5 frames from 1.22x and soft to sharp, a small bounce. */
const REEL_ENTER = { scaleFrom: 1.22, decay: 11, freq: 15, blur: 0.01, blurS: 0.16, fadeS: 0.06, flash: 0.8, flashS: 0.3, drift: -0.025 };
/** The accents of the two references, for previews only: the product takes the accent from the video (theme.ts). */
const REF_ACCENTS = { '1.1': '#52F42E', '1.2': '#FF3434' };
/**
 * Premium Caption 1 (refs c01 and the reel DbS2vcfyQxx, approved by Ishaan 2026-10-18): a white lead tier and the
 * spoken key word lit underneath, in any accent (the video's own, from `accentFromPixels`).
 *   1.1  both tiers caps, Russo One 600, letters set a little open (tracking +0.02 em)
 *   1.2  sentence-case white lead (Poppins 800) over a slanted key line
 * Ishaan's pick: Russo One at 600. It has one cut (400); a 4.5 % same-colour stroke thickens it to 600 identically on
 * every layer (the browser's synthetic bold skips offscreen layers, which ghosted the glow).
 */
function premiumCaption1(variant, accent = REF_ACCENTS[variant]) {
    const lit = litKey(accent);
    const key = {
        font: 'Russo One', weight: 400, round: 0.045, size: 0.1, tracking: 0.02, fill: lit.fill,
        // a dark bed under the word, then the bloom: the word reads highlighted, not just glowing
        shadow: { color: 'rgba(0,0,0,0.75)', blur: 0.04, dy: 0.01 },
        glow: lit.glow,
        sheen: 0.25,
    };
    const lead = variant === '1.1'
        ? { font: 'Russo One', weight: 400, round: 0.045, size: 0.07, tracking: 0.02, wordGap: 0.04, fill: ['#FFFFFF', '#FFFFFF', '#D9DDE3'], shadow: { color: 'rgba(0,0,0,0.7)', blur: 0.03, dy: 0.008 } }
        : { font: 'Poppins', weight: 800, casing: 'none', size: 0.068, tracking: -0.01, fill: ['#FFFFFF', '#FFFFFF', '#E2E2E6'], shadow: { color: 'rgba(0,0,0,0.7)', blur: 0.03, dy: 0.008 } };
    return {
        id: `premium-1-${variant.replace('.', '-')}`,
        name: `Premium Caption ${variant}`,
        ref: 'c01.png; reel DbS2vcfyQxx (0 s green, 4.9 s red)',
        fonts: variant === '1.1' ? ['Russo+One'] : ['Russo+One', 'Poppins:wght@800'],
        tiers: [lead, variant === '1.1' ? { ...key, wordGap: 0.04 } : { ...key, skew: 0.2 }],
        y: 0.8,
        gap: 0.016,
        maxWords: 4,
        enter: REEL_ENTER,
        captionseasy: {
            look: 34,
            set: {
                fontId: 'Russo One', fontWeight: 600, casing: 'upper', letterSpacing: -1, lineHeight: 1,
                'fill.color': '#FFFFFF', 'active.color': lit.glow.color, 'hero.scale': 1.43, 'hero.fontId': 'Russo One',
                'shadow.enabled': true, 'shadow.color': 'rgba(0,0,0,0.7)',
                'glow.enabled': true, 'glow.color': lit.glow.color, 'glow.radius': 24,
                'position.y': 0.8, maxWordsPerCard: 4, 'entrance.type': 'pop',
            },
        },
    };
}
/** The swatch of reference 2 (gold), for previews; the product takes the accent from the video like Caption 1. */
const REF_ACCENT_2 = '#F2C94C';
/**
 * Premium Caption 2 (ref c03, reel DZsBWoCz04j): three tiers around the key words, hybrid type. A white lead in
 * Plus Jakarta Sans SemiBold Italic, the key words big in tall condensed caps (Antonio 500, slanted to match) with a
 * soft metallic gradient, and the words after them as a lighter tail (Medium Italic). Every tier sits in an After
 * Effects-style glow (its own light blurred wide and tight, screened back). Each word
 * fades in out of a heavy blur over ~7 frames, no bounce (read from the reel at 30 fps).
 */
function premiumCaption2(accent = REF_ACCENT_2) {
    // the After Effects glow: the letters' own light blurred wide and tight and added back, so every word sits in a haze
    const white = (size, weight) => ({
        font: 'Plus Jakarta Sans', weight, italic: true, casing: 'none', size, tracking: -0.02, fill: ['#FFFFFF', '#FFFFFF', '#F1F0EC'],
        shadow: { color: 'rgba(0,0,0,0.35)', blur: 0.025, dy: 0.006 },
        glow: { color: '#FFFFFF', layers: [{ r: 0.045, a: 0.28, c: '#FFF4E0' }, { r: 0.015, a: 0.42 }, { r: 0.004, a: 0.35 }] },
    });
    const metal = metalKey(accent);
    return {
        id: 'premium-2',
        name: 'Premium Caption 2',
        ref: 'c03 still; reel DZsBWoCz04j (0 to 8 s)',
        fonts: ['Plus+Jakarta+Sans:ital,wght@1,500;1,600', 'Antonio:wght@500'],
        tiers: [
            white(0.05, 600),
            {
                font: 'Antonio', weight: 500, skew: 0.12, size: 0.17, tracking: 0, fill: metal,
                shadow: { color: 'rgba(0,0,0,0.35)', blur: 0.02, dy: 0.006 },
                glow: { color: metal[2], layers: [{ r: 0.07, a: 0.32, c: metal[3] }, { r: 0.024, a: 0.45 }, { r: 0.006, a: 0.4, c: metal[0] }] },
            },
            white(0.046, 500),
        ],
        y: 0.78,
        gap: 0.03,
        maxWords: 6,
        tailMax: 2,
        enter: { scaleFrom: 1.04, decay: 14, freq: 0, blur: 0.022, blurS: 0.24, fadeS: 0.2, flash: 0, flashS: 0.3, drift: -0.01 },
        captionseasy: {
            look: 34,
            set: {
                fontId: 'Plus Jakarta Sans', fontWeight: 600, casing: 'none', letterSpacing: -1, lineHeight: 1,
                'fill.color': '#FFFFFF', 'active.color': accent, 'hero.scale': 2.6, 'hero.fontId': 'Antonio',
                'shadow.enabled': true, 'shadow.color': 'rgba(0,0,0,0.45)', 'glow.enabled': false,
                'position.y': 0.78, maxWordsPerCard: 6, 'entrance.type': 'blur-in',
            },
        },
    };
}
/** The swatch of reference 3 (ice blue), for previews; the product takes the accent from the video. */
const REF_ACCENT_3 = '#6EC6F5';
/**
 * Premium Caption 3 (ref c04, reel Dd76h-2RpSv): stacked cards composed like the reel's. Connector words small and
 * above-left, the highlighted word(s) big, the words after them right-aligned under the highlight. Plain words in clean
 * white Montserrat (content words Medium, connectors Regular and smaller). The highlight is Montserrat Bold behind the
 * speaker as a shiny negative of the frame: the background decides its colour (light blue over warm, orange over cool,
 * green over magenta...), pushed bright and saturated. The card never covers the face. Words slide up out of a blur.
 * No accent: the colour comes from the video itself.
 */
function premiumCaption3() {
    const white = (weight, size) => ({
        font: 'Montserrat', weight, casing: 'lower', size, tracking: -0.02, fill: '#FFFFFF',
        shadow: { color: 'rgba(0,0,0,0.35)', blur: 0.02, dy: 0.004 },
    });
    return {
        id: 'premium-3',
        name: 'Premium Caption 3',
        ref: 'reel Dd76h-2RpSv',
        fonts: ['Montserrat:wght@400;500;700'],
        layout: 'stack',
        tiers: [
            white(500, 0.075),
            {
                font: 'Montserrat', weight: 700, casing: 'lower', size: 0.16, tracking: -0.03, fill: '#FFFFFF', behind: true,
                shiny: { saturate: 2.4, lift: 1.3, contrast: 1.15, sheen: 0.45, opacity: 0.95 },
                shadow: { color: 'rgba(0,0,0,0.2)', blur: 0.02, dy: 0 },
            },
            white(400, 0.05),
        ],
        y: 0.6,
        gap: 0.012,
        maxWords: 4,
        tailMax: 2,
        enter: { scaleFrom: 1, decay: 0, freq: 0, blur: 0.02, blurS: 0.28, fadeS: 0.1, flash: 0, flashS: 0.3, drift: -0.012, rise: 0.05 },
        captionseasy: {
            look: 34,
            set: {
                fontId: 'Montserrat', fontWeight: 600, casing: 'lower', letterSpacing: -1, lineHeight: 1,
                'fill.color': '#FFFFFF', 'active.color': '#FFFFFF', 'hero.scale': 2, 'hero.fontId': 'Montserrat',
                'shadow.enabled': true, 'shadow.color': 'rgba(0,0,0,0.4)', 'glow.enabled': false,
                'position.y': 0.74, maxWordsPerCard: 4, 'entrance.type': 'rise',
            },
        },
    };
}
/** The swatch of reference 4 (red), for previews; the product takes the accent from the video like the others. */
const REF_ACCENT_4 = '#D42020';
/**
 * Premium Caption 4 (ref reel Dd1Mf7xzsbm, "3 different COUNTRIES", "Here's what NOBODY about working tells you"): a
 * poster card. The key word giant in League Gothic narrowed to a very tall set, a glossy accent ramp on a 3D block with a
 * drop shadow, standing behind the speaker from the forehead to below the shoulders, its letters rising one after
 * another out of a motion trail. The words before it a small white Sacramento script on its top-left corner, written
 * on; after it a white Poppins line over the chest, then the closing words in script under it, right-aligned.
 */
function premiumCaption4(accent = REF_ACCENT_4) {
    const g = glossKey(accent);
    // the small words must read on any background: a firm dark shadow under thin script and the sans line
    const strong = { color: 'rgba(0,0,0,0.7)', blur: 0.022, dy: 0.006 };
    return {
        id: 'premium-4',
        name: 'Premium Caption 4',
        ref: 'reel Dd1Mf7xzsbm (0-3 s, 18-19 s)',
        fonts: ['League+Gothic', 'Sacramento', 'Poppins:wght@600'],
        layout: 'poster',
        tiers: [
            { font: 'Sacramento', weight: 400, casing: 'none', size: 0.095, tracking: 0, fill: '#FFFFFF', shadow: strong, round: 0.02 },
            {
                font: 'League Gothic', weight: 400, wide: 0.62, size: 0.3, tracking: 0.01, fill: g.fill, behind: true,
                extrude: { depth: 0.05, color: g.side, dark: g.dark, steps: 12 },
                bevel: { size: 0.018, light: '#FFD0C8', dark: '#3A0006', lightA: 0.55, darkA: 0.6 },
                sheen: 0.12,
                // a firm, dark drop shadow: the word stands off any wall (the ref separates it from a busy background)
                shadow: { color: 'rgba(0,0,0,0.68)', blur: 0.04, dy: 0.02 },
            },
            { font: 'Poppins', weight: 600, casing: 'none', size: 0.05, tracking: -0.01, fill: '#FFFFFF', shadow: strong },
        ],
        y: 0.5,
        gap: 0.01,
        maxWords: 5,
        tailMax: 3,
        enter: { scaleFrom: 1, decay: 0, freq: 0, blur: 0, blurS: 0.22, fadeS: 0.06, flash: 0, flashS: 0.3, drift: -0.01, rise: 0.6, stagger: 0.035, writeS: 0.45 },
        captionseasy: {
            look: 34,
            set: {
                fontId: 'Poppins', fontWeight: 600, casing: 'none', letterSpacing: 0, lineHeight: 1,
                'fill.color': '#FFFFFF', 'active.color': accent, 'hero.scale': 4, 'hero.fontId': 'League Gothic',
                'shadow.enabled': true, 'shadow.color': 'rgba(0,0,0,0.5)', 'glow.enabled': false,
                'position.y': 0.5, maxWordsPerCard: 5, 'entrance.type': 'rise',
            },
        },
    };
}
const PREMIUM_PRESETS = [premiumCaption1('1.1'), premiumCaption1('1.2'), premiumCaption2(), premiumCaption3(), premiumCaption4()];

const STOP = new Set(('a an the and or but so to of in on at for is are am was be it i we you he she they my your our ' +
    'this that with as by from now just then very really can will do does basically which after before into them get also').split(' '));
/** how strongly a word carries the line: the one the voice hits goes to the key tier */
function weight(w, i) {
    const bare = w.text.replace(/[^\p{L}\p{N}]/gu, '');
    const low = bare.toLowerCase();
    if (!bare)
        return -9;
    let s = Math.min(bare.length, 9) / 3;
    if (STOP.has(low))
        s -= 4;
    if (/\d/.test(bare))
        s += 3;
    if (i > 0 && /^\p{Lu}/u.test(bare))
        s += 2;
    if (/[!?]$/.test(w.text))
        s += 1.5;
    return s;
}
/**
 * Cards: phrases split at punctuation and pauses; the key word is the strongest within `maxWords`. Two tiers
 * (`tailMax` 0): each card ends on its key. Three tiers: the key takes a second strong word ("SOCIAL MEDIA") and up to
 * `tailMax` words after it stay on the card as its tail ("grow karna").
 */
function cards(words, maxWords, tailMax = 0) {
    const phrases = [];
    let cur = [];
    words.forEach((w, i) => {
        cur.push(w);
        const next = words[i + 1];
        if (!next || /[.,!?;:]$/.test(w.text) || next.t - w.end > 0.35) {
            phrases.push(cur);
            cur = [];
        }
    });
    const out = [];
    for (let p of phrases) {
        while (p.length) {
            const win = p.slice(0, maxWords);
            // the voice leans on the end of a phrase: a small bias to later words
            const score = (i) => weight(win[i], i) + (i === p.length - 1 ? 0.6 : 0);
            let k = 0;
            win.forEach((_, i) => { if (score(i) >= score(k))
                k = i; });
            if (tailMax > 0) {
                const kEnd = k + 1 < win.length && weight(win[k + 1], k + 1) >= 1.5 ? k + 2 : k + 1;
                const end = Math.min(p.length, kEnd + tailMax);
                const seg = p.slice(0, end);
                out.push({ lead: seg.slice(0, k), key: seg.slice(k, kEnd), tail: seg.slice(kEnd), t0: seg[0].t, t1: seg[seg.length - 1].end });
                p = p.slice(end);
                continue;
            }
            // one short word that closes the phrase rides with the key ("DID IT!")
            const cut = p.length - k - 1 === 1 && p[k + 1].text.replace(/\W/g, '').length <= 3 && /[.!?]$/.test(p[k + 1].text) ? k + 2 : k + 1;
            const seg = p.slice(0, cut);
            out.push({ lead: seg.slice(0, k), key: seg.slice(k), tail: [], t0: seg[0].t, t1: seg[seg.length - 1].end });
            p = p.slice(cut);
        }
    }
    // readable time (Ishaan, 2026-10-18: "the minimum appear time was off, appearing too fast and leaving too fast"): a
    // card that would be up for less than MIN_CARD joins its neighbour when the voice runs on (the stronger key leads the
    // merged card), then every card holds until the next one starts, up to HOLD past its last word, never less than MIN_CARD
    const all = (c) => [...c.lead, ...c.key, ...c.tail];
    const span = (c, n) => (n ? Math.min(n.t0, c.t1 + HOLD) : c.t1 + HOLD) - c.t0;
    for (let i = 0; i < out.length; i++) {
        const c = out[i], n = out[i + 1], prev = out[i - 1];
        if (span(c, n) >= MIN_CARD)
            continue;
        const intoNext = n && n.t0 - c.t1 < 0.6 && all(c).length + all(n).length <= maxWords + 3;
        const intoPrev = !intoNext && prev && c.t0 - prev.t1 < 0.6 && all(prev).length + all(c).length <= maxWords + 3;
        if (!intoNext && !intoPrev)
            continue;
        const [a, b] = intoNext ? [c, n] : [prev, c];
        out.splice(intoNext ? i : i - 1, 2, merged(a, b, tailMax));
        i = Math.max(-1, i - 2);
    }
    out.forEach((c, i) => { const n = out[i + 1]; c.t1 = Math.max(c.t0 + MIN_CARD, n ? Math.min(n.t0, c.t1 + HOLD) : c.t1 + HOLD); if (n)
        c.t1 = Math.min(c.t1, n.t0); });
    return out;
}
/** shortest time a card stays up, and how long it holds after its last word when the voice pauses */
const MIN_CARD = 1.2, HOLD = 1.0;
/** Two neighbouring cards as one: the stronger key stays the key, the words before it lead, the words after it trail. */
function merged(a, b, tailMax) {
    const ws = [...a.lead, ...a.key, ...a.tail, ...b.lead, ...b.key, ...b.tail];
    const keyOf = (c) => c.key.reduce((s, w, i) => s + weight(w, i), 0) / Math.max(1, c.key.length);
    const key = keyOf(a) >= keyOf(b) ? a.key : b.key;
    const k0 = ws.indexOf(key[0]), k1 = k0 + key.length;
    // two tiers end on the key: the words after it ride in the key line
    const tail = tailMax > 0 ? ws.slice(k1) : [];
    return { lead: ws.slice(0, k0), key: tailMax > 0 ? key : ws.slice(k0), tail, t0: ws[0].t, t1: ws[ws.length - 1].end };
}
/**
 * Captions never show punctuation (Ishaan, 2026-10-18): only letters, digits and the symbols that carry meaning
 * (% $ # & +) reach the screen. The words keep it for timing and key-word choice.
 */
const bare = (s) => s.replace(/[^\p{L}\p{N}%$#&+ ]/gu, '');
const cased = (tier, s) => (tier.casing === 'none' ? bare(s) : tier.casing === 'lower' ? bare(s).toLowerCase() : bare(s).toUpperCase());
const clamp = (x) => Math.min(Math.max(x, 0), 1);
/** An entry curve that starts and ends at rest, weighted to the start: 1 - (1 - x^1.3)^3 (zero speed at 0 and at 1). */
const fromRest = (x) => 1 - Math.pow(1 - Math.pow(clamp(x), 1.3), 3);
/** the font of the last `font()` call, applied as-is to offscreen layers (`ctx.font` reads back without the stretch) */
let face = { font: '', stretch: 'normal', spacing: '0px' };
function setFace(c) {
    c.font = face.font;
    c.fontStretch = face.stretch;
    c.letterSpacing = face.spacing;
}
/** cap height as a share of the em, per face; the cap of the last font() call */
const CAPS = new Map();
let cap = 0.72;
function font(ctx, tier, S, k = 1) {
    // the face's own cap height (measured once per face): sizes are cap heights, so any font lands at the same size
    const id = `${tier.italic ? "italic " : ""}${tier.weight} "${tier.font}"`;
    if (!CAPS.has(id)) {
        face = { font: `${tier.italic ? "italic " : ""}${tier.weight} 100px "${tier.font}"`, stretch: tier.stretch ?? "normal", spacing: "0px" };
        setFace(ctx);
        const a = ctx.measureText("H").actualBoundingBoxAscent;
        if (a > 0)
            CAPS.set(id, a / 100);
    }
    cap = CAPS.get(id) ?? 0.72;
    const px = (tier.size * S / cap) * k;
    face = { font: `${tier.italic ? "italic " : ""}${tier.weight} ${px}px "${tier.font}"`, stretch: tier.stretch ?? 'normal', spacing: `${tier.tracking * px}px` };
    setFace(ctx);
    return px;
}
function fillStyle(ctx, tier, y, px) {
    if (typeof tier.fill === 'string')
        return tier.fill;
    const g = ctx.createLinearGradient(0, y - px * 0.74, 0, y);
    tier.fill.forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    return g;
}
/**
 * The bloom: the word drawn once into its own layer, then laid back blurred at each radius in screen mode, wide and
 * faint to tight and hot, so the light falls off like a lens bloom instead of stacked shadow rings.
 */
function bloom(ctx, tier, text, x, y, px, S, alpha) {
    const g = tier.glow;
    const pad = Math.ceil(Math.max(...g.layers.map(l => l.r)) * S * 2.5);
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2, h = Math.ceil(px * 1.3) + pad * 2;
    const off = new OffscreenCanvas(w, h);
    const o = off.getContext('2d');
    setFace(o);
    o.fillStyle = '#fff';
    o.fillText(text, pad, pad + px);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    // each layer carries its own hue (emerald halo, lime body, near-white core): the white mask tinted per layer
    const tint = new OffscreenCanvas(w, h), tc = tint.getContext('2d');
    for (const l of g.layers) {
        tc.globalCompositeOperation = 'copy';
        tc.drawImage(off, 0, 0);
        tc.globalCompositeOperation = 'source-in';
        tc.fillStyle = l.c ?? g.color;
        tc.fillRect(0, 0, w, h);
        ctx.globalAlpha = alpha * l.a;
        ctx.filter = `blur(${l.r * S}px)`;
        ctx.drawImage(tint, x - pad, y - px - pad);
    }
    ctx.restore();
}
/** soft corners: the word stroked in its own fill with round joins, so square cuts read as rounded squares */
function round(c, tier, text, x, y, px) {
    if (!tier.round)
        return;
    c.save();
    c.lineJoin = 'round';
    c.lineWidth = tier.round * px;
    c.strokeStyle = c.fillStyle;
    c.strokeText(text, x, y);
    c.restore();
}
const SPRITES = new Map();
const TIER_KEYS = new WeakMap();
function sprite(tier, text, px, S) {
    let tk = TIER_KEYS.get(tier);
    if (!tk) {
        tk = JSON.stringify(tier);
        TIER_KEYS.set(tier, tk);
    }
    const key = `${face.font}|${face.stretch}|${face.spacing}|${text}|${Math.round(S)}|${tk}`;
    const hit = SPRITES.get(key);
    if (hit)
        return hit;
    const glowR = tier.glow ? Math.max(...tier.glow.layers.map(l => l.r)) * S * 2.5 : 0;
    const shadowR = tier.shadow ? (tier.shadow.blur * 2 + Math.abs(tier.shadow.dy)) * S : 0;
    const pad = Math.ceil(Math.max(px * 0.3, glowR, shadowR));
    const probe = new OffscreenCanvas(1, 1).getContext('2d');
    setFace(probe);
    const w = Math.ceil(probe.measureText(text).width * (1 + (tier.skew ?? 0)) + px * 0.2) + pad * 2, h = Math.ceil(px * 1.4) + pad * 2;
    const layer = (draw) => {
        const c = new OffscreenCanvas(w, h), o = c.getContext('2d');
        setFace(o);
        draw(o);
        return c;
    };
    const out = {
        pad, px,
        shadow: tier.shadow ? layer(o => {
            o.shadowColor = tier.shadow.color;
            o.shadowBlur = tier.shadow.blur * S;
            o.shadowOffsetY = tier.shadow.dy * S;
            // the letters themselves are pushed out of the layer, only their shadow stays
            o.shadowOffsetX = w * 2;
            o.fillStyle = '#000';
            o.fillText(text, pad - w * 2, pad + px);
        }) : null,
        glow: tier.glow ? layer(o => bloom(o, tier, text, pad, pad + px, px, S, 1)) : null,
        face: layer(o => paintFace(o, tier, text, pad, pad + px, px, S)),
    };
    if (SPRITES.size > 400)
        SPRITES.clear();
    SPRITES.set(key, out);
    return out;
}
function paintWord(ctx, tier, text, x, y, px, S, alpha, glowGain = 1) {
    const sp = sprite(tier, text, px, S);
    const ox = x - sp.pad, oy = y - sp.pad - px;
    ctx.save();
    if (sp.shadow) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(sp.shadow, ox, oy);
    }
    if (sp.glow) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = Math.min(1, alpha * glowGain);
        ctx.drawImage(sp.glow, ox, oy);
        ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(sp.face, ox, oy);
    ctx.restore();
}
/** The word's face (edge, fill, inner sheen) at full opacity, drawn once into its sprite. */
/**
 * The bevel: a lit rim on the top-left of each letter and a dark rim on the bottom-right (the letter minus itself
 * shifted), softened a little, so a flat fill reads as a glossy, cut letter (Premium Caption 4's red).
 */
function bevel(c, tier, text, x, y, px) {
    const b = tier.bevel;
    if (!b)
        return;
    const d = Math.max(1, b.size * px);
    const pad = Math.ceil(px * 0.3 + d);
    const w = Math.ceil(c.measureText(text).width) + pad * 2, h = Math.ceil(px * 1.4) + pad * 2;
    for (const [dx, col, a] of [[d, b.light, b.lightA], [-d, b.dark, b.darkA]]) {
        const layer = new OffscreenCanvas(w, h), o = layer.getContext('2d');
        setFace(o);
        o.fillStyle = col;
        o.fillText(text, pad, pad + px);
        o.globalCompositeOperation = 'destination-out';
        o.fillText(text, pad + dx, pad + px + dx);
        c.save();
        c.globalAlpha = a;
        c.filter = `blur(${d * 0.4}px)`;
        c.drawImage(layer, x - pad, y - px - pad);
        c.restore();
    }
}
function paintFace(ctx, tier, text, x, y, px, S) {
    const alpha = 1;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = alpha;
    if (tier.edge) {
        ctx.lineJoin = 'round';
        ctx.strokeStyle = tier.edge.color;
        ctx.lineWidth = tier.edge.width * S / 1080;
        ctx.strokeText(text, x, y);
    }
    if (tier.extrude) {
        // 3D: the letters repeated down and to the right in darkening shades under the face (the reel's glossy red block)
        // one copy per pixel of depth, so the block reads solid (sparse copies showed as stripes)
        const ex = tier.extrude, n = Math.max(ex.steps ?? 10, Math.ceil(ex.depth * px));
        for (let i = n; i >= 1; i--) {
            const k = i / n;
            ctx.fillStyle = k > 0.45 ? ex.dark : ex.color;
            ctx.fillText(text, x + ex.depth * px * k * 0.35, y + ex.depth * px * k);
        }
    }
    if (!tier.sheen) {
        ctx.fillStyle = fillStyle(ctx, tier, y, px);
        round(ctx, tier, text, x, y, px);
        ctx.fillText(text, x, y);
        bevel(ctx, tier, text, x, y, px);
        ctx.restore();
        return;
    }
    // the letters lit from inside: on their own layer, the fill, then their shape blurred white and kept only inside
    // the letters (strongest at the core, falling off to the gradient at the edges)
    const pad = Math.ceil(px * 0.2);
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2, h = Math.ceil(px * 1.3) + pad * 2;
    const layer = new OffscreenCanvas(w, h), o = layer.getContext('2d');
    setFace(o);
    const by = pad + px;
    o.fillStyle = fillStyle(o, tier, by, px);
    round(o, tier, text, pad, by, px);
    o.fillText(text, pad, by);
    o.globalCompositeOperation = 'source-atop';
    o.globalAlpha = tier.sheen;
    o.filter = `blur(${px * 0.07}px)`;
    o.fillStyle = '#FFFFFF';
    o.fillText(text, pad, by - px * 0.03);
    ctx.drawImage(layer, x - pad, y - by);
    ctx.restore();
}
/**
 * One tier centred at `cy` (its cap middle). Each word enters on its own onset (`p.enter`, decoded from the reference
 * reel at 30 fps): it pops in large and soft, snaps to size on a damped spring (a small undershoot, the bounce), and its
 * glow flashes on arrival then eases. Words not yet spoken keep their place.
 */
function tierLine(ctx, p, tier, ws, t, W, cy, S) {
    if (!ws.length)
        return;
    let px = font(ctx, tier, S);
    const text = cased(tier, ws.map(w => w.text).join(' '));
    const k = tier.wide ?? 1;
    const fit = Math.min(1, (W * 0.9) / (ctx.measureText(text).width * k));
    if (fit < 1)
        px = font(ctx, tier, S, fit);
    const full = ctx.measureText(text).width * k;
    const base = cy + px * cap / 2;
    const space = ctx.measureText(' ').width * k + (tier.wordGap ?? 0) * px * k;
    let x = W / 2 - full / 2;
    for (const w of ws) {
        const s = cased(tier, w.text);
        const wd = ctx.measureText(s).width * k;
        const e = t - w.t;
        if (e >= 0) {
            const r = p.enter;
            // damped spring 1 - exp(-decay e) cos(freq e): from scaleFrom down through 1, a little under, back to 1
            // a damped spring when it bounces (Caption 1, the reel's measured motion); otherwise one curve that leaves rest
            // and lands at rest (owner rule: speed is a curve, never a step)
            const spring = r.freq > 0 ? 1 - Math.exp(-r.decay * e) * Math.cos(r.freq * e) : fromRest(e * r.decay / 4.6);
            const sc = r.scaleFrom + (1 - r.scaleFrom) * spring;
            const pull = clamp(1 - e / r.blurS);
            const flash = 1 + r.flash * Math.exp(-e / r.flashS);
            ctx.save();
            ctx.translate(x, 0);
            ctx.scale(k, 1);
            const cx = wd / k / 2, cyw = base - px * cap / 2;
            ctx.translate(cx, cyw);
            ctx.scale(sc, sc);
            if (tier.skew)
                ctx.transform(1, 0, -tier.skew, 1, 0, 0);
            ctx.translate(-cx, -cyw);
            // focus pull: the word arrives soft and sharpens as it lands
            if (pull > 0)
                ctx.filter = `blur(${pull * r.blur * S}px)`;
            paintWord(ctx, tier, s, 0, base, px, S, clamp(e / r.fadeS), flash);
            ctx.restore();
        }
        x += wd + space;
    }
}
/** Paint the caption for time `t` (s) on a W x H canvas. */
/**
 * Paint the caption for time `t` (s) on a W x H canvas that already holds the video frame. `scene.person`: the speaker
 * cut out of the same frame (video masked by a person matte); words of a tier marked `behind` are painted under it.
 * `scene.face`: the face box, which a stack card never covers.
 */
function drawCaption(ctx, p, list, t, W, H, scene = {}) {
    const c = list.find(c => t >= c.t0 && t < c.t1);
    if (!c)
        return;
    if (p.layout === 'stack')
        return drawStack(ctx, p, c, t, W, H, scene);
    if (p.layout === 'poster')
        return drawPoster(ctx, p, c, t, W, H, scene);
    const S = Math.min(W, H);
    const [t1, t2] = p.tiers;
    const h1 = c.lead.length ? t1.size * S : 0;
    const h2 = t2.size * S;
    const t3 = p.tiers[2] ?? t1;
    const h3 = c.tail.length ? t3.size * S : 0;
    const gap = c.lead.length ? p.gap * S : 0;
    const gap3 = c.tail.length ? p.gap * S : 0;
    const top = p.y * H - (h1 + gap + h2 + gap3 + h3) / 2;
    // the hold: the whole card settles slowly smaller while it is up (the reference's drift)
    const d = 1 + p.enter.drift * (t - c.t0);
    ctx.save();
    ctx.translate(W / 2, p.y * H);
    ctx.scale(d, d);
    ctx.translate(-W / 2, -p.y * H);
    tierLine(ctx, p, t1, c.lead, t, W, top + h1 / 2, S);
    tierLine(ctx, p, t2, c.key, t, W, top + h1 + gap + h2 / 2, S);
    tierLine(ctx, p, t3, c.tail, t, W, top + h1 + gap + h2 + gap3 + h3 / 2, S);
    ctx.restore();
}
/** The word onsets that get a Style 1 typing tick (one per word, the owner's rule in sfx-style1/map.json "word"). */
function ticks(list) {
    return list.flatMap(c => [...c.lead, ...c.key, ...c.tail].map(w => w.t));
}
const ANCHORS = new Map();
/**
 * The stack (Premium Caption 3, ref c04): the highlighted word is the card. It is scaled to span the speaker's
 * shoulders and centred on the body at shoulder height, behind the speaker (a shiny negative of the frame), the way the
 * reel's "second" crosses behind the neck. Everything else is arranged around it: the words before it above, starting
 * at its left edge (pushed left if they would reach the face), the words after it below, right-aligned to its right
 * edge. Connectors are small, content words a middle size, in clean white Montserrat. Text never covers the face.
 * Each word slides up out of a blur as it is said; the card drifts slowly while it holds.
 */
function drawStack(ctx, p, c, t, W, H, scene) {
    const S = Math.min(W, H);
    const m = 0.04 * S;
    const [content, key] = p.tiers;
    const connector = p.tiers[2] ?? content;
    const hl = new Set(c.key);
    const isConnector = (w) => { const b = bare(w.text).toLowerCase(); return b.length <= 3 || STOP.has(b); };
    // the anchor: the neck line, from the face box; the highlight spans about 3.2 face boxes, past the shoulders, so the
    // neck and shoulders cut into it but most of the word shows (as the reel's "second" behind the neck)
    const id = `${c.t0}|${W}x${H}`;
    let an = ANCHORS.get(id);
    if (!an) {
        const f = scene.face ?? null;
        an = f
            ? { cx: (f.x + f.w / 2) * W, cy: (f.y + f.h) * H - 0.08 * f.h * H, span: Math.min(W - 2 * m, f.w * W * 3.2), face: f }
            : { cx: W / 2, cy: p.y * H, span: W * 0.62, face: null };
        if (ANCHORS.size > 500)
            ANCHORS.clear();
        ANCHORS.set(id, an);
    }
    const item = (w, k = 1) => {
        const tier = hl.has(w) ? key : isConnector(w) ? connector : content;
        const px = font(ctx, tier, S, k);
        const text = cased(tier, w.text);
        return { w, tier, text, px, cap, width: ctx.measureText(text).width, k };
    };
    const gapX = (l) => l.px * 0.24;
    const widthOf = (line) => line.reduce((a, l, i) => a + l.width + (i ? gapX(l) : 0), 0);
    const capOf = (line) => Math.max(0, ...line.map(l => l.px * l.cap));
    // the highlight line, scaled so it spans the shoulders (never past the frame)
    const base = c.key.map(w => item(w));
    const kScale = c.key.length ? Math.max(0.6, Math.min(3, an.span / Math.max(1, widthOf(base)))) : 1;
    const keyLine = c.key.map(w => item(w, kScale));
    const pairs = (ws) => { const out = []; for (let i = 0; i < ws.length; i += 2)
        out.push(ws.slice(i, i + 2).map(w => item(w))); return out; };
    const above = pairs(c.lead), below = pairs(c.tail);
    const lead = p.gap * S;
    const keyW = widthOf(keyLine), keyCap = capOf(keyLine);
    // vertical: the highlight's cap centred on the shoulder line, the rest stacked above and below, all kept in frame
    const aboveH = above.reduce((a, l) => a + capOf(l) + lead, 0), belowH = below.reduce((a, l) => a + lead + capOf(l), 0);
    let keyTop = an.cy - keyCap / 2;
    keyTop = Math.min(keyTop, H - m - belowH - keyCap);
    keyTop = Math.max(keyTop, m + aboveH);
    const keyLeft = Math.min(Math.max(an.cx - keyW / 2, m), W - m - keyW);
    const placed = [];
    let y = keyTop - lead;
    for (let i = above.length - 1; i >= 0; i--) {
        const line = above[i], w = widthOf(line);
        let x = keyLeft;
        // never into the face: a line that would reach it moves left of it
        const f = an.face;
        if (f && x + w > f.x * W - m && y - capOf(line) < (f.y + f.h) * H + m && y > f.y * H - m)
            x = Math.max(m, f.x * W - m - w);
        placed.unshift({ items: line, x, base: y });
        y -= capOf(line) + lead;
    }
    if (keyLine.length)
        placed.push({ items: keyLine, x: keyLeft, base: keyTop + keyCap });
    y = keyTop + keyCap;
    for (const line of below) {
        y += lead + capOf(line);
        placed.push({ items: line, x: Math.max(m, keyLeft + keyW - widthOf(line)), base: y });
    }
    const r = p.enter;
    const drift = 1 + r.drift * (t - c.t0);
    ctx.save();
    ctx.translate(an.cx, an.cy);
    ctx.scale(drift, drift);
    ctx.translate(-an.cx, -an.cy);
    const draw = (behind) => placed.forEach(line => {
        let x = line.x;
        line.items.forEach((l, i) => {
            if (i)
                x += gapX(l);
            const e = t - l.w.t;
            if (e >= 0 && !!l.tier.behind === behind) {
                const k = fromRest(e / r.blurS);
                const dy = (1 - k) * (r.rise ?? 0.04) * S;
                ctx.save();
                if (k < 1)
                    ctx.filter = `blur(${(1 - k) * r.blur * S}px)`;
                font(ctx, l.tier, S, l.k); // each word in its own face and size (the layout pass left the last one set)
                if (l.tier.shiny)
                    paintShiny(ctx, l.tier, l.text, x, line.base + dy, l.px, S, clamp(e / r.fadeS));
                else
                    paintWord(ctx, l.tier, l.text, x, line.base + dy, l.px, S, clamp(e / r.fadeS));
                ctx.restore();
            }
            x += l.width;
        });
    });
    // the highlight behind the speaker, the speaker over it, the plain words in front
    draw(true);
    if (scene.person && placed.some(l => l.items.some(i => i.tier.behind && t >= i.w.t))) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(scene.person, 0, 0, W, H);
        ctx.restore();
    }
    draw(false);
    ctx.restore();
}
/**
 * The poster (Premium Caption 4, ref reel Dd1Mf7xzsbm): the key word is a giant, very tall condensed word standing
 * behind the speaker from the forehead to below the shoulders ("COUNTRIES", "NOBODY"), its letters rising one after
 * another out of a vertical motion trail. The words before it are a small handwritten script tucked on its top-left
 * corner and written on left to right; the words after it are a white sans line over the chest, then the last words in
 * script, right-aligned under the key. Tiers: [script, key, sans]. Text never covers the face.
 */
function drawPoster(ctx, p, c, t, W, H, scene) {
    const S = Math.min(W, H);
    const m = 0.04 * S;
    const [script, key] = p.tiers;
    const sans = p.tiers[2] ?? script;
    const r = p.enter;
    // the anchor, once per card: centred on the speaker, below the face
    const id = `poster|${c.t0}|${W}x${H}`;
    let an = ANCHORS.get(id);
    if (!an) {
        const f = scene.face ?? null;
        an = f
            // like Caption 3 (the look Ishaan approved for text behind the speaker): the key is wider than the shoulders
            // (3.2 face widths) and centred at the neck, so both ends of the word show beside the body and only the neck and
            // shoulders pass in front of it, where the cut-out is solid; across the face, every hole in the matte shows
            ? { cx: (f.x + f.w / 2) * W, cy: (f.y + f.h) * H - 0.08 * f.h * H, span: f.h * H * 0.95, face: f, wmax: Math.min(W - 2 * m, f.w * W * 3.2) }
            : { cx: W / 2, cy: p.y * H, span: H * 0.42, face: null, wmax: W * 0.62 };
        if (ANCHORS.size > 500)
            ANCHORS.clear();
        ANCHORS.set(id, an);
    }
    // the key: as wide as the shoulders span (its height capped at about a face), never past the frame
    const keyWords = c.key;
    const keyText = cased(key, keyWords.map(w => w.text).join(' '));
    let kpx = font(ctx, key, S);
    const kw1 = ctx.measureText(keyText).width * (key.wide ?? 1);
    const k0 = Math.max(0.3, Math.min(an.span / (kpx * cap), (an.wmax ?? W - 2 * m) / Math.max(1, kw1)));
    kpx = font(ctx, key, S, k0);
    const kw0 = ctx.measureText(keyText).width * (key.wide ?? 1);
    const kfit = Math.min(1, (W - 2 * m) / kw0, (H - 2 * m) / (kpx * cap));
    if (kfit < 1)
        kpx = font(ctx, key, S, k0 * kfit);
    const kScale = k0 * Math.min(1, kfit);
    const keyCap = kpx * cap, keyW = ctx.measureText(keyText).width * (key.wide ?? 1);
    const keyLeft = Math.min(Math.max(an.cx - keyW / 2, m), W - m - keyW);
    const keyTop = Math.min(Math.max(an.cy - keyCap / 2, m), H - m - keyCap);
    const keyBase = keyTop + keyCap;
    // the words around it
    // after the key: the first half in white sans over the chest, the rest as closing script ("about working" / "tells you")
    const tail = c.tail;
    const sansWords = tail.slice(0, tail.length >= 2 ? Math.ceil(tail.length / 2) : tail.length);
    const closing = tail.slice(sansWords.length);
    const drift = 1 + r.drift * (t - c.t0);
    ctx.save();
    ctx.translate(an.cx, an.cy);
    ctx.scale(drift, drift);
    ctx.translate(-an.cx, -an.cy);
    // 1. the key, behind the speaker: letter by letter out of a vertical trail
    if (keyWords.length && t >= keyWords[0].t) {
        font(ctx, key, S, kScale);
        const e = t - keyWords[0].t;
        const kw = key.wide ?? 1;
        let x = keyLeft;
        const chars = [...keyText];
        chars.forEach((ch, i) => {
            const cw = ctx.measureText(ch).width * kw;
            const le = e - i * r.stagger;
            if (le > 0) {
                const k = fromRest(le / r.blurS);
                const dy = (1 - k) * keyCap * (r.rise ?? 0.6);
                ctx.save();
                ctx.translate(x, 0);
                ctx.scale(kw, 1);
                // the motion trail: faint copies below the letter while it travels, gone when it lands
                if (k < 1)
                    for (const [o, a] of [[0.18, 0.25], [0.36, 0.12]])
                        paintWord(ctx, key, ch, 0, keyBase + dy + o * keyCap * (1 - k), kpx, S, a * (1 - k) * clamp(le / r.fadeS));
                paintWord(ctx, key, ch, 0, keyBase + dy, kpx, S, clamp(le / r.fadeS));
                ctx.restore();
            }
            x += cw;
        });
    }
    // the speaker over it
    if (scene.person && keyWords.length && t >= keyWords[0].t) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(scene.person, 0, 0, W, H);
        ctx.restore();
    }
    // 2. the script lead, tucked on the key's top-left corner, written on left to right
    const writeOn = (ws, x, base, alignRight) => {
        if (!ws.length)
            return;
        const px = font(ctx, script, S);
        const text = cased(script, ws.map(w => w.text).join(' '));
        const tw = ctx.measureText(text).width;
        const e = t - ws[0].t;
        if (e < 0)
            return;
        const x0 = alignRight ? x - tw : x;
        const k = fromRest(e / (r.writeS ?? 0.45));
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0 - px * 0.3, base - px * 1.4, (tw + px * 0.6) * k, px * 2.2);
        ctx.clip();
        paintWord(ctx, script, text, x0, base, px, S, 1);
        ctx.restore();
    };
    if (c.lead.length) {
        const spx = font(ctx, script, S);
        let lx = keyLeft + keyW * 0.02;
        const f = an.face;
        const lb = keyTop + spx * 0.55;
        const lw = ctx.measureText(cased(script, c.lead.map(w => w.text).join(' '))).width;
        // never into the face: move the script left of it when it would reach it
        // never into the face: move the script left of it when it would reach it
        if (f && lx + lw > f.x * W - m && lb > f.y * H - m && lb - spx < (f.y + f.h) * H + m)
            lx = Math.max(m, f.x * W - m - lw);
        writeOn(c.lead, lx, lb, false);
    }
    // 3. the sans line over the chest (in front), then the closing script, right-aligned under the key
    if (sansWords.length) {
        const px = font(ctx, sans, S);
        const text = cased(sans, sansWords.map(w => w.text).join(' '));
        const tw = ctx.measureText(text).width;
        let x = an.cx - tw / 2;
        // over the chest, never on the face: at least a margin under the face box
        const faceBottom = an.face ? (an.face.y + an.face.h) * H + m + px * cap : 0;
        const base = Math.min(Math.max(keyBase - keyCap * 0.12, faceBottom), H - m);
        let wx = x;
        for (const w of sansWords) {
            font(ctx, sans, S);
            const s = cased(sans, w.text), ww = ctx.measureText(s).width;
            const e = t - w.t;
            if (e >= 0) {
                const k = fromRest(e / 0.25);
                ctx.save();
                if (k < 1)
                    ctx.filter = `blur(${(1 - k) * 0.01 * S}px)`;
                paintWord(ctx, sans, s, wx, base + (1 - k) * 0.02 * S, px, S, clamp(e / 0.12));
                ctx.restore();
            }
            wx += ww + ctx.measureText(' ').width;
        }
        x = wx;
    }
    if (closing.length) {
        const spx = font(ctx, script, S);
        const fb = an.face ? (an.face.y + an.face.h) * H + m + spx * 0.9 : 0;
        writeOn(closing, keyLeft + keyW, Math.min(Math.max(keyBase + spx * 0.9, fb), H - m), true);
    }
    ctx.restore();
}
/**
 * The shiny negative (Premium Caption 3's highlight): inside the letters the frame is inverted (difference with
 * white), so the background decides the colour, then saturation and brightness are pushed to the bright side, so the
 * word reads as a shiny, transparent light blue, orange or green depending on what is behind it, with the video's
 * texture still moving inside. A light sheen runs over the top. Flat: no 3D, no perspective.
 */
function paintShiny(ctx, tier, text, x, y, px, S, alpha) {
    const sh = tier.shiny;
    const m = ctx.getTransform();
    const pad = Math.ceil(px * 0.2);
    const tw = ctx.measureText(text).width;
    // the word's box in canvas pixels (the stack only scales and translates)
    const bx = Math.floor(m.a * (x - pad) + m.e), by = Math.floor(m.d * (y - px - pad) + m.f);
    const bw = Math.ceil(m.a * (tw + pad * 2)), bh = Math.ceil(m.d * (px * 1.35 + pad * 2));
    if (bw < 2 || bh < 2)
        return;
    const o = new OffscreenCanvas(bw, bh), g = o.getContext('2d');
    // 1. the frame under the word, inverted: the background decides the colour
    g.drawImage(ctx.canvas, bx, by, bw, bh, 0, 0, bw, bh);
    g.globalCompositeOperation = 'difference';
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, bw, bh);
    // 2. hue/saturation and brightness on the bright side: shiny, not muddy
    g.globalCompositeOperation = 'copy';
    g.filter = `saturate(${sh.saturate}) brightness(${sh.lift}) contrast(${sh.contrast})`;
    g.drawImage(o, 0, 0);
    g.filter = 'none';
    // 3. the sheen: a light band over the top of the letters
    const sg = g.createLinearGradient(0, pad * m.d, 0, (pad + px) * m.d);
    sg.addColorStop(0, `rgba(255,255,255,${sh.sheen})`);
    sg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalCompositeOperation = 'screen';
    g.fillStyle = sg;
    g.fillRect(0, 0, bw, bh);
    // 4. kept only inside the letters
    g.globalCompositeOperation = 'destination-in';
    g.setTransform(m.a, 0, 0, m.d, 0, 0);
    setFace(g);
    g.fillStyle = '#FFFFFF';
    g.fillText(text, pad, pad + px);
    g.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha * sh.opacity;
    if (tier.shadow) {
        ctx.shadowColor = tier.shadow.color;
        ctx.shadowBlur = tier.shadow.blur * S * m.a;
    }
    ctx.drawImage(o, bx, by);
    ctx.restore();
}

export { premiumCaption1, cards, drawCaption, ticks, accentFromPixels, litKey };

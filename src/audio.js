// Generative slow jazz with the Web Audio API (no recordings): ~66 BPM swing ballad, ii–V–I cycling through keys,
// Rhodes-style comping, walking upright bass, brushes + soft ride, sparse melody, optional lead voice, plate-ish reverb.
// Also plays the user's own MP3 files as a playlist. Starts only after the first user gesture.

const BPM = 66, BEAT = 60 / BPM, SLOT = BEAT / 3;
const KEYS = [0, 5, 10, 3, 8, 1];
const SCALES = { m7: [0, 2, 3, 5, 7, 9, 10], 7: [0, 2, 4, 5, 7, 9, 10], maj7: [0, 2, 4, 5, 7, 9, 11] };
const THIRD = { m7: 3, 7: 4, maj7: 4 }, SEVENTH = { m7: 10, 7: 10, maj7: 11 };
const COMP = [[0, 5], [2, 8], [5, 9], [2, 6, 11], [3, 8], [0, 8], [2, 5, 9]];
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];

function chordFor(bar) {
  const k = KEYS[Math.floor(bar / 4) % KEYS.length], b = bar % 4;
  return b === 0 ? { r: (k + 2) % 12, t: 'm7' } : b === 1 ? { r: (k + 7) % 12, t: '7' } : { r: k, t: 'maj7' };
}

export class JazzAudio {
  constructor(settings = {}) {
    this.ctx = null; this.vol = settings.vol ?? 0.7; this.muted = !!settings.muted; this.mode = settings.mode ?? 'generated';
    this.lead = null; this.muffled = false; this.list = []; this.idx = -1; this.onChange = () => {}; this.phrase = {}; this.leadPhrase = {}; this.step = 0; this.crowd = 0;
  }
  get running() { return !!this.ctx && this.ctx.state === 'running' && !this.muted && (this.mode === 'generated' || (this.el && !this.el.paused)); }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 18000;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    this.out = c.createGain(); this.master.connect(this.out); this.out.connect(this.lp); this.lp.connect(comp); comp.connect(c.destination); this.setVolume(this.vol);
    this.gen = c.createGain(); this.gen.connect(this.master);
    this.bus = c.createGain(); const dry = c.createGain(); dry.gain.value = 0.8; this.bus.connect(dry); dry.connect(this.gen);
    const send = c.createGain(); send.gain.value = 0.42; this.bus.connect(send);
    const conv = c.createConvolver(); conv.buffer = this.impulse(2.6); send.connect(conv); conv.connect(this.gen);
    // Rhodes tremolo bus
    this.rbus = c.createGain(); this.rbus.gain.value = 0.9; this.rbus.connect(this.bus);
    const lfo = c.createOscillator(); lfo.frequency.value = 4.6; const ld = c.createGain(); ld.gain.value = 0.08; lfo.connect(ld); ld.connect(this.rbus.gain); lfo.start();
    // noise
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; this.noise = nb;
    this.crowdGain = c.createGain(); this.crowdGain.gain.value = 0; const cs = c.createBufferSource(); cs.buffer = nb; cs.loop = true; const cb = c.createBiquadFilter(); cb.type = 'bandpass'; cb.frequency.value = 480; cb.Q.value = 0.5;
    cs.connect(cb); cb.connect(this.crowdGain); this.crowdGain.connect(this.master); cs.start();
    this.mediaGain = c.createGain(); this.mediaGain.connect(this.master);
    this.tNext = c.currentTime + 0.15; this.timer = setInterval(() => this.pump(), 40);
    this.setMode(this.mode);
  }
  impulse(sec) {
    const c = this.ctx, len = c.sampleRate * sec, b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let y = 0; for (let i = 0; i < len; i++) { y += ((rnd() * 2 - 1) - y) * 0.3; d[i] = y * Math.pow(1 - i / len, 2.6); } }
    return b;
  }

  // ── controls ──────────────────────────────────────────────────────────────
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : v * 0.9, this.ctx.currentTime, 0.05); }
  setMuted(m) { this.muted = m; this.setVolume(this.vol); this.onChange(); }
  setMuffled(b, cutoff = 650) { if (b === this.muffled && cutoff === this.cut) return; this.muffled = b; this.cut = cutoff; if (this.lp) this.lp.frequency.setTargetAtTime(b ? cutoff : 18000, this.ctx.currentTime, 0.2); }
  /** distance-based level for standing outside the bar (1 = indoors) */
  setOutGain(g) { if (this.out) this.out.gain.setTargetAtTime(g, this.ctx.currentTime, 0.25); }
  setLead(kind) { this.lead = kind === 'none' ? null : kind; }
  setCrowd(n) { if (this.crowdGain) this.crowdGain.gain.setTargetAtTime(Math.min(n, 50) / 50 * 0.05, this.ctx.currentTime, 1); }
  setMode(m) {
    this.mode = m; if (!this.ctx) return;
    this.gen.gain.setTargetAtTime(m === 'generated' ? 1 : 0, this.ctx.currentTime, 0.1);
    if (m === 'generated') this.el?.pause(); else if (this.list.length) { if (this.idx < 0) this.playIndex(0); else this.el.play().catch(() => {}); }
    this.onChange();
  }
  loadFiles(files) {
    this.start(); const arr = [...files].filter(f => f.type.startsWith('audio/') || /\.(mp3|m4a|ogg|wav)$/i.test(f.name));
    if (!arr.length) return 0;
    for (const f of arr) this.list.push({ name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f) });
    if (!this.el && this.ctx) { this.el = new Audio(); this.el.crossOrigin = 'anonymous'; this.el.addEventListener('ended', () => this.next()); this.ctx.createMediaElementSource(this.el).connect(this.mediaGain); }
    this.onChange(); return arr.length;
  }
  playIndex(i) { if (!this.list.length || !this.el) return; this.idx = (i + this.list.length) % this.list.length; this.el.src = this.list[this.idx].url; this.el.play().catch(() => {}); this.onChange(); }
  next() { this.playIndex(this.idx + 1); } prev() { this.playIndex(this.idx - 1); }
  togglePlay() { if (!this.el) return; if (this.el.paused) { this.idx < 0 ? this.playIndex(0) : this.el.play(); } else this.el.pause(); this.onChange(); }
  clearList() { this.el?.pause(); this.list = []; this.idx = -1; this.setMode('generated'); }

  // ── scheduler ─────────────────────────────────────────────────────────────
  pump() {
    const c = this.ctx; if (!c) return;
    if (c.currentTime > this.tNext + 1) this.tNext = c.currentTime + 0.1; // tab was throttled
    while (this.tNext < c.currentTime + 0.25) { if (this.mode === 'generated' && !this.muted && c.state === 'running') this.slot(this.step, this.tNext); this.tNext += SLOT; this.step++; }
  }
  slot(step, t) {
    const sib = step % 3, beat = Math.floor(step / 3) % 4, bar = Math.floor(step / 12), inBar = step % 12, ch = chordFor(bar), nx = chordFor(bar + 1);
    if (inBar === 0) this.planBar(bar, ch);
    // drums
    if (sib === 0) { this.ride(t, beat === 0 ? 0.06 : 0.05); if (beat % 2 === 1) { this.swish(t, 0.05); this.hat(t, 0.05); } if (beat === 0 && rnd() < 0.5) this.kick(t, 0.07); }
    if (sib === 2 && beat % 2 === 1) this.ride(t, 0.04);
    if (sib === 2 && rnd() < 0.08) this.swish(t, 0.025);
    // walking bass
    if (sib === 0) {
      const base = 36 + (ch.r % 12), root = base > 47 ? base - 12 : base, nroot = (() => { const b = 36 + (nx.r % 12); return b > 47 ? b - 12 : b; })();
      const third = root + THIRD[ch.t], fifth = root + 7, sev = root + SEVENTH[ch.t];
      const note = beat === 0 ? root : beat === 1 ? pick([third, fifth, root + 12 > 52 ? root : root + 12]) : beat === 2 ? pick([fifth, sev, third]) : nroot + (rnd() < 0.5 ? 1 : -1);
      this.bass(note, t, BEAT * 0.88, 0.2);
    }
    // Rhodes comping
    if (this.comp.includes(inBar)) { const r = 48 + (ch.r % 12), v = [r + THIRD[ch.t], r + SEVENTH[ch.t], r + 14]; v.forEach((m, i) => this.rhodes(m, t + i * 0.012, BEAT * 0.7, 0.045)); }
    // melodies
    const lp = this.leadPhrase[inBar]; if (lp && this.lead) this.voice(lp.m, t, lp.d * SLOT, 0.1, this.lead);
    const rp = this.phrase[inBar]; if (rp) this.rhodes(rp.m, t, rp.d * SLOT, 0.06);
  }
  planBar(bar, ch) {
    this.comp = pick(COMP); const sc = SCALES[ch.t];
    const pool = (lo, hi) => { const a = []; for (let m = lo; m <= hi; m++) if (sc.includes(((m - ch.r) % 12 + 12) % 12)) a.push(m); return a; };
    const mk = (poolArr, prob, maxN, hold) => {
      const out = {}; if (rnd() > prob) return out;
      const slots = [0, 2, 3, 5, 6, 8, 9, 11]; let i = Math.floor(rnd() * poolArr.length), s = pick([0, 2, 3, 5]);
      const n = 2 + Math.floor(rnd() * (maxN - 1));
      for (let k = 0; k < n && s < 12; k++) {
        const nxt = slots.filter(x => x > s); const e = nxt.length && k < n - 1 ? pick(nxt.slice(0, 3)) : 12;
        out[s] = { m: poolArr[Math.max(0, Math.min(poolArr.length - 1, i))], d: Math.min((e - s) * (hold ? 1 : 0.9), 8) };
        i += pick([-2, -1, -1, 1, 1, 2, 3, -3]); s = e;
      }
      return out;
    };
    this.phrase = mk(pool(64, 83), this.lead ? 0.12 : 0.5, 5, false);
    const lo = this.lead === 'vocal' ? 60 : 58, hi = this.lead === 'vocal' ? 77 : 80;
    this.leadPhrase = this.lead ? mk(pool(lo, hi), 0.8, 6, true) : {};
  }

  // ── instruments ───────────────────────────────────────────────────────────
  env(g, t, a, peak, dur, rel = 0.15, sus = 0.4) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(peak * sus, 0.0002), t + Math.max(a + 0.01, dur * 0.8)); g.gain.setTargetAtTime(0, t + dur, rel);
  }
  rhodes(m, t, dur, vel) {
    const c = this.ctx, f = mf(m), g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600 + m * 20;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator(), g2 = c.createGain(), g3 = c.createGain();
    o1.type = 'sine'; o2.type = 'sine'; o3.type = 'sine'; o1.frequency.value = f; o2.frequency.value = f * 2; o3.frequency.value = f * 7.02;
    g2.gain.setValueAtTime(0.35, t); g2.gain.exponentialRampToValueAtTime(0.02, t + 0.5); g3.gain.setValueAtTime(0.09, t); g3.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o1.connect(g); o2.connect(g2); g2.connect(g); o3.connect(g3); g3.connect(g); g.connect(lp); lp.connect(this.rbus);
    this.env(g, t, 0.004, vel, dur, 0.18, 0.3); const end = t + dur + 1.2;
    [o1, o2, o3].forEach(o => { o.start(t); o.stop(end); });
  }
  bass(m, t, dur, vel) {
    const c = this.ctx, f = mf(m), g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.8;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain(); o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = f; o2.frequency.value = f * 2; g2.gain.value = 0.35;
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(this.bus); this.env(g, t, 0.012, vel, dur, 0.06, 0.25);
    const n = c.createBufferSource(); n.buffer = this.noise; const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 600; const ng = c.createGain(); ng.gain.setValueAtTime(vel * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04); n.connect(nf); nf.connect(ng); ng.connect(this.bus); n.start(t, rnd(), 0.06);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.5); o2.stop(t + dur + 0.5);
  }
  nz(t, type, freq, q, vel, a, dec, off = 0) {
    const c = this.ctx, n = c.createBufferSource(); n.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + a); g.gain.exponentialRampToValueAtTime(0.0003, t + a + dec); n.connect(f); f.connect(g); g.connect(this.bus); n.start(t, rnd() * 0.8, a + dec + 0.1); return f;
  }
  ride(t, vel) {
    this.nz(t, 'bandpass', 8200, 0.9, vel * 0.9, 0.002, 0.7);
    const c = this.ctx; for (const fr of [3140, 4570, 6290]) { const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = fr; g.gain.setValueAtTime(vel * 0.05, t); g.gain.exponentialRampToValueAtTime(0.0002, t + 0.45); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; o.connect(hp); hp.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.5); }
  }
  swish(t, vel) { const f = this.nz(t, 'bandpass', 2200, 0.8, vel, 0.07, 0.22); f.frequency.setValueAtTime(2000, t); f.frequency.linearRampToValueAtTime(4200, t + 0.25); }
  hat(t, vel) { this.nz(t, 'highpass', 7000, 0.7, vel, 0.001, 0.05); }
  kick(t, vel) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.2); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.25); }
  voice(m, t, dur, vel, kind) {
    const c = this.ctx, f = mf(m), vocal = kind === 'vocal', mix = c.createGain(), out = c.createGain();
    const o = c.createOscillator(), o2 = c.createOscillator(); o.type = 'sawtooth'; o2.type = vocal ? 'sawtooth' : 'square'; o.frequency.setValueAtTime(this.lastF ?? f, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); o2.frequency.value = f * 1.004; this.lastF = f;
    const g2 = c.createGain(); g2.gain.value = vocal ? 0.5 : 0.25; o2.connect(g2); o.connect(mix); g2.connect(mix);
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = vocal ? 5.6 : 5.0; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * (vocal ? 0.018 : 0.012), t + 0.35); vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    const forms = vocal ? [[800, 9, 1], [1150, 9, 0.55], [2800, 12, 0.25]] : [[650, 5, 1], [1700, 6, 0.55], [2600, 8, 0.2]];
    for (const [fr, q, gn] of forms) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fr; b.Q.value = q; const gg = c.createGain(); gg.gain.value = gn; mix.connect(b); b.connect(gg); gg.connect(out); }
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = vocal ? 3400 : 3000; out.connect(lp); lp.connect(this.bus);
    this.env(out, t, vocal ? 0.12 : 0.07, vel * 3.2, dur, 0.12, 0.8);
    if (!vocal) { const br = c.createBufferSource(); br.buffer = this.noise; const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 2400; const bg = c.createGain(); bg.gain.value = vel * 0.12; br.connect(bf); bf.connect(bg); bg.connect(lp); br.start(t, rnd(), dur); br.stop(t + dur); }
    const end = t + dur + 0.6; [o, o2, vib].forEach(x => { x.start(t); x.stop(end); });
  }
}

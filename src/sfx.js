// Tiny WebAudio sound engine — everything synthesized, no audio files.
// The AudioContext is created lazily on first use (must be a user gesture).
// All sounds route through a master gain so mute is one knob.

let ctx = null
let master = null
let muted = false
let roomStarted = false

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 1
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(m) {
  muted = m
  if (master) master.gain.value = m ? 0 : 1
}

export function isMuted() {
  return muted
}

// A short filtered noise tick — sounds like a mouse button.
function tick(freq, gainVal, dur, type = 'bandpass') {
  const ac = ensureCtx()
  const buf = ac.createBuffer(1, Math.max(1, (ac.sampleRate * dur) | 0), ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3)
  }
  const src = ac.createBufferSource()
  src.buffer = buf
  const bp = ac.createBiquadFilter()
  bp.type = type
  bp.frequency.value = freq
  bp.Q.value = 1.2
  const g = ac.createGain()
  g.gain.value = gainVal
  src.connect(bp)
  bp.connect(g)
  g.connect(master)
  src.start()
}

export function clickDown() {
  tick(2200, 0.5, 0.025)
}

export function clickUp() {
  tick(3200, 0.3, 0.018)
}

// Mechanical keyboard clack while typing — pitch varies per key.
export function keyClack() {
  tick(1600 + Math.random() * 1100, 0.14, 0.014)
}

// Soft footstep thud — alternate feet get slightly different pitch.
let stepFlip = false
export function footstep() {
  stepFlip = !stepFlip
  tick(stepFlip ? 240 : 210, 0.35, 0.055, 'lowpass')
}

// Cheerful two-tone ding for completing a whiteboard task.
export function taskDing() {
  const ac = ensureCtx()
  const t = ac.currentTime
  ;[
    [660, 0],
    [990, 0.09],
  ].forEach(([f, d]) => {
    const o = ac.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = ac.createGain()
    g.gain.setValueAtTime(0.0001, t + d)
    g.gain.exponentialRampToValueAtTime(0.18, t + d + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.25)
    o.connect(g)
    g.connect(master)
    o.start(t + d)
    o.stop(t + d + 0.3)
  })
}

// Physics impact thud — volume follows collision speed. Rate-limited so a
// tumbling pile doesn't machine-gun.
let lastImpact = 0
export function impact(v) {
  const now = Date.now()
  if (now - lastImpact < 80) return
  lastImpact = now
  const ac = ensureCtx()
  const t = ac.currentTime
  const dur = 0.11
  const buf = ac.createBuffer(1, (ac.sampleRate * dur) | 0, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5)
  const src = ac.createBufferSource()
  src.buffer = buf
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 420 + Math.min(v, 10) * 60
  const g = ac.createGain()
  g.gain.value = Math.min(0.16, 0.02 + v * 0.016)
  src.connect(lp)
  lp.connect(g)
  g.connect(master)
  src.start(t)
}

// Horn: classic double beep. Cars get a two-tone chord, bikes a higher
// single tone.
export function horn(kind = 'car') {
  const ac = ensureCtx()
  const freqs = kind === 'bike' ? [620] : [400, 505]
  const t0 = ac.currentTime
  for (const start of [0, 0.3]) {
    const g = ac.createGain()
    const t = t0 + start
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(kind === 'bike' ? 0.11 : 0.13, t + 0.02)
    g.gain.setValueAtTime(kind === 'bike' ? 0.11 : 0.13, t + 0.16)
    g.gain.linearRampToValueAtTime(0, t + 0.2)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1800
    lp.connect(g)
    g.connect(master)
    for (const f of freqs) {
      const o = ac.createOscillator()
      o.type = 'square'
      o.frequency.value = f
      o.connect(lp)
      o.start(t)
      o.stop(t + 0.22)
    }
  }
}

// Car engine — a synthesized four-stroke, not a drone. The realism comes
// from an LFO that "chops" the amplitude at the firing rate (that pulsing
// brap), riding on two detuned saws + a sub, plus a whiff of noise for
// grit, all under a lowpass that opens as you rev.
let engine = null
export function engineStart(kind = 'car') {
  const ac = ensureCtx()
  if (engine) return
  const bike = kind === 'bike'
  const out = ac.createGain()
  out.gain.value = 0
  out.connect(master)

  // core rumble: two slightly-detuned saws + a sub octave
  const o1 = ac.createOscillator()
  o1.type = 'sawtooth'
  o1.frequency.value = 48
  const o2 = ac.createOscillator()
  o2.type = 'sawtooth'
  o2.frequency.value = 48
  o2.detune.value = -14
  const sub = ac.createOscillator()
  sub.type = 'triangle'
  sub.frequency.value = 24

  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 500
  lp.Q.value = 5

  // firing "chop": an LFO drives a gain so the tone pulses like cylinders
  // firing — the rate climbs with revs (set in engineSpeed)
  const chop = ac.createGain()
  chop.gain.value = 0.55
  const lfo = ac.createOscillator()
  lfo.type = 'sawtooth'
  lfo.frequency.value = 20
  const lfoDepth = ac.createGain()
  lfoDepth.gain.value = 0.4
  lfo.connect(lfoDepth)
  lfoDepth.connect(chop.gain)

  // grit: quiet bandpassed noise
  const nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
  const nd = nbuf.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
  const noise = ac.createBufferSource()
  noise.buffer = nbuf
  noise.loop = true
  const nbp = ac.createBiquadFilter()
  nbp.type = 'bandpass'
  nbp.frequency.value = 700
  nbp.Q.value = 0.7
  const ng = ac.createGain()
  ng.gain.value = 0.015

  o1.connect(lp)
  o2.connect(lp)
  sub.connect(lp)
  lp.connect(chop)
  chop.connect(out)
  noise.connect(nbp)
  nbp.connect(ng)
  ng.connect(out)

  o1.start()
  o2.start()
  sub.start()
  lfo.start()
  noise.start()
  // bikes: higher-pitched, revvier, a bit more grit
  engine = { o1, o2, sub, lfo, lp, ng, out, base: bike ? 70 : 42, span: bike ? 230 : 150, chop: bike ? 30 : 16, chopSpan: bike ? 120 : 74 }
  out.gain.linearRampToValueAtTime(0.5, ac.currentTime + 0.4)
}
export function engineSpeed(rpm) {
  // rpm: 0..1 (idle → redline)
  if (!engine) return
  const r = Math.max(0, Math.min(1, rpm))
  const f = engine.base + r * engine.span
  engine.o1.frequency.value = f
  engine.o2.frequency.value = f
  engine.sub.frequency.value = f * 0.5
  engine.lfo.frequency.value = engine.chop + r * engine.chopSpan // firing rate climbs with revs
  engine.lp.frequency.value = 400 + r * 3200 // opens up = brighter at revs
  engine.ng.gain.value = 0.012 + r * 0.03
  engine.out.gain.value = 0.32 + r * 0.24
}
export function engineStop() {
  if (!engine) return
  const ac = ensureCtx()
  engine.out.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3)
  const e = engine
  engine = null
  screechStop()
  setTimeout(() => {
    try {
      e.o1.stop()
      e.o2.stop()
      e.sub.stop()
      e.lfo.stop()
    } catch {}
  }, 400)
}

// Tyre screech / burnout — a looping bandpassed-noise squeal, gain ramped
// on/off so it can sustain during a clutch-drop.
let screech = null
export function screechStart() {
  const ac = ensureCtx()
  if (screech) return
  const buf = ac.createBuffer(1, (ac.sampleRate * 0.5) | 0, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buf
  src.loop = true
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1300
  bp.Q.value = 2.5
  const g = ac.createGain()
  g.gain.value = 0
  src.connect(bp)
  bp.connect(g)
  g.connect(master)
  src.start()
  g.gain.linearRampToValueAtTime(0.09, ac.currentTime + 0.05)
  screech = { src, g }
}
export function screechStop() {
  if (!screech) return
  const ac = ensureCtx()
  const s = screech
  screech = null
  s.g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.12)
  setTimeout(() => {
    try {
      s.src.stop()
    } catch {}
  }, 160)
}

// Gearshift — a short mechanical clack (a touch beefier than a mouse click).
export function shiftClack() {
  const ac = ensureCtx()
  const t = ac.currentTime
  const buf = ac.createBuffer(1, (ac.sampleRate * 0.05) | 0, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4)
  const src = ac.createBufferSource()
  src.buffer = buf
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 220
  bp.Q.value = 1.5
  const g = ac.createGain()
  g.gain.value = 0.12
  src.connect(bp)
  bp.connect(g)
  g.connect(master)
  src.start(t)
}

// Roller-door motor: low mechanical rumble + slat rattle for ~2.2s.
export function doorMotor() {
  const ac = ensureCtx()
  const t = ac.currentTime
  const DUR = 2.2
  const g = ac.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.11, t + 0.15)
  g.gain.setValueAtTime(0.11, t + DUR - 0.3)
  g.gain.linearRampToValueAtTime(0, t + DUR)
  g.connect(master)
  // motor hum — detuned saw pair through a lowpass
  for (const f of [52, 57]) {
    const o = ac.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(f, t)
    o.frequency.linearRampToValueAtTime(f * 1.06, t + DUR)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 240
    o.connect(lp)
    lp.connect(g)
    o.start(t)
    o.stop(t + DUR)
  }
  // slat rattle — looped noise through a bandpass
  const buf = ac.createBuffer(1, (ac.sampleRate * 0.5) | 0, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const n = ac.createBufferSource()
  n.buffer = buf
  n.loop = true
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 900
  bp.Q.value = 1.2
  const ng = ac.createGain()
  ng.gain.value = 0.035
  n.connect(bp)
  bp.connect(ng)
  ng.connect(g)
  n.start(t)
  n.stop(t + DUR)
}

// Night-garage room tone: quiet brown-noise air + a faint mains hum.
// Starts once (first user gesture) and loops forever; mute kills it.
export function startRoomTone() {
  if (roomStarted) return
  roomStarted = true
  const ac = ensureCtx()

  // brown noise loop (2s), heavily lowpassed = air handling / night air
  const len = ac.sampleRate * 2
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    d[i] = last * 3.5
  }
  const src = ac.createBufferSource()
  src.buffer = buf
  src.loop = true
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 220
  const g = ac.createGain()
  g.gain.value = 0
  g.gain.linearRampToValueAtTime(0.05, ac.currentTime + 3) // fade in gently
  src.connect(lp)
  lp.connect(g)
  g.connect(master)
  src.start()

  // faint electrical hum from the monitors
  const osc = ac.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = 100
  const og = ac.createGain()
  og.gain.value = 0
  og.gain.linearRampToValueAtTime(0.008, ac.currentTime + 3)
  osc.connect(og)
  og.connect(master)
  osc.start()
}

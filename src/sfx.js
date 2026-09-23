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

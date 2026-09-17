// Tiny WebAudio sound effects — synthesized, no audio files.
// The AudioContext is created lazily on first use (must be a user gesture).

let ctx = null

function ensureCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// A short filtered noise tick — sounds like a mouse button.
// `freq` shifts the character: press is deeper, release is lighter.
function tick(freq, gainVal, dur) {
  const ac = ensureCtx()
  const buf = ac.createBuffer(1, Math.max(1, (ac.sampleRate * dur) | 0), ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3)
  }
  const src = ac.createBufferSource()
  src.buffer = buf
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = 1.2
  const g = ac.createGain()
  g.gain.value = gainVal
  src.connect(bp)
  bp.connect(g)
  g.connect(ac.destination)
  src.start()
}

export function clickDown() {
  tick(2200, 0.5, 0.025)
}

export function clickUp() {
  tick(3200, 0.3, 0.018)
}

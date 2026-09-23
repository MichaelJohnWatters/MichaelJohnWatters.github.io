import { useEffect, useRef, useState } from 'react'
import { TV_PRESETS, ytSearch } from './content'
import { keyClack } from './sfx'

// The "remote": a phone you pick up in the man-cave to cast YouTube to the
// garage TV — search or tap a preset channel, tap a result to cast. Plain
// DOM overlay (above the blending canvas) so typing/scrolling are native.
export default function Phone({ open, tv, onCast, onStop, onClose }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const inputRef = useRef()

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60)
  }, [open])

  if (!open) return null

  const search = async (query, castFirst) => {
    if (!query.trim()) return
    setBusy(true)
    const res = await ytSearch(query)
    setItems(res)
    setBusy(false)
    if (castFirst && res[0]) onCast(res[0].id)
  }

  return (
    <div
      className="phone-wrap"
      onClick={onClose}
      onPointerMove={(e) => {
        // in-game dot cursor (native cursor stays hidden — same dot as the
        // FP crosshair, but it follows the freed mouse)
        const d = document.getElementById('phone-dot')
        if (d) {
          d.style.left = e.clientX + 'px'
          d.style.top = e.clientY + 'px'
        }
      }}
    >
      <div id="phone-dot" className="crosshair phone-dot" />
      {/* held up from the bottom-right, like an FPS prop */}
      <div className="phone" onClick={(e) => e.stopPropagation()}>
        <div className="phone-status">
          <span>9:41</span>
          <div className="phone-island" />
          <span>📶 🔋</span>
        </div>
        <div className="phone-head">📺 cast to garage TV</div>
        <input
          ref={inputRef}
          className="phone-input"
          placeholder="search youtube…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => (window.__termTyping = true)}
          onBlur={() => (window.__termTyping = false)}
          onKeyDown={(e) => {
            // keep keystrokes off the window listeners (walk keys, L, V…)
            e.stopPropagation()
            keyClack()
            if (e.key === 'Enter') search(q, false)
          }}
        />
        <div className="phone-presets">
          {TV_PRESETS.map((p) => (
            <button key={p.key} onClick={() => search(p.q, true)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="phone-list">
          {busy && <div className="phone-note">searching…</div>}
          {!busy && !items.length && (
            <div className="phone-note">search, or tap a channel to cast its top hit</div>
          )}
          {items.map((it) => (
            <button
              key={it.id}
              className={'phone-item' + (tv === it.id ? ' casting' : '')}
              onClick={() => onCast(it.id)}
            >
              <img src={`https://i.ytimg.com/vi/${it.id}/mqdefault.jpg`} alt="" />
              <span>{it.title}</span>
            </button>
          ))}
        </div>
        <div className="phone-foot">
          {tv && (
            <button className="phone-stop" onClick={onStop}>
              ■ stop casting
            </button>
          )}
          <button className="phone-close" onClick={onClose}>
            ✕ put phone down
          </button>
        </div>
        <div className="phone-home" />
      </div>
    </div>
  )
}

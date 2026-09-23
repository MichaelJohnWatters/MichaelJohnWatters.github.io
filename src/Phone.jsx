import { useEffect, useRef, useState } from 'react'
import { TV_PRESETS, ytSearch } from './content'
import { keyClack, clickDown, taskDing } from './sfx'

const CODE = '1234' // it's on a post-it by the pc. peak security.

// The "remote": a phone you pick up in the man-cave to cast YouTube to the
// garage TV. Every pickup starts LOCKED — passcode 1234 (it's on a post-it
// by the pc). Plain DOM overlay so typing/scrolling are native.
export default function Phone({ open, tv, onCast, onStop, onClose }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [locked, setLocked] = useState(true)
  const [code, setCode] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef()

  // Putting the phone down locks it again — real phones do.
  useEffect(() => {
    if (open) {
      setLocked(true)
      setCode('')
    }
  }, [open])
  useEffect(() => {
    if (open && !locked) setTimeout(() => inputRef.current?.focus(), 60)
  }, [open, locked])

  const pressKey = (d) => {
    keyClack()
    setCode((c) => {
      const next = (c + d).slice(0, 4)
      if (next.length === 4) {
        if (next === CODE) {
          clickDown()
          taskDing()
          setLocked(false)
        } else {
          setShake(true)
          setTimeout(() => setShake(false), 450)
          return ''
        }
      }
      return next
    })
  }

  // Physical keyboard works on the keypad too.
  useEffect(() => {
    if (!open || !locked) return
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) pressKey(e.key)
      else if (e.key === 'Backspace') setCode((c) => c.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, locked])

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
      {/* rises from the bottom-right — picked up into the hand */}
      <div className={'phone' + (shake ? ' shake' : '')} onClick={(e) => e.stopPropagation()}>
        <div className="phone-status">
          <span>9:41</span>
          <div className="phone-island" />
          <span>📶 🔋</span>
        </div>

        {locked ? (
          <div className="phone-lockscreen">
            <div className="phone-lock-clock">
              {String(new Date().getHours()).padStart(2, '0')}:
              {String(new Date().getMinutes()).padStart(2, '0')}
            </div>
            <div className="phone-lock-sub">enter passcode</div>
            <div className="phone-dots">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i < code.length ? 'full' : ''} />
              ))}
            </div>
            <div className="phone-pad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
                k === '' ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    onClick={() => (k === '⌫' ? setCode((c) => c.slice(0, -1)) : pressKey(k))}
                  >
                    {k}
                  </button>
                ),
              )}
            </div>
            <div className="phone-lock-hint">forgot it? it's on a post-it by the pc 🙈</div>
          </div>
        ) : (
          <>
            <div className="yt-head">
              <span className="yt-logo">
                <i>▶</i> MikeTube
              </span>
              {tv && <span className="yt-live">📡 casting</span>}
            </div>
            <input
              ref={inputRef}
              className="phone-input yt-search"
              placeholder="Search MikeTube"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => (window.__termTyping = true)}
              onBlur={() => (window.__termTyping = false)}
              onKeyDown={(e) => {
                // keep keystrokes off the window listeners (walk keys, L…)
                e.stopPropagation()
                keyClack()
                if (e.key === 'Enter') search(q, false)
              }}
            />
            <div className="phone-presets yt-chips">
              {TV_PRESETS.map((p) => (
                <button key={p.key} onClick={() => search(p.q, true)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="phone-list yt-list">
              {busy && <div className="phone-note">searching…</div>}
              {!busy && !items.length && (
                <div className="phone-note">search, or tap a chip to cast its top hit</div>
              )}
              {items.map((it) => (
                <button
                  key={it.id}
                  className={'phone-item yt-item' + (tv === it.id ? ' casting' : '')}
                  onClick={() => onCast(it.id)}
                >
                  <img className="yt-thumb" src={`https://i.ytimg.com/vi/${it.id}/mqdefault.jpg`} alt="" />
                  <span className="yt-title">{it.title}</span>
                  {tv === it.id && <span className="yt-now">▶ now casting on the garage TV</span>}
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
          </>
        )}
        <div className="phone-home" />
      </div>
    </div>
  )
}

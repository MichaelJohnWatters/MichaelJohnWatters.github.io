import { useEffect, useState } from 'react'
import { OS_WINDOWS } from './content'

// The retro-Linux desktop (CDE/Motif vibe) on the PRIMARY monitor — now a real
// little OS: icons open windows, windows stack/focus/close, the Applications
// menu works, the clock ticks. Clicks arrive via Monitors' raycast bridge,
// which hit-tests [data-click] elements in framebuffer coords and calls
// el.click() — so these are all just normal React onClick handlers.
export default function ComputerOS({ mon, cursorRef, screenRef, focusedWin, onFocus }) {
  const [order, setOrder] = useState(['about.txt']) // open windows, last = front
  const [menuOpen, setMenuOpen] = useState(false)
  const [time, setTime] = useState('')

  useEffect(() => {
    const f = () =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    f()
    const id = setInterval(f, 30000)
    return () => clearInterval(id)
  }, [])

  const open = (key) => {
    setMenuOpen(false)
    setOrder((o) => [...o.filter((k) => k !== key), key])
    onFocus?.(`win:${key}`)
  }
  const close = (key) => {
    setOrder((o) => o.filter((k) => k !== key))
    if (focusedWin === key) onFocus?.('desk')
  }
  const focus = (key) => {
    setOrder((o) => [...o.filter((k) => k !== key), key])
    onFocus?.(`win:${key}`)
  }

  return (
    <div className="os-screen" ref={screenRef} style={{ width: mon.pxW, height: mon.pxH }}>
      {/* Desktop surface — clicking empty desktop clears window focus */}
      <div className="desktop" data-click onClick={() => onFocus?.('desk')}>
        {/* Desktop icons — click to open */}
        <div className="desk-icons">
          {OS_WINDOWS.map((w) => (
            <button
              className="desk-icon"
              key={w.title}
              data-click
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                open(w.title)
              }}
            >
              <span className="desk-icon-glyph">▤</span>
              <span className="desk-icon-label">{w.title}</span>
            </button>
          ))}
        </div>

        {/* Open windows, cascaded; click focuses, ✕ closes */}
        {order.map((key) => {
          const idx = OS_WINDOWS.findIndex((x) => x.title === key)
          const w = OS_WINDOWS[idx]
          return (
            <div
              className={`win${focusedWin === key ? ' win-active' : ''}`}
              key={key}
              data-click
              onClick={(e) => {
                e.stopPropagation()
                focus(key)
              }}
              style={{ left: 104 + idx * 26, top: 22 + idx * 18 }}
            >
              <div className="win-title">
                <span>{key} — File Viewer</span>
                <span className="win-btns">
                  <i>_</i>
                  <i>□</i>
                  <i
                    data-click
                    onClick={(e) => {
                      e.stopPropagation()
                      close(key)
                    }}
                  >
                    ✕
                  </i>
                </span>
              </div>
              <div className="win-body">
                <p>{w.body}</p>
              </div>
            </div>
          )
        })}

        {/* Applications menu */}
        {menuOpen && (
          <div className="apps-menu">
            {OS_WINDOWS.map((w) => (
              <button
                className="apps-item"
                key={w.title}
                data-click
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation()
                  open(w.title)
                }}
              >
                ▤ {w.title}
              </button>
            ))}
          </div>
        )}

        <div className="desk-hint">↑ scroll up to leave the desk</div>
      </div>

      {/* Bottom panel / taskbar */}
      <div className="taskbar">
        <button
          className="start-btn"
          data-click
          tabIndex={-1}
          onClick={() => setMenuOpen((m) => !m)}
        >
          🐧 Applications
        </button>
        {order.map((key) => (
          <button
            className="task-open"
            key={key}
            data-click
            tabIndex={-1}
            onClick={() => focus(key)}
          >
            ▤ {key}
          </button>
        ))}
        <div className="clock">{time}</div>
      </div>

      {/* Fake retro cursor — driven by Monitors' raycast router */}
      <svg className="os-cursor" ref={cursorRef} width="18" height="24" viewBox="0 0 18 24">
        <path
          d="M1 1 L1 17 L5 13 L8 20 L11 19 L8 12 L14 12 Z"
          fill="#f5f5f5"
          stroke="#111"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  )
}

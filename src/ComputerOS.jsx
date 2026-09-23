import { useEffect, useRef, useState } from 'react'
import { OS_WINDOWS, downloadCV } from './content'
import { keyClack } from './sfx'
import { IS_TOUCH } from './touch'

// Retro browser: the search box is REAL — enter opens actual Google results
// in a new tab (Google can't be embedded; new-tab is the honest version).
// Bookmarks: embed = renders INSIDE the in-world browser (same-origin /
// embed-friendly pages only — Google & co. forbid iframing, so external
// links open real tabs instead).
const BOOKMARKS = [
  ['This site', './', 'embed'], // the garage, recursively 🤯
  ['CV', 'cv/michael-watters-cv.html', 'embed'],
  ['MX-5 wiki', 'https://en.wikipedia.org/wiki/Mazda_MX-5', 'embed'],
  ['GitHub', 'https://github.com/MichaelJohnWatters', 'tab'],
  ['LinkedIn', 'https://www.linkedin.com/in/michael-watters-b50437167', 'tab'],
]

function WebBrowser({ focused }) {
  const [q, setQ] = useState('')
  const qRef = useRef('')
  const [status, setStatus] = useState('enter = search in-window · shift+enter = your real browser')
  const [page, setPage] = useState(null) // embedded page URL, or null = home
  const [scrollY, setScrollY] = useState(0) // embed scroll (px, visual)
  const hidRef = useRef()

  const openPage = (url, label) => {
    setPage(url)
    setScrollY(0)
    setStatus(`${label} · live — click away! (some sites refuse frames: shift-click those)`)
  }

  // external=true (shift) → the visitor's real browser; else in-window Bing
  // (one of the few engines that still allows being embedded).
  const go = (external) => {
    const s = qRef.current.trim()
    qRef.current = ''
    setQ('')
    if (hidRef.current) hidRef.current.value = ''
    window.__termTyping = false
    if (!s) return
    if (external) {
      window.open('https://www.google.com/search?q=' + encodeURIComponent(s), '_blank', 'noopener')
      setStatus(`→ opened Google for “${s}” in your browser`)
    } else {
      openPage('https://www.bing.com/search?q=' + encodeURIComponent(s), `results for “${s}”`)
    }
  }

  useEffect(() => {
    if (!focused) return
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (document.activeElement === hidRef.current) return
      if (e.key === 'Enter') {
        go(e.shiftKey)
      } else if (e.key === 'Backspace') {
        qRef.current = qRef.current.slice(0, -1)
        setQ(qRef.current)
      } else if (e.key.length === 1) {
        if (qRef.current.length < 40) {
          qRef.current += e.key
          setQ(qRef.current)
        }
      } else {
        return
      }
      window.__termTyping = qRef.current.length > 0
      keyClack()
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.__termTyping = false
    }
  }, [focused])

  return (
    <div className="web">
      <div className="web-bar">
        <button
          className="web-nav"
          data-click
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation()
            setPage(null)
            setStatus('ready.')
          }}
        >
          ⌂
        </button>
        {page && (
          <>
            <button
              className="web-nav"
              data-click
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                setScrollY((s) => Math.max(0, s - 220))
              }}
            >
              ▲
            </button>
            <button
              className="web-nav"
              data-click
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                setScrollY((s) => Math.min(1600, s + 220))
              }}
            >
              ▼
            </button>
          </>
        )}
        <span className="web-addr">{page ? page : 'http://www.noogle.com'}</span>
      </div>
      <div className="web-marks">
        {BOOKMARKS.map(([label, url, kind]) => (
          <button
            className="web-mark"
            key={label}
            data-click
            tabIndex={-1}
            onClick={(e) => {
              const external = e.shiftKey || e.metaKey
              if (kind === 'embed' && !external) {
                openPage(url, label)
              } else {
                window.open(url, '_blank', 'noopener')
                setStatus(
                  kind === 'embed'
                    ? `→ opened ${label} in your browser`
                    : `→ ${label} in your browser (that site blocks embedding)`,
                )
              }
            }}
          >
            ★ {label}
          </button>
        ))}
      </div>
      {page ? (
        <div className="web-embed">
          {/* pointerEvents AUTO: the browser natively hit-tests transformed
              elements, so real clicks/wheel/typing go INTO the page — live
              browsing on the in-world monitor. (Sites that forbid framing
              will refuse to load when navigated to — that's on them.) */}
          <iframe
            src={page}
            title="embedded page"
            // sandbox WITHOUT allow-top-navigation: framed sites cannot
            // "frame-bust" and hijack the visitor's whole tab — links
            // navigate IN-frame; explicit new-tab links still pop out.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            style={{
              width: '200%',
              height: '200%',
              border: 'none',
              pointerEvents: 'auto',
              transform: `scale(0.5) translateY(${-scrollY * 2}px)`,
              transformOrigin: '0 0',
            }}
          />
        </div>
      ) : (
      <div className="web-page">
        <div className="web-logo">
          <span style={{ color: '#4285f4' }}>N</span>
          <span style={{ color: '#ea4335' }}>o</span>
          <span style={{ color: '#fbbc05' }}>o</span>
          <span style={{ color: '#4285f4' }}>g</span>
          <span style={{ color: '#34a853' }}>l</span>
          <span style={{ color: '#ea4335' }}>e</span>
        </div>
        <div
          className="web-search"
          data-click
          onClick={() => {
            if (IS_TOUCH) hidRef.current?.focus()
          }}
        >
          {q}
          {focused && <span className="term-caret">▊</span>}
        </div>
        <button
          className="web-go"
          data-click
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation()
            go(e.shiftKey || e.metaKey)
          }}
        >
          Noogle Search
        </button>
        <div className="web-status">{status}</div>
      </div>
      )}
      <input
        ref={hidRef}
        className="hid-input"
        autoCapitalize="none"
        autoCorrect="off"
        onInput={(e) => {
          qRef.current = e.target.value.slice(0, 40)
          setQ(qRef.current)
          window.__termTyping = qRef.current.length > 0
          keyClack()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') go(e.shiftKey)
        }}
      />
    </div>
  )
}

// A4 page at CSS 96dpi: 794 x 1123 px; the CV is two pages stacked.
const CV_PAGE_W = 794
const CV_DOC_H = 2246
const CV_STEP = 250 // unscaled px per scroll click

// Scaled iframe of the real CV html + a proper right-side scrollbar
// (arrows + draggable proportional thumb) + a prominent PDF download.
function CvViewer({ width, height }) {
  const rootRef = useRef()
  const [scroll, setScroll] = useState(0)
  const scale = Math.max(0.1, (width - 42) / CV_PAGE_W)
  const visH = Math.max(60, (height - 62) / scale)
  const maxScroll = Math.max(0, CV_DOC_H - visH)
  const sc = Math.min(scroll, maxScroll)

  // Thumb dragging: the bridge dispatches os-drag (framebuffer-px deltas).
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onDrag = (e) => {
      const t = e.target
      if (!t.classList || !t.classList.contains('cv-thumb')) return
      const track = t.parentElement
      const range = Math.max(1, track.offsetHeight - t.offsetHeight)
      const ratio = maxScroll / range
      setScroll((s) => Math.max(0, Math.min(maxScroll, s + e.detail.dy * ratio)))
    }
    root.addEventListener('os-drag', onDrag)
    return () => root.removeEventListener('os-drag', onDrag)
  }, [maxScroll])

  const step = (d) => setScroll((s) => Math.max(0, Math.min(maxScroll, s + d)))

  return (
    <div className="cv-viewer" ref={rootRef}>
      <div className="cv-tools">
        <span className="cv-name">Michael-Watters-CV.pdf</span>
        <button
          className="cv-dl"
          data-click
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation()
            downloadCV()
          }}
        >
          ⬇ DOWNLOAD PDF
        </button>
      </div>
      <div className="cv-row">
        <div className="cv-frame">
          <iframe
            src="cv/michael-watters-cv.html"
            title="Michael Watters CV"
            scrolling="no"
            style={{
              width: CV_PAGE_W,
              height: CV_DOC_H,
              border: 'none',
              pointerEvents: 'none',
              transform: `scale(${scale}) translateY(${-sc}px)`,
              transformOrigin: '0 0',
            }}
          />
        </div>
        {/* classic right-side scrollbar: full height, arrows, draggable thumb */}
        <div className="cv-scroll">
          <button
            className="cv-btn"
            data-click
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              step(-CV_STEP)
            }}
          >
            ▲
          </button>
          <div className="cv-track">
            <div
              className="cv-thumb"
              data-drag="cv-thumb"
              style={{
                top: `${(sc / CV_DOC_H) * 100}%`,
                height: `${Math.min(100, (visH / CV_DOC_H) * 100)}%`,
              }}
            />
          </div>
          <button
            className="cv-btn"
            data-click
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              step(CV_STEP)
            }}
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  )
}

// The retro-Linux desktop (CDE/Motif vibe) on the PRIMARY monitor — now a real
// little OS: icons open windows, windows stack/focus/close, the Applications
// menu works, the clock ticks. Clicks arrive via Monitors' raycast bridge,
// which hit-tests [data-click] elements in framebuffer coords and calls
// el.click() — so these are all just normal React onClick handlers.
const DEFAULT_W = 320
const DEFAULT_H = 150

export default function ComputerOS({ mon, screenRef, focusedWin, onFocus }) {
  // CV opens by default, front and focused — it's the first thing a visitor
  // sees on the monitor. about.txt peeks out behind it.
  const [order, setOrder] = useState(['about.txt', 'cv.html'])
  const [menuOpen, setMenuOpen] = useState(false)
  const [time, setTime] = useState('')

  useEffect(() => {
    const f = () =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    f()
    const id = setInterval(f, 30000)
    return () => clearInterval(id)
  }, [])

  // Per-window state: minimized / maximized / position / size.
  const [winState, setWinState] = useState({
    'about.txt': { x: 104, y: 14, w: 350, h: 200 },
    'cv.html': { x: 190, y: 6, w: 390, h: 285 },
  })
  const st = (key) => winState[key] || {}
  const patch = (key, p) => setWinState((s) => ({ ...s, [key]: { ...s[key], ...p } }))

  const open = (key) => {
    setMenuOpen(false)
    const idx = OS_WINDOWS.findIndex((x) => x.title === key)
    const def = OS_WINDOWS[idx] || {}
    setWinState((s) => ({
      ...s,
      [key]: {
        x: 96 + idx * 24,
        y: 16 + idx * 16,
        w: def.defW || DEFAULT_W,
        h: def.defH || DEFAULT_H,
        ...s[key],
        min: false,
      },
    }))
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
  const minimize = (key) => {
    patch(key, { min: true })
    if (focusedWin === key) {
      // hand focus to the top remaining visible window, else the desk
      const rest = order.filter((k) => k !== key && !(winState[k] && winState[k].min))
      onFocus?.(rest.length ? `win:${rest[rest.length - 1]}` : 'desk')
    }
  }
  const toggleMax = (key) => {
    patch(key, { max: !st(key).max, min: false })
    focus(key)
  }
  const taskClick = (key) => {
    if (st(key).min) open(key) // restore + focus
    else if (focusedWin === key) minimize(key) // classic toggle
    else focus(key)
  }

  // Window move/resize via the raycast drag bridge: Monitors dispatches
  // os-dragstart / os-drag (framebuffer-px deltas) on [data-drag] handles.
  const focusRef = useRef()
  focusRef.current = { focusedWin, focus }
  useEffect(() => {
    const root = screenRef.current
    if (!root) return
    const deskW = mon.pxW - 6
    const deskH = mon.pxH - 6 - 30 // minus borders + taskbar
    const cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
    const keyOf = (e) => {
      const t = e.target.closest?.('[data-drag]') || e.target
      return { key: t?.dataset?.winKey, kind: t?.dataset?.drag }
    }
    const onStart = (e) => {
      const { key } = keyOf(e)
      if (key && focusRef.current.focusedWin !== key) focusRef.current.focus(key)
    }
    const onDrag = (e) => {
      const { key, kind } = keyOf(e)
      if (!key) return
      const { dx, dy } = e.detail
      setWinState((s) => {
        const cur = s[key] || {}
        if (cur.max) return s // maximized windows don't move/resize
        if (kind !== 'move') {
          // kind = resize-<edge>: r, l, b, br, bl — any edge/corner
          const edge = kind.split('-')[1] || ''
          let x = cur.x || 0
          let w = cur.w || DEFAULT_W
          let h = cur.h || DEFAULT_H
          if (edge.includes('r')) w = cl(w + dx, 180, deskW - 8)
          if (edge.includes('l')) {
            const nw = cl(w - dx, 180, deskW - 8)
            x = cl(x + (w - nw), 0, deskW - 80)
            w = nw
          }
          if (edge.includes('b')) h = cl(h + dy, 90, deskH - 8)
          return { ...s, [key]: { ...cur, x, w, h } }
        }
        return {
          ...s,
          [key]: {
            ...cur,
            x: cl((cur.x || 0) + dx, 0, deskW - 80),
            y: cl((cur.y || 0) + dy, 0, deskH - 28),
          },
        }
      })
    }
    root.addEventListener('os-dragstart', onStart)
    root.addEventListener('os-drag', onDrag)
    return () => {
      root.removeEventListener('os-dragstart', onStart)
      root.removeEventListener('os-drag', onDrag)
    }
  }, [mon, screenRef])

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
              <span className="desk-icon-glyph">{w.glyph || '▤'}</span>
              <span className="desk-icon-label">{w.title}</span>
            </button>
          ))}
        </div>

        {/* Open windows, cascaded; click focuses; _ □ ✕ all work */}
        {order.map((key) => {
          const idx = OS_WINDOWS.findIndex((x) => x.title === key)
          const w = OS_WINDOWS[idx]
          const s = st(key)
          if (s.min) return null
          return (
            <div
              className={`win${focusedWin === key ? ' win-active' : ''}${s.max ? ' win-max' : ''}`}
              key={key}
              data-click
              onClick={(e) => {
                e.stopPropagation()
                focus(key)
              }}
              style={s.max ? undefined : { left: s.x, top: s.y, width: s.w, height: s.h }}
            >
              <div className="win-title" data-drag="move" data-win-key={key}>
                <span>{key} — File Viewer</span>
                <span className="win-btns">
                  <i
                    data-click
                    onClick={(e) => {
                      e.stopPropagation()
                      minimize(key)
                    }}
                  >
                    _
                  </i>
                  <i
                    data-click
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMax(key)
                    }}
                  >
                    {s.max ? '❐' : '□'}
                  </i>
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
              <div
                className={`win-body${w.kind === 'cv' ? ' win-body-cv' : ''}${w.kind === 'web' ? ' win-body-web' : ''}`}
              >
                {w.kind === 'cv' ? (
                  <CvViewer
                    width={s.max ? mon.pxW - 24 : s.w}
                    height={s.max ? mon.pxH - 76 : s.h}
                  />
                ) : w.kind === 'web' ? (
                  <WebBrowser focused={focusedWin === key} />
                ) : (
                  w.body.map((line, i) => <p key={i}>{line}</p>)
                )}
              </div>
              {!s.max && (
                <>
                  <div className="win-h win-h-l" data-drag="resize-l" data-win-key={key} />
                  <div className="win-h win-h-r" data-drag="resize-r" data-win-key={key} />
                  <div className="win-h win-h-b" data-drag="resize-b" data-win-key={key} />
                  <div className="win-h win-h-bl" data-drag="resize-bl" data-win-key={key} />
                  <div className="win-resize" data-drag="resize-br" data-win-key={key} />
                </>
              )}
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
        {/* pinned quick-launch: always available, open or not */}
        {['netscape.exe', 'cv.html'].map((key) => {
          const w = OS_WINDOWS.find((x) => x.title === key)
          return (
            <button
              className="task-pin"
              key={key}
              title={key}
              data-click
              tabIndex={-1}
              onClick={() => open(key)}
            >
              {w?.glyph || '▤'}
            </button>
          )
        })}
        {order.map((key) => (
          <button
            className={`task-open${focusedWin === key && !st(key).min ? ' task-active' : ''}`}
            key={key}
            data-click
            tabIndex={-1}
            onClick={() => taskClick(key)}
          >
            ▤ {key}
          </button>
        ))}
        <div className="clock">{time}</div>
      </div>

    </div>
  )
}

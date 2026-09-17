import { OS_WINDOWS } from './content'

// The retro-Linux desktop (CDE/Motif vibe) shown on the PRIMARY monitor.
// Rendered inside a drei <Html transform> in Monitors.jsx, so it lives on the
// monitor glass permanently. Authored at mon.pxW x mon.pxH and only scaled.
export default function ComputerOS({ mon, screenRef, cursorRef }) {
  return (
    <div className="os-screen" ref={screenRef} style={{ width: mon.pxW, height: mon.pxH }}>
      {/* Desktop surface */}
      <div className="desktop">
        {/* Desktop icons — one per content section */}
        <div className="desk-icons">
          {OS_WINDOWS.map((w) => (
            <button className="desk-icon" key={w.title} tabIndex={-1}>
              <span className="desk-icon-glyph">▤</span>
              <span className="desk-icon-label">{w.title}</span>
            </button>
          ))}
        </div>

        {/* One open window to show the chrome */}
        <div className="win">
          <div className="win-title">
            <span>about.txt — File Viewer</span>
            <span className="win-btns">
              <i>_</i>
              <i>□</i>
              <i>✕</i>
            </span>
          </div>
          <div className="win-body">
            <p>{OS_WINDOWS[0].body}</p>
            <p className="win-note">
              (placeholder — real content drops in here. Icons above are the
              other sections.)
            </p>
          </div>
        </div>

        <div className="desk-hint">↑ scroll up to leave the desk</div>
      </div>

      {/* Bottom panel / taskbar */}
      <div className="taskbar">
        <button className="start-btn" tabIndex={-1}>🐧 Applications</button>
        <div className="task-open">▤ about.txt</div>
        <div className="clock">13:37</div>
      </div>

      {/* Fake retro cursor — driven by Monitors' dual-display router */}
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

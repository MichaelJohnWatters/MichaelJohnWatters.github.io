import puppeteer from 'puppeteer-core'
const run = async (w, h) => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: [`--window-size=${w},${h}`],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h })
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 3500))
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
    el.scrollTop = el.scrollHeight
  })
  await new Promise((r) => setTimeout(r, 2500))
  const res = await page.evaluate(() => {
    const { proj, inv } = window.__camDbg
    // project world point via camera matrices (column-major)
    const mul = (m, v) => [
      m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],
      m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],
      m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],
      m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3],
    ]
    const project = (p) => {
      const view = mul(inv, [...p, 1])
      const clip = mul(proj, view)
      return [ (clip[0]/clip[3]*0.5+0.5)*innerWidth, (-clip[1]/clip[3]*0.5+0.5)*innerHeight ]
    }
    // primary glass top-left corner world pos (rotY 0.1 about centre -0.33,1.14,-2.83)
    const cx=-0.33, cy=1.14, cz=-2.83, hw=0.355, hh=0.2, rot=0.1
    const lx=-hw, ly=hh
    const wx = cx + lx*Math.cos(rot), wz = cz - lx*Math.sin(rot)
    const webgl = project([wx, cy+ly, wz])
    const domRect = document.querySelector('.os-screen').getBoundingClientRect()
    return { webglCorner: webgl.map((n)=>n.toFixed(1)), domCorner: [domRect.x.toFixed(1), domRect.y.toFixed(1)], aspect: window.__camDbg.aspect, fov: window.__camDbg.fov }
  })
  console.log(`${w}x${h}:`, JSON.stringify(res))
  await browser.close()
}
await run(1280, 800)
await run(860, 700)

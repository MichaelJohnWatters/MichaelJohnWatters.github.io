// Real WebKit (Safari engine) phone test — catches iOS-only rendering bugs.
import { webkit, devices } from 'playwright'
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 13'] })
const page = await ctx.newPage()
await page.goto('http://localhost:5173')
await page.waitForTimeout(4500)
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await page.waitForTimeout(3500)
await page.screenshot({ path: '/tmp/shots/wk-seated.png' })
// numeric check: DOM corner vs where it should be — measure .os-screen rect
const info = await page.evaluate(() => {
  const s = document.querySelector('.os-screen')
  const r = s.getBoundingClientRect()
  const c = document.querySelector('canvas')
  return {
    osRect: { x: r.x.toFixed(0), y: r.y.toFixed(0), w: r.width.toFixed(0), h: r.height.toFixed(0) },
    canvas: { w: c.clientWidth, h: c.clientHeight, bufW: c.width, bufH: c.height },
    inner: [innerWidth, innerHeight],
    vv: [visualViewport.width, visualViewport.height, visualViewport.offsetTop],
  }
})
console.log(JSON.stringify(info, null, 1))
await browser.close()

import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--window-size=1280,800', '--use-angle=metal', '--enable-gpu', '--enable-unsafe-swiftshader'],
})
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 4500))
console.log('gl renderer:', await page.evaluate(() => {
  const c = document.createElement('canvas')
  const gl = c.getContext('webgl2')
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'
}))
const fps = () => page.evaluate(() => new Promise((res) => {
  let n = 0
  const t0 = performance.now()
  const tick = () => (performance.now() - t0 < 2500 ? (n++, requestAnimationFrame(tick)) : res(Math.round(n / 2.5)))
  requestAnimationFrame(tick)
}))
console.log('spiral fps (cold):', await fps())
await new Promise((r) => setTimeout(r, 3000))
console.log('spiral fps (warm):', await fps())
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
console.log('seated fps:', await fps())
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise((r) => setTimeout(r, 800))
console.log('explore fps:', await fps())
await b.close()

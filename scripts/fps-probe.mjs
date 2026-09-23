import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--window-size=1280,800', '--enable-gpu'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
const fps = () => page.evaluate(() => new Promise((res) => {
  let n = 0
  const t0 = performance.now()
  const tick = () => (performance.now() - t0 < 2500 ? (n++, requestAnimationFrame(tick)) : res(Math.round(n / 2.5)))
  requestAnimationFrame(tick)
}))
console.log('spiral-top fps:', await fps())
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

import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
})
const page = await browser.newPage()
await page.emulate({
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
})
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 4000))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 3000))
const term = await page.evaluate(() => {
  const t = document.querySelector('.os-screen.term')
  const r = t.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height * 0.8, rect: {x: r.x.toFixed(0), y: r.y.toFixed(0), w: r.width.toFixed(0), h: r.height.toFixed(0)} }
})
console.log('term rect:', JSON.stringify(term.rect))
await page.touchscreen.tap(term.x, term.y)
await new Promise((r) => setTimeout(r, 120))
await page.touchscreen.tap(term.x, term.y)
await new Promise((r) => setTimeout(r, 800))
console.log('taps:', JSON.stringify(await page.evaluate(() => window.__taps)))
console.log('zoom:', await page.evaluate(() => !!document.querySelector('.zoom-hint')))
// step-away check
const stepInfo = await page.evaluate(() => {
  const b = document.querySelector('.ctl-step')
  return b ? 'present' : 'MISSING'
})
console.log('step button:', stepInfo)
await page.screenshot({ path: '/tmp/shots/m-debug.png' })
await browser.close()

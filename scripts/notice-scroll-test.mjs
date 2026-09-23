import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--window-size=1280,800'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  window.__opened = null; window.open = (u) => { window.__opened = u; return null }
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.keyboard.press('Digit1')
await new Promise((r) => setTimeout(r, 1800))
const clickAt = async (sel, idx = 0) => {
  const p = await page.evaluate((s, i) => {
    const el = [...document.querySelectorAll(s)][i]
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, sel, idx)
  if (!p) return false
  await page.mouse.move(p.x, p.y, { steps: 3 })
  await new Promise((r) => setTimeout(r, 120))
  await page.mouse.click(p.x, p.y)
  await new Promise((r) => setTimeout(r, 350))
  return true
}
await clickAt('.task-pin')
// normal-click GitHub bookmark → notice, no window.open
await clickAt('.web-mark', 3)
console.log('notice shown:', await page.evaluate(() => !!document.querySelector('.web-notice')))
console.log('window.open (expect null):', await page.evaluate(() => window.__opened))
await page.screenshot({ path: '/tmp/shots/29-notice.png' })
// open CV embed and test ▲▼ scroll
await clickAt('.web-mark', 1)
await new Promise((r) => setTimeout(r, 1500))
const t0 = await page.evaluate(() => document.querySelector('.web-embed iframe')?.style.transform)
await clickAt('.web-nav', 3) // ▼
await clickAt('.web-nav', 3)
const t1 = await page.evaluate(() => document.querySelector('.web-embed iframe')?.style.transform)
console.log('scroll transform:', t0, '→', t1)
await b.close()

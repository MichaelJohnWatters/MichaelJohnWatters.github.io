import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--window-size=1280,800'] })
const page = await b.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.keyboard.press('Digit1')
await new Promise((r) => setTimeout(r, 1800))
await page.screenshot({ path: '/tmp/shots/25a-leaned.png' })
const clickAt = async (sel) => {
  const p = await page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, sel)
  if (!p) { console.log('missing', sel); return }
  await page.mouse.move(p.x, p.y, { steps: 3 })
  await new Promise((r) => setTimeout(r, 120))
  await page.mouse.click(p.x, p.y)
  await new Promise((r) => setTimeout(r, 350))
}
await clickAt('.task-pin')
await page.keyboard.type('wikipedia mazda mx5', { delay: 20 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 4000))
await page.screenshot({ path: '/tmp/shots/25b-search.png' })
console.log('errors:', JSON.stringify(errs))
await b.close()

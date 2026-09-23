import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--window-size=1280,800'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
const clickAt = async (sel, idx = 0) => {
  const p = await page.evaluate((s, i) => {
    const el = [...document.querySelectorAll(s)][i]
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, sel, idx)
  if (!p) { console.log('NOT FOUND:', sel, idx); return false }
  await page.mouse.move(p.x, p.y, { steps: 3 })
  await new Promise((r) => setTimeout(r, 120))
  await page.mouse.click(p.x, p.y)
  await new Promise((r) => setTimeout(r, 300))
  return true
}
await clickAt('.task-pin')
await clickAt('.web-mark', 1) // CV embed
await new Promise((r) => setTimeout(r, 1200))
console.log(JSON.stringify(await page.evaluate(() => ({
  btns: document.querySelectorAll('.web .cv-btn').length,
  thumb: !!document.querySelector('.web-thumb'),
  btnRect: (() => { const b = document.querySelectorAll('.web .cv-btn')[1]; if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x.toFixed(0), y: r.y.toFixed(0), w: r.width.toFixed(1), h: r.height.toFixed(1) } })(),
}))))
await b.close()

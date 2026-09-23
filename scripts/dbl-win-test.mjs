import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
// double-click ON THE CV WINDOW BODY (left monitor)
const p = await page.evaluate(() => {
  const w = [...document.querySelectorAll('.win')].find((x) => x.textContent.includes('cv.html'))
  const r = w.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height * 0.6 }
})
await page.mouse.click(p.x, p.y)
await new Promise((r) => setTimeout(r, 120))
await page.mouse.click(p.x, p.y)
await new Promise((r) => setTimeout(r, 1200))
console.log('zoomed via CV window dbl-click:', await page.evaluate(() => !!document.querySelector('.zoom-hint')))
await browser.close()

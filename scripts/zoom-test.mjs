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
// press 1 → zoom primary
await page.keyboard.press('Digit1')
await new Promise((r) => setTimeout(r, 1800))
await page.screenshot({ path: '/tmp/shots/14-zoom1.png' })
const z1 = await page.evaluate(() => !!document.querySelector('.zoom-hint'))
console.log('zoomed on 1:', z1)
// esc → back
await page.keyboard.press('Escape')
await new Promise((r) => setTimeout(r, 1500))
// double-click terminal background → zoom B
const p = await page.evaluate(() => {
  const t = document.querySelector('.os-screen.term')
  const r = t.getBoundingClientRect()
  return { x: r.x + r.width * 0.5, y: r.y + r.height * 0.85 }
})
await page.mouse.move(p.x, p.y, { steps: 4 })
await new Promise((r) => setTimeout(r, 150))
await page.mouse.click(p.x, p.y)
await new Promise((r) => setTimeout(r, 120))
await page.mouse.click(p.x, p.y)
await new Promise((r) => setTimeout(r, 1800))
const z2 = await page.evaluate(() => !!document.querySelector('.zoom-hint'))
console.log('zoomed on dblclick B:', z2)
await page.screenshot({ path: '/tmp/shots/15-zoom2.png' })
await browser.close()

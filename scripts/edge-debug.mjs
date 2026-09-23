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
await page.evaluate(() => {
  window.__events = []
  const root = document.querySelector('.os-screen')
  root.addEventListener('os-dragstart', (e) => window.__events.push('start:' + e.target.dataset.drag))
  root.addEventListener('os-drag', (e) => window.__events.push('drag:' + e.target.dataset.drag + ':' + e.detail.dx.toFixed(1)))
})
const p = await page.evaluate(() => {
  const el = document.querySelector('.win-h-l')
  const r = el.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, rect: { w: r.width.toFixed(1), h: r.height.toFixed(1) } }
})
console.log('handle visual rect:', JSON.stringify(p))
await page.mouse.move(p.x, p.y, { steps: 4 })
await page.mouse.down()
await page.mouse.move(p.x - 40, p.y, { steps: 8 })
await page.mouse.up()
await new Promise((r) => setTimeout(r, 300))
console.log('events:', JSON.stringify(await page.evaluate(() => window.__events.slice(0, 6))))
await browser.close()

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
console.log('pins:', await page.evaluate(() => [...document.querySelectorAll('.task-pin')].map((b) => b.title)))
// click the browser pin
const p = await page.evaluate(() => {
  const el = document.querySelector('.task-pin')
  const r = el.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.move(p.x, p.y, { steps: 3 })
await new Promise((r) => setTimeout(r, 120))
await page.mouse.click(p.x, p.y)
await new Promise((r) => setTimeout(r, 500))
console.log('web window open:', await page.evaluate(() => !!document.querySelector('.web')))
await page.screenshot({ path: '/tmp/shots/22-pins.png' })
await b.close()

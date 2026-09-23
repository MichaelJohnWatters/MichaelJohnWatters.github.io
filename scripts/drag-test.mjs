import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3000))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))

const center = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}, sel)
const geom = () => page.evaluate(() => {
  const w = document.querySelector('.win')
  return { left: w.style.left, top: w.style.top, width: w.style.width, height: w.style.height }
})

console.log('before:', JSON.stringify(await geom()))
// RESIZE: drag the grip down-right
let p = await center('.win-resize')
await page.mouse.move(p.x, p.y, { steps: 4 })
await page.mouse.down()
await page.mouse.move(p.x + 60, p.y + 40, { steps: 10 })
await page.mouse.up()
await new Promise((r) => setTimeout(r, 300))
console.log('after resize:', JSON.stringify(await geom()))
// MOVE: drag the title bar (avoid the buttons — use left part)
p = await page.evaluate(() => {
  const t = document.querySelector('.win-title')
  const r = t.getBoundingClientRect()
  return { x: r.x + r.width * 0.3, y: r.y + r.height / 2 }
})
await page.mouse.move(p.x, p.y, { steps: 4 })
await page.mouse.down()
await page.mouse.move(p.x - 50, p.y + 35, { steps: 10 })
await page.mouse.up()
await new Promise((r) => setTimeout(r, 300))
console.log('after move:', JSON.stringify(await geom()))
// terminal cursor present?
p = await page.evaluate(() => {
  const t = document.querySelector('.os-screen.term')
  const r = t.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.move(p.x, p.y, { steps: 6 })
await new Promise((r) => setTimeout(r, 300))
const curs = await page.evaluate(() =>
  [...document.querySelectorAll('.os-cursor')].map((c) => c.style.opacity),
)
console.log('cursor opacities (A,B):', JSON.stringify(curs))
await page.screenshot({ path: '/tmp/shots/12-drag.png' })
await browser.close()

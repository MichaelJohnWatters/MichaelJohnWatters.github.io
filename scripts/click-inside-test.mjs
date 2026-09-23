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
// lean into the primary screen for a big target, open browser, search
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
await clickAt('.task-pin', 0) // open browser via pin
await page.keyboard.type('wikipedia mazda mx5', { delay: 20 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 3000))
console.log('frames before click:', page.frames().length, page.frames().map((f) => f.url().slice(0, 45)).slice(-2))
// find the bing frame and a result link INSIDE it, then real-click its visual position
const bingFrame = page.frames().find((f) => f.url().includes('bing.com'))
if (!bingFrame) { console.log('NO BING FRAME'); await b.close(); process.exit(1) }
const link = await bingFrame.evaluate(() => {
  const a = [...document.querySelectorAll('h2 a, li a')].find((x) => x.href && x.href.includes('wikipedia'))
  if (!a) return null
  const r = a.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, href: a.href }
})
console.log('target link in frame coords:', JSON.stringify(link)?.slice(0, 120))
if (link) {
  // frame coords → page coords: iframe is scaled 0.5 and offset; compute via iframe rect
  const ifr = await page.evaluate(() => {
    const el = document.querySelector('.web-embed iframe')
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y }
  })
  const px = ifr.x + link.x * 0.5
  const py = ifr.y + link.y * 0.5
  await page.mouse.move(px, py, { steps: 4 })
  await new Promise((r) => setTimeout(r, 150))
  await page.mouse.click(px, py)
  await new Promise((r) => setTimeout(r, 3500))
  console.log('frames after click:', page.frames().map((f) => f.url().slice(0, 50)).slice(-2))
}
await page.screenshot({ path: '/tmp/shots/23-inside-click.png' })
await b.close()

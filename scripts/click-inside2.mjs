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
await page.keyboard.press('Digit1') // lean in: screen near-flat for coord mapping
await new Promise((r) => setTimeout(r, 1800))
const clickAt = async (sel) => {
  const p = await page.evaluate((s) => {
    const el = document.querySelector(s)
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, sel)
  await page.mouse.move(p.x, p.y, { steps: 3 })
  await new Promise((r) => setTimeout(r, 120))
  await page.mouse.click(p.x, p.y)
  await new Promise((r) => setTimeout(r, 350))
}
await clickAt('.task-pin')
await page.keyboard.type('wikipedia mazda mx5', { delay: 20 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 4000))
const f = page.frames().find((fr) => fr.url().includes('bing.com'))
const link = await f.evaluate(() => {
  const a = document.querySelector('.b_algo h2 a')
  if (!a) return null
  a.scrollIntoView({ block: 'start' })
  const r = a.getBoundingClientRect()
  return { x: r.x + Math.min(60, r.width / 2), y: r.y + r.height / 2, href: a.href.slice(0, 60) }
})
console.log('link:', JSON.stringify(link))
const ifr = await page.evaluate(() => {
  const el = document.querySelector('.web-embed iframe')
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y }
})
const px = ifr.x + link.x * 0.5
const py = ifr.y + link.y * 0.5
console.log('clicking page coords:', px.toFixed(0), py.toFixed(0))
await page.mouse.move(px, py, { steps: 4 })
await new Promise((r) => setTimeout(r, 200))
await page.mouse.click(px, py)
await new Promise((r) => setTimeout(r, 4000))
console.log('frame url after click:', page.frames().map((fr) => fr.url().slice(0, 55)).filter((u) => !u.includes('localhost')))
await page.screenshot({ path: '/tmp/shots/24-browsed.png' })
await b.close()

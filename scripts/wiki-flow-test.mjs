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
  if (!p) return false
  await page.mouse.move(p.x, p.y, { steps: 3 })
  await new Promise((r) => setTimeout(r, 120))
  await page.mouse.click(p.x, p.y)
  await new Promise((r) => setTimeout(r, 350))
  return true
}
await clickAt('.task-pin')
await page.keyboard.type('mazda mx5', { delay: 20 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 4500))
const wikiFrame = page.frames().find((f) => f.url().includes('wikipedia.org'))
console.log('wiki frame:', wikiFrame?.url()?.slice(0, 70))
console.log('iframe pe (view mode, expect none):', await page.evaluate(() => document.querySelector('.web-embed iframe')?.style.pointerEvents))
// toggle live via 🖱
await clickAt('.web-nav', 1)
console.log('iframe pe after 🖱 (expect auto):', await page.evaluate(() => document.querySelector('.web-embed iframe')?.style.pointerEvents))
// navigate inside the frame (simulates a link click's effect through sandbox)
if (wikiFrame) {
  await wikiFrame.evaluate(() => { const a = document.querySelector('a[href^="/wiki/"]'); if (a) a.click() })
  await new Promise((r) => setTimeout(r, 3000))
  console.log('after in-frame link click:', page.frames().find((f) => f.url().includes('wikipedia'))?.url()?.slice(0, 70))
  console.log('top page still portfolio:', await page.evaluate(() => location.hostname))
}
await page.screenshot({ path: '/tmp/shots/26-wiki.png' })
await b.close()

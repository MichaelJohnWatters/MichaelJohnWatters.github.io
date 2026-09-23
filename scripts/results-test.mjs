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
await clickAt('.task-pin')
await page.keyboard.type('mazda mx5', { delay: 20 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 3000))
console.log('results:', await page.evaluate(() => [...document.querySelectorAll('.web-res-title')].slice(0, 3).map((e) => e.textContent)))
await page.screenshot({ path: '/tmp/shots/27-results.png' })
// click the first result via the bridge
await clickAt('.web-result', 0)
await new Promise((r) => setTimeout(r, 3000))
console.log('opened article frame:', page.frames().find((f) => f.url().includes('wikipedia'))?.url()?.slice(0, 60))
console.log('iframe pe (view mode):', await page.evaluate(() => document.querySelector('.web-embed iframe')?.style.pointerEvents))
await page.screenshot({ path: '/tmp/shots/28-article.png' })
await b.close()

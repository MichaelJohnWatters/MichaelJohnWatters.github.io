import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--window-size=1280,800'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  window.__opened = null
  window.open = (u) => { window.__opened = u; return null }
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
await clickAt('.desk-icon', 2) // netscape
// normal enter → in-window bing
await page.keyboard.type('mazda mx5 na', { delay: 20 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 2500))
console.log('embed src:', await page.evaluate(() => document.querySelector('.web-embed iframe')?.src?.slice(0, 60)))
console.log('window.open called:', await page.evaluate(() => window.__opened))
// bing actually rendered? check frame loaded
const frames = page.frames().map((f) => f.url().slice(0, 40))
console.log('frames:', JSON.stringify(frames))
await page.screenshot({ path: '/tmp/shots/21-bing.png' })
// shift+enter → real browser
await page.evaluate(() => { document.documentElement.classList.add('x') })
await page.keyboard.type('test query', { delay: 20 })
await page.keyboard.down('Shift')
await page.keyboard.press('Enter')
await page.keyboard.up('Shift')
await new Promise((r) => setTimeout(r, 400))
console.log('shift+enter opened:', await page.evaluate(() => window.__opened))
await b.close()

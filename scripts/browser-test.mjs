import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
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
  await new Promise((r) => setTimeout(r, 300))
  return true
}
// open the browser via its desktop icon (index: about=0, cv=1, netscape=2)
const opened = await clickAt('.desk-icon', 2)
console.log('netscape icon clicked:', opened, '— web window:', await page.evaluate(() => !!document.querySelector('.web')))
// type a search + enter (browser window is focused after open)
await page.keyboard.type('mx5 na parts', { delay: 25 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 300))
console.log('window.open url:', await page.evaluate(() => window.__opened))
// bookmark click
await clickAt('.web-mark', 0)
console.log('bookmark open url:', await page.evaluate(() => window.__opened))
await page.screenshot({ path: '/tmp/shots/17-browser.png' })
await browser.close()

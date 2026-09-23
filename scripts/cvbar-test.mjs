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
await page.keyboard.press('Digit1') // lean into the desktop
await new Promise((r) => setTimeout(r, 1800))
// open cv.html icon
const icon = await page.evaluate(() => {
  const el = [...document.querySelectorAll('.desk-icon')].find((i) => i.textContent.includes('cv'))
  const r = el.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.move(icon.x, icon.y, { steps: 3 })
await new Promise((r) => setTimeout(r, 150))
await page.mouse.click(icon.x, icon.y)
await new Promise((r) => setTimeout(r, 800))
const before = await page.evaluate(() => document.querySelector('.cv-thumb')?.style.top)
// drag the thumb down
const th = await page.evaluate(() => {
  const t = document.querySelector('.cv-thumb')
  const r = t.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.move(th.x, th.y, { steps: 3 })
await page.mouse.down()
await page.mouse.move(th.x, th.y + 60, { steps: 10 })
await page.mouse.up()
await new Promise((r) => setTimeout(r, 300))
const after = await page.evaluate(() => document.querySelector('.cv-thumb')?.style.top)
console.log('thumb top before/after drag:', before, '→', after)
await page.screenshot({ path: '/tmp/shots/16-cvbar.png' })
await browser.close()

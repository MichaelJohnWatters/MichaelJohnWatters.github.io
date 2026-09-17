import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 3000))
await page.evaluate(() => {
  const e = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto' && d.scrollHeight > d.clientHeight)
  e.id = '__scroll'; e.scrollTop = e.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
// find the visual center of the primary screen and hover it
const target = await page.evaluate(() => {
  const s = document.querySelector('.os-screen')
  const r = s.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, rect: { x: r.x, y: r.y, w: r.width, h: r.height } }
})
console.log('primary screen visual rect:', JSON.stringify(target))
await page.mouse.move(target.x, target.y, { steps: 5 })
await new Promise((r) => setTimeout(r, 600))
const state = await page.evaluate(() => {
  const curs = [...document.querySelectorAll('.os-cursor')].map((c) => ({
    op: c.style.opacity, tf: c.style.transform.slice(0, 60),
  }))
  const scrollEl = document.getElementById('__scroll')
  return { cursors: curs, elCursor: scrollEl.style.cursor, bodyCursor: getComputedStyle(document.body).cursor }
})
console.log('state:', JSON.stringify(state, null, 1))
await page.screenshot({ path: '/tmp/shots/7-cursor.png' })
await browser.close()

import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
const c = await page.evaluate(() => {
  const icons = [...document.querySelectorAll('.desk-icon')]
  const r = icons[2].getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.click(c.x, c.y)
await new Promise((r) => setTimeout(r, 400))
await page.keyboard.type('bbc', { delay: 25 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 7000))
const out = await page.evaluate(() => {
  const list = document.querySelector('.web-results')
  const before = list?.scrollTop
  document.querySelectorAll('.cv-btn').forEach((b) => b.textContent === '▼' && b.click())
  return {
    results: document.querySelectorAll('.web-result').length,
    thumb: !!document.querySelector('.res-thumb'),
    scrollable: list ? list.scrollHeight - list.clientHeight : null,
    scrolledFrom: before,
    scrolledTo: list?.scrollTop,
  }
})
console.log(JSON.stringify(out))
await b.close()

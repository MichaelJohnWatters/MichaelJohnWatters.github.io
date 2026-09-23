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
  const r = [...document.querySelectorAll('.desk-icon')][2].getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.click(c.x, c.y)
await new Promise((r) => setTimeout(r, 400))
await page.keyboard.type('bbc', { delay: 25 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 7000))
await page.evaluate(() => [...document.querySelectorAll('.web-result')][0].click())
await new Promise((r) => setTimeout(r, 8000))
await page.evaluate(() => [...document.querySelectorAll('.web-nav')].find((b) => b.textContent === '+')?.click())
await new Promise((r) => setTimeout(r, 500))
const out = await page.evaluate(() => document.querySelector('.web-embed iframe')?.style.transform)
console.log('after +:', out)
await b.close()

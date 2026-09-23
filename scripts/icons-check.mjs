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
const info = await page.evaluate(() => {
  const desk = document.querySelector('.desktop')
  const dh = desk.offsetHeight
  return [...document.querySelectorAll('.desk-icon')].map((i) => ({
    label: i.textContent.trim().slice(0, 12),
    left: i.offsetLeft,
    bottom: i.offsetTop + i.offsetHeight,
    fits: i.offsetTop + i.offsetHeight <= dh,
  }))
})
console.log(JSON.stringify(info, null, 1))
await browser.close()

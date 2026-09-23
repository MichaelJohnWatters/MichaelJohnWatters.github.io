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
await page.screenshot({ path: '/tmp/shots/r1-1280.png' })
await page.setViewport({ width: 860, height: 800 })
await new Promise((r) => setTimeout(r, 1500))
await page.screenshot({ path: '/tmp/shots/r2-860.png' })
await page.setViewport({ width: 1400, height: 700 })
await new Promise((r) => setTimeout(r, 1500))
await page.screenshot({ path: '/tmp/shots/r3-1400x700.png' })
await browser.close()
console.log('done')

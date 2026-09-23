import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
const probe = () =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    return {
      buffer: [c.width, c.height],
      styleWH: [c.style.width, c.style.height],
      client: [c.clientWidth, c.clientHeight],
      dpr: window.devicePixelRatio,
    }
  })
console.log('@1280x800:', JSON.stringify(await probe()))
await page.setViewport({ width: 860, height: 700 })
await new Promise((r) => setTimeout(r, 1500))
console.log('@860x700 :', JSON.stringify(await probe()))
await browser.close()

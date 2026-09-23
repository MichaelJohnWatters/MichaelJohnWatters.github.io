import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
console.log('@1280x800 (expect 1.6):', JSON.stringify(await page.evaluate(() => window.__camDbg)))
await page.setViewport({ width: 860, height: 700 })
await new Promise((r) => setTimeout(r, 1500))
console.log('@860x700 (expect 1.229):', JSON.stringify(await page.evaluate(() => window.__camDbg)))
await browser.close()

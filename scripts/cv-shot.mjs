import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 794, height: 1123 })
await page.goto('file:///Users/michaeljohnwatters/repo/personal-website-3js/public/cv/michael-watters-cv.html')
await new Promise((r) => setTimeout(r, 800))
await page.screenshot({ path: '/tmp/shots/cv-page1.png' })
await browser.close()

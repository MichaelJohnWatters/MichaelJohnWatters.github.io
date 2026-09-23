import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('https://michaeljohnwatters.github.io/', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 4000))
await page.screenshot({ path: '/tmp/shots/live.png' })
console.log('captured live site')
await browser.close()

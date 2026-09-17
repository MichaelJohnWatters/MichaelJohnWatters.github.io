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
  const e = [...document.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 100)
  e.scrollTop = e.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.keyboard.type('sudo make me a website', { delay: 30 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 400))
await page.keyboard.type('mx5', { delay: 30 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 600))
await page.screenshot({ path: '/tmp/shots/6-terminal.png' })
console.log('done')
await browser.close()

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
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.click('.ctl-step')
await new Promise((r) => setTimeout(r, 1000))
await page.keyboard.press('KeyV')
await page.mouse.move(640, 400, { steps: 4 }) // centre = face the desk
await new Promise((r) => setTimeout(r, 500))
await page.screenshot({ path: '/tmp/shots/10-fp-desk.png' })
console.log('done')
await browser.close()

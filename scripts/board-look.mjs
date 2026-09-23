import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--window-size=1280,800'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.click('.ctl-step')
await new Promise((r) => setTimeout(r, 600))
await page.evaluate(() => document.exitPointerLock())
await new Promise((r) => setTimeout(r, 300))
await page.mouse.move(470, 380, { steps: 6 }) // face the back-left wall
await new Promise((r) => setTimeout(r, 700))
await page.screenshot({ path: '/tmp/shots/32-board2.png' })
console.log('done')
await b.close()

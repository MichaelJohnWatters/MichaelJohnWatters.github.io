import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.screenshot({ path: '/tmp/shots/boot.png' }) // catch the loading screen
await new Promise((r) => setTimeout(r, 3800))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.mouse.move(100, 400)
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise((r) => setTimeout(r, 700))
// already facing the back wall — strafe left toward the blueprint
await page.keyboard.down('KeyA'); await new Promise((r) => setTimeout(r, 1700)); await page.keyboard.up('KeyA')
await new Promise((r) => setTimeout(r, 400))
await page.screenshot({ path: '/tmp/shots/art1.png' })
await b.close()

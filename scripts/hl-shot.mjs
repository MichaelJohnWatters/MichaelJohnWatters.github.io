import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3800))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise((r) => setTimeout(r, 700))
// lights OFF so beams read; the spawn is beside the Civic — get in
await page.keyboard.press('KeyL')
await new Promise((r) => setTimeout(r, 400))
await page.keyboard.press('KeyE')
await new Promise((r) => setTimeout(r, 1200))
await page.keyboard.press('KeyV')
await new Promise((r) => setTimeout(r, 600))
await page.screenshot({ path: '/tmp/shots/cockpit.png' })
await page.screenshot({ path: '/tmp/shots/headlights.png' })
await b.close()

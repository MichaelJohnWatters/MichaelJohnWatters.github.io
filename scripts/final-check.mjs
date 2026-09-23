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
// pointer lock on step away
await page.click('.ctl-step')
await new Promise((r) => setTimeout(r, 800))
console.log('pointer locked after step away:', await page.evaluate(() => !!document.pointerLockElement))
// look at the whiteboard: it's at (-2.05, 1.5); face it and screenshot
await page.evaluate(() => document.exitPointerLock())
await new Promise((r) => setTimeout(r, 300))
// walk backward a little and look left (absolute fallback: mouse to left side)
await page.mouse.move(340, 330, { steps: 6 })
await page.keyboard.down('KeyS')
await new Promise((r) => setTimeout(r, 700))
await page.keyboard.up('KeyS')
await new Promise((r) => setTimeout(r, 800))
await page.screenshot({ path: '/tmp/shots/31-board.png' })
console.log('shot taken')
await b.close()

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
await page.click('.ctl-step') // FP by default on desktop
await new Promise((r) => setTimeout(r, 1200))
console.log('crosshair:', await page.evaluate(() => !!document.querySelector('.crosshair')))
console.log('fp-cursor class:', await page.evaluate(() => document.documentElement.classList.contains('fp-cursor')))
// walk toward the desk-side wall switch: spawn (0.9,0.4) facing -z; switch at (1.7,1.25,-2.94)
// turn slightly right via mouse and walk forward
await page.mouse.move(760, 380, { steps: 5 }) // aim a bit right of centre
await page.keyboard.down('KeyW')
await new Promise((r) => setTimeout(r, 900))
await page.keyboard.up('KeyW')
await new Promise((r) => setTimeout(r, 600))
const hit = await page.evaluate(() => document.documentElement.classList.contains('aim-hit'))
console.log('aim-hit near switch:', hit)
await page.screenshot({ path: '/tmp/shots/20-fp-aim.png' })
await b.close()

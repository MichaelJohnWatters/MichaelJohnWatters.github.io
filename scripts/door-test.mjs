import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.mouse.move(100, 400)
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise((r) => setTimeout(r, 700))
console.log('locked:', await page.evaluate(() => !!document.pointerLockElement))
// pointer lock is on: one 982px rightward delta = 180° turn (0.0032 rad/px)
await page.mouse.move(1082, 400, { steps: 1 })
await new Promise((r) => setTimeout(r, 400))
// strafe A (moves +x when facing +z) to line up with the parking-bay door
await page.keyboard.down('KeyD'); await new Promise((r) => setTimeout(r, 1250)); await page.keyboard.up('KeyD')
await new Promise((r) => setTimeout(r, 400))
console.log('aim:', await page.evaluate(() => document.getElementById('aim-label')?.textContent))
await page.mouse.down(); await page.mouse.up()
await new Promise((r) => setTimeout(r, 2600))
console.log('aim after click:', await page.evaluate(() => document.getElementById('aim-label')?.textContent))
await page.keyboard.down('KeyW'); await new Promise((r) => setTimeout(r, 4200)); await page.keyboard.up('KeyW')
await new Promise((r) => setTimeout(r, 400))
await page.screenshot({ path: '/tmp/shots/yard.png' })
// half-turn back to look at the garage from outside
await page.mouse.move(591, 400, { steps: 1 }) // 90° right — face the lamp side
await new Promise((r) => setTimeout(r, 400))
await page.screenshot({ path: '/tmp/shots/yard-side.png' })
await b.close()

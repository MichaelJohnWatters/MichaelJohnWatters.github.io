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
// 180° turn (pointer lock, 0.0032 rad/px)
await page.mouse.move(1082, 400, { steps: 1 })
await new Promise((r) => setTimeout(r, 300))
// strafe A (+x when facing +z) toward the parking bay door, step into reach
await page.keyboard.down('KeyA'); await new Promise((r) => setTimeout(r, 760)); await page.keyboard.up('KeyA')
await page.keyboard.down('KeyW'); await new Promise((r) => setTimeout(r, 400)); await page.keyboard.up('KeyW')
await new Promise((r) => setTimeout(r, 400))
console.log('aim:', await page.evaluate(() => document.getElementById('aim-label')?.textContent))
await page.mouse.down(); await page.mouse.up() // open the door
await new Promise((r) => setTimeout(r, 2400))
console.log('prompt:', await page.evaluate(() => document.querySelector('.sit-label')?.textContent))
await page.keyboard.press('KeyE') // get in
await new Promise((r) => setTimeout(r, 800))
console.log('driving hud:', await page.evaluate(() => document.querySelector('.ctl-back')?.textContent))
await page.keyboard.down('KeyW'); await new Promise((r) => setTimeout(r, 3200)); await page.keyboard.up('KeyW')
await new Promise((r) => setTimeout(r, 900))
await page.screenshot({ path: '/tmp/shots/drive.png' })
await page.keyboard.press('KeyE') // get out
await new Promise((r) => setTimeout(r, 800))
console.log('back on foot:', await page.evaluate(() => document.querySelector('.explore-hint')?.textContent || document.querySelector('.sit-label')?.textContent))
await page.screenshot({ path: '/tmp/shots/drive-out.png' })
await b.close()

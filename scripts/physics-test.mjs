import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 4500))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.mouse.move(100, 400)
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise((r) => setTimeout(r, 700))
await page.mouse.move(1082, 400, { steps: 1 }) // 180°
await page.keyboard.down('KeyD'); await new Promise((r) => setTimeout(r, 1250)); await page.keyboard.up('KeyD')
await page.keyboard.down('KeyW'); await new Promise((r) => setTimeout(r, 500)); await page.keyboard.up('KeyW')
await new Promise((r) => setTimeout(r, 300))
await page.mouse.down(); await page.mouse.up() // open lift door
await new Promise((r) => setTimeout(r, 2400))
// out into the lot, veer to letter I, plow through the name
await page.keyboard.down('KeyW'); await new Promise((r) => setTimeout(r, 3800)); await page.keyboard.up('KeyW')
await page.keyboard.down('KeyA'); await new Promise((r) => setTimeout(r, 350)); await page.keyboard.up('KeyA')
await page.keyboard.down('KeyW'); await new Promise((r) => setTimeout(r, 3000)); await page.keyboard.up('KeyW')
await new Promise((r) => setTimeout(r, 800))
// look back at the damage
await page.mouse.move(100, 400, { steps: 1 })
await new Promise((r) => setTimeout(r, 600))
await page.screenshot({ path: '/tmp/shots/physics.png' })
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0
  const t0 = performance.now()
  const tick = () => (performance.now() - t0 < 2500 ? (n++, requestAnimationFrame(tick)) : res(Math.round(n / 2.5)))
  requestAnimationFrame(tick)
}))
console.log('fps with physics:', fps)
await b.close()

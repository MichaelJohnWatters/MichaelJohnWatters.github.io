import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu'] })
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
await page.keyboard.press('KeyL') // lights off — night proper
await page.mouse.move(1082, 400, { steps: 1 }) // 180°
await page.keyboard.down('KeyD'); await new Promise((r) => setTimeout(r, 1250)); await page.keyboard.up('KeyD')
await page.keyboard.down('KeyW'); await new Promise((r) => setTimeout(r, 500)); await page.keyboard.up('KeyW')
await new Promise((r) => setTimeout(r, 300))
await page.mouse.down(); await page.mouse.up() // open door
await new Promise((r) => setTimeout(r, 2400))
await page.keyboard.press('KeyF') // torch on
await page.keyboard.down('KeyW'); await new Promise((r) => setTimeout(r, 9000)); await page.keyboard.up('KeyW')
await new Promise((r) => setTimeout(r, 600))
await page.screenshot({ path: '/tmp/shots/road.png' })
await b.close()

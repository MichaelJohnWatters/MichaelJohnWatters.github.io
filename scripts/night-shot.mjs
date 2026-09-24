import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu'] })
const page = await b.newPage()
await page.setViewport({ width: 1200, height: 750 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise(r=>setTimeout(r,5000))
// step into the scene and go explore/drive outside to see the night world
await page.mouse.move(200,400)
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise(r=>setTimeout(r,3500))
await page.screenshot({ path: 'scripts/night.png' })
await b.close()
console.log('shot saved')

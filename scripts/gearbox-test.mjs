import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 4500))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).overflowY==='auto'); el.scrollTop=el.scrollHeight })
await new Promise((r) => setTimeout(r, 2500))
await page.mouse.move(100,400)
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise((r) => setTimeout(r, 700))
await page.keyboard.press('KeyE') // get in the civic
await new Promise((r) => setTimeout(r, 800))
const read = () => page.evaluate(() => ({ gear: document.getElementById('gear-num')?.textContent, spd: document.getElementById('spd-num')?.textContent, rpm: document.getElementById('rpm-fill')?.style.width }))
console.log('in car:', await read())
// floor it and sample the gearbox climbing
await page.keyboard.down('KeyW')
for (let i=0;i<5;i++){ await new Promise(r=>setTimeout(r,900)); console.log('accel', i, await read()) }
await page.keyboard.up('KeyW')
await new Promise(r=>setTimeout(r,1500))
console.log('coast:', await read())
// CLUTCH-DROP LAUNCH: brake to stop, hold clutch, rev, release
await page.keyboard.down('KeyS'); await new Promise(r=>setTimeout(r,2500)); await page.keyboard.up('KeyS')
await new Promise(r=>setTimeout(r,600))
console.log('stopped:', await read())
await page.keyboard.down('ShiftLeft')
await page.keyboard.down('KeyW')
await new Promise(r=>setTimeout(r,1200)) // rev to redline, clutch in
console.log('revving (clutch in):', await read())
await page.keyboard.up('ShiftLeft') // DROP THE CLUTCH
await new Promise(r=>setTimeout(r,700))
console.log('post-drop:', await read())
await page.keyboard.up('KeyW')
await b.close()

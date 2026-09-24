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
await page.keyboard.press('KeyE')
await new Promise(r=>setTimeout(r,800))
const read = () => page.evaluate(() => ({ g: document.getElementById('gear-num')?.textContent, spd:+document.getElementById('spd-num')?.textContent, warn: document.getElementById('rev-warn')?.textContent }))
console.log('boarded:', await read())
// TEST 1: floor it from a stop in gear, NO clutch -> should stall
await page.keyboard.down('KeyW')
await new Promise(r=>setTimeout(r,900))
console.log('floored from stop (expect STALL):', await read())
await page.keyboard.up('KeyW')
// TEST 2: restart with clutch, rev, drop -> launch away
await page.keyboard.down('ShiftLeft'); await new Promise(r=>setTimeout(r,500)) // clutch: restart + rev
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,900)) // rev with clutch in
console.log('revving on clutch (restarted):', await read())
await page.keyboard.up('ShiftLeft') // DROP -> launch
await new Promise(r=>setTimeout(r,1200))
console.log('after clutch-drop launch:', await read())
await page.keyboard.up('KeyW')
await b.close()

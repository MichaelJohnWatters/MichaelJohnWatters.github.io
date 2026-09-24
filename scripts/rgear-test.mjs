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
await page.keyboard.press('KeyE'); await new Promise(r=>setTimeout(r,700))
const read = () => page.evaluate(() => ({ g: document.getElementById('gear-num')?.textContent, spd:+document.getElementById('spd-num')?.textContent }))
console.log('boarded:', await read())
// start (in N), clutch-launch into 1st
await page.keyboard.press('KeyI'); await new Promise(r=>setTimeout(r,300))
await page.keyboard.down('ShiftLeft'); await page.keyboard.press('ArrowUp')
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,600))
await page.keyboard.up('ShiftLeft'); await new Promise(r=>setTimeout(r,400))
console.log('launched:', await read())
// POWER: wind out, upshift at redline, measure speed gained
for (let s=0;s<14;s++){ await new Promise(r=>setTimeout(r,500)); const r=await read(); const rpm=await page.evaluate(()=>parseInt(document.getElementById('rpm-fill')?.style.width)); if(rpm>92 && r.g!=='5') await page.keyboard.press('ArrowUp'); if(s%3===0)console.log('accel',s,r) }
console.log('TOP SPEED:', await read())
await page.keyboard.up('KeyW')
// REVERSE: brake to stop, clutch, down to N then R, release, gas to reverse
await page.keyboard.down('KeyS'); await new Promise(r=>setTimeout(r,3000)); await page.keyboard.up('KeyS')
await new Promise(r=>setTimeout(r,400))
console.log('stopped:', await read())
await page.keyboard.down('ShiftLeft')
for (let i=0;i<6;i++){ await page.keyboard.press('ArrowDown'); await new Promise(r=>setTimeout(r,350)) } // down to R
console.log('in R (clutch in):', await read())
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,700)) // REV in R, clutch in
await page.keyboard.up('ShiftLeft'); await new Promise(r=>setTimeout(r,1500)) // DROP -> reverse launch
console.log('reversing:', await read())
await page.keyboard.up('KeyW')
await b.close()

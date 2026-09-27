import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,120)))
await page.setViewport({ width: 1200, height: 750 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(x=>getComputedStyle(x).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight }); await new Promise(r=>setTimeout(r,2500))
await page.mouse.move(120,400); await page.evaluate(()=>document.querySelector('.ctl-step')?.click()); await new Promise(r=>setTimeout(r,700))
await page.keyboard.press('KeyE'); await new Promise(r=>setTimeout(r,700))
await page.keyboard.press('KeyI'); await new Promise(r=>setTimeout(r,300))
// drive out of the garage into the lot
await page.keyboard.down('ShiftLeft'); await page.keyboard.press('ArrowUp'); await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,700)); await page.keyboard.up('ShiftLeft')
for(let i=0;i<5;i++){ await new Promise(r=>setTimeout(r,400)); const rpm=await page.evaluate(()=>parseInt(document.getElementById('rpm-fill')?.style.width)); if(rpm>92)await page.keyboard.press('ArrowUp') }
await page.keyboard.up('KeyW')
await new Promise(r=>setTimeout(r,500))
await page.screenshot({ path:'scripts/sky-out.png' })
console.log('reset btn present:', await page.evaluate(()=>!!document.querySelector('.ctl-reset')))
console.log('errors:', errs.slice(0,3))
await b.close()

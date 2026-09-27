import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,120)))
await page.setViewport({ width: 1200, height: 750 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(x=>getComputedStyle(x).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight }); await new Promise(r=>setTimeout(r,2500))
await page.mouse.move(120,400); await page.evaluate(()=>document.querySelector('.ctl-step')?.click()); await new Promise(r=>setTimeout(r,700))
await page.keyboard.press('KeyE'); await new Promise(r=>setTimeout(r,700))
await page.keyboard.press('KeyI'); await new Promise(r=>setTimeout(r,300))
// drive out and curve RIGHT toward the moon (+x/+z), then look
await page.keyboard.down('ShiftLeft'); await page.keyboard.press('ArrowUp'); await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,600)); await page.keyboard.up('ShiftLeft')
await page.keyboard.down('KeyD')
for(let i=0;i<5;i++){ await new Promise(r=>setTimeout(r,350)); const rpm=await page.evaluate(()=>parseInt(document.getElementById('rpm-fill')?.style.width)); if(rpm>92)await page.keyboard.press('ArrowUp') }
await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW'); await new Promise(r=>setTimeout(r,400))
await page.screenshot({ path:'scripts/moon.png' })
console.log('errors:', errs.slice(0,2))
await b.close()

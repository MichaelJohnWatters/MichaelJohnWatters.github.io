import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,120)))
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,7000))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(x=>getComputedStyle(x).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight }); await new Promise(r=>setTimeout(r,2500))
await page.evaluate(()=>document.querySelector('.ctl-step')?.click()); await new Promise(r=>setTimeout(r,1200)) // explore
// get into the MUSCLE parked car (slot 4, at x15 z19.8)
await page.evaluate(()=>window.__enterCar && window.__enterCar(4)); await new Promise(r=>setTimeout(r,1200))
const st = () => page.evaluate(()=>{const c=window.__car; return c?{x:+c.x.toFixed(1),z:+c.z.toFixed(1),y:+c.y.toFixed(2),fwd:+c.fwd.toFixed(1)}:null})
console.log('after get-in (should be ~x15 z19.8, not ejected):', await st())
// give it a moment to settle, then drive forward and confirm it moves (not stuck/ejected)
await page.keyboard.press('KeyI'); await new Promise(r=>setTimeout(r,300))
await page.keyboard.down('ShiftLeft'); await page.keyboard.press('ArrowUp'); await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,700)); await page.keyboard.up('ShiftLeft')
for(let i=0;i<4;i++){ await new Promise(r=>setTimeout(r,350)); console.log(await st()) }
await page.keyboard.up('KeyW')
console.log('errors:', errs.slice(0,3))
await b.close()

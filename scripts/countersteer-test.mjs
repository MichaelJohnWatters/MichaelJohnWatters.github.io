import puppeteer from 'puppeteer-core'
const CAR = process.argv[2] || "MX-5"
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu'] })
const page = await b.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,90)))
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise(r=>setTimeout(r,4500))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight })
await new Promise(r=>setTimeout(r,2500))
await page.mouse.move(100,400)
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise(r=>setTimeout(r,800))
await page.keyboard.press('KeyE'); await new Promise(r=>setTimeout(r,500))
const picked = await page.evaluate((CAR) => { const bs=[...document.querySelectorAll('.tune button, .tune-pick button')].filter(b=>new RegExp(CAR,'i').test(b.textContent)); if(bs[0]){bs[0].click();return bs[0].textContent} return null }, CAR)
await new Promise(r=>setTimeout(r,600))
await page.keyboard.press('KeyI'); await new Promise(r=>setTimeout(r,300))
const read = () => page.evaluate(()=>{ const c=window.__car; if(!c)return null; const velH=Math.atan2(c.vx,c.vz); let s=velH-c.heading; while(s>Math.PI)s-=2*Math.PI; while(s<-Math.PI)s+=2*Math.PI; return {x:+c.x.toFixed(0), z:+c.z.toFixed(0), fwd:+c.fwd.toFixed(1), yaw:+c.yaw.toFixed(2), slip:+(s*180/Math.PI).toFixed(0)} })
// teleport to the open road at ~20 m/s in 3rd, facing +z
await page.evaluate(()=>window.__place && window.__place(15, 190, 18))
await new Promise(r=>setTimeout(r,300))
console.log(CAR, 'placed:', await read())
console.log('=== throttle + steer D (slip = slide angle; grows & holds = drift) ===')
await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD') /* initiate */
for(let s=0;s<5;s++){ await new Promise(r=>setTimeout(r,250)); console.log('  turn', await read()) }
await page.keyboard.up('KeyD')
console.log('  -- COUNTER-STEER (hold A opposite lock; slip should shrink, not fling) --')
await page.keyboard.down('KeyA')
for(let s=0;s<6;s++){ await new Promise(r=>setTimeout(r,200)); console.log('  ', await read()) }
await page.keyboard.up('KeyA')
await page.keyboard.up('KeyW')
console.log('errors', errs.slice(0,2))
await b.close()

import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1024, height: 700 })
const errs=[]; page.on('pageerror',e=>errs.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
// enter the top sweeper: place near top of right straight heading north, hold W + steer LEFT
await page.evaluate(()=>window.__place && window.__place(0, 500, 8, 0)); await new Promise(r=>setTimeout(r,300))
await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD')
const path=[]
for(let i=0;i<18;i++){ await new Promise(r=>setTimeout(r,400)); path.push(await page.evaluate(()=>({x:+window.__car.x.toFixed(0), z:+window.__car.z.toFixed(0), f:+window.__car.fwd.toFixed(0)}))) }
await page.keyboard.up('KeyW'); await page.keyboard.up('KeyD')
console.log('sweeper path (x,z,fwd):')
path.forEach((p,i)=>console.log(`  t${i}: x=${p.x} z=${p.z} fwd=${p.f}`))
// did it round the top (z past 555) and start heading down the left side (x well negative)?
const maxZ=Math.max(...path.map(p=>p.z)), minX=Math.min(...path.map(p=>p.x))
console.log(`maxZ=${maxZ} minX=${minX}  (want maxZ>550, minX<-40 to show it rounded the sweeper)`)
console.log('errs:', errs.length)
await b.close()

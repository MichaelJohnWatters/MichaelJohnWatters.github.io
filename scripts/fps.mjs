import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,7000))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(x=>getComputedStyle(x).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight }); await new Promise(r=>setTimeout(r,2500))
await page.evaluate(()=>document.querySelector('.ctl-step')?.click()); await new Promise(r=>setTimeout(r,800))
await page.keyboard.press('KeyE'); await new Promise(r=>setTimeout(r,800))
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,1200))
// measure fps over 3s while driving
const fps = await page.evaluate(()=>new Promise(res=>{ let n=0; const t0=performance.now(); function f(){ n++; if(performance.now()-t0<3000) requestAnimationFrame(f); else res(Math.round(n/((performance.now()-t0)/1000))) } requestAnimationFrame(f) }))
await page.keyboard.up('KeyW')
console.log('FPS while driving:', fps)
await b.close()

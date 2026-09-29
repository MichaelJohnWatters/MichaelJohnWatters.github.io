import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1280, height: 800 })
async function measure(){ return page.evaluate(()=>new Promise(res=>{const dt=[];let last=performance.now();function f(){const n=performance.now();dt.push(n-last);last=n;if(dt.length<150)requestAnimationFrame(f);else res(Math.round(1000/(dt.reduce((a,b)=>a+b,0)/dt.length)))}requestAnimationFrame(f)})) }
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
// A: timing OFF (no ghost, laptimer idle) at 0,300
await page.evaluate(()=>window.__place && window.__place(0,300,0)); await new Promise(r=>setTimeout(r,600))
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,600))
const a = await measure(); await page.keyboard.up('KeyW')
console.log('A (timing idle):', a, 'fps')
await b.close()

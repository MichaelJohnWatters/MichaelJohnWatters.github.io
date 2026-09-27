import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1024, height: 700 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
// on the right straight facing EAST (+x), drive into the outer edge
await page.evaluate(()=>window.__place && window.__place(0,300,0,Math.PI/2)); await new Promise(r=>setTimeout(r,400))
await page.keyboard.down('KeyW')
let stopX=0
for(let i=0;i<10;i++){ await new Promise(r=>setTimeout(r,500)); stopX=await page.evaluate(()=>+window.__car.x.toFixed(2)) }
await page.keyboard.up('KeyW')
console.log('drove east, car centre stopped at x =', stopX)
console.log('road edge is at x=6.5; barrier face ~6.9. car half-width ~0.95')
await b.close()

import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1024, height: 700 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
// on the bottom sweeper's return, approaching the start: place at (-5,80) heading NORTH along the arc exit
await page.evaluate(()=>window.__place && window.__place(-5, 70, 12, 0)); await new Promise(r=>setTimeout(r,400))
await page.keyboard.down('KeyW')
const path=[]
for(let i=0;i<10;i++){ await new Promise(r=>setTimeout(r,400)); path.push(await page.evaluate(()=>({x:+window.__car.x.toFixed(1),z:+window.__car.z.toFixed(1),f:+window.__car.fwd.toFixed(0)}))) }
await page.keyboard.up('KeyW')
path.forEach((p,i)=>console.log(`t${i}: x=${p.x} z=${p.z} fwd=${p.f}`))
await b.close()

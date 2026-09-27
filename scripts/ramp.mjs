import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1024, height: 700 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,7000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
// long runway: start at z60 with initial northward speed, floor it
await page.evaluate(()=>window.__place && window.__place(0.3, 60, 20)); await new Promise(r=>setTimeout(r,300))
await page.keyboard.down('KeyW')
const s=[]
for(let i=0;i<14;i++){ await new Promise(r=>setTimeout(r,300)); s.push(await page.evaluate(()=>({z:+window.__car.z.toFixed(1), y:+window.__car.y.toFixed(2), fwd:+window.__car.fwd.toFixed(1)}))) }
await page.keyboard.up('KeyW')
s.forEach((p,i)=>console.log(`t${i}: z=${p.z} y=${p.y} fwd=${p.fwd}`))
await b.close()

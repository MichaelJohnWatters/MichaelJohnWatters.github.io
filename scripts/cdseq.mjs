import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1024, height: 700 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
await page.evaluate(()=>document.querySelector('.ctl-gridstart')?.click())
const seq=[]
for(let i=0;i<10;i++){ seq.push(await page.evaluate(()=>document.querySelector('.countdown')?.textContent ?? '-')); await new Promise(r=>setTimeout(r,500)) }
console.log('countdown over 5s:', seq.join(' '))
console.log('lap-best HUD:', await page.evaluate(()=>document.getElementById('lap-best')?.textContent))
await b.close()

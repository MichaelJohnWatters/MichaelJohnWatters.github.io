import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1024, height: 700 })
const errs=[]; page.on('pageerror',e=>errs.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
const hud=()=>page.evaluate(()=>({cur:document.getElementById('lap-cur')?.textContent, last:document.getElementById('lap-last')?.textContent, count:document.getElementById('lap-count')?.textContent}))
// first crossing north over z=116 -> starts the timer
await page.evaluate(()=>window.__place && window.__place(0,104,10,0)); await new Promise(r=>setTimeout(r,300))
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,4500)); await page.keyboard.up('KeyW')
console.log('after 1st crossing:', JSON.stringify(await hud()))
// teleport back south, drive north again (>3s later) -> counts lap 1
await page.evaluate(()=>window.__place && window.__place(0,104,10,0)); await new Promise(r=>setTimeout(r,300))
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,4500)); await page.keyboard.up('KeyW')
console.log('after 2nd crossing:', JSON.stringify(await hud()))
console.log('errs:', errs.length)
await b.close()

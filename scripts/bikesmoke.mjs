import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1024, height: 700 })
const errs=[]; page.on('pageerror',e=>errs.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
// enter the bike (idx 1), arcade default
await page.evaluate(()=>window.__enterCar && window.__enterCar(1)); await new Promise(r=>setTimeout(r,500))
await page.evaluate(()=>window.__drive && window.__drive(1)); await new Promise(r=>setTimeout(r,900))
const p0 = await page.evaluate(()=>{const c=window.__car||{}; return {kind: (window.__car&&'x'in window.__car)?'car':'?'}})
// drive forward a bit
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,2500)); await page.keyboard.up('KeyW')
console.log('errs after bike drive:', errs.length, errs.slice(0,3).join(' | '))
await b.close()

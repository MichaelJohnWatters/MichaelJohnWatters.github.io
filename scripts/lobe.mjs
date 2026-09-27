import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1024, height: 700 })
const errs=[]; page.on('pageerror',e=>errs.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,7000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
// drop on the WEST side of the lobe ring, facing north
await page.evaluate(()=>window.__place && window.__place(-84, 540, 0)); await new Promise(r=>setTimeout(r,400))
const p0 = await page.evaluate(()=>({x:+window.__car.x.toFixed(1), z:+window.__car.z.toFixed(1)}))
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,3000)); await page.keyboard.up('KeyW')
const p1 = await page.evaluate(()=>({x:+window.__car.x.toFixed(1), z:+window.__car.z.toFixed(1)}))
const bounded = p1.x > -90 && p1.x < -26 && p1.z > 512 && p1.z < 578
console.log('lobe start', JSON.stringify(p0), '-> after W', JSON.stringify(p1))
console.log('moved:', (Math.hypot(p1.x-p0.x, p1.z-p0.z)).toFixed(1), 'm   in-bounds:', bounded, '  errs:', errs.length)
await b.close()

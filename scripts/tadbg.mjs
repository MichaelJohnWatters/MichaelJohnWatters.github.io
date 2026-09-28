import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1024, height: 700 })
const errs=[]; page.on('pageerror',e=>errs.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,1200))
const info = await page.evaluate(()=>({
  btn: !!document.querySelector('.ctl-gridstart'),
  lapHud: !!document.querySelector('.lap-hud'),
  backBtn: !!document.querySelector('.ctl-back'),
}))
console.log('elements:', JSON.stringify(info))
// place away, click via DOM, check
await page.evaluate(()=>window.__place && window.__place(0,300,0)); await new Promise(r=>setTimeout(r,400))
await page.evaluate(()=>document.querySelector('.ctl-gridstart')?.click()); await new Promise(r=>setTimeout(r,250))
const after = await page.evaluate(()=>({
  cd: document.querySelector('.countdown')?.textContent ?? null,
  x: +window.__car.x.toFixed(1), z:+window.__car.z.toFixed(1),
}))
console.log('after DOM click:', JSON.stringify(after))
console.log('errs:', errs.slice(0,3))
await b.close()

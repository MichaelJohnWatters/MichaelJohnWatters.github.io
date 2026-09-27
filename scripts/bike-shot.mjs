import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,100)))
await page.setViewport({ width: 1200, height: 750 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,7000))
await page.mouse.move(200,400); await page.evaluate(()=>document.querySelector('.ctl-step')?.click()); await new Promise(r=>setTimeout(r,3500))
// ride the bike to see it up close (get near it): the bike is at ~5.6,4.4
await page.screenshot({ path:'scripts/bike.png' })
console.log('errors:', errs.slice(0,3))
await b.close()

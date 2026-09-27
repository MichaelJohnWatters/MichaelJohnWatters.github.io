import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,120)))
await page.setViewport({ width: 1200, height: 750 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,5500))
await page.mouse.move(200,400); await page.evaluate(()=>document.querySelector('.ctl-step')?.click()); await new Promise(r=>setTimeout(r,3500))
await page.screenshot({ path:'scripts/realism-explore.png' })
console.log('errors:', errs.slice(0,3))
await b.close()

import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1280, height: 800 })
const errs=[]; page.on('pageerror',e=>errs.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,7000))
// scroll down to sit at the desk
await page.evaluate(()=>{const el=[...document.querySelectorAll('div')].find(x=>getComputedStyle(x).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight}); await new Promise(r=>setTimeout(r,3500))
await page.screenshot({ path:'scripts/deskshot.png' })
console.log('shot saved; errs:', errs.length, errs.slice(0,2).join(' | '))
await b.close()

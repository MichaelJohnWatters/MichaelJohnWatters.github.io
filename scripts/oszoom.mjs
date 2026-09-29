import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,7000))
await page.evaluate(()=>{const el=[...document.querySelectorAll('div')].find(x=>getComputedStyle(x).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight}); await new Promise(r=>setTimeout(r,3500))
// click the left monitor to zoom into the OS
await page.mouse.click(430, 300); await new Promise(r=>setTimeout(r,2500))
await page.screenshot({ path:'scripts/oszoom.png' })
console.log('done')
await b.close()

import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage()
await page.evaluateOnNewDocument(() => { const o=window.matchMedia.bind(window); window.matchMedia=(q)=>/pointer: coarse|hover: none/.test(q)?{matches:true,media:q,onchange:null,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){},dispatchEvent(){return false}}:o(q) })
await page.setViewport({ width:844, height:360, hasTouch:true, isMobile:true, deviceScaleFactor:2 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' })
await new Promise(r=>setTimeout(r,4500))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight })
await new Promise(r=>setTimeout(r,2800))
// double-tap the left monitor to zoom in on the OS ("the pc")
for (const [x,y] of [[250,150],[210,140],[300,150]]) {
  await page.mouse.click(x,y,{clickCount:2}); await new Promise(r=>setTimeout(r,1400))
  const z = await page.evaluate(()=>document.querySelector('.zoom-hint')?.textContent || null)
  if (z) { console.log('zoomed via', x, y); break }
}
await new Promise(r=>setTimeout(r,1200))
await page.screenshot({ path:'scripts/zoom-pc.png' })
console.log('zoom-hint present:', await page.evaluate(()=>!!document.querySelector('.zoom-hint')))
await b.close()

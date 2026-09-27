import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal','--enable-gpu'] })
for (const [w,h] of [[844,330],[780,300],[930,380]]) {
  const page = await b.newPage()
  await page.evaluateOnNewDocument(() => { const o=window.matchMedia.bind(window); window.matchMedia=(q)=>/pointer: coarse|hover: none/.test(q)?{matches:true,media:q,onchange:null,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){},dispatchEvent(){return false}}:o(q) })
  await page.setViewport({ width:w, height:h, hasTouch:true, isMobile:true, deviceScaleFactor:2 })
  await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' })
  await new Promise(r=>setTimeout(r,4500))
  await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight })
  await new Promise(r=>setTimeout(r,2800))
  await page.screenshot({ path:`scripts/asp-${w}x${h}.png` })
  console.log(`shot ${w}x${h}`)
  await page.close()
}
await b.close()

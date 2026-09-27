import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu'] })
const page = await b.newPage()
await page.evaluateOnNewDocument(() => { const orig = window.matchMedia.bind(window); window.matchMedia = (q) => (/pointer: coarse|hover: none/.test(q)) ? { matches: true, media: q, onchange:null, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){return false} } : orig(q) })
await page.setViewport({ width: 844, height: 390, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }) // iPhone-ish landscape
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise(r=>setTimeout(r,5000))
await page.screenshot({ path: 'scripts/m-desk-intro.png' })
// scroll to sit at the desk (look at the monitors)
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight })
await new Promise(r=>setTimeout(r,3000))
await page.screenshot({ path: 'scripts/m-desk-seated.png' })
// report canvas + root sizing vs viewport
const dims = await page.evaluate(() => ({ inner:[innerWidth,innerHeight], canvas:(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]})(), root:(()=>{const r=document.getElementById('root').getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})(), bodyScroll:[document.body.scrollHeight, document.documentElement.scrollHeight] }))
console.log(JSON.stringify(dims))
await b.close()

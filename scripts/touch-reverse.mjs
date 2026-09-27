import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,100)))
await page.evaluateOnNewDocument(() => { const o=window.matchMedia.bind(window); window.matchMedia=(q)=>/pointer: coarse|hover: none/.test(q)?{matches:true,media:q,onchange:null,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){},dispatchEvent(){return false}}:o(q) })
await page.setViewport({ width: 900, height: 450, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise(r=>setTimeout(r,5000))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight })
await new Promise(r=>setTimeout(r,2800))
await page.evaluate(()=>document.querySelector('.ctl-step')?.click())
await new Promise(r=>setTimeout(r,3000))
await page.evaluate(()=>{ const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0 && /drive the civic/i.test(e.textContent)); if(el)(el.closest('.aim-label,.sit-label')||el).click() })
await new Promise(r=>setTimeout(r,1500))
const jb = await page.evaluate(()=>{ const j=document.querySelector('.joystick'); const r=j.getBoundingClientRect(); return {cx:r.x+r.width/2, cy:r.y+r.height/2} })
const st = () => page.evaluate(()=>({gear:document.getElementById('gear-num')?.textContent, fwd:window.__car?+window.__car.fwd.toFixed(1):null, z:window.__car?+window.__car.z.toFixed(1):null}))
// forward
await page.touchscreen.touchStart(jb.cx, jb.cy); await page.touchscreen.touchMove(jb.cx, jb.cy-40)
console.log('--- forward ---')
for(let i=0;i<4;i++){ await new Promise(r=>setTimeout(r,400)); await page.touchscreen.touchMove(jb.cx, jb.cy-40); console.log(await st()) }
// now pull BACK: should brake, stop, then reverse
console.log('--- pull back (brake → stop → reverse) ---')
await page.touchscreen.touchMove(jb.cx, jb.cy+40)
for(let i=0;i<9;i++){ await new Promise(r=>setTimeout(r,400)); await page.touchscreen.touchMove(jb.cx, jb.cy+40); console.log(await st()) }
await page.touchscreen.touchEnd()
console.log('errors', errs.slice(0,3))
await b.close()

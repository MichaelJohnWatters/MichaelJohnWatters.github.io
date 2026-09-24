import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu'] })
const page = await b.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,100)))
await page.evaluateOnNewDocument(() => { const orig = window.matchMedia.bind(window); window.matchMedia = (q) => (/pointer: coarse|hover: none/.test(q)) ? { matches: true, media: q, onchange: null, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){return false} } : orig(q) })
await page.setViewport({ width: 900, height: 450, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise(r=>setTimeout(r,5000))
const gate = await page.evaluate(()=>{ const g=document.querySelector('.rotate-gate'); return g?getComputedStyle(g).display:'?' })
console.log('rotate-gate display (landscape → should be none):', gate)
// sit down at the desk (scroll), then step away into explore
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight })
await new Promise(r=>setTimeout(r,2500))
await page.evaluate(()=>document.querySelector('.ctl-step')?.click())
await new Promise(r=>setTimeout(r,3000))
console.log('labels:', await page.evaluate(()=>[...document.querySelectorAll('.aim-label,.sit-label,.explore-hint,.ctl')].map(e=>e.textContent.trim().slice(0,40)).filter(Boolean)))
const entered = await page.evaluate(()=>{ const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0 && /drive the civic|ride the bike/i.test(e.textContent)); if(el){ const t=el.closest('.aim-label,.sit-label')||el; t.click(); return t.textContent.trim() } return null })
console.log('enter drive:', entered)
await new Promise(r=>setTimeout(r,1500))
const joyBox = await page.evaluate(()=>{ const j=document.querySelector('.joystick'); if(!j)return null; const r=j.getBoundingClientRect(); return {cx:r.x+r.width/2, cy:r.y+r.height/2} })
console.log('joystick present:', !!joyBox)
console.log('before:', await page.evaluate(()=>window.__car?{z:+window.__car.z.toFixed(1),fwd:+window.__car.fwd.toFixed(1)}:null))
// push the stick UP (throttle) via real touch → pointer events
if (joyBox) {
  await page.touchscreen.touchStart(joyBox.cx, joyBox.cy)
  await page.touchscreen.touchMove(joyBox.cx, joyBox.cy - 40)
  for(let i=0;i<7;i++){ await new Promise(r=>setTimeout(r,400)); await page.touchscreen.touchMove(joyBox.cx, joyBox.cy - 40); console.log(await page.evaluate(()=>window.__car?{z:+window.__car.z.toFixed(1),fwd:+window.__car.fwd.toFixed(1),gear:document.getElementById('gear-num')?.textContent,spd:document.getElementById('spd-num')?.textContent}:null)) }
  await page.touchscreen.touchEnd()
}
console.log('errors', errs.slice(0,3))
await b.close()

import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,120)))
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise(r=>setTimeout(r,4500))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight })
await new Promise(r=>setTimeout(r,2500))
await page.mouse.move(120,400)
await page.evaluate(()=>document.querySelector('.ctl-step')?.click())
await new Promise(r=>setTimeout(r,800))
await page.keyboard.press('KeyE'); await new Promise(r=>setTimeout(r,1000))
// click the ⚙ auto toggle
const label = await page.evaluate(()=>{ const btn=[...document.querySelectorAll('.ctl-auto')][0]; if(btn){const t=btn.textContent.trim(); btn.click(); return t} return 'NO BUTTON' })
console.log('auto button was:', label)
await new Promise(r=>setTimeout(r,500))
const now = await page.evaluate(()=>document.querySelector('.ctl-auto')?.textContent.trim())
console.log('now:', now)
// no I, no clutch, no shift — just hold W and it should auto-start + auto-shift
await page.keyboard.down('KeyW')
for(let i=0;i<7;i++){ await new Promise(r=>setTimeout(r,400)); console.log(await page.evaluate(()=>({gear:document.getElementById('gear-num')?.textContent, spd:document.getElementById('spd-num')?.textContent, fwd:window.__car?+window.__car.fwd.toFixed(1):null}))) }
await page.keyboard.up('KeyW')
console.log('errors:', errs)
await b.close()

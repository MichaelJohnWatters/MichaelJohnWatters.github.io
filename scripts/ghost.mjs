import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1100, height: 720 })
const errs=[]; page.on('pageerror',e=>errs.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,3000))
// inject a synthetic ghost driving north up the right straight, then reload
await page.evaluate(()=>{
  const s=[]; for(let i=0;i<=40;i++){ s.push({t:+(i*0.4).toFixed(2), x:0, z:118+i*9, h:0}) }
  localStorage.setItem('nightgarage.ghost', JSON.stringify({samples:s, sectors:[12,12,12]}))
  localStorage.setItem('nightgarage.bestLap','40')
})
await page.reload({ waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,7000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
// cross the finish to start timing so the ghost plays
await page.evaluate(()=>window.__place && window.__place(0,112,6)); await new Promise(r=>setTimeout(r,300))
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,900))
const hud = await page.evaluate(()=>({cur:document.getElementById('lap-cur')?.textContent, delta:document.getElementById('lap-delta')?.textContent, s1:document.getElementById('sec1')?.textContent}))
await page.screenshot({ path:'scripts/ghost.png' })
await page.keyboard.up('KeyW')
console.log('HUD:', JSON.stringify(hud), ' errs:', errs.length, errs.slice(0,2).join(' | '))
await b.close()

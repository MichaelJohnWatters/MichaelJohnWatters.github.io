import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,120)))
await page.setViewport({ width: 1200, height: 750 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,7000))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(x=>getComputedStyle(x).overflowY==='auto'); if(el)el.scrollTop=el.scrollHeight }); await new Promise(r=>setTimeout(r,2500))
await page.evaluate(()=>document.querySelector('.ctl-step')?.click()); await new Promise(r=>setTimeout(r,900)) // explore
await page.evaluate(()=>window.__drive && window.__drive(1)); await new Promise(r=>setTimeout(r,900)) // ride the bike
const pos = () => page.evaluate(()=>{const c=window.__car; return {spd:document.getElementById('spd-num')?.textContent}})
console.log('auto toggle present in drive?', await page.evaluate(()=>!!document.querySelector('.ctl-auto')))
console.log('reset btn present (should be NO for bike)?', await page.evaluate(()=>!!document.querySelector('.ctl-reset')))
// desktop manual bike: start engine, shift to 1, drive
await page.evaluate(()=>document.querySelector('.ctl-auto')?.click()); await new Promise(r=>setTimeout(r,400)) // → auto
await page.keyboard.down('KeyW'); for(let i=0;i<5;i++){ await new Promise(r=>setTimeout(r,350)); console.log(await pos()) } await page.keyboard.up('KeyW')
console.log('errors:', errs.slice(0,3))
await b.close()

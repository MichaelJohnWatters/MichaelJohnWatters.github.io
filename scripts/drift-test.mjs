import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu'] })
const page = await b.newPage()
const errs=[]; page.on('pageerror',e=>errs.push(String(e).slice(0,140)))
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 4500))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).overflowY==='auto'); el.scrollTop=el.scrollHeight })
await new Promise((r) => setTimeout(r, 2500))
await page.mouse.move(100,400)
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise((r) => setTimeout(r, 800))
await page.keyboard.press('KeyE'); await new Promise(r=>setTimeout(r,700))
await page.keyboard.press('KeyI'); await new Promise(r=>setTimeout(r,300))
const spd = () => page.evaluate(()=>+document.getElementById('spd-num')?.textContent)
// clutch launch straight
await page.keyboard.down('ShiftLeft'); await page.keyboard.press('ArrowUp'); await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,600)); await page.keyboard.up('ShiftLeft')
// STRAIGHT LINE: accelerate, upshift, confirm speed rises steadily (stable)
let last=0, ok=true
for(let s=0;s<8;s++){ await new Promise(r=>setTimeout(r,500)); const rpm=await page.evaluate(()=>parseInt(document.getElementById('rpm-fill')?.style.width)); const g=await page.evaluate(()=>document.getElementById('gear-num')?.textContent); if(rpm>92&&g!=='5')await page.keyboard.press('ArrowUp'); const v=await spd(); if(s>2 && v<last-30) ok=false; last=v; if(s%2===0)console.log('straight',s,'spd'+v) }
console.log('straight-line stable (speed didnt collapse):', ok, 'top', last)
// TURN: hold D and keep power, see it turns without exploding
await page.keyboard.down('KeyD'); await new Promise(r=>setTimeout(r,1500))
console.log('mid-turn spd:', await spd())
await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW')
console.log('fps', await page.evaluate(() => new Promise((res)=>{let n=0;const t0=performance.now();const t=()=>(performance.now()-t0<1500?(n++,requestAnimationFrame(t)):res(Math.round(n/1.5)));requestAnimationFrame(t)})), 'errors', errs.slice(0,3))
await b.close()

import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1024, height: 700 })
const errs=[]; page.on('pageerror',e=>errs.push(String(e)))
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,7000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
await page.evaluate(()=>window.__place && window.__place(0.3, 40, 0)); await new Promise(r=>setTimeout(r,400))
// drive north up the main road, sample every 700ms
await page.keyboard.down('KeyW')
const path=[]
for (let i=0;i<16;i++){ await new Promise(r=>setTimeout(r,700)); path.push(await page.evaluate(()=>({x:+window.__car.x.toFixed(1), z:+window.__car.z.toFixed(1), v:+Math.hypot(window.__car.velx||0,window.__car.velz||0).toFixed(1)}))) }
await page.keyboard.up('KeyW')
console.log('trajectory (x,z):')
path.forEach((p,i)=>console.log(`  t${i}: x=${p.x} z=${p.z}`))
// detect a stall: z stops increasing
let stall=null
for(let i=3;i<path.length;i++){ if(path[i].z - path[i-1].z < 0.6 && path[i].z < 520){ stall={at:i, ...path[i]}; break } }
console.log('STALL:', stall?JSON.stringify(stall):'none (reached rbt area)')
console.log('errs:', errs.length)
await b.close()

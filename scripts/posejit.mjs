import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 900, height: 600 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
await page.evaluate(()=>window.__place && window.__place(0,150,22)); await new Promise(r=>setTimeout(r,600))
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,1500))
// sample pose every frame for ~1s
const s = await page.evaluate(()=>new Promise(res=>{const a=[];function f(){const c=window.__car;a.push([+c.x.toFixed(3),+c.y.toFixed(3),+c.z.toFixed(3),+c.heading.toFixed(4)]);if(a.length<80)requestAnimationFrame(f);else res(a)}requestAnimationFrame(f)}))
await page.keyboard.up('KeyW')
// analyse: y bob range, lateral (x) jitter around the straight (x should be ~0), heading jitter
const ys=s.map(r=>r[1]), xs=s.map(r=>r[0]), hs=s.map(r=>r[3])
const range=a=>+(Math.max(...a)-Math.min(...a)).toFixed(3)
// frame-to-frame y delta std (high-freq bob)
const dy=[];for(let i=1;i<s.length;i++)dy.push(Math.abs(s[i][1]-s[i-1][1]))
const meandy=dy.reduce((a,b)=>a+b,0)/dy.length
console.log('y range (suspension bob):', range(ys), ' mean |dy|/frame:', meandy.toFixed(4))
console.log('x range over straight (lateral):', range(xs))
console.log('heading range (rad):', range(hs))
await b.close()

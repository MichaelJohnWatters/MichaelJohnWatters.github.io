import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
// seed a ghost so the ghost car + delta run during the measured lap
await page.evaluate(()=>{const s=[];for(let i=0;i<=600;i++)s.push({t:+(i*0.06).toFixed(2),x:0,z:118+i*0.6,h:0});localStorage.setItem('nightgarage.ghost',JSON.stringify({samples:s,sectors:[12,12,12]}));localStorage.setItem('nightgarage.bestLap','36')})
await page.reload({waitUntil:'domcontentloaded'}); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
await page.evaluate(()=>window.__place && window.__place(0,110,25)); await new Promise(r=>setTimeout(r,300))
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,1500)) // cross finish, timing on, ghost running
const jit = await page.evaluate(()=>new Promise(res=>{const dt=[];let last=performance.now();function f(){const n=performance.now();dt.push(n-last);last=n;if(dt.length<150)requestAnimationFrame(f);else{const m=dt.reduce((a,b)=>a+b,0)/dt.length;const sd=Math.sqrt(dt.reduce((a,b)=>a+(b-m)**2,0)/dt.length);res({fps:Math.round(1000/m),mean:+m.toFixed(1),sd:+sd.toFixed(1),max:+Math.max(...dt).toFixed(1)})}}requestAnimationFrame(f)}))
await page.keyboard.up('KeyW')
const started = await page.evaluate(()=>document.getElementById('lap-cur')?.textContent)
console.log('during timed lap @speed:', JSON.stringify(jit), ' lap-cur:', started)
await b.close()

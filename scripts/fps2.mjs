import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
async function fpsAt(x,z,label){
  await page.evaluate((x,z)=>window.__place && window.__place(x,z,15),x,z); await new Promise(r=>setTimeout(r,500))
  await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,700))
  const fps = await page.evaluate(()=>new Promise(res=>{let n=0;const t0=performance.now();function f(){n++;if(performance.now()-t0<3000)requestAnimationFrame(f);else res(Math.round(n/((performance.now()-t0)/1000)))}requestAnimationFrame(f)}))
  await page.keyboard.up('KeyW')
  // also measure frame-time variance (jitter) via rAF deltas
  const jit = await page.evaluate(()=>new Promise(res=>{const dt=[];let last=performance.now();function f(){const n=performance.now();dt.push(n-last);last=n;if(dt.length<120)requestAnimationFrame(f);else{const m=dt.reduce((a,b)=>a+b,0)/dt.length;const v=Math.sqrt(dt.reduce((a,b)=>a+(b-m)**2,0)/dt.length);res({mean:+m.toFixed(1),sd:+v.toFixed(1),max:+Math.max(...dt).toFixed(1)})}}requestAnimationFrame(f)}))
  console.log(`${label}: ${fps} fps | frame ms mean=${jit.mean} sd=${jit.sd} max=${jit.max}`)
}
await fpsAt(0,300,'straight     ')
await fpsAt(-30,555,'top sweeper  ')
await b.close()

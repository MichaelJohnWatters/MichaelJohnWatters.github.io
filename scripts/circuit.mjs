import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage(); await page.setViewport({ width: 1024, height: 700 })
const errs=[]; page.on('pageerror',e=>errs.push(String(e))); page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()) })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,8000))
await page.evaluate(()=>window.__enterCar && window.__enterCar(0)); await new Promise(r=>setTimeout(r,600))
await page.evaluate(()=>window.__drive && window.__drive(0)); await new Promise(r=>setTimeout(r,900))
async function run(x,z,label){
  await page.evaluate((x,z)=>window.__place && window.__place(x,z,0),x,z); await new Promise(r=>setTimeout(r,400))
  const p0=await page.evaluate(()=>({x:+window.__car.x.toFixed(1),z:+window.__car.z.toFixed(1)}))
  await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,4000)); await page.keyboard.up('KeyW')
  const p1=await page.evaluate(()=>({x:+window.__car.x.toFixed(1),z:+window.__car.z.toFixed(1)}))
  console.log(`${label}: (${p0.x},${p0.z}) -> (${p1.x},${p1.z})  dz=${(p1.z-p0.z).toFixed(1)} dx=${(p1.x-p0.x).toFixed(1)}`)
}
await run(0,45,'access->track ')
await run(0,300,'right straight')
console.log('errs:', errs.length, errs.slice(0,3).join(' | '))
await b.close()

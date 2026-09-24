import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 4500))
await page.evaluate(() => { const el=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).overflowY==='auto'); el.scrollTop=el.scrollHeight })
await new Promise((r) => setTimeout(r, 2500))
await page.mouse.move(100,400)
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise((r) => setTimeout(r, 700))
await page.keyboard.press('KeyE')
await new Promise(r=>setTimeout(r,800))
const read = () => page.evaluate(() => ({ g: document.getElementById('gear-num')?.textContent, spd:+document.getElementById('spd-num')?.textContent, warn: document.getElementById('rev-warn')?.textContent, rpm: parseInt(document.getElementById('rpm-fill')?.style.width) }))
// wind each gear to redline before upshifting → build real speed
await page.keyboard.down('KeyW')
for (let s=0;s<26;s++){
  await new Promise(r=>setTimeout(r,300))
  const r = await read()
  if (r.rpm > 90 && r.g!=='5') { await page.keyboard.press('ArrowUp') }
  if (s%3===0) console.log('wind', r)
  if (+r.spd > 95) break
}
console.log('TOP:', await read())
// money shift: 5th -> 2nd, spacing presses past the 0.3s shift cooldown
await page.keyboard.press('ArrowDown'); await new Promise(r=>setTimeout(r,350))
await page.keyboard.press('ArrowDown'); await new Promise(r=>setTimeout(r,350))
await page.keyboard.press('ArrowDown'); await new Promise(r=>setTimeout(r,500))
console.log('AFTER money-shift:', await read())
await page.keyboard.up('KeyW')
await new Promise(r=>setTimeout(r,1500))
console.log('coasting:', await read())
await page.screenshot({ path:'/tmp/shots/wreck.png' })
await b.close()

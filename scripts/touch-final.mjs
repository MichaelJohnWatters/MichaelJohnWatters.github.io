import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
})
const page = await browser.newPage()
await page.emulate({
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
})
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 4000))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 3500))
console.log('step button (seated, unzoomed):', await page.evaluate(() => !!document.querySelector('.ctl-step')))
await page.screenshot({ path: '/tmp/shots/m1-seated.png' })
// step away → joystick
const step = await page.evaluate(() => {
  const b = document.querySelector('.ctl-step')
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.touchscreen.tap(step.x, step.y)
await new Promise((r) => setTimeout(r, 1500))
console.log('explore mode:', await page.evaluate(() => !!document.querySelector('.ctl-back')))
console.log('joystick:', await page.evaluate(() => !!document.querySelector('.joystick')))
// drag the joystick knob up (walk forward) — camera should move
const joy = await page.evaluate(() => {
  const j = document.querySelector('.joystick')
  const r = j.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.touchscreen.touchStart(joy.x, joy.y)
for (let i = 1; i <= 6; i++) await page.touchscreen.touchMove(joy.x, joy.y - i * 6)
await new Promise((r) => setTimeout(r, 1200))
await page.touchscreen.touchEnd()
await new Promise((r) => setTimeout(r, 500))
await page.screenshot({ path: '/tmp/shots/m3-explore.png' })
console.log('done')
await browser.close()

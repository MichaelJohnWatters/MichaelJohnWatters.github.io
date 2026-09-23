import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
})
const page = await browser.newPage()
// emulate a phone: viewport + touch + coarse pointer
await page.emulate({
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
})
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 4000))
// swipe/scroll to the desk
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 3000))
await page.screenshot({ path: '/tmp/shots/m1-seated.png' })
// tap the experience icon (visual center)
const icon = await page.evaluate(() => {
  const el = [...document.querySelectorAll('.desk-icon')].find((i) => i.textContent.includes('experience'))
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
if (icon) {
  await page.touchscreen.tap(icon.x, icon.y)
  await new Promise((r) => setTimeout(r, 600))
}
const winCount = await page.evaluate(() => document.querySelectorAll('.win').length)
console.log('windows after tap (expect 3):', winCount)
// double-tap terminal background to lean in
const term = await page.evaluate(() => {
  const t = document.querySelector('.os-screen.term')
  const r = t.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height * 0.8 }
})
await page.touchscreen.tap(term.x, term.y)
await new Promise((r) => setTimeout(r, 120))
await page.touchscreen.tap(term.x, term.y)
await new Promise((r) => setTimeout(r, 1500))
console.log('zoomed after double-tap:', await page.evaluate(() => !!document.querySelector('.zoom-hint')))
await page.screenshot({ path: '/tmp/shots/m2-zoom.png' })
// double-tap again to sit back, then step away → joystick present?
await page.touchscreen.tap(term.x, term.y)
await new Promise((r) => setTimeout(r, 120))
await page.touchscreen.tap(term.x, term.y)
await new Promise((r) => setTimeout(r, 1500))
const step = await page.evaluate(() => {
  const b = document.querySelector('.ctl-step')
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
if (step) {
  await page.touchscreen.tap(step.x, step.y)
  await new Promise((r) => setTimeout(r, 1200))
}
console.log('joystick present:', await page.evaluate(() => !!document.querySelector('.joystick')))
await page.screenshot({ path: '/tmp/shots/m3-explore.png' })
await browser.close()

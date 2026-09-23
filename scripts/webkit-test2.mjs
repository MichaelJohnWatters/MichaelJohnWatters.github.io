import { webkit, devices } from 'playwright'
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 13'] })
const page = await ctx.newPage()
await page.goto('http://localhost:5173')
await page.waitForTimeout(4500)
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await page.waitForTimeout(3000)
// force the Html wrappers ABOVE the canvas
await page.evaluate(() => {
  const canvas = document.querySelector('canvas')
  ;[...canvas.parentElement.children].forEach((e) => {
    if (e !== canvas && e.tagName === 'DIV' && e.firstChild?.firstChild) e.style.zIndex = '99999999'
  })
})
await page.waitForTimeout(500)
await page.screenshot({ path: '/tmp/shots/wk-forced.png' })
console.log('z-forced screenshot taken')
await browser.close()

import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
const geom = () => page.evaluate(() => {
  const w = document.querySelector('.win')
  return { left: parseFloat(w.style.left).toFixed(0), width: parseFloat(w.style.width).toFixed(0), height: parseFloat(w.style.height).toFixed(0) }
})
const dragSel = async (sel, ddx, ddy) => {
  const p = await page.evaluate((s) => {
    const el = document.querySelector(s)
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, sel)
  await page.mouse.move(p.x, p.y, { steps: 4 })
  await page.mouse.down()
  await page.mouse.move(p.x + ddx, p.y + ddy, { steps: 8 })
  await page.mouse.up()
  await new Promise((r) => setTimeout(r, 250))
}
console.log('before:', JSON.stringify(await geom()))
await dragSel('.win-h-l', -40, 0) // left edge out
console.log('after left-edge drag:', JSON.stringify(await geom()))
await dragSel('.win-h-b', 0, 30) // bottom edge down
console.log('after bottom-edge drag:', JSON.stringify(await geom()))
await browser.close()

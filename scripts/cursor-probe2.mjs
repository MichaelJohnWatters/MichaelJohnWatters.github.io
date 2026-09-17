import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 3000))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.mouse.move(300, 390, { steps: 6 })
await new Promise((r) => setTimeout(r, 300))
const onGlass = await page.evaluate(() => ({
  onGlass: document.documentElement.classList.contains('on-glass'),
  computedCursor: getComputedStyle(document.elementFromPoint(300, 390)).cursor,
  curOpacity: document.querySelector('.os-cursor').style.opacity,
}))
console.log('over glass:', JSON.stringify(onGlass))
await page.mouse.move(1100, 700, { steps: 6 })
await new Promise((r) => setTimeout(r, 300))
const offGlass = await page.evaluate(() => ({
  onGlass: document.documentElement.classList.contains('on-glass'),
  curOpacity: document.querySelector('.os-cursor').style.opacity,
}))
console.log('off glass:', JSON.stringify(offGlass))
await browser.close()

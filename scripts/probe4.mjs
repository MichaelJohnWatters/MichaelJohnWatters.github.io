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
  el.id = '__scroll'; el.scrollTop = el.scrollHeight
  window.__hits = { el: 0, win: 0, over: null }
  el.addEventListener('pointermove', () => window.__hits.el++)
  window.addEventListener('pointermove', (e) => {
    window.__hits.win++
    window.__hits.over = document.elementFromPoint(e.clientX, e.clientY)?.tagName + '#' + (document.elementFromPoint(e.clientX, e.clientY)?.id || document.elementFromPoint(e.clientX, e.clientY)?.className?.toString().slice(0,20))
  })
})
await new Promise((r) => setTimeout(r, 2000))
await page.mouse.move(300, 390, { steps: 8 })
await new Promise((r) => setTimeout(r, 400))
console.log(JSON.stringify(await page.evaluate(() => window.__hits)))
await browser.close()

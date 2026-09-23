import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
const out = await page.evaluate(() => {
  const items = document.querySelectorAll('.wb-item')
  const board = items[0]?.parentElement
  return {
    items: items.length,
    labels: [...items].map((i) => i.textContent.trim().slice(0, 30)),
    overflow: board ? board.scrollHeight - board.clientHeight : null,
  }
})
console.log(JSON.stringify(out, null, 2))
await b.close()

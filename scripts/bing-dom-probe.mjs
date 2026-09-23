import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--window-size=1280,800'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
const clickAt = async (sel) => {
  const p = await page.evaluate((s) => {
    const el = document.querySelector(s)
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, sel)
  await page.mouse.move(p.x, p.y, { steps: 3 })
  await new Promise((r) => setTimeout(r, 120))
  await page.mouse.click(p.x, p.y)
  await new Promise((r) => setTimeout(r, 350))
}
await clickAt('.task-pin')
await page.keyboard.type('wikipedia mazda mx5', { delay: 20 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 4000))
const f = page.frames().find((fr) => fr.url().includes('bing.com'))
if (!f) { console.log('no bing frame'); process.exit(1) }
const info = await f.evaluate(() => ({
  title: document.title.slice(0, 60),
  bodyText: document.body?.innerText?.slice(0, 150),
  anchors: [...document.querySelectorAll('a[href]')].slice(0, 8).map((a) => a.href.slice(0, 60)),
  algoCount: document.querySelectorAll('.b_algo').length,
})).catch((e) => 'EVAL FAIL: ' + e.message)
console.log(JSON.stringify(info, null, 1))
await b.close()

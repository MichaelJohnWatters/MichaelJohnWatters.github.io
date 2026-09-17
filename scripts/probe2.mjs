import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
const errors = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 300)))
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 3000))
// jump to seated
await page.evaluate(() => {
  const e = [...document.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 100)
  e.scrollTop = e.scrollHeight
})
await new Promise((r) => setTimeout(r, 3000))
const info = await page.evaluate(() => {
  return [...document.querySelectorAll('.os-screen')].map((s) => {
    const r = s.getBoundingClientRect()
    let el = s
    const chain = []
    while (el && el.tagName !== 'BODY') {
      const cs = getComputedStyle(el)
      chain.push({ tag: el.tagName, cls: String(el.className).slice(0, 20), display: cs.display, vis: cs.visibility, op: cs.opacity })
      el = el.parentElement
    }
    return { rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, chain: chain.slice(0, 5) }
  })
})
console.log(JSON.stringify(info, null, 1))
console.log('ERRORS:', JSON.stringify(errors.slice(0, 8), null, 1))
await browser.close()

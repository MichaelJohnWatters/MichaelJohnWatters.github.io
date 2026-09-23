// Verify Noogle → Cloudflare Worker → native in-world results list.
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
const clickAt = async (sel, idx = 0) => {
  const p = await page.evaluate((s, i) => {
    const el = [...document.querySelectorAll(s)][i]
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, sel, idx)
  if (!p) return false
  await page.mouse.move(p.x, p.y, { steps: 3 })
  await new Promise((r) => setTimeout(r, 120))
  await page.mouse.click(p.x, p.y)
  await new Promise((r) => setTimeout(r, 350))
  return true
}
await clickAt('.desk-icon', 2) // netscape
await page.keyboard.type('bbc', { delay: 25 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 9000)) // cold worker + ddg fallback can take a few s
const out = await page.evaluate(() => ({
  count: document.querySelectorAll('.web-result').length,
  titles: [...document.querySelectorAll('.web-res-title')].slice(0, 3).map((t) => t.textContent),
  note: document.querySelector('.web-res-note')?.textContent || null,
}))
console.log(JSON.stringify(out, null, 2))
await b.close()

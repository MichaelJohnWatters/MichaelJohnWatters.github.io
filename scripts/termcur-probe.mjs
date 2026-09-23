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
const term = await page.evaluate(() => {
  const t = document.querySelector('.os-screen.term')
  const r = t.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.move(term.x, term.y, { steps: 5 })
await new Promise((r) => setTimeout(r, 400))
console.log(JSON.stringify(await page.evaluate(() => {
  const curs = [...document.querySelectorAll('.os-cursor')]
  return {
    cursors: curs.map((c) => ({ op: c.style.opacity, computed: getComputedStyle(c).opacity, vis: getComputedStyle(c).visibility, tf: c.style.transform.slice(0, 40) })),
    onGlass: document.documentElement.classList.contains('on-glass'),
    overEmbed: document.documentElement.classList.contains('over-embed'),
  }
}), null, 1))
await b.close()

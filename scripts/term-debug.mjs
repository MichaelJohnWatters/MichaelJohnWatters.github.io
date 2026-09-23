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
// what wrapper z-indexes exist, and whose content covers the terminal point?
console.log(JSON.stringify(await page.evaluate((pt) => {
  const canvas = document.querySelector('canvas')
  const wrappers = [...canvas.parentElement.children].filter((e) => e !== canvas && e.tagName === 'DIV' && e.firstChild?.firstChild)
  return {
    wrapperZ: wrappers.map((w) => ({ z: w.style.zIndex, cls: w.querySelector('.os-screen,.postit,.whiteboard')?.className?.slice(0, 22) })),
    canvasZ: canvas.style.zIndex,
  }
}, term), null, 1))
// click terminal + type
await page.mouse.move(term.x, term.y, { steps: 4 })
await new Promise((r) => setTimeout(r, 150))
await page.mouse.click(term.x, term.y)
await new Promise((r) => setTimeout(r, 300))
await page.keyboard.type('help', { delay: 30 })
await new Promise((r) => setTimeout(r, 300))
console.log('typed shows:', await page.evaluate(() => document.querySelector('.term-body.claude .term-line:last-child')?.textContent))
await b.close()

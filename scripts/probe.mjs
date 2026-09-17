// DOM probe: inspect drei Html transform divs at two scroll depths.
import puppeteer from 'puppeteer-core'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 3000))

const probe = () =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const cRect = canvas.getBoundingClientRect()
    const screens = [...document.querySelectorAll('.os-screen')].map((s) => {
      // walk up to the drei outer div (child of canvas parent)
      let outer = s
      while (outer.parentElement && outer.parentElement !== canvas.parentElement) {
        outer = outer.parentElement
      }
      const r = s.getBoundingClientRect()
      return {
        cls: s.className,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        outerStyle: {
          pos: outer.style.position,
          top: outer.style.top,
          left: outer.style.left,
          w: outer.style.width,
          h: outer.style.height,
          transform: outer.style.transform.slice(0, 120),
          perspective: outer.style.perspective,
        },
        parentOfOuter: outer.parentElement?.tagName + '.' + (outer.parentElement?.className || '') ,
      }
    })
    return { canvasRect: { x: cRect.x, y: cRect.y, w: cRect.width, h: cRect.height }, screens }
  })

const el = await page.evaluate(() => {
  const els = [...document.querySelectorAll('div')]
  const e = els.find((d) => d.scrollHeight > d.clientHeight + 100)
  e.id = '__scroll'
  return true
})

console.log('=== t=0 ===')
console.log(JSON.stringify(await probe(), null, 1))

await page.evaluate(() => {
  const e = document.getElementById('__scroll')
  e.scrollTop = 0.85 * (e.scrollHeight - e.clientHeight)
})
await new Promise((r) => setTimeout(r, 2500))

console.log('=== t=0.85 settled ===')
console.log(JSON.stringify(await probe(), null, 1))

await browser.close()

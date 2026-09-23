import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
const probe = () =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const outers = [...canvas.parentElement.children].filter(
      (e) => e !== canvas && e.tagName === 'DIV' && e.firstChild?.firstChild,
    )
    return outers.slice(0, 2).map((o) => {
      const outer = o.firstChild
      const t = outer.style.transform || ''
      const tz = t.match(/translateZ\(([\d.]+)px\)/)?.[1]
      const tr = t.match(/translate\(([\d.]+)px,([\d.]+)px\)$/)
      return {
        elW: o.firstChild.style.width,
        persp: o.firstChild.style.perspective,
        translateZ: tz,
        centerTranslate: tr ? [tr[1], tr[2]] : null,
      }
    })
  })
console.log('@1280x800 (expect fov 965.7, center 640,400):', JSON.stringify(await probe(), null, 1))
await page.setViewport({ width: 860, height: 700 })
await new Promise((r) => setTimeout(r, 1500))
console.log('@860x700 (expect fov 845, center 430,350):', JSON.stringify(await probe(), null, 1))
await browser.close()

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
    const screens = [...document.querySelectorAll('.os-screen')].map((s) => {
      let outer = s
      while (outer.parentElement && outer.parentElement !== canvas.parentElement) outer = outer.parentElement
      const inner = outer.firstChild
      return {
        outerW: outer.firstChild ? outer.style.width || outer.firstChild.style?.width : '?',
        outerStyleW: (outer.querySelector('div') || {}).style?.width,
        wrapperCss: outer.style.cssText.slice(0, 60),
      }
    })
    const outers = [...canvas.parentElement.children].filter((e) => e !== canvas && e.tagName === 'DIV')
    return {
      canvas: { w: canvas.clientWidth, h: canvas.clientHeight },
      win: { w: window.innerWidth, h: window.innerHeight },
      outerDivs: outers.map((o) => ({
        css: o.style.cssText.slice(0, 50),
        childW: o.firstChild?.style?.width,
        childH: o.firstChild?.style?.height,
        childPersp: o.firstChild?.style?.perspective,
      })),
    }
  })
console.log('@1280:', JSON.stringify(await probe(), null, 1))
await page.setViewport({ width: 860, height: 700 })
await new Promise((r) => setTimeout(r, 1500))
console.log('@860x700:', JSON.stringify(await probe(), null, 1))
await browser.close()

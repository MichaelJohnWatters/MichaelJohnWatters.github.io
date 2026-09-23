import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.goto('file:///Users/michaeljohnwatters/repo/personal-website-3js/public/cv/michael-watters-cv.html')
await new Promise((r) => setTimeout(r, 500))
console.log(JSON.stringify(await p.evaluate(() => {
  const mm = 96 / 25.4
  return [...document.querySelectorAll('.page')].map((pg) => ({
    offsetH: pg.offsetHeight,
    a4px: Math.round(297 * mm),
    contentBottom: Math.max(...[...pg.querySelectorAll('*')].map((el) => el.offsetTop + el.offsetHeight)),
  }))
})))
await b.close()

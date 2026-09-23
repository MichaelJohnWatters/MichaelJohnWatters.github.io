import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--window-size=1280,800'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
const doneCount = () => page.evaluate(() => document.querySelectorAll('.wb-done').length)
console.log('whiteboard present:', await page.evaluate(() => !!document.querySelector('.whiteboard')))
console.log('done at start:', await doneCount())
await page.keyboard.press('KeyL') // lights task
await new Promise((r) => setTimeout(r, 400))
console.log('after L:', await doneCount())
// seat + search task
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
const p = await page.evaluate(() => {
  const el = document.querySelector('.task-pin')
  const r = el.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.move(p.x, p.y, { steps: 3 })
await new Promise((r) => setTimeout(r, 150))
await page.mouse.click(p.x, p.y)
await page.keyboard.type('bbc', { delay: 20 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 2500))
console.log('after search:', await doneCount())
console.log('results shown:', await page.evaluate(() => [...document.querySelectorAll('.web-res-title')].slice(0, 2).map((e) => e.textContent)))
// scroll back out to see the whiteboard area
await page.evaluate(() => { document.getElementById ; const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto'); el.scrollTop = el.scrollHeight * 0.55 })
await new Promise((r) => setTimeout(r, 2500))
await page.screenshot({ path: '/tmp/shots/30-whiteboard.png' })
await b.close()

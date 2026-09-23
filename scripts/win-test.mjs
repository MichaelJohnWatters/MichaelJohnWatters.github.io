import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 3000))
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
  await new Promise((r) => setTimeout(r, 250))
  return true
}

// open ALL five icons
for (let i = 0; i < 5; i++) await clickAt('.desk-icon', i)
const t1 = await page.evaluate(() => ({
  taskbarH: document.querySelector('.taskbar').offsetHeight,
  wins: document.querySelectorAll('.win').length,
  taskBtns: document.querySelectorAll('.task-open').length,
}))
console.log('all open:', JSON.stringify(t1))

// maximize the focused (front) window: its □ is win-btns i[1]
await clickAt('.win-active .win-btns i', 1)
const t2 = await page.evaluate(() => ({
  maxed: !!document.querySelector('.win-max'),
}))
console.log('after maximize:', JSON.stringify(t2))

// restore then minimize it
await clickAt('.win-active .win-btns i', 1)
await clickAt('.win-active .win-btns i', 0)
const t3 = await page.evaluate(() => ({
  maxed: !!document.querySelector('.win-max'),
  visibleWins: document.querySelectorAll('.win').length,
  taskBtns: document.querySelectorAll('.task-open').length,
  taskbarH: document.querySelector('.taskbar').offsetHeight,
}))
console.log('after restore+minimize:', JSON.stringify(t3))

// restore from taskbar (click last task button)
const nBtns = t3.taskBtns
await clickAt('.task-open', nBtns - 1)
const t4 = await page.evaluate(() => ({ visibleWins: document.querySelectorAll('.win').length }))
console.log('after taskbar restore:', JSON.stringify(t4))
await page.screenshot({ path: '/tmp/shots/11-windows.png' })
await browser.close()

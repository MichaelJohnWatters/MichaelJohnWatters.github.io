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
// click the 'projects/' desktop icon at its VISUAL position
const iconPos = await page.evaluate(() => {
  const icons = [...document.querySelectorAll('.desk-icon')]
  const proj = icons.find((i) => i.textContent.includes('projects'))
  const r = proj.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await page.mouse.move(iconPos.x, iconPos.y, { steps: 5 })
await new Promise((r) => setTimeout(r, 200))
await page.mouse.click(iconPos.x, iconPos.y)
await new Promise((r) => setTimeout(r, 500))
const winState = await page.evaluate(() => ({
  windows: [...document.querySelectorAll('.win')].map((w) => ({
    title: w.querySelector('.win-title span').textContent,
    active: w.className.includes('win-active'),
  })),
  taskButtons: [...document.querySelectorAll('.task-open')].map((b) => b.textContent),
}))
console.log('after icon click:', JSON.stringify(winState, null, 1))
await page.screenshot({ path: '/tmp/shots/8-os-click.png' })
// step away + toggle first person
await page.click('.ctl-step')
await new Promise((r) => setTimeout(r, 1200))
await page.keyboard.press('KeyV')
await new Promise((r) => setTimeout(r, 300))
await page.keyboard.down('KeyW')
await new Promise((r) => setTimeout(r, 900))
await page.keyboard.up('KeyW')
await new Promise((r) => setTimeout(r, 600))
await page.screenshot({ path: '/tmp/shots/9-first-person.png' })
console.log('first-person shot captured')
await browser.close()

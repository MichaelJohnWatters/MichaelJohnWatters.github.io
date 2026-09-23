import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
const cdp = await page.createCDPSession()
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: '/tmp/shots' })
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
  await new Promise((r) => setTimeout(r, 150))
  await page.mouse.click(p.x, p.y)
  await new Promise((r) => setTimeout(r, 350))
  return true
}
// icon order: about, cv.html, experience, projects, skills, contact → idx 1
await clickAt('.desk-icon', 1)
const state = await page.evaluate(() => ({
  cvWin: !!document.querySelector('.cv-viewer'),
  iframe: document.querySelector('.cv-frame iframe')?.src || null,
  about: document.querySelector('.win .win-body p')?.textContent.slice(0, 50),
}))
console.log('cv window:', JSON.stringify(state, null, 1))
// click download
await clickAt('.cv-dl')
await new Promise((r) => setTimeout(r, 1500))
console.log('screenshot...')
await page.screenshot({ path: '/tmp/shots/13-cv.png' })
await browser.close()

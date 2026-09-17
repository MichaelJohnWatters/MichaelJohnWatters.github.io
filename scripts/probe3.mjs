import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1280,800'],
})
const page = await browser.newPage()
const logs = []
page.on('console', (m) => logs.push(m.type() + ': ' + m.text().slice(0, 150)))
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e).slice(0, 250)))
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 3000))
const res1 = await page.evaluate(() => {
  const els = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 100)
  return els.map((e) => ({ sh: e.scrollHeight, ch: e.clientHeight, cls: e.className.slice(0, 30), styleTop: e.style.cssText.slice(0, 80) }))
})
console.log('scrollable divs:', JSON.stringify(res1, null, 1))
await page.evaluate(() => {
  const e = [...document.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 100)
  e.scrollTop = e.scrollHeight
})
await new Promise((r) => setTimeout(r, 2000))
const res2 = await page.evaluate(() => {
  const e = [...document.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 100)
  const hint = document.querySelector('.scroll-hint')
  return { scrollTop: e.scrollTop, hintOpacity: hint ? hint.style.opacity : 'gone' }
})
console.log('after scroll:', JSON.stringify(res2))
console.log('LOGS:', JSON.stringify(logs.filter(l => !l.startsWith('log')).slice(0, 6), null, 1))
await browser.close()

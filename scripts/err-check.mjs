import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await b.newPage()
const errs = []
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 300)))
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 4000))
console.log('canvas:', await page.evaluate(() => !!document.querySelector('canvas')))
console.log('errors:', JSON.stringify(errs.slice(0, 5), null, 1))
await b.close()

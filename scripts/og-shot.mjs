// Capture the night-garage hero as the social share card (1200x630).
import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--window-size=1200,630'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 630 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 5000)) // settle the establishing shot
await page.screenshot({ path: 'public/og.png' })
console.log('og.png captured')
await browser.close()

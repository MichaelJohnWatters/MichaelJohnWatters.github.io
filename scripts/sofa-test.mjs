import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise((r) => setTimeout(r, 600))
// walk: W to the back wall, then D along it to the couch
await page.keyboard.down('KeyW'); await new Promise((r) => setTimeout(r, 1000)); await page.keyboard.up('KeyW')
await page.keyboard.down('KeyD'); await new Promise((r) => setTimeout(r, 1500)); await page.keyboard.up('KeyD')
await new Promise((r) => setTimeout(r, 400))
const prompt = await page.evaluate(() => document.querySelector('.sit-label')?.textContent)
console.log('prompt:', prompt)
await page.keyboard.press('KeyE')
await new Promise((r) => setTimeout(r, 600))
const seated = await page.evaluate(() => ({
  label: document.querySelector('.sit-label')?.textContent,
  aim: document.getElementById('aim-label')?.textContent,
}))
console.log('seated:', JSON.stringify(seated))
await page.screenshot({ path: '/tmp/shots/sofa.png' })
await page.keyboard.press('KeyE')
await new Promise((r) => setTimeout(r, 600))
console.log('stood:', await page.evaluate(() => document.querySelector('.sit-label')?.textContent))
await b.close()

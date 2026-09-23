import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 3500))
await page.evaluate(() => {
  localStorage.removeItem('phone-unlocked') // fresh visitor
  const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
  el.scrollTop = el.scrollHeight
})
await new Promise((r) => setTimeout(r, 2500))
await page.evaluate(() => document.querySelector('.ctl-step')?.click())
await new Promise((r) => setTimeout(r, 700))
await page.keyboard.press('KeyP')
await new Promise((r) => setTimeout(r, 600))
console.log('locked ui:', await page.evaluate(() => !!document.querySelector('.phone-pad')))
// wrong code
for (const k of '9999') await page.keyboard.press(k)
await new Promise((r) => setTimeout(r, 600))
console.log('still locked after 9999:', await page.evaluate(() => !!document.querySelector('.phone-pad')))
// right code
for (const k of '1234') await page.keyboard.press(k)
await new Promise((r) => setTimeout(r, 800))
const after = await page.evaluate(() => ({
  unlockedUi: !!document.querySelector('.phone-input'),
  stored: localStorage.getItem('phone-unlocked'),
}))
console.log('after 1234:', JSON.stringify(after))
// close & reopen — should stay unlocked
await page.evaluate(() => document.querySelector('.phone-close')?.click())
await new Promise((r) => setTimeout(r, 400))
await page.keyboard.press('KeyP')
await new Promise((r) => setTimeout(r, 500))
console.log('reopen RE-LOCKS:', await page.evaluate(() => !!document.querySelector('.phone-pad')))
for (const k of '1234') await page.keyboard.press(k)
await new Promise((r) => setTimeout(r, 700))
await page.type('.phone-input', 'lofi', { delay: 15 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 6000))
await page.screenshot({ path: '/tmp/shots/lock.png' }) // yt-shot
await b.close()

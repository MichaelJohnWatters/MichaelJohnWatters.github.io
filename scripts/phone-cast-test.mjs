// step away → P → unlock 1234 → search → cast → TV iframe + volume slider
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
await new Promise((r) => setTimeout(r, 800))
await page.keyboard.press('KeyP')
await new Promise((r) => setTimeout(r, 600))
console.log('overlay:', await page.evaluate(() => !!document.querySelector('.phone')))
for (const k of '1234') await page.keyboard.press(k)
await new Promise((r) => setTimeout(r, 700))
await page.type('.phone-input', 'lofi hip hop radio', { delay: 15 })
await page.keyboard.press('Enter')
await new Promise((r) => setTimeout(r, 6000))
console.log('results:', await page.evaluate(() => document.querySelectorAll('.phone-item').length))
await page.evaluate(() => document.querySelector('.phone-item')?.click())
await new Promise((r) => setTimeout(r, 4000))
const tv = await page.evaluate(() => {
  const f = document.querySelector('.cave-tv iframe')
  return {
    iframe: !!f,
    jsapi: f?.src?.includes('enablejsapi=1'),
    volSlider: !!document.querySelector('.yt-vol input'),
    stop: !!document.querySelector('.phone-stop'),
  }
})
console.log('tv:', JSON.stringify(tv))
// set the volume slider
await page.evaluate(() => {
  const s = document.querySelector('.yt-vol input')
  if (s) {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    set.call(s, '25')
    s.dispatchEvent(new Event('input', { bubbles: true }))
    s.dispatchEvent(new Event('change', { bubbles: true }))
  }
})
await new Promise((r) => setTimeout(r, 400))
console.log('vol after set:', await page.evaluate(() => document.querySelector('.yt-vol input')?.value))
await page.evaluate(() => document.querySelector('.phone-stop')?.click())
await new Promise((r) => setTimeout(r, 500))
console.log('after stop:', await page.evaluate(() => !!document.querySelector('.cave-tv iframe')))
await b.close()

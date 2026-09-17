// Headless screenshot probe: scroll the dive to various offsets and capture
// frames so we can see how the on-glass Html tracks the monitors.
import puppeteer from 'puppeteer-core'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = 'http://localhost:5173'
const OUT = '/tmp/shots'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1280,800', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 3500)) // let the scene warm up

// Find drei ScrollControls' scroll element — the overflow-y:auto div
// (NOT the Html blending wrappers, which are overflow:hidden but scrollable).
const scrollInfo = await page.evaluate(() => {
  const els = [...document.querySelectorAll('div')]
  const el = els.find((d) => getComputedStyle(d).overflowY === 'auto' && d.scrollHeight > d.clientHeight)
  if (!el) return null
  el.id = '__scroll'
  return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }
})
console.log('scroll el:', scrollInfo)

async function shot(frac, name, settleMs) {
  await page.evaluate((f) => {
    const el = document.getElementById('__scroll')
    el.scrollTop = f * (el.scrollHeight - el.clientHeight)
  }, frac)
  await new Promise((r) => setTimeout(r, settleMs))
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('captured', name)
}

// settled frames at increasing depth
await shot(0.0, '0-start', 2000)
await shot(0.35, '1-mid-spiral', 2500)
await shot(0.6, '2-approach', 2500)
await shot(0.85, '3-close', 2500)
await shot(1.0, '4-seated', 3000)
// and one mid-motion frame: jump back out then in, capture while damping
await shot(0.0, 'reset', 2500)
await page.evaluate(() => {
  const el = document.getElementById('__scroll')
  el.scrollTop = 0.7 * (el.scrollHeight - el.clientHeight)
})
await new Promise((r) => setTimeout(r, 350)) // mid-damp
await page.screenshot({ path: `${OUT}/5-in-motion.png` })
console.log('captured 5-in-motion')

await browser.close()

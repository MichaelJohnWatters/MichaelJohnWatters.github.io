import puppeteer from 'puppeteer-core'
for (const [w, h] of [[860, 700], [1600, 900]]) {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: [`--window-size=${w},${h}`],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h })
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 3500))
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => getComputedStyle(d).overflowY === 'auto')
    el.scrollTop = el.scrollHeight
  })
  await new Promise((r) => setTimeout(r, 2500))
  await page.screenshot({ path: `/tmp/shots/fresh-${w}x${h}.png` })
  console.log(`captured fresh ${w}x${h}`)
  await browser.close()
}

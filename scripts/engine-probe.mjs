import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const page = await b.newPage()
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36')
// Bing
await page.goto('https://www.bing.com/search?q=mazda+mx5+wiki', { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 2000))
console.log('bing:', await page.evaluate(() => {
  const as = [...document.querySelectorAll('.b_algo h2 a')].slice(0, 3)
  return as.map((a) => ({ target: a.target || '(none)', href: a.href.slice(0, 40) }))
}))
// searx.be
try {
  await page.goto('https://searx.be/search?q=mazda+mx5+wiki', { waitUntil: 'domcontentloaded', timeout: 15000 })
  await new Promise((r) => setTimeout(r, 2000))
  console.log('searx:', await page.evaluate(() => {
    const as = [...document.querySelectorAll('a')].filter((a) => /^https?:/.test(a.href) && !a.href.includes('searx')).slice(0, 3)
    return { title: document.title.slice(0, 40), links: as.map((a) => ({ target: a.target || '(none)', href: a.href.slice(0, 40) })) }
  }))
} catch (e) { console.log('searx failed:', String(e).slice(0, 80)) }
await b.close()

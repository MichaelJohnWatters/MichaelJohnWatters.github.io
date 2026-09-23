// Re-render the (redacted) CV html to PDF via headless Chrome.
import puppeteer from 'puppeteer-core'
import { fileURLToPath } from 'url'
import path from 'path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = 'file://' + path.join(root, 'public/cv/michael-watters-cv.html')
const out = path.join(root, 'public/cv/Michael-Watters-CV.pdf')

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
})
const page = await browser.newPage()
await page.goto(src, { waitUntil: 'networkidle0' })
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
})
console.log('rendered', out)
await browser.close()

import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--use-angle=metal','--enable-gpu'] })
const page = await b.newPage()
await page.setViewport({ width: 1280, height: 800 })
await page.goto('http://localhost:5173', { waitUntil:'domcontentloaded' }); await new Promise(r=>setTimeout(r,7000))
const bg = await page.evaluate(()=>{ const el=document.querySelector('.os-screen'); if(!el)return 'NO os-screen'; const s=getComputedStyle(el).backgroundImage; return { hasLogo: s.includes('svg'), hasGradient: s.includes('gradient'), snippet: s.slice(0,70) } })
console.log(JSON.stringify(bg))
await b.close()

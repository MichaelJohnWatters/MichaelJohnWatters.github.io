import puppeteer from 'puppeteer-core'
const urls = {
  resolvedLive: 'https://www.youtube-nocookie.com/embed/GCCyYfDwyew?autoplay=1&mute=1&controls=0&playsinline=1',
  searchResult: 'https://www.youtube-nocookie.com/embed/rFZHOHl-L8A?autoplay=1&mute=1&controls=0&playsinline=1',
}
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await b.newPage()
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
for (const [name, u] of Object.entries(urls)) {
  await p.evaluate((src) => {
    document.getElementById('ytt')?.remove()
    const f = document.createElement('iframe')
    f.id = 'ytt'
    f.width = 480
    f.height = 260
    f.allow = 'autoplay; encrypted-media'
    f.src = src
    document.body.appendChild(f)
  }, u)
  await new Promise((r) => setTimeout(r, 6000))
  const fr = p.frames().find((f) => f.url().includes('youtube'))
  const state = fr
    ? await fr.evaluate(() => ({
        text: document.body.innerText.trim().slice(0, 80),
        unavailable: !!document.body.innerText.match(/unavailable|not available/i),
        video: !!document.querySelector('video'),
        playing: (() => { const v = document.querySelector('video'); return v ? !v.paused : false })(),
      })).catch((e) => ({ err: String(e).slice(0, 60) }))
    : { err: 'no frame' }
  console.log(name, JSON.stringify(state))
}
await b.close()

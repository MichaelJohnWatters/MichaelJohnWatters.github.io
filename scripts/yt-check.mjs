import puppeteer from 'puppeteer-core'
const urls = {
  oldId: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&controls=0&playsinline=1',
  liveByChannel: 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCSJ4gkVC6NrvII8umztf0Ow&autoplay=1&mute=1&controls=0&playsinline=1',
  liveByChannelYT: 'https://www.youtube.com/embed/live_stream?channel=UCSJ4gkVC6NrvII8umztf0Ow&autoplay=1&mute=1&controls=0&playsinline=1',
}
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
for (const [name, u] of Object.entries(urls)) {
  const p = await b.newPage()
  await p.goto(u, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, 4000))
  const state = await p.evaluate(() => ({
    unavailable: !!document.body.innerText.match(/unavailable|not available/i),
    hasVideo: !!document.querySelector('video'),
    playing: (() => { const v = document.querySelector('video'); return v ? !v.paused : false })(),
  }))
  console.log(name, JSON.stringify(state))
  await p.close()
}
await b.close()

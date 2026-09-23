// Noogle search proxy — Cloudflare Worker.
// Fetches Bing's HTML server-side (no CORS/frame rules apply there), parses
// the b_algo results, decodes the ck/a redirect links to real URLs, and
// returns clean JSON for the in-world browser's native results page.
//
// Deploy: see worker/README.md. Free tier is far more than enough.

const ALLOWED_ORIGINS = ['https://michaeljohnwatters.github.io']

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'Accept-Language': 'en-GB,en;q=0.9',
    },
  })
  return res.text()
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }
const strip = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (_, e) => ENT[e])
    .replace(/\s+/g, ' ')
    .trim()

function parseBing(html) {
  const items = []
  const blocks = html.match(/<li class="b_algo[\s\S]*?<\/li>/g) || []
  for (const b of blocks) {
    const m = b.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!m) continue
    let url = m[1]
    // bing ck/a redirects carry the real URL base64url-encoded in u=a1...
    const u = url.match(/u=a1([^&"]+)/)
    if (u) {
      try {
        let s = u[1].replace(/-/g, '+').replace(/_/g, '/')
        while (s.length % 4) s += '='
        url = atob(s)
      } catch {}
    }
    const title = strip(m[2])
    const pm = b.match(/<p[^>]*>([\s\S]*?)<\/p>/)
    const snippet = pm ? strip(pm[1]).slice(0, 180) : ''
    if (/^https?:\/\//.test(url) && title) items.push({ title, url, snippet })
    if (items.length >= 8) break
  }
  return items
}

// Do any of the items even mention a query word? (Junk pages don't.)
function relevant(items, q) {
  if (!items.length) return false
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length >= 3)
  if (!words.length) return true
  return items.some((it) =>
    words.some((w) => (it.title + ' ' + it.url + ' ' + it.snippet).toLowerCase().includes(w)),
  )
}

export default {
  async fetch(req) {
    const reqUrl = new URL(req.url)
    const q = (reqUrl.searchParams.get('q') || '').slice(0, 200)
    const origin = req.headers.get('Origin') || ''
    const allowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost')
    const headers = {
      'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=600',
    }
    if (!q) return new Response('{"items":[]}', { headers })

    // Bing intermittently serves generic junk (Microsoft support pages) to
    // datacenter IPs — retry a couple of times; a fresh request usually hits
    // a good backend. Still junk after that → return [] so the client falls
    // back to its Wikipedia search. (DuckDuckGo can't be the fallback: it
    // 522s all requests from Cloudflare Workers.)
    const attempts = []
    let items = []
    for (let i = 0; i < 3; i++) {
      items = parseBing(
        await fetchHtml('https://www.bing.com/search?q=' + encodeURIComponent(q) + (i ? '&count=10&setlang=en' : '')),
      )
      attempts.push({ count: items.length, sample: items[0]?.title })
      if (relevant(items, q)) break
    }
    if (!relevant(items, q)) items = []

    // ?debug=1 → per-attempt diagnostics
    if (reqUrl.searchParams.get('debug')) {
      return new Response(JSON.stringify({ attempts, kept: items.length }), { headers })
    }

    return new Response(JSON.stringify({ items }), { headers })
  },
}

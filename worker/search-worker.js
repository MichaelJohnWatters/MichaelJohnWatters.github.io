// Noogle search proxy — Cloudflare Worker.
// Fetches Bing's HTML server-side (no CORS/frame rules apply there), parses
// the b_algo results, decodes the ck/a redirect links to real URLs, and
// returns clean JSON for the in-world browser's native results page.
//
// Deploy: see worker/README.md. Free tier is far more than enough.

const ALLOWED_ORIGINS = ['https://michaeljohnwatters.github.io']

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

    const res = await fetch('https://www.bing.com/search?q=' + encodeURIComponent(q), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    })
    const html = await res.text()

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
      const title = m[2].replace(/<[^>]+>/g, '').trim()
      const pm = b.match(/<p[^>]*>([\s\S]*?)<\/p>/)
      const snippet = pm
        ? pm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 180)
        : ''
      if (/^https?:\/\//.test(url) && title) items.push({ title, url, snippet })
      if (items.length >= 8) break
    }

    return new Response(JSON.stringify({ items }), { headers })
  },
}

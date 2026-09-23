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

// /page?u=<url> — fetch a page server-side and re-serve it so the in-world
// browser can display sites that forbid being framed (X-Frame-Options/CSP
// never reach the client: we return the BODY under our own headers). Scripts
// are stripped (static retro rendering — fitting for netscape.exe), <base>
// is injected so images/CSS resolve, and links are rewritten back through
// the proxy so browsing keeps working in-frame.
async function servePage(target, workerOrigin, cors) {
  // x-page-ok lets the CLIENT detect a blocked page (CORS-exposed) and show
  // its native 🚫 notice instead of rendering our error page.
  const ok = (body, headers) =>
    new Response(body, { headers: { ...cors, 'x-page-ok': '1', ...headers } })
  const fail = (host, why) =>
    new Response(pageErrorHtml(host, why), {
      headers: { ...cors, 'x-page-ok': '0', 'Content-Type': 'text/html; charset=utf-8' },
    })
  let t
  try {
    t = new URL(target)
  } catch {
    return fail(target, 'bad url')
  }
  if (t.protocol !== 'https:' && t.protocol !== 'http:') return fail(t.hostname, 'blocked')
  let res
  try {
    res = await fetch(t.href, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    })
  } catch {
    return fail(t.hostname, 'unreachable')
  }
  const ctype = res.headers.get('content-type') || ''
  if (!ctype.includes('html')) {
    // non-HTML (pdf, image…): pass straight through
    return ok(res.body, { 'Content-Type': ctype })
  }
  let html = await res.text()
  if (res.status >= 400 || !html) return fail(t.hostname, 'HTTP ' + res.status)
  const base = (res.url || t.href).replace(/"/g, '')
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]*\/>/gi, '')
    .replace(/<meta[^>]+http-equiv=["']?(content-security-policy|refresh)[^>]*>/gi, '')
    .replace(/<base[^>]*>/gi, '')
    // keep browsing in-frame: route links back through the proxy (must be
    // ABSOLUTE — the injected <base> would otherwise send relative links to
    // the target site)
    .replace(/(<a\b[^>]*?\shref=)["']([^"']+)["']/gi, (m, pre, href) => {
      if (/^(#|mailto:|javascript:|tel:)/i.test(href)) return m
      try {
        const abs = new URL(href, base).href
        return `${pre}"${workerOrigin}/page?u=${encodeURIComponent(abs)}"`
      } catch {
        return m
      }
    })
    .replace(/<head([^>]*)>/i, `<head$1><base href="${base}">`)
  return ok(html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' })
}

// Retro-styled in-frame error page — shown when the user navigates INSIDE an
// already-open page to a blocked site (the client's notice covers first-load).
const pageErrorHtml = (host, why) =>
  `<html><body style="background:#0d0d12;color:#c9c9d4;font-family:ui-monospace,monospace;padding:28px">
<h2 style="color:#e8b34b">🚫 ${host}</h2>
<p>won't let the in-world browser in (${why}).</p>
<p style="color:#8a8a96">tip: ⇧shift+click the link to open it in your real browser.</p>
</body></html>`

export default {
  async fetch(req) {
    const reqUrl = new URL(req.url)
    const origin = req.headers.get('Origin') || ''
    const allowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost')
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Expose-Headers': 'x-page-ok',
    }
    if (reqUrl.pathname === '/page') {
      return servePage(reqUrl.searchParams.get('u') || '', reqUrl.origin, cors)
    }
    // /tv?c=<channelId> → the channel's CURRENT live videoId. Live stream IDs
    // go stale whenever a stream restarts (embeds then say "unavailable"), so
    // the cave TV resolves the id fresh at cast time.
    if (reqUrl.pathname === '/tv') {
      const c = (reqUrl.searchParams.get('c') || '').replace(/[^\w-]/g, '')
      let id = null
      if (c) {
        const html = await fetchHtml('https://www.youtube.com/channel/' + c + '/live')
        // canonical watch link on the /live page = the active broadcast
        const m =
          html.match(/rel="canonical"[^>]+watch\?v=([\w-]{6,})/) ||
          html.match(/"videoId":"([\w-]{6,})"/)
        id = m ? m[1] : null
      }
      return new Response(JSON.stringify({ id }), {
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      })
    }
    // /yt?q= → YouTube search results [{id, title}] for the phone's cast UI.
    // Thumbnails are predictable: https://i.ytimg.com/vi/<id>/mqdefault.jpg
    if (reqUrl.pathname === '/yt') {
      const q = (reqUrl.searchParams.get('q') || '').slice(0, 120)
      const items = []
      if (q) {
        const html = await fetchHtml('https://www.youtube.com/results?search_query=' + encodeURIComponent(q))
        const re = /"videoRenderer":\{"videoId":"([\w-]{11})"[\s\S]*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g
        let m
        while ((m = re.exec(html)) && items.length < 12) {
          let title = m[2]
          try {
            title = JSON.parse('"' + m[2] + '"')
          } catch {}
          if (!items.some((it) => it.id === m[1])) items.push({ id: m[1], title })
        }
      }
      return new Response(JSON.stringify({ items }), {
        headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      })
    }
    const q = (reqUrl.searchParams.get('q') || '').slice(0, 200)
    const headers = {
      ...cors,
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

# Noogle search proxy (Cloudflare Worker)

Gives the in-world browser REAL web-wide search results. Without it the site
falls back to Wikipedia search automatically, so deploying is optional.

## Deploy (dashboard, ~3 minutes, free)

1. https://dash.cloudflare.com → sign up / log in (free plan is fine)
2. **Workers & Pages → Create → Create Worker** — name it e.g. `noogle-search`
3. Click **Edit code**, delete the boilerplate, paste the contents of
   `search-worker.js`, hit **Deploy**
4. Copy the worker URL (looks like `https://noogle-search.<you>.workers.dev`)
5. Put it in `src/content.js`:
   ```js
   export const SEARCH_PROXY = 'https://noogle-search.<you>.workers.dev'
   ```
6. Commit + push — done. Searches now hit the real web.

## Notes

- CORS is locked to michaeljohnwatters.github.io (+ localhost for dev).
- Results are parsed from Bing server-side; responses cache for 10 min.
- Free tier allows 100k requests/day — a portfolio won't scratch it.

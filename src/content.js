// Real content, sourced from the CV (public/cv/michael-watters-cv.html).
// Each OS window: title, body lines (rendered as paragraphs), optional kind
// ('cv' renders the CV viewer) and preferred default window size.

export const OS_WINDOWS = [
  {
    title: 'about.txt',
    defW: 350,
    defH: 200,
    body: [
      'Michael Watters — Scala Engineer, Belfast.',
      'Currently building regulatory reporting for an AI-powered anti-money-laundering (AML) compliance platform — taking compliance data through to submission to government authorities. Financial crime / RegTech.',
      'Full delivery lifecycle: Scala & Go services, Kubernetes deployments, GitHub Actions CI/CD and QA automation — with a background in large-scale data pipelines.',
    ],
  },
  {
    title: 'cv.html',
    kind: 'cv',
    glyph: '📄',
    defW: 390,
    defH: 290,
    body: [],
  },
  {
    title: 'netscape.exe',
    kind: 'web',
    glyph: '🌐',
    defW: 400,
    defH: 250,
    body: [],
  },
  {
    title: 'experience/',
    defW: 380,
    defH: 240,
    body: [
      'Napier AI — Scala Engineer · Jan 2025–present, Belfast. Regulatory reporting end-to-end to government authorities. Scala, Go, Kubernetes, GitHub Actions, Kafka, PostgreSQL, Elasticsearch.',
      'Magnite — Software Engineer II · 2022–2024, Belfast. Large-scale batch pipelines onboarding advertising data; audience building via identity graphs. PySpark, Databricks, Snowflake, Go APIs, AWS.',
      'SpotX (acquired by Magnite) — SE I / Trainee · 2019–2022, Belfast. Custom reporting in functional Scala for billing + fee contracts; Scala query API for Apache Druid.',
    ],
  },
  {
    title: 'projects/',
    defW: 390,
    defH: 230,
    body: [
      'Programmatic Advertising Platform — solo. ~170K lines of Go across 18 microservices on Kubernetes: SSP / exchange / DSP / ad-serving, identity-resolution pipeline, exactly-once billing ledger. RTB auction path held at p95 ~73ms. Prometheus, Grafana, Loki, Jaeger.',
      'This website — the Three.js night garage you are sitting in. React Three Fiber, drei, a raycast-driven in-world OS (yes, this window).',
    ],
  },
  {
    title: 'skills.json',
    glyph: '{ }',
    defW: 370,
    defH: 190,
    body: [
      '{ "languages": ["Scala", "Go", "Python", "SQL"],',
      '  "data": ["Spark", "Databricks", "Kafka", "Snowflake", "ClickHouse", "PostgreSQL", "Elasticsearch", "Druid"],',
      '  "infra": ["Kubernetes", "Helm", "GitHub Actions", "AWS", "Prometheus", "Grafana"],',
      '  "also": ["Flutter/Dart", "C++ embedded", "React/TS"] }',
    ],
  },
  {
    title: 'contact.sh',
    glyph: '✉',
    defW: 340,
    defH: 160,
    body: [
      'email:    mjwatters@outlook.com',
      'github:   github.com/MichaelJohnWatters',
      'linkedin: linkedin.com/in/michael-watters-b50437167',
      'web:      michaeljohnwatters.github.io',
      'cv:       open cv.html → ⬇ download pdf',
    ],
  },
]

// Web-search proxy (Cloudflare Worker — see worker/README.md). Noogle
// searches the REAL web through it; empty string would fall back to
// Wikipedia's free CORS API.
export const SEARCH_PROXY = 'https://noogle-search.michaeljohnwatters.workers.dev'

// Trigger a browser download of the rendered PDF.
export function downloadCV() {
  import('./tasks').then((m) => m.complete?.('cv')).catch(() => {})
  const a = document.createElement('a')
  a.href = 'cv/Michael-Watters-CV.pdf'
  a.download = 'Michael Watters - CV.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

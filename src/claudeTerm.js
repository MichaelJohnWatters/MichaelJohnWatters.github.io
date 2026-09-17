// The scripted "Claude" living in the garage terminal.
// Pattern-matched local responses — no API, no login, works for everyone.
// Swappable later for a real backend behind the same input.

const RULES = [
  {
    match: /^(help|\?)$/,
    reply: [
      'commands: about · skills · projects · experience · contact',
      '          status · mx5 · garage · clear',
      "…or just ask me something. I'm scripted, but I'm doing my best.",
    ],
  },
  {
    match: /about|who is michael|who's michael|whoami/,
    reply: [
      'Michael Watters — developer. Builds things for the web,',
      'currently this 3D garage. (Real bio coming soon — placeholder!)',
    ],
  },
  {
    match: /skill|stack|tech/,
    reply: [
      'JS/TS · React · Three.js/R3F · [placeholder — real skills',
      'landing here once Michael feeds me his CV]',
    ],
  },
  {
    match: /project|work|built/,
    reply: [
      'Latest project: the room you are standing in.',
      'More on the big monitor → desktop icons. (Content WIP.)',
    ],
  },
  {
    match: /experience|job|career|cv|resume/,
    reply: ['Career timeline is being typed up — check back soon, or', 'grab the CV from contact.sh on the desktop.'],
  },
  {
    match: /contact|email|hire|linkedin|github/,
    reply: ['github.com/MichaelJohnWatters — email + LinkedIn landing', 'in contact.sh soon.'],
  },
  {
    match: /status/,
    reply: [
      'host: garage-workstation · uptime 14d 03:12',
      'build: passing ✔',
      'mx5_na/restoration: 12% ▓░░░░░░░░',
      'parts_needed: [engine, doors x2, bonnet, wheels x4]',
    ],
  },
  {
    match: /mx-?5|miata|car|civic|drive/,
    reply: [
      'The NA is… a project. Engine out, doors off, big dreams.',
      'The Civic runs. One day you will drive it. Not today.',
    ],
  },
  {
    match: /garage|room|website|site|3d|three/,
    reply: ['Built with React Three Fiber. You are inside the portfolio.', 'Scroll up to stand up. Walk around. Mind the jack stands.'],
  },
  { match: /^(hi|hey|hello|yo|sup)\b/, reply: ['Hey! Type `help` to see what I know.'] },
  { match: /who are you|claude/, reply: ["Claude — well, a tiny scripted stand-in. The real one", 'built this site with Michael.'] },
  { match: /sudo/, reply: ['michael is not in the sudoers file.', 'This incident will be reported. 🚨'] },
  { match: /rm\s+-rf/, reply: ['nice try. the MX-5 is the only thing getting', 'disassembled around here.'] },
  { match: /^ls\b/, reply: ['about.txt  experience/  projects/  skills.json  contact.sh  mx5_parts/'] },
  { match: /vim|emacs|nano/, reply: ['editor wars are not covered by my warranty.'] },
  { match: /^exit|quit|logout/, reply: ['You can leave the desk, but the terminal stays with you. ⎋'] },
  { match: /meaning of life|42/, reply: ['42. Obviously. Now ask me about the MX-5.'] },
]

const FALLBACKS = [
  "hmm, that's beyond my script. Try `help`.",
  "I'd ask the real Claude about that one. Try `help`.",
  'no idea — my brain is 60 lines of regex. `help`?',
]

let fallbackIdx = 0

// Returns an array of reply lines, or null for empty input.
// 'clear' is handled by the caller (returns the CLEAR sentinel).
export const CLEAR = Symbol('clear')

export function respond(raw) {
  const q = raw.trim().toLowerCase()
  if (!q) return null
  if (q === 'clear') return CLEAR
  for (const r of RULES) {
    if (r.match.test(q)) return r.reply
  }
  fallbackIdx = (fallbackIdx + 1) % FALLBACKS.length
  return [FALLBACKS[fallbackIdx]]
}

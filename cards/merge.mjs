// Merges authored card chunks (cards/*.json) into src/data.ts, deduping against existing text (case/punctuation-insensitive).
import fs from 'node:fs'
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const src = fs.readFileSync('src/data.ts', 'utf8')
const arrays = { classicCards: 'card', betchuDareCards: 'string', shotOClockCards: 'card', wildCardsList: 'card', classicPunishmentsList: 'string' }
const chunks = fs.readdirSync('cards').filter((f) => f.endsWith('.json')).sort()
const add = Object.fromEntries(Object.keys(arrays).map((k) => [k, []]))
for (const f of chunks) for (const [k, items] of Object.entries(JSON.parse(fs.readFileSync('cards/' + f, 'utf8')))) add[k].push(...items)
let out = src, report = []
for (const [name, kind] of Object.entries(arrays)) {
  const start = out.indexOf(`export const ${name}`), end = out.indexOf('\n];', start)
  const body = out.slice(start, end)
  const seen = new Set([...body.matchAll(/(?:text: )?"((?:[^"\\]|\\.)*)"/g)].map((m) => norm(m[1])))
  const lines = []
  for (const it of add[name]) {
    const text = kind === 'card' ? it.text : it
    const n = norm(text); if (!n || seen.has(n)) continue; seen.add(n)
    lines.push(kind === 'card' ? `  { text: ${JSON.stringify(text)}, type: ${JSON.stringify(it.type)}, spice: ${JSON.stringify(it.spice)} },` : `  ${JSON.stringify(text)},`)
  }
  const head = out.slice(0, end).replace(/,?\s*$/, lines.length ? ',' : '')
  out = head + (lines.length ? '\n' + lines.join('\n') : '') + out.slice(end)
  report.push(`${name}: +${lines.length} (skipped ${add[name].length - lines.length} dupes), total ${seen.size}`)
}
fs.writeFileSync('src/data.ts', out)
console.log(report.join('\n'))

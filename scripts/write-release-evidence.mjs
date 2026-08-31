import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createReleaseEvidence } from '../lib/index.js'

function argument(name) {
  const index = process.argv.indexOf(name)
  if (index < 0 || index + 1 >= process.argv.length) throw new Error(`missing ${name}`)
  return process.argv[index + 1]
}

const result = JSON.parse(readFileSync(resolve(argument('--result')), 'utf8'))
const output = resolve(argument('--output'))
const endpoint = argument('--endpoint')
if (endpoint !== 'official' && endpoint !== 'custom') throw new Error('--endpoint must be official or custom')
const elapsedMs = Number(argument('--elapsed-ms'))

const evidence = createReleaseEvidence(result, {
  deepseekHarness: { version: argument('--dsh-version'), commit: argument('--dsh-commit') },
  provider: { version: argument('--provider-version'), commit: argument('--provider-commit') },
  consumer: { version: argument('--consumer-version'), commit: argument('--consumer-commit') },
  endpoint,
  model: argument('--model'),
  elapsedMs,
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
})

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 })
console.log(output)

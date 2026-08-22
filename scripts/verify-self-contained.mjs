import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const ignored = new Set(['.git', 'lib', 'node_modules'])
const extensions = new Set(['.js', '.json', '.md', '.mjs', '.ts', '.yaml', '.yml'])
const failures = []
const files = []
const inside = target => {
  const value = relative(root, target)
  return value === '' || (value !== '..' && !value.startsWith(`..${sep}`) && !isAbsolute(value))
}
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue
    const full = join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      try { if (!inside(realpathSync(full))) failures.push(`${relative(root, full)}: symlink leaves repository`) }
      catch { failures.push(`${relative(root, full)}: broken symlink`) }
    } else if (entry.isDirectory()) walk(full)
    else if (entry.isFile() && extensions.has(extname(entry.name))) files.push(full)
  }
}
walk(root)
for (const file of files) {
  const source = readFileSync(file, 'utf8')
  if (extname(file) === '.md') {
    for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)) {
      const value = match[1].trim().replace(/^<|>$/gu, '')
      if (value.startsWith('#') || /^[a-z][a-z+.-]*:/iu.test(value)) continue
      const target = resolve(dirname(file), value.split('#')[0])
      if (!inside(target) || !existsSync(target)) failures.push(`${relative(root, file)}: broken link ${value}`)
    }
  }
}
for (const required of ['src/index.ts', 'src/config.ts', 'src/runtime.ts', 'src/invariant.ts', 'docs/dsh-plugin-contracts.md', 'tests/plugin.spec.ts']) {
  if (!existsSync(join(root, required))) failures.push(`missing ${required}`)
}
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const verifierSpec = manifest.dependencies?.['dsh-as-a-verifier']
if (verifierSpec !== 'git+https://github.com/omdsh-dev/dsh-as-a-verifier.git#d717bf90b77c031efc02ad9f344aa54edb631ccd') {
  failures.push('dsh-as-a-verifier dependency is not pinned to the reviewed merge commit')
}
if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`self-contained repository verified (${files.length} text files)`)

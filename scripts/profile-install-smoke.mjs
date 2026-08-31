import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const DSH_VERSION = '0.1.2-alpha.2'
const CONSUMER_NAME = 'dsh-verified-ralph'
const CONSUMER_REPOSITORY = 'omdsh-dev/dsh-verified-ralph'
const PROVIDER_NAME = 'dsh-as-a-verifier'
const PROVIDER_REPOSITORY = 'omdsh-dev/dsh-as-a-verifier'
const PROVIDER_COMMIT = '7dcf417310c8a76cd1e8a5180d964bc9411f92f4'

function argument(name) {
  const index = process.argv.indexOf(name)
  if (index < 0 || index + 1 >= process.argv.length) throw new Error(`missing ${name}`)
  return process.argv[index + 1]
}

function run(command, args, options = {}) {
  const executable = process.platform === 'win32' && command === 'pnpm' ? 'pnpm.cmd' : command
  const result = spawnSync(executable, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    timeout: 120_000,
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})\n${result.stdout}\n${result.stderr}`)
  }
  return `${result.stdout}${result.stderr}`
}

function countRows(dump, id) {
  return (dump.match(new RegExp(`id: ${id}\\b`, 'g')) ?? []).length
}

const ref = argument('--ref')
if (!/^[0-9a-f]{40}$/.test(ref)) throw new Error('profile smoke ref must be an exact commit SHA')

const workspace = mkdtempSync(join(tmpdir(), 'dsh-verified-ralph-profile-smoke-'))
const launcher = join(workspace, 'launcher')
const home = join(workspace, 'home')
const env = {
  ...process.env,
  DSH_HOME: home,
  DSH_TELEMETRY_DISABLED: '1',
  DEEPSEEK_API_KEY: '',
}

try {
  mkdirSync(launcher)
  writeFileSync(join(launcher, 'package.json'), JSON.stringify({ private: true, packageManager: 'pnpm@11.7.0' }, null, 2))
  writeFileSync(join(launcher, 'pnpm-workspace.yaml'), [
    'packages:',
    "  - '.'",
    'allowBuilds:',
    `  '@deepseek-ai/dsh-subprocess-local@${DSH_VERSION}': true`,
    "  '@google/genai@1.52.0': true",
    "  'koffi@3.1.6': true",
    "  'node-pty@1.2.0-beta.15': true",
    "  'protobufjs@7.6.6': true",
    '',
  ].join('\n'))
  run('pnpm', ['add', '--save-exact', `@deepseek-ai/dsh@${DSH_VERSION}`], { cwd: launcher, env })
  const require = createRequire(join(launcher, 'smoke.cjs'))
  const manifestPath = require.resolve('@deepseek-ai/dsh/package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.version !== DSH_VERSION) throw new Error(`installed DSH ${manifest.version}, expected ${DSH_VERSION}`)
  const bin = join(dirname(manifestPath), manifest.bin.dsh)

  for (const profile of ['web', 'headless']) {
    run(process.execPath, [bin, '--profile', profile, '--dump-config'], { cwd: workspace, env })
    const profileDir = join(home, 'profiles', profile)
    writeFileSync(join(profileDir, 'pnpm-workspace.yaml'), [
      'packages:',
      "  - '.'",
      'blockExoticSubdeps: false',
      'allowBuilds:',
      `  '${CONSUMER_NAME}@https://codeload.github.com/${CONSUMER_REPOSITORY}/tar.gz/${ref}': true`,
      `  '${PROVIDER_NAME}@https://codeload.github.com/${PROVIDER_REPOSITORY}/tar.gz/${PROVIDER_COMMIT}': true`,
      '',
    ].join('\n'))
    run(process.execPath, [bin, 'plugin', '--profile', profile, 'add', '--save-exact',
      `github:${PROVIDER_REPOSITORY}#${PROVIDER_COMMIT}`, `github:${CONSUMER_REPOSITORY}#${ref}`], { cwd: workspace, env })
    run('pnpm', ['peers', 'check'], { cwd: profileDir, env })
    const dump = run(process.execPath, [bin, '--profile', profile, '--dump-config'], { cwd: workspace, env })
    for (const id of [PROVIDER_NAME, CONSUMER_NAME, 'tool-ralph']) {
      const rows = countRows(dump, id)
      if (rows !== 1) throw new Error(`${profile} profile contains ${rows} ${id} rows`)
    }
    const help = run(process.execPath, [bin, '--profile', profile, '--help'], { cwd: workspace, env })
    if (!help.includes(`dsh --profile ${profile}`)) throw new Error(`${profile} profile did not reach its app help`)
  }
  console.log(`${CONSUMER_NAME} profile smoke passed on DSH ${DSH_VERSION} for ${ref} with provider ${PROVIDER_COMMIT}`)
} finally {
  rmSync(workspace, { recursive: true, force: true })
}

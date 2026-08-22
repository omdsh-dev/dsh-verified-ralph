import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it } from 'vitest'
import * as VerifiedRalph from '../src/index.ts'

const roots: string[] = []
const contexts: Context[] = []
afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

const Services = {
  name: 'test-services',
  apply(ctx: Context) {
    const tools: ToolDefinition[] = [{ name: 'ralph' } as ToolDefinition]
    ctx.provide('tools', {
      register(tool: ToolDefinition) { tools.push(tool); return () => { tools.splice(tools.indexOf(tool), 1) } },
      schemas: () => tools,
    })
    ctx.provide('subagents', { getProvider: () => undefined } as never)
    ctx.provide('verifier', { track: async () => { throw new Error('not used') } } as never)
    ctx.provide('systemPrompt', { section: () => () => {} } as never)
  },
}

async function boot(profile: 'Web' | 'Headless'): Promise<Context> {
  const root = await mkdtemp(join(tmpdir(), `dsh-verified-ralph-${profile.toLowerCase()}-`))
  roots.push(root)
  const path = join(root, 'cordis.yml')
  await writeFile(path, [
    `# ${profile} profile fixture after bundle patches`,
    '- name: test-services',
    '- id: dsh-verified-ralph',
    '  name: dsh-verified-ralph',
    '',
  ].join('\n'))
  const ctx = new Context()
  contexts.push(ctx)
  ctx.baseUrl = `${pathToFileURL(root).href}/`
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const modules = new Map<string, unknown>([['test-services', Services], ['dsh-verified-ralph', VerifiedRalph]])
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(path).href } })
  await ctx.loader.await()
  return ctx
}

describe('Web and Headless composition', () => {
  it.each(['Web', 'Headless'] as const)('boots %s with official and verified Ralph tools', async profile => {
    const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
    expect(patch.match(/id: dsh-verified-ralph/gu)).toHaveLength(1)
    expect(patch).not.toContain('/invariant')
    const ctx = await boot(profile)
    expect(ctx.tools.schemas().map(tool => tool.name)).toEqual(['ralph', 'verified_ralph'])
  })
})

import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import * as plugin from '../src/index.ts'

async function mount() {
  const ctx = new Context()
  const tools: ToolDefinition[] = [{ name: 'ralph' } as ToolDefinition]
  const sections: { name: string, text: string }[] = []
  ctx.provide('tools', {
    register(tool: ToolDefinition) {
      tools.push(tool)
      return () => { tools.splice(tools.indexOf(tool), 1) }
    },
  })
  ctx.provide('subagents', { getProvider: () => undefined, start: async () => { throw new Error('not used') } } as never)
  ctx.provide('verifier', { track: async () => { throw new Error('not used') } } as never)
  ctx.provide('systemPrompt', {
    section(section: { name: string, text: string }) {
      sections.push(section)
      return () => { sections.splice(sections.indexOf(section), 1) }
    },
  } as never)
  const fiber = await ctx.plugin(plugin, {})
  return { ctx, tools, sections, fiber }
}

describe('dsh-verified-ralph plugin', () => {
  it('preserves the function-plugin namespace through Loader unwrapping', () => {
    expect('default' in plugin).toBe(false)
    expect(plugin.name).toBe('dsh-verified-ralph')
    expect(plugin.inject).toEqual(['tools', 'subagents', 'systemPrompt', 'verifier'])
    const loader = Object.create(Loader.prototype) as Loader
    expect(loader.unwrapExports(plugin)).toBe(plugin)
  })

  it('coexists with ralph and removes its tool and guidance on disposal', async () => {
    const test = await mount()
    expect(test.tools.map(tool => tool.name)).toEqual(['ralph', 'verified_ralph'])
    expect(test.sections[0]?.text).toContain('direct human explicitly asks')
    const tool = test.tools.find(candidate => candidate.name === 'verified_ralph')
    expect(tool?.presentCall?.({ objective: 'Ship it.' })).toEqual({ card: 'generic', title: 'verified_ralph', rawInput: 'Ship it.' })
    expect(tool?.presentResult?.({ objective: 'Ship it.' }, { content: [], isError: false })).toEqual({ card: 'generic' })
    await test.fiber.dispose()
    expect(test.tools.map(tool => tool.name)).toEqual(['ralph'])
    expect(test.sections).toEqual([])
  })
})

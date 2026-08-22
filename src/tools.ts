/** Model-facing verified_ralph tool. @module dsh-verified-ralph/tools */

import type { Context } from '@deepseek-ai/cordis'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ResolvedConfig } from './config.ts'
import { runVerifiedRalph } from './runner.ts'
import type { VerifiedRalphResult } from './types.ts'

const TRUNCATION_NOTICE = '\n… [truncated]'

function bound(text: string, maximum: number): string {
  if (text.length <= maximum) return text
  if (maximum <= TRUNCATION_NOTICE.length) return TRUNCATION_NOTICE.slice(0, maximum)
  return `${text.slice(0, maximum - TRUNCATION_NOTICE.length)}${TRUNCATION_NOTICE}`
}

function render(result: VerifiedRalphResult, maximum: number): string {
  const label = result.status === 'verified-complete'
    ? 'independently verified completion'
    : result.status === 'blocked'
      ? 'a worker-reported blocker'
      : result.status === 'stagnated'
        ? 'verifier-detected stagnation'
        : 'the round budget'
  return bound(`Verified Ralph ended after ${result.roundsStarted} rounds with ${label}.\n${JSON.stringify(result, null, 2)}`, maximum)
}

export function registerVerifiedRalphTool(ctx: Context, config: ResolvedConfig): void {
  const unregister = ctx.tools.register(defineTool({
    name: 'verified_ralph',
    description: 'Run fresh local Ralph workers toward one immutable objective, independently score each child session, reject unverified completion, issue bounded correction, and stop persistent stagnation.',
    parameters: {
      objective: { type: 'string', required: true, description: 'The immutable objective for every fresh verified Ralph round.' },
      maxRounds: { type: 'integer', description: 'Optional round cap bounded by deployment policy.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          runId: { type: 'string', required: true },
          status: { type: 'string', required: true },
          roundsStarted: { type: 'integer', required: true },
          agentsStarted: { type: 'integer', required: true },
          report: { type: 'json', required: true },
          progress: { type: 'json', required: true },
          usage: { type: 'json', required: true },
          verification: { type: 'json', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: render(value as unknown as VerifiedRalphResult, config.maxResultChars) }],
    },
    presentCall: args => ({ card: 'generic', title: 'verified_ralph', rawInput: args.objective }),
    presentResult: () => ({ card: 'generic' }),
    async execute(args, exec) {
      if (exec.agent === undefined) throw new Error('verified_ralph requires a calling agent')
      const result = await runVerifiedRalph(ctx, config, args, exec.agent, exec.signal)
      return {
        ...result,
        report: result.report as unknown as JsonValue,
        progress: result.progress as unknown as JsonValue,
        usage: result.usage as unknown as JsonValue,
        verification: result.verification as unknown as JsonValue,
      }
    },
  }))
  ctx.effect(() => unregister, 'dsh-verified-ralph: verified_ralph')
}

export function renderVerifiedRalphResult(result: VerifiedRalphResult, maximum: number): ContentBlock[] {
  return [{ type: 'text', text: render(result, maximum) }]
}

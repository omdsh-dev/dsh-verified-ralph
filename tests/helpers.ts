import type { Agent } from '@deepseek-ai/dsh-agent'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { VerifierUsage } from 'dsh-as-a-verifier'

export const usage: VerifierUsage = {
  calls: 1,
  inputTokens: 10,
  cachedInputTokens: 2,
  uncachedInputTokens: 8,
  outputTokens: 3,
  reasoningTokens: 1,
  cacheHitRate: 0.2,
}

export const parent = { id: 'parent', session: { id: 'parent' } } as unknown as Agent

export function sessionEvents(label = 'verified output'): SessionEvent[] {
  return [
    { type: 'turn/start', seq: 0, time: 1, data: { turn: 1 } },
    { type: 'step/start', seq: 1, time: 2, data: { turn: 1, step: 1 } },
    {
      type: 'assistant/message', seq: 2, time: 3, surfaceOp: 'append',
      data: { turn: 1, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: label }] } },
    },
    { type: 'tool/call', seq: 3, time: 4, data: { turn: 1, step: 1, callId: 'call-1', name: 'test', arguments: '{}' } },
    {
      type: 'tool/result', seq: 4, time: 5, surfaceOp: 'append',
      data: { turn: 1, step: 1, message: { role: 'tool', callId: 'call-1', content: [{ type: 'text', text: 'passed' }] } },
    },
    { type: 'step/end', seq: 5, time: 6, data: { turn: 1, step: 1 } },
    { type: 'turn/end', seq: 6, time: 7, data: { turn: 1, reason: { kind: 'completed' } } },
  ] as unknown as SessionEvent[]
}

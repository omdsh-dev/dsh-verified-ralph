/** Project immutable local DSH session events into verifier trajectory steps. @module dsh-verified-ralph/projection */

import type { SessionEvent } from '@deepseek-ai/dsh-session'

function serialized(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

/** Group observable assistant and tool evidence inside each completed DSH step. */
export function projectSessionSteps(events: readonly SessionEvent[]): string[] {
  const steps: string[] = []
  let current: string[] | undefined
  for (const event of events) {
    switch (event.type) {
      case 'step/start':
        if (current !== undefined) throw new Error('local child session opened a nested step')
        current = []
        break
      case 'assistant/message':
        current?.push(`Assistant output:\n${serialized(event.data.message)}`)
        break
      case 'tool/call':
        current?.push(`Tool call ${event.data.name}:\n${event.data.arguments}`)
        break
      case 'tool/result':
        current?.push(`Tool result:\n${serialized(event.data.message)}`)
        break
      case 'step/end':
        if (current === undefined) throw new Error('local child session closed a step that was not open')
        steps.push(current.length === 0 ? '(No observable assistant or tool output.)' : current.join('\n\n'))
        current = undefined
        break
      default:
        break
    }
  }
  if (current !== undefined) throw new Error('local child session ended with an open step')
  if (steps.length === 0) throw new Error('local child session contained no completed verifiable steps')
  return steps
}

/** Fresh-round prompt following DSH tool-ralph semantics (MIT). @module dsh-verified-ralph/prompt */

import type { RalphRoundReport } from './types.ts'

export function buildRoundPrompt(
  objective: string,
  round: number,
  maxRounds: number,
  previous: RalphRoundReport | undefined,
  correction: string | undefined,
): string {
  return [
    'You are one fresh worker in a foreground verified Ralph loop. You receive no parent conversation and no prior child session. Do not call ralph or verified_ralph.',
    `Immutable objective:\n${objective}`,
    `Ralph round: ${round} of ${maxRounds}.`,
    'The shared workspace and current working tree are long-term memory and the source of truth. Inspect them before acting, perform concrete work, and verify the task\'s actual success criteria.',
    `Previous structured handoff:\n${previous === undefined ? '(none — first round)' : JSON.stringify(previous)}`,
    `Independent verifier correction:\n${correction ?? '(none)'}`,
    'Return the required structured report. Use continue while useful work remains, complete only with concrete evidence, and blocked only for a specific external or human-input blocker. Worker status is not independent certification.',
  ].join('\n\n')
}

export function correctionMessage(score: number, threshold: number): string {
  return `Independent progress score ${score.toFixed(4)} is below completion threshold ${threshold.toFixed(4)}. Re-open the objective, inspect the real workspace, and run the task's actual success criteria. Do not rely on prior narration or completion claims.`
}

/** Empty invariant companion for the event-free verified Ralph consumer. @module dsh-verified-ralph/invariant */

import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-verified-ralph/invariant'

/** Child sessions and final tool results are owned by existing providers; this plugin adds no independent durable relationship. */
export function apply(_ctx: Context): void {}

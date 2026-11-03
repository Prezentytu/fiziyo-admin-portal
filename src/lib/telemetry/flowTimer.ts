const flowStartedAt = new Map<string, number>();

export function startFlow(flow: string, now: number = Date.now()): void {
  flowStartedAt.set(flow, now);
}

/** Returns the flow duration in ms and forgets the flow, or null when it was never started. */
export function finishFlow(flow: string, now: number = Date.now()): number | null {
  const startedAt = flowStartedAt.get(flow);
  if (startedAt === undefined) {
    return null;
  }
  flowStartedAt.delete(flow);
  return Math.max(0, now - startedAt);
}

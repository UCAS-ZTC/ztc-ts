// Stub — missing from source snapshot

export function snipCompactIfNeeded(messages: any[], _opts?: any): { messages: any[]; tokensFreed: number } {
  return { messages, tokensFreed: 0 };
}
export function isSnipRuntimeEnabled(): boolean { return false; }
export function shouldNudgeForSnips(): boolean { return false; }
export function isSnipBoundary(_msg: any): boolean { return false; }
export function isSnipMarkerMessage(_msg: any): boolean { return false; }
export default { snipCompactIfNeeded, isSnipRuntimeEnabled, shouldNudgeForSnips, isSnipBoundary, isSnipMarkerMessage }

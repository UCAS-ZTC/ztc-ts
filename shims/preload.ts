const MACRO = {
  VERSION: '2.1.89-local',
  VERSION_CHANGELOG: 'Local build with telemetry stripped and features unlocked',
  PACKAGE_URL: 'claude-code-local',
  NATIVE_PACKAGE_URL: 'claude-code-local-native',
  BUILD_TIME: new Date().toISOString(),
  FEEDBACK_CHANNEL: 'github',
  ISSUES_EXPLAINER: 'Local build — no upstream issue routing.',
}

;(globalThis as any).MACRO = MACRO

process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC ??= '1'
process.env.DISABLE_TELEMETRY ??= '1'
process.env.CLAUDE_CODE_DISABLE_AUTOUPDATER ??= '1'
process.env.CLAUDE_CODE_VERIFY_PLAN ??= 'false'

export {}

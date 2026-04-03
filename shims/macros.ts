export const MACRO = {
  VERSION: '2.1.89',
  VERSION_CHANGELOG: '',
  PACKAGE_URL: '@anthropic-ai/claude-code',
  NATIVE_PACKAGE_URL: '@anthropic-ai/claude-code-native',
} as const

;(globalThis as any).MACRO = MACRO

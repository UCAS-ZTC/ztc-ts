const ENABLED_FEATURES = new Set([
  // --- Core enhancements (verified: all required files exist) ---
  'BASH_CLASSIFIER',
  'CACHED_MICROCOMPACT',
  'COMPACTION_REMINDERS',
  'CONTEXT_COLLAPSE',
  'EXTRACT_MEMORIES',
  'MESSAGE_ACTIONS',
  'QUICK_SEARCH',
  'REACTIVE_COMPACT',
  'TOKEN_BUDGET',
  'SLOW_OPERATION_LOGGING',
  'DUMP_SYSTEM_PROMPT',
  'TREE_SITTER_BASH',

  // --- Agent & memory ---
  'AGENT_MEMORY_SNAPSHOT',
  'AGENT_TRIGGERS',
  'CONNECTOR_TEXT',
  'HISTORY_PICKER',
  'IS_LIBC_GLIBC',
  'MEMORY_SHAPE_TELEMETRY',
  'MONITOR_TOOL',
  'SKILL_IMPROVEMENT',
  'TEAMMEM',
  'TRANSCRIPT_CLASSIFIER',
  'ULTRATHINK',
  'VERIFICATION_AGENT',
  'WEB_BROWSER_TOOL',

  // --- Ported from free-code (safe to enable) ---
  'AWAY_SUMMARY',
  'BUILTIN_EXPLORE_PLAN_AGENTS',
  'HOOK_PROMPTS',
  'MCP_RICH_OUTPUT',
  'NEW_INIT',
  'PROMPT_CACHE_BREAK_DETECTION',
  'SHOT_STATS',
  'UNATTENDED_RETRY',
])

const DISABLED_FEATURES = new Set([
  // --- Missing source files (would crash at runtime) ---
  'COMMIT_ATTRIBUTION',
  'COORDINATOR_MODE',
  'DIRECT_CONNECT',
  'FILE_PERSISTENCE',
  'REVIEW_ARTIFACT',
  'SSH_REMOTE',
  'TEMPLATES',

  // --- Requires OAuth / cloud services ---
  'BRIDGE_MODE',
  'CCR_AUTO_CONNECT',
  'CCR_MIRROR',
  'CCR_REMOTE_SETUP',
  'LODESTONE',

  // --- Requires specific hardware/platform ---
  'NATIVE_CLIPBOARD_IMAGE',
  'POWERSHELL_AUTO_MODE',
  'VOICE_MODE',

  // --- Incomplete command stubs (empty default export, no name) ---
  'BUDDY',
  'FORK_SUBAGENT',
  'HISTORY_SNIP',
  'PROACTIVE',
  'ULTRAPLAN',
  'WORKFLOW_SCRIPTS',

  // --- Internal / test / large missing subsystems ---
  'ABLATION_BASELINE',
  'ALLOW_TEST_VERSIONS',
  'BG_SESSIONS',
  'BREAK_CACHE_COMMAND',
  'BYOC_ENVIRONMENT_RUNNER',
  'CHICAGO_MCP',
  'DAEMON',
  'ENHANCED_TELEMETRY_BETA',
  'EXPERIMENTAL_SKILL_SEARCH',
  'HARD_FAIL',
  'IS_LIBC_MUSL',
  'KAIROS',
  'KAIROS_BRIEF',
  'KAIROS_CHANNELS',
  'KAIROS_DREAM',
  'KAIROS_GITHUB_WEBHOOKS',
  'KAIROS_PUSH_NOTIFICATION',
  'NATIVE_CLIENT_ATTESTATION',
  'OVERFLOW_TEST_TOOL',
  'PERFETTO_TRACING',
  'RUN_SKILL_GENERATOR',
  'SELF_HOSTED_RUNNER',
  'TERMINAL_PANEL',
  'TREE_SITTER_BASH_SHADOW',
  'UDS_INBOX',
])

export function feature(name: string): boolean {
  if (ENABLED_FEATURES.has(name)) return true
  if (DISABLED_FEATURES.has(name)) return false
  if (process.env.CLAUDE_CODE_ENABLE_ALL_FEATURES === '1') return true
  return false
}

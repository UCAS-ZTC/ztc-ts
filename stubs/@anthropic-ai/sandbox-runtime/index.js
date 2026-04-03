const EMPTY_CONFIG = { allowOnly: [], denyWithinAllow: [] }
const EMPTY_NETWORK = { allowedDomains: [], blockedDomains: [] }
const NOOP_STORE = { add() {}, getAll() { return [] }, clear() {} }

export class SandboxManager {
  constructor(config) { this.config = config }
  async start() {}
  async stop() {}
  isActive() { return false }
  getViolations() { return [] }

  static checkDependencies() { return { satisfied: true } }
  static isSupportedPlatform() { return false }
  static wrapWithSandbox(command, shell, opts) { return { command, args: opts?.args || [] } }
  static async initialize(config, callback) { if (callback) await callback() }

  static isSandboxingEnabled() { return false }
  static isSandboxRequired() { return false }
  static isSandboxEnabledInSettings() { return false }
  static isAutoAllowBashIfSandboxedEnabled() { return false }
  static areUnsandboxedCommandsAllowed() { return true }
  static areSandboxSettingsLockedByPolicy() { return false }
  static getSandboxUnavailableReason() { return 'Sandbox disabled in local build' }

  static getFsReadConfig() { return EMPTY_CONFIG }
  static getFsWriteConfig() { return EMPTY_CONFIG }
  static getNetworkRestrictionConfig() { return EMPTY_NETWORK }
  static getAllowUnixSockets() { return true }
  static getAllowLocalBinding() { return true }
  static getIgnoreViolations() { return true }
  static getEnableWeakerNestedSandbox() { return false }
  static getProxyPort() { return undefined }
  static getSocksProxyPort() { return undefined }
  static getLinuxHttpSocketPath() { return undefined }
  static getLinuxSocksSocketPath() { return undefined }
  static getExcludedCommands() { return [] }
  static getLinuxGlobPatternWarnings() { return [] }

  static async waitForNetworkInitialization() {}
  static getSandboxViolationStore() { return NOOP_STORE }
  static annotateStderrWithSandboxFailures(command, stderr) { return stderr }
  static cleanupAfterCommand() {}
  static refreshConfig() {}
  static updateConfig(newConfig) {}
  static async reset() {}
  static async setSandboxSettings(settings) {}
}

export const SandboxRuntimeConfigSchema = {
  parse: (v) => v,
  safeParse: (v) => ({ success: true, data: v }),
}

export class SandboxViolationStore {
  constructor() { this.violations = [] }
  add(v) { this.violations.push(v) }
  getAll() { return this.violations }
  clear() { this.violations = [] }
}

export default { SandboxManager, SandboxRuntimeConfigSchema, SandboxViolationStore }

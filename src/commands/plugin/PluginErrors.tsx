import { getPluginErrorMessage, type PluginError } from '../../types/plugin.js'
import { uiText } from '../../utils/uiLocale.js'

export function formatErrorMessage(error: PluginError): string {
  switch (error.type) {
    case 'path-not-found':
      return uiText(
        `${error.component} path not found: ${error.path}`,
        `${error.component} 路径不存在：${error.path}`,
      )
    case 'git-auth-failed':
      return uiText(
        `Git ${error.authType.toUpperCase()} authentication failed for ${error.gitUrl}`,
        `Git ${error.authType.toUpperCase()} 认证失败：${error.gitUrl}`,
      )
    case 'git-timeout':
      return uiText(
        `Git ${error.operation} timed out for ${error.gitUrl}`,
        `Git ${error.operation} 操作超时：${error.gitUrl}`,
      )
    case 'network-error':
      return uiText(
        `Network error accessing ${error.url}${error.details ? `: ${error.details}` : ''}`,
        `访问 ${error.url} 时发生网络错误${error.details ? `：${error.details}` : ''}`,
      )
    case 'manifest-parse-error':
      return uiText(
        `Failed to parse manifest at ${error.manifestPath}: ${error.parseError}`,
        `解析清单失败：${error.manifestPath}：${error.parseError}`,
      )
    case 'manifest-validation-error':
      return uiText(
        `Invalid manifest at ${error.manifestPath}: ${error.validationErrors.join(', ')}`,
        `清单无效：${error.manifestPath}：${error.validationErrors.join('，')}`,
      )
    case 'plugin-not-found':
      return uiText(
        `Plugin "${error.pluginId}" not found in marketplace "${error.marketplace}"`,
        `在市场“${error.marketplace}”中未找到插件“${error.pluginId}”`,
      )
    case 'marketplace-not-found':
      return uiText(
        `Marketplace "${error.marketplace}" not found`,
        `未找到市场“${error.marketplace}”`,
      )
    case 'marketplace-load-failed':
      return uiText(
        `Failed to load marketplace "${error.marketplace}": ${error.reason}`,
        `加载市场“${error.marketplace}”失败：${error.reason}`,
      )
    case 'mcp-config-invalid':
      return uiText(
        `Invalid MCP server config for "${error.serverName}": ${error.validationError}`,
        `MCP 服务器“${error.serverName}”配置无效：${error.validationError}`,
      )
    case 'mcp-server-suppressed-duplicate': {
      const dup = error.duplicateOf.startsWith('plugin:')
        ? uiText(
            `server provided by plugin "${error.duplicateOf.split(':')[1] ?? '?'}"`,
            `由插件“${error.duplicateOf.split(':')[1] ?? '?'}”提供的服务器`,
          )
        : uiText(
            `already-configured "${error.duplicateOf}"`,
            `已配置的“${error.duplicateOf}”`,
          )
      return uiText(
        `MCP server "${error.serverName}" skipped - same command/URL as ${dup}`,
        `已跳过 MCP 服务器“${error.serverName}” - 与 ${dup} 使用相同的命令或 URL`,
      )
    }
    case 'hook-load-failed':
      return uiText(
        `Failed to load hooks from ${error.hookPath}: ${error.reason}`,
        `从 ${error.hookPath} 加载 hooks 失败：${error.reason}`,
      )
    case 'component-load-failed':
      return uiText(
        `Failed to load ${error.component} from ${error.path}: ${error.reason}`,
        `从 ${error.path} 加载 ${error.component} 失败：${error.reason}`,
      )
    case 'mcpb-download-failed':
      return uiText(
        `Failed to download MCPB from ${error.url}: ${error.reason}`,
        `从 ${error.url} 下载 MCPB 失败：${error.reason}`,
      )
    case 'mcpb-extract-failed':
      return uiText(
        `Failed to extract MCPB ${error.mcpbPath}: ${error.reason}`,
        `解压 MCPB ${error.mcpbPath} 失败：${error.reason}`,
      )
    case 'mcpb-invalid-manifest':
      return uiText(
        `MCPB manifest invalid at ${error.mcpbPath}: ${error.validationError}`,
        `MCPB 清单无效：${error.mcpbPath}：${error.validationError}`,
      )
    case 'marketplace-blocked-by-policy':
      return error.blockedByBlocklist
        ? uiText(
            `Marketplace "${error.marketplace}" is blocked by enterprise policy`,
            `市场“${error.marketplace}”已被企业策略阻止`,
          )
        : uiText(
            `Marketplace "${error.marketplace}" is not in the allowed marketplace list`,
            `市场“${error.marketplace}”不在允许列表中`,
          )
    case 'dependency-unsatisfied':
      return error.reason === 'not-enabled'
        ? uiText(
            `Dependency "${error.dependency}" is disabled`,
            `依赖“${error.dependency}”已被禁用`,
          )
        : uiText(
            `Dependency "${error.dependency}" is not installed`,
            `依赖“${error.dependency}”未安装`,
          )
    case 'lsp-config-invalid':
      return uiText(
        `Invalid LSP server config for "${error.serverName}": ${error.validationError}`,
        `LSP 服务器“${error.serverName}”配置无效：${error.validationError}`,
      )
    case 'lsp-server-start-failed':
      return uiText(
        `LSP server "${error.serverName}" failed to start: ${error.reason}`,
        `LSP 服务器“${error.serverName}”启动失败：${error.reason}`,
      )
    case 'lsp-server-crashed':
      return error.signal
        ? uiText(
            `LSP server "${error.serverName}" crashed with signal ${error.signal}`,
            `LSP 服务器“${error.serverName}”因信号 ${error.signal} 崩溃`,
          )
        : uiText(
            `LSP server "${error.serverName}" crashed with exit code ${error.exitCode ?? 'unknown'}`,
            `LSP 服务器“${error.serverName}”异常退出，退出码 ${error.exitCode ?? 'unknown'}`,
          )
    case 'lsp-request-timeout':
      return uiText(
        `LSP server "${error.serverName}" timed out on ${error.method} after ${error.timeoutMs}ms`,
        `LSP 服务器“${error.serverName}”执行 ${error.method} 超时，耗时 ${error.timeoutMs}ms`,
      )
    case 'lsp-request-failed':
      return uiText(
        `LSP server "${error.serverName}" ${error.method} failed: ${error.error}`,
        `LSP 服务器“${error.serverName}”执行 ${error.method} 失败：${error.error}`,
      )
    case 'plugin-cache-miss':
      return uiText(
        `Plugin "${error.plugin}" not cached at ${error.installPath}`,
        `插件“${error.plugin}”未在 ${error.installPath} 中缓存`,
      )
    case 'generic-error':
      return error.error
  }

  const _exhaustive: never = error
  return getPluginErrorMessage(_exhaustive)
}

export function getErrorGuidance(error: PluginError): string | null {
  switch (error.type) {
    case 'path-not-found':
      return uiText(
        'Check that the path in your manifest or marketplace config is correct',
        '请检查清单或市场配置中的路径是否正确',
      )
    case 'git-auth-failed':
      return error.authType === 'ssh'
        ? uiText(
            'Configure SSH keys or use HTTPS URL instead',
            '请配置 SSH 密钥，或改用 HTTPS URL',
          )
        : uiText(
            'Configure credentials or use SSH URL instead',
            '请配置凭据，或改用 SSH URL',
          )
    case 'git-timeout':
    case 'network-error':
      return uiText(
        'Check your internet connection and try again',
        '请检查网络连接后重试',
      )
    case 'manifest-parse-error':
      return uiText(
        'Check manifest file syntax in the plugin directory',
        '请检查插件目录中清单文件的语法',
      )
    case 'manifest-validation-error':
      return uiText(
        'Check manifest file follows the required schema',
        '请检查清单文件是否符合要求的 schema',
      )
    case 'plugin-not-found':
      return uiText(
        `Plugin may not exist in marketplace "${error.marketplace}"`,
        `插件可能不存在于市场“${error.marketplace}”中`,
      )
    case 'marketplace-not-found':
      return error.availableMarketplaces.length > 0
        ? uiText(
            `Available marketplaces: ${error.availableMarketplaces.join(', ')}`,
            `可用市场：${error.availableMarketplaces.join('，')}`,
          )
        : uiText(
            'Add the marketplace first using /plugin marketplace add',
            '请先使用 /plugin marketplace add 添加市场',
          )
    case 'mcp-config-invalid':
      return uiText(
        'Check MCP server configuration in .mcp.json or manifest',
        '请检查 .mcp.json 或清单中的 MCP 服务器配置',
      )
    case 'mcp-server-suppressed-duplicate': {
      if (error.duplicateOf.startsWith('plugin:')) {
        const winningPlugin = error.duplicateOf.split(':')[1] ?? uiText('the other plugin', '另一个插件')
        return uiText(
          `Disable plugin "${winningPlugin}" if you want this plugin's version instead`,
          `如果你想使用当前插件提供的版本，请禁用插件“${winningPlugin}”`,
        )
      }
      return uiText(
        `Remove "${error.duplicateOf}" from your MCP config if you want the plugin's version instead`,
        `如果你想使用当前插件提供的版本，请从 MCP 配置中移除“${error.duplicateOf}”`,
      )
    }
    case 'hook-load-failed':
      return uiText(
        'Check hooks.json file syntax and structure',
        '请检查 hooks.json 的语法和结构',
      )
    case 'component-load-failed':
      return uiText(
        `Check ${error.component} directory structure and file permissions`,
        `请检查 ${error.component} 目录结构和文件权限`,
      )
    case 'mcpb-download-failed':
      return uiText(
        'Check your internet connection and URL accessibility',
        '请检查网络连接以及 URL 是否可访问',
      )
    case 'mcpb-extract-failed':
      return uiText(
        'Verify the MCPB file is valid and not corrupted',
        '请确认 MCPB 文件有效且未损坏',
      )
    case 'mcpb-invalid-manifest':
      return uiText(
        'Contact the plugin author about the invalid manifest',
        '请联系插件作者修复无效清单',
      )
    case 'marketplace-blocked-by-policy':
      if (error.blockedByBlocklist) {
        return uiText(
          'This marketplace source is explicitly blocked by your administrator',
          '该市场源已被管理员显式阻止',
        )
      }
      return error.allowedSources.length > 0
        ? uiText(
            `Allowed sources: ${error.allowedSources.join(', ')}`,
            `允许的来源：${error.allowedSources.join('，')}`,
          )
        : uiText(
            'Contact your administrator to configure allowed marketplace sources',
            '请联系管理员配置允许的市场源',
          )
    case 'dependency-unsatisfied':
      return error.reason === 'not-enabled'
        ? uiText(
            `Enable "${error.dependency}" or uninstall "${error.plugin}"`,
            `请启用“${error.dependency}”，或卸载“${error.plugin}”`,
          )
        : uiText(
            `Install "${error.dependency}" or uninstall "${error.plugin}"`,
            `请安装“${error.dependency}”，或卸载“${error.plugin}”`,
          )
    case 'lsp-config-invalid':
      return uiText(
        'Check LSP server configuration in the plugin manifest',
        '请检查插件清单中的 LSP 服务器配置',
      )
    case 'lsp-server-start-failed':
    case 'lsp-server-crashed':
    case 'lsp-request-timeout':
    case 'lsp-request-failed':
      return uiText(
        'Check LSP server logs with --debug for details',
        '请使用 --debug 查看 LSP 服务器日志',
      )
    case 'plugin-cache-miss':
      return uiText(
        'Run /plugins to refresh the plugin cache',
        '请运行 /plugins 刷新插件缓存',
      )
    case 'marketplace-load-failed':
    case 'generic-error':
      return null
  }

  const _exhaustive: never = error
  return null
}

import chalk from 'chalk'
import { logEvent } from 'src/services/analytics/index.js'
import {
  getLatestVersion,
  type InstallStatus,
  installGlobalPackage,
} from 'src/utils/autoUpdater.js'
import { regenerateCompletionCache } from 'src/utils/completionCache.js'
import {
  getGlobalConfig,
  type InstallMethod,
  saveGlobalConfig,
} from 'src/utils/config.js'
import { logForDebugging } from 'src/utils/debug.js'
import { getDoctorDiagnostic } from 'src/utils/doctorDiagnostic.js'
import { gracefulShutdown } from 'src/utils/gracefulShutdown.js'
import {
  installOrUpdateClaudePackage,
  localInstallationExists,
} from 'src/utils/localInstaller.js'
import {
  installLatest as installLatestNative,
  removeInstalledSymlink,
} from 'src/utils/nativeInstaller/index.js'
import { getPackageManager } from 'src/utils/nativeInstaller/packageManagers.js'
import { writeToStdout } from 'src/utils/process.js'
import { gte } from 'src/utils/semver.js'
import { getInitialSettings } from 'src/utils/settings/settings.js'
import { uiText } from 'src/utils/uiLocale.js'

export async function update() {
  logEvent('tengu_update_check', {})
  writeToStdout(`${uiText('Current version', '当前版本')}: ${MACRO.VERSION}\n`)

  const channel = getInitialSettings()?.autoUpdatesChannel ?? 'latest'
  writeToStdout(`${uiText('Checking for updates to', '正在检查更新通道')} ${channel} ${uiText('version', '版本')}...\n`)

  logForDebugging('update: Starting update check')

  // Run diagnostic to detect potential issues
  logForDebugging('update: Running diagnostic')
  const diagnostic = await getDoctorDiagnostic()
  logForDebugging(`update: Installation type: ${diagnostic.installationType}`)
  logForDebugging(
    `update: Config install method: ${diagnostic.configInstallMethod}`,
  )

  // Check for multiple installations
  if (diagnostic.multipleInstallations.length > 1) {
    writeToStdout('\n')
    writeToStdout(chalk.yellow(uiText('Warning: Multiple installations found', '警告：检测到多个安装来源')) + '\n')
    for (const install of diagnostic.multipleInstallations) {
      const current =
        diagnostic.installationType === install.type
          ? ` ${uiText('(currently running)', '（当前正在运行）')}`
          : ''
      writeToStdout(
        `- ${install.type} ${uiText('at', '位于')} ${install.path}${current}\n`,
      )
    }
  }

  // Display warnings if any exist
  if (diagnostic.warnings.length > 0) {
    writeToStdout('\n')
    for (const warning of diagnostic.warnings) {
      logForDebugging(`update: Warning detected: ${warning.issue}`)

      // Don't skip PATH warnings - they're always relevant
      // The user needs to know that 'which claude' points elsewhere
      logForDebugging(`update: Showing warning: ${warning.issue}`)

      writeToStdout(chalk.yellow(`${uiText('Warning', '警告')}: ${warning.issue}\n`))

      writeToStdout(chalk.bold(`${uiText('Fix', '修复建议')}: ${warning.fix}\n`))
    }
  }

  // Update config if installMethod is not set (but skip for package managers)
  const config = getGlobalConfig()
  if (
    !config.installMethod &&
    diagnostic.installationType !== 'package-manager'
  ) {
    writeToStdout('\n')
    writeToStdout(`${uiText('Updating configuration to track installation method', '正在更新配置以记录安装方式')}...\n`)
    let detectedMethod: 'local' | 'native' | 'global' | 'unknown' = 'unknown'

    // Map diagnostic installation type to config install method
    switch (diagnostic.installationType) {
      case 'npm-local':
        detectedMethod = 'local'
        break
      case 'native':
        detectedMethod = 'native'
        break
      case 'npm-global':
        detectedMethod = 'global'
        break
      default:
        detectedMethod = 'unknown'
    }

    saveGlobalConfig(current => ({
      ...current,
      installMethod: detectedMethod,
    }))
    writeToStdout(`${uiText('Installation method set to', '安装方式已设置为')}: ${detectedMethod}\n`)
  }

  // Check if running from development build
  if (diagnostic.installationType === 'development') {
    writeToStdout('\n')
    writeToStdout(
      chalk.yellow(uiText('Warning: Cannot update development build', '警告：开发版本不支持自动更新')) + '\n',
    )
    await gracefulShutdown(1)
  }

  // Check if running from a package manager
  if (diagnostic.installationType === 'package-manager') {
    const packageManager = await getPackageManager()
    writeToStdout('\n')

    if (packageManager === 'homebrew') {
      writeToStdout(uiText('Claude is managed by Homebrew.\n', '当前 Claude 由 Homebrew 管理。\n'))
      const latest = await getLatestVersion(channel)
      if (latest && !gte(MACRO.VERSION, latest)) {
        writeToStdout(`${uiText('Update available', '发现可更新版本')}: ${MACRO.VERSION} → ${latest}\n`)
        writeToStdout('\n')
        writeToStdout(`${uiText('To update, run', '请执行以下命令更新')}:\n`)
        writeToStdout(chalk.bold('  brew upgrade claude-code') + '\n')
      } else {
        writeToStdout(uiText('Claude is up to date!\n', 'Claude 已是最新版本！\n'))
      }
    } else if (packageManager === 'winget') {
      writeToStdout(uiText('Claude is managed by winget.\n', '当前 Claude 由 winget 管理。\n'))
      const latest = await getLatestVersion(channel)
      if (latest && !gte(MACRO.VERSION, latest)) {
        writeToStdout(`${uiText('Update available', '发现可更新版本')}: ${MACRO.VERSION} → ${latest}\n`)
        writeToStdout('\n')
        writeToStdout(`${uiText('To update, run', '请执行以下命令更新')}:\n`)
        writeToStdout(
          chalk.bold('  winget upgrade Anthropic.ClaudeCode') + '\n',
        )
      } else {
        writeToStdout(uiText('Claude is up to date!\n', 'Claude 已是最新版本！\n'))
      }
    } else if (packageManager === 'apk') {
      writeToStdout(uiText('Claude is managed by apk.\n', '当前 Claude 由 apk 管理。\n'))
      const latest = await getLatestVersion(channel)
      if (latest && !gte(MACRO.VERSION, latest)) {
        writeToStdout(`${uiText('Update available', '发现可更新版本')}: ${MACRO.VERSION} → ${latest}\n`)
        writeToStdout('\n')
        writeToStdout(`${uiText('To update, run', '请执行以下命令更新')}:\n`)
        writeToStdout(chalk.bold('  apk upgrade claude-code') + '\n')
      } else {
        writeToStdout(uiText('Claude is up to date!\n', 'Claude 已是最新版本！\n'))
      }
    } else {
      // pacman, deb, and rpm don't get specific commands because they each have
      // multiple frontends (pacman: yay/paru/makepkg, deb: apt/apt-get/aptitude/nala,
      // rpm: dnf/yum/zypper)
      writeToStdout(uiText('Claude is managed by a package manager.\n', '当前 Claude 由系统包管理器管理。\n'))
      writeToStdout(uiText('Please use your package manager to update.\n', '请使用对应包管理器执行更新。\n'))
    }

    await gracefulShutdown(0)
  }

  // Check for config/reality mismatch (skip for package-manager installs)
  if (
    config.installMethod &&
    diagnostic.configInstallMethod !== 'not set' &&
    diagnostic.installationType !== 'package-manager'
  ) {
    const runningType = diagnostic.installationType
    const configExpects = diagnostic.configInstallMethod

    // Map installation types for comparison
    const typeMapping: Record<string, string> = {
      'npm-local': 'local',
      'npm-global': 'global',
      native: 'native',
      development: 'development',
      unknown: 'unknown',
    }

    const normalizedRunningType = typeMapping[runningType] || runningType

    if (
      normalizedRunningType !== configExpects &&
      configExpects !== 'unknown'
    ) {
      writeToStdout('\n')
      writeToStdout(
        chalk.yellow(
          uiText('Warning: Configuration mismatch', '警告：配置与实际不一致'),
        ) + '\n',
      )
      writeToStdout(
        `${uiText('Config expects', '配置期望')}: ${configExpects} ${uiText('installation', '安装方式')}\n`,
      )
      writeToStdout(
        `${uiText('Currently running', '当前运行')}: ${runningType}\n`,
      )
      writeToStdout(
        chalk.yellow(
          uiText(
            `Updating the ${runningType} installation you are currently using`,
            `将按你当前使用的 ${runningType} 安装方式进行更新`,
          ),
        ) + '\n',
      )

      // Update config to match reality
      saveGlobalConfig(current => ({
        ...current,
        installMethod: normalizedRunningType as InstallMethod,
      }))
      writeToStdout(
        `${uiText('Config updated to reflect current installation method', '配置已更新为当前安装方式')}: ${normalizedRunningType}\n`,
      )
    }
  }

  // Handle native installation updates first
  if (diagnostic.installationType === 'native') {
    logForDebugging(
      'update: Detected native installation, using native updater',
    )
    try {
      const result = await installLatestNative(channel, true)

      // Handle lock contention gracefully
      if (result.lockFailed) {
        const pidInfo = result.lockHolderPid
          ? ` (${uiText('PID', '进程 ID')} ${result.lockHolderPid})`
          : ''
        writeToStdout(
          chalk.yellow(
            uiText(
              `Another Claude process${pidInfo} is currently running. Please try again in a moment.`,
              `另一个 Claude 进程${pidInfo}正在运行。请稍后再试。`,
            ),
          ) + '\n',
        )
        await gracefulShutdown(0)
      }

      if (!result.latestVersion) {
        process.stderr.write(uiText('Failed to check for updates\n', '检查更新失败\n'))
        await gracefulShutdown(1)
      }

      if (result.latestVersion === MACRO.VERSION) {
        writeToStdout(
          chalk.green(
            uiText(
              `Claude Code is up to date (${MACRO.VERSION})`,
              `Claude Code 已是最新版本（${MACRO.VERSION}）`,
            ),
          ) + '\n',
        )
      } else {
        writeToStdout(
          chalk.green(
            uiText(
              `Successfully updated from ${MACRO.VERSION} to version ${result.latestVersion}`,
              `已成功从 ${MACRO.VERSION} 更新到 ${result.latestVersion}`,
            ),
          ) + '\n',
        )
        await regenerateCompletionCache()
      }
      await gracefulShutdown(0)
    } catch (error) {
      process.stderr.write(
        uiText(
          'Error: Failed to install native update\n',
          '错误：安装原生更新失败\n',
        ),
      )
      process.stderr.write(String(error) + '\n')
      process.stderr.write(
        uiText(
          'Try running "claude doctor" for diagnostics\n',
          '可尝试运行 "claude doctor" 进行诊断\n',
        ),
      )
      await gracefulShutdown(1)
    }
  }

  // Fallback to existing JS/npm-based update logic
  // Remove native installer symlink since we're not using native installation
  // But only if user hasn't migrated to native installation
  if (config.installMethod !== 'native') {
    await removeInstalledSymlink()
  }

  logForDebugging('update: Checking npm registry for latest version')
  logForDebugging(`update: Package URL: ${MACRO.PACKAGE_URL}`)
  const npmTag = channel === 'stable' ? 'stable' : 'latest'
  const npmCommand = `npm view ${MACRO.PACKAGE_URL}@${npmTag} version`
  logForDebugging(`update: Running: ${npmCommand}`)
  const latestVersion = await getLatestVersion(channel)
  logForDebugging(
    `update: Latest version from npm: ${latestVersion || 'FAILED'}`,
  )

  if (!latestVersion) {
    logForDebugging('update: Failed to get latest version from npm registry')
    process.stderr.write(
      chalk.red(uiText('Failed to check for updates', '检查更新失败')) + '\n',
    )
    process.stderr.write(
      uiText(
        'Unable to fetch latest version from npm registry\n',
        '无法从 npm registry 获取最新版本\n',
      ),
    )
    process.stderr.write('\n')
    process.stderr.write(uiText('Possible causes:\n', '可能原因：\n'))
    process.stderr.write(
      uiText('  • Network connectivity issues\n', '  • 网络连接异常\n'),
    )
    process.stderr.write(
      uiText('  • npm registry is unreachable\n', '  • 无法访问 npm registry\n'),
    )
    process.stderr.write(
      uiText(
        '  • Corporate proxy/firewall blocking npm\n',
        '  • 企业代理或防火墙阻止了 npm 访问\n',
      ),
    )
    if (MACRO.PACKAGE_URL && !MACRO.PACKAGE_URL.startsWith('@anthropic')) {
      process.stderr.write(
        uiText(
          '  • Internal/development build not published to npm\n',
          '  • 内部/开发构建未发布到 npm\n',
        ),
      )
    }
    process.stderr.write('\n')
    process.stderr.write(uiText('Try:\n', '建议尝试：\n'))
    process.stderr.write(
      uiText('  • Check your internet connection\n', '  • 检查网络连接\n'),
    )
    process.stderr.write(
      uiText(
        '  • Run with --debug flag for more details\n',
        '  • 使用 --debug 获取更多细节\n',
      ),
    )
    const packageName =
      MACRO.PACKAGE_URL ||
      (process.env.USER_TYPE === 'ant'
        ? '@anthropic-ai/claude-cli'
        : '@anthropic-ai/claude-code')
    process.stderr.write(
      uiText(
        `  • Manually check: npm view ${packageName} version\n`,
        `  • 手动检查：npm view ${packageName} version\n`,
      ),
    )

    process.stderr.write(
      uiText(
        '  • Check if you need to login: npm whoami\n',
        '  • 检查是否需要登录：npm whoami\n',
      ),
    )
    await gracefulShutdown(1)
  }

  // Check if versions match exactly, including any build metadata (like SHA)
  if (latestVersion === MACRO.VERSION) {
    writeToStdout(
      chalk.green(
        uiText(
          `Claude Code is up to date (${MACRO.VERSION})`,
          `Claude Code 已是最新版本（${MACRO.VERSION}）`,
        ),
      ) + '\n',
    )
    await gracefulShutdown(0)
  }

  writeToStdout(
    uiText(
      `New version available: ${latestVersion} (current: ${MACRO.VERSION})\n`,
      `发现新版本：${latestVersion}（当前：${MACRO.VERSION}）\n`,
    ),
  )
  writeToStdout(uiText('Installing update...\n', '正在安装更新...\n'))

  // Determine update method based on what's actually running
  let useLocalUpdate = false
  let updateMethodName = ''

  switch (diagnostic.installationType) {
    case 'npm-local':
      useLocalUpdate = true
      updateMethodName = 'local'
      break
    case 'npm-global':
      useLocalUpdate = false
      updateMethodName = 'global'
      break
    case 'unknown': {
      // Fallback to detection if we can't determine installation type
      const isLocal = await localInstallationExists()
      useLocalUpdate = isLocal
      updateMethodName = isLocal ? 'local' : 'global'
      writeToStdout(
        chalk.yellow(
          uiText(
            'Warning: Could not determine installation type',
            '警告：无法确定安装类型',
          ),
        ) + '\n',
      )
      writeToStdout(
        uiText(
          `Attempting ${updateMethodName} update based on file detection...\n`,
          `将基于文件检测尝试 ${updateMethodName} 更新...\n`,
        ),
      )
      break
    }
    default:
      process.stderr.write(
        uiText(
          `Error: Cannot update ${diagnostic.installationType} installation\n`,
          `错误：不支持更新 ${diagnostic.installationType} 安装类型\n`,
        ),
      )
      await gracefulShutdown(1)
  }

  writeToStdout(
    uiText(
      `Using ${updateMethodName} installation update method...\n`,
      `将使用 ${updateMethodName} 安装方式进行更新...\n`,
    ),
  )

  logForDebugging(`update: Update method determined: ${updateMethodName}`)
  logForDebugging(`update: useLocalUpdate: ${useLocalUpdate}`)

  let status: InstallStatus

  if (useLocalUpdate) {
    logForDebugging(
      'update: Calling installOrUpdateClaudePackage() for local update',
    )
    status = await installOrUpdateClaudePackage(channel)
  } else {
    logForDebugging('update: Calling installGlobalPackage() for global update')
    status = await installGlobalPackage()
  }

  logForDebugging(`update: Installation status: ${status}`)

  switch (status) {
    case 'success':
      writeToStdout(
        chalk.green(
          uiText(
            `Successfully updated from ${MACRO.VERSION} to version ${latestVersion}`,
            `已成功从 ${MACRO.VERSION} 更新到 ${latestVersion}`,
          ),
        ) + '\n',
      )
      await regenerateCompletionCache()
      break
    case 'no_permissions':
      process.stderr.write(
        uiText(
          'Error: Insufficient permissions to install update\n',
          '错误：权限不足，无法安装更新\n',
        ),
      )
      if (useLocalUpdate) {
        process.stderr.write(uiText('Try manually updating with:\n', '可尝试手动更新：\n'))
        process.stderr.write(
          `  cd ~/.claude/local && npm update ${MACRO.PACKAGE_URL}\n`,
        )
      } else {
        process.stderr.write(
          uiText(
            'Try running with sudo or fix npm permissions\n',
            '可尝试使用 sudo，或修复 npm 权限\n',
          ),
        )
        process.stderr.write(
          uiText(
            'Or consider using native installation with: claude install\n',
            '或者改用原生安装方式：claude install\n',
          ),
        )
      }
      await gracefulShutdown(1)
      break
    case 'install_failed':
      process.stderr.write(uiText('Error: Failed to install update\n', '错误：安装更新失败\n'))
      if (useLocalUpdate) {
        process.stderr.write(uiText('Try manually updating with:\n', '可尝试手动更新：\n'))
        process.stderr.write(
          `  cd ~/.claude/local && npm update ${MACRO.PACKAGE_URL}\n`,
        )
      } else {
        process.stderr.write(
          uiText(
            'Or consider using native installation with: claude install\n',
            '或者改用原生安装方式：claude install\n',
          ),
        )
      }
      await gracefulShutdown(1)
      break
    case 'in_progress':
      process.stderr.write(
        uiText(
          'Error: Another instance is currently performing an update\n',
          '错误：另一个实例正在执行更新\n',
        ),
      )
      process.stderr.write(
        uiText(
          'Please wait and try again later\n',
          '请稍后再试\n',
        ),
      )
      await gracefulShutdown(1)
      break
  }
  await gracefulShutdown(0)
}

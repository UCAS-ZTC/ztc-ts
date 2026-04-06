/**
 * Shared helper functions and types for plugin details views
 *
 * Used by both DiscoverPlugins and BrowseMarketplace components.
 */

import * as React from 'react'
import { ConfigurableShortcutHint } from '../../components/ConfigurableShortcutHint.js'
import { Byline } from '../../components/design-system/Byline.js'
import { Box, Text } from '../../ink.js'
import { uiText } from '../../utils/uiLocale.js'
import type { PluginMarketplaceEntry } from '../../utils/plugins/schemas.js'

/**
 * Represents a plugin available for installation from a marketplace
 */
export type InstallablePlugin = {
  entry: PluginMarketplaceEntry
  marketplaceName: string
  pluginId: string
  isInstalled: boolean
}

/**
 * Menu option for plugin details view
 */
export type PluginDetailsMenuOption = {
  label: string
  action: string
}

/**
 * Extract GitHub repo info from a plugin's source
 */
export function extractGitHubRepo(plugin: InstallablePlugin): string | null {
  const isGitHub =
    plugin.entry.source &&
    typeof plugin.entry.source === 'object' &&
    'source' in plugin.entry.source &&
    plugin.entry.source.source === 'github'

  if (
    isGitHub &&
    typeof plugin.entry.source === 'object' &&
    'repo' in plugin.entry.source
  ) {
    return plugin.entry.source.repo
  }

  return null
}

/**
 * Build menu options for plugin details view with scoped installation options
 */
export function buildPluginDetailsMenuOptions(
  hasHomepage: string | undefined,
  githubRepo: string | null,
): PluginDetailsMenuOption[] {
  const options: PluginDetailsMenuOption[] = [
    {
      label: uiText('Install for you (user scope)', '仅为你安装（user 作用域）'),
      action: 'install-user',
    },
    {
      label: uiText(
        'Install for all collaborators on this repository (project scope)',
        '为当前仓库所有协作者安装（project 作用域）',
      ),
      action: 'install-project',
    },
    {
      label: uiText(
        'Install for you, in this repo only (local scope)',
        '仅在当前仓库为你安装（local 作用域）',
      ),
      action: 'install-local',
    },
  ]

  if (hasHomepage) {
    options.push({
      label: uiText('Open homepage', '打开主页'),
      action: 'homepage',
    })
  }

  if (githubRepo) {
    options.push({
      label: uiText('View on GitHub', '在 GitHub 查看'),
      action: 'github',
    })
  }

  options.push({
    label: uiText('Back to plugin list', '返回插件列表'),
    action: 'back',
  })

  return options
}

/**
 * Key hint component for plugin selection screens
 */
export function PluginSelectionKeyHint({
  hasSelection,
}: {
  hasSelection: boolean
}): React.ReactNode {
  return (
    <Box marginTop={1}>
      <Text dimColor italic>
        <Byline>
          {hasSelection && (
            <ConfigurableShortcutHint
              action="plugin:install"
              context="Plugin"
              fallback="i"
              description={uiText('install', '安装')}
              bold
            />
          )}
          <ConfigurableShortcutHint
            action="plugin:toggle"
            context="Plugin"
            fallback="Space"
            description={uiText('toggle', '切换')}
          />
          <ConfigurableShortcutHint
            action="select:accept"
            context="Select"
            fallback="Enter"
            description={uiText('details', '详情')}
          />
          <ConfigurableShortcutHint
            action="confirm:no"
            context="Confirmation"
            fallback="Esc"
            description={uiText('back', '返回')}
          />
        </Byline>
      </Text>
    </Box>
  )
}

import React from 'react'
import { Text } from '../../ink.js'
import {
  extractMcpToolDisplayName,
  getMcpDisplayName,
} from '../../services/mcp/mcpStringUtils.js'
import { filterToolsByServer } from '../../services/mcp/utils.js'
import { useAppState } from '../../state/AppState.js'
import type { Tool } from '../../Tool.js'
import { plural } from '../../utils/stringUtils.js'
import { uiText } from '../../utils/uiLocale.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'
import { Select } from '../CustomSelect/index.js'
import { Byline } from '../design-system/Byline.js'
import { Dialog } from '../design-system/Dialog.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'
import type { ServerInfo } from './types.js'

type Props = {
  server: ServerInfo
  onSelectTool: (tool: Tool, index: number) => void
  onBack: () => void
}

export function MCPToolListEmptyState(): React.ReactNode {
  return <Text dimColor>{uiText('No tools available', '暂无可用工具')}</Text>
}

export function MCPToolListView({ server, onSelectTool, onBack }: Props): React.ReactNode {
  const mcpTools = useAppState(s => s.mcp.tools)

  const serverTools = React.useMemo(() => {
    if (server.client.type !== 'connected') {
      return []
    }

    return filterToolsByServer(mcpTools, server.name)
  }, [server, mcpTools])

  const toolOptions = serverTools.map((tool, index) => {
    const toolName = getMcpDisplayName(tool.name, server.name)
    const fullDisplayName = tool.userFacingName ? tool.userFacingName({}) : toolName
    const displayName = extractMcpToolDisplayName(fullDisplayName)

    const isReadOnly = tool.isReadOnly?.({}) ?? false
    const isDestructive = tool.isDestructive?.({}) ?? false
    const isOpenWorld = tool.isOpenWorld?.({}) ?? false

    const annotations: string[] = []
    if (isReadOnly) annotations.push(uiText('read-only', '只读'))
    if (isDestructive) annotations.push(uiText('destructive', '高风险'))
    if (isOpenWorld) annotations.push(uiText('open-world', '开放网络'))

    return {
      label: displayName,
      value: index.toString(),
      description: annotations.length > 0 ? annotations.join(', ') : undefined,
      descriptionColor: isDestructive ? 'error' : isReadOnly ? 'success' : undefined,
    }
  })

  return (
    <Dialog
      title={uiText(`Tools for ${server.name}`, `${server.name} 的工具`) }
      subtitle={uiText(
        `${serverTools.length} ${plural(serverTools.length, 'tool')}`,
        `${serverTools.length} 个工具`,
      )}
      onCancel={onBack}
      inputGuide={exitState =>
        exitState.pending ? (
          <Text>
            {uiText('Press ', '再次按 ')}
            {exitState.keyName}
            {uiText(' again to exit', ' 退出')}
          </Text>
        ) : (
          <Byline>
            <KeyboardShortcutHint shortcut="↑↓" action={uiText('navigate', '导航')} />
            <KeyboardShortcutHint shortcut="Enter" action={uiText('select', '选择')} />
            <ConfigurableShortcutHint
              action="confirm:no"
              context="Confirmation"
              fallback="Esc"
              description={uiText('back', '返回')}
            />
          </Byline>
        )
      }
    >
      {serverTools.length === 0 ? (
        <MCPToolListEmptyState />
      ) : (
        <Select
          options={toolOptions}
          onChange={value => {
            const index = parseInt(value, 10)
            const tool = serverTools[index]
            if (tool) {
              onSelectTool(tool, index)
            }
          }}
          onCancel={onBack}
        />
      )}
    </Dialog>
  )
}

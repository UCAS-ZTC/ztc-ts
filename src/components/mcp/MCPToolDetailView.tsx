import React from 'react'
import { Box, Text } from '../../ink.js'
import {
  extractMcpToolDisplayName,
  getMcpDisplayName,
} from '../../services/mcp/mcpStringUtils.js'
import type { Tool } from '../../Tool.js'
import { uiText } from '../../utils/uiLocale.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'
import { Dialog } from '../design-system/Dialog.js'
import type { ServerInfo } from './types.js'

type Props = {
  tool: Tool
  server: ServerInfo
  onBack: () => void
}

const TOOL_PERMISSION_CONTEXT = {
  mode: 'default' as const,
  additionalWorkingDirectories: new Map(),
  alwaysAllowRules: {},
  alwaysDenyRules: {},
  alwaysAskRules: {},
  isBypassPermissionsModeAvailable: false,
}

export function MCPToolDetailView({ tool, server, onBack }: Props): React.ReactNode {
  const [toolDescription, setToolDescription] = React.useState<string>('')

  const toolName = getMcpDisplayName(tool.name, server.name)
  const fullDisplayName = tool.userFacingName ? tool.userFacingName({}) : toolName
  const displayName = extractMcpToolDisplayName(fullDisplayName)

  const isReadOnly = tool.isReadOnly?.({}) ?? false
  const isDestructive = tool.isDestructive?.({}) ?? false
  const isOpenWorld = tool.isOpenWorld?.({}) ?? false

  React.useEffect(() => {
    async function loadDescription() {
      try {
        const desc = await tool.description(
          {},
          {
            isNonInteractiveSession: false,
            toolPermissionContext: TOOL_PERMISSION_CONTEXT,
            tools: [],
          },
        )
        setToolDescription(desc)
      } catch {
        setToolDescription(uiText('Failed to load description', '加载工具描述失败'))
      }
    }

    void loadDescription()
  }, [tool])

  const titleContent = (
    <>
      {displayName}
      {isReadOnly && <Text color="success"> {uiText('[read-only]', '[只读]')}</Text>}
      {isDestructive && <Text color="error"> {uiText('[destructive]', '[高风险]')}</Text>}
      {isOpenWorld && <Text dimColor>{uiText('[open-world]', '[开放网络]')}</Text>}
    </>
  )

  return (
    <Dialog
      title={titleContent}
      subtitle={server.name}
      onCancel={onBack}
      inputGuide={exitState =>
        exitState.pending ? (
          <Text>
            {uiText('Press ', '再次按 ')}
            {exitState.keyName}
            {uiText(' again to exit', ' 退出')}
          </Text>
        ) : (
          <ConfigurableShortcutHint
            action="confirm:no"
            context="Confirmation"
            fallback="Esc"
            description={uiText('go back', '返回')}
          />
        )
      }
    >
      <Box flexDirection="column">
        <Box>
          <Text bold>{uiText('Tool name: ', '工具名：')}</Text>
          <Text dimColor>{toolName}</Text>
        </Box>

        <Box>
          <Text bold>{uiText('Full name: ', '完整名称：')}</Text>
          <Text dimColor>{tool.name}</Text>
        </Box>

        {toolDescription && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>{uiText('Description:', '说明：')}</Text>
            <Text wrap="wrap">{toolDescription}</Text>
          </Box>
        )}

        {tool.inputJSONSchema &&
          tool.inputJSONSchema.properties &&
          Object.keys(tool.inputJSONSchema.properties).length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold>{uiText('Parameters:', '参数：')}</Text>
              <Box marginLeft={2} flexDirection="column">
                {Object.entries(tool.inputJSONSchema.properties).map(([key, value]) => {
                  const required = tool.inputJSONSchema?.required as string[] | undefined
                  const isRequired = required?.includes(key)
                  const valueType =
                    typeof value === 'object' && value && 'type' in value
                      ? String(value.type)
                      : uiText('unknown', '未知')

                  return (
                    <Text key={key}>
                      • {key}
                      {isRequired && <Text dimColor>{uiText(' (required)', '（必填）')}</Text>}:{' '}
                      <Text dimColor>{valueType}</Text>
                      {typeof value === 'object' && value && 'description' in value && (
                        <Text dimColor> - {String(value.description)}</Text>
                      )}
                    </Text>
                  )
                })}
              </Box>
            </Box>
          )}
      </Box>
    </Dialog>
  )
}

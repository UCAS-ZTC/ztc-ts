import figures from 'figures'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Box, color, Link, Text, useTheme } from '../../ink.js'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import {
  AuthenticationCancelledError,
  performMCPOAuthFlow,
} from '../../services/mcp/auth.js'
import { capitalize } from '../../utils/stringUtils.js'
import { uiText } from '../../utils/uiLocale.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'
import { Select } from '../CustomSelect/index.js'
import { Byline } from '../design-system/Byline.js'
import { Dialog } from '../design-system/Dialog.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'
import { Spinner } from '../Spinner.js'
import type { AgentMcpServerInfo } from './types.js'

type Props = {
  agentServer: AgentMcpServerInfo
  onCancel: () => void
  onComplete?: (result?: string, options?: { display?: CommandResultDisplay }) => void
}

export function MCPAgentServerErrorMessage({ error }: { error: string }): React.ReactNode {
  return (
    <Box>
      <Text color="error">
        {uiText('Error: ', '错误：')}
        {error}
      </Text>
    </Box>
  )
}

/**
 * Menu for agent-specific MCP servers.
 * These servers are defined in agent frontmatter and only connect when the agent runs.
 * For HTTP/SSE servers, this allows pre-authentication before using the agent.
 */
export function MCPAgentServerMenu({
  agentServer,
  onCancel,
  onComplete,
}: Props): React.ReactNode {
  const [theme] = useTheme()
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null)
  const authAbortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => authAbortControllerRef.current?.abort(), [])

  const handleEscCancel = useCallback(() => {
    if (isAuthenticating) {
      authAbortControllerRef.current?.abort()
      authAbortControllerRef.current = null
      setIsAuthenticating(false)
      setAuthorizationUrl(null)
    }
  }, [isAuthenticating])

  useKeybinding('confirm:no', handleEscCancel, {
    context: 'Confirmation',
    isActive: isAuthenticating,
  })

  const handleAuthenticate = useCallback(async () => {
    if (!agentServer.needsAuth || !agentServer.url) {
      return
    }

    setIsAuthenticating(true)
    setError(null)
    const controller = new AbortController()
    authAbortControllerRef.current = controller

    try {
      const tempConfig = {
        type: agentServer.transport as 'http' | 'sse',
        url: agentServer.url,
      }

      await performMCPOAuthFlow(
        agentServer.name,
        tempConfig,
        setAuthorizationUrl,
        controller.signal,
      )

      onComplete?.(
        uiText(
          `Authentication successful for ${agentServer.name}. The server will connect when the agent runs.`,
          `已完成 ${agentServer.name} 的认证。服务器会在 Agent 运行时连接。`,
        ),
      )
    } catch (err) {
      if (err instanceof Error && !(err instanceof AuthenticationCancelledError)) {
        setError(err.message)
      }
    } finally {
      setIsAuthenticating(false)
      authAbortControllerRef.current = null
    }
  }, [agentServer, onComplete])

  const capitalizedServerName = capitalize(String(agentServer.name))

  if (isAuthenticating) {
    return (
      <Box flexDirection="column" gap={1} padding={1}>
        <Text color="claude">
          {uiText('Authenticating with ', '正在与 ')}
          {agentServer.name}
          {'…'}
        </Text>
        <Box>
          <Spinner />
          <Text>{uiText(' A browser window will open for authentication', ' 将打开浏览器进行认证')}</Text>
        </Box>

        {authorizationUrl && (
          <Box flexDirection="column">
            <Text dimColor>
              {uiText(
                "If your browser doesn't open automatically, copy this URL manually:",
                '如果浏览器未自动打开，请手动复制这个 URL：',
              )}
            </Text>
            <Link url={authorizationUrl} />
          </Box>
        )}

        <Box marginLeft={3}>
          <Text dimColor>
            {uiText(
              'Return here after authenticating in your browser. ',
              '完成浏览器认证后返回此处。',
            )}
            <ConfigurableShortcutHint
              action="confirm:no"
              context="Confirmation"
              fallback="Esc"
              description={uiText('go back', '返回')}
            />
          </Text>
        </Box>
      </Box>
    )
  }

  const menuOptions = []

  if (agentServer.needsAuth) {
    menuOptions.push({
      label: agentServer.isAuthenticated
        ? uiText('Re-authenticate', '重新认证')
        : uiText('Authenticate', '认证'),
      value: 'auth',
    })
  }

  menuOptions.push({
    label: uiText('Back', '返回'),
    value: 'back',
  })

  return (
    <Dialog
      title={uiText(
        `${capitalizedServerName} MCP Server`,
        `${capitalizedServerName} MCP 服务器`,
      )}
      subtitle={uiText('agent-only', '仅 Agent 可用')}
      onCancel={onCancel}
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
            <KeyboardShortcutHint shortcut="Enter" action={uiText('confirm', '确认')} />
            <ConfigurableShortcutHint
              action="confirm:no"
              context="Confirmation"
              fallback="Esc"
              description={uiText('go back', '返回')}
            />
          </Byline>
        )
      }
    >
      <Box flexDirection="column" gap={0}>
        <Box>
          <Text bold>{uiText('Type: ', '类型：')}</Text>
          <Text dimColor>{agentServer.transport}</Text>
        </Box>

        {agentServer.url && (
          <Box>
            <Text bold>{uiText('URL: ', 'URL：')}</Text>
            <Text dimColor>{agentServer.url}</Text>
          </Box>
        )}

        {agentServer.command && (
          <Box>
            <Text bold>{uiText('Command: ', '命令：')}</Text>
            <Text dimColor>{agentServer.command}</Text>
          </Box>
        )}

        <Box>
          <Text bold>{uiText('Used by: ', '被以下 Agent 使用：')}</Text>
          <Text dimColor>{agentServer.sourceAgents.join(', ')}</Text>
        </Box>

        <Box marginTop={1}>
          <Text bold>{uiText('Status: ', '状态：')}</Text>
          <Text>
            {color('inactive', theme)(figures.radioOff)} {uiText('not connected', '未连接')} ({uiText('agent-only', '仅 Agent 可用')})
          </Text>
        </Box>

        {agentServer.needsAuth && (
          <Box>
            <Text bold>{uiText('Auth: ', '认证：')}</Text>
            {agentServer.isAuthenticated ? (
              <Text>{color('success', theme)(figures.tick)} {uiText('authenticated', '已认证')}</Text>
            ) : (
              <Text>
                {color('warning', theme)(figures.triangleUpOutline)} {uiText('may need authentication', '可能需要认证')}
              </Text>
            )}
          </Box>
        )}
      </Box>

      <Box>
        <Text dimColor>
          {uiText(
            'This server connects only when running the agent.',
            '该服务器仅会在运行 Agent 时建立连接。',
          )}
        </Text>
      </Box>

      {error && <MCPAgentServerErrorMessage error={error} />}

      <Box>
        <Select
          options={menuOptions}
          onChange={async value => {
            switch (value) {
              case 'auth':
                await handleAuthenticate()
                break
              case 'back':
                onCancel()
                break
            }
          }}
          onCancel={onCancel}
        />
      </Box>
    </Dialog>
  )
}

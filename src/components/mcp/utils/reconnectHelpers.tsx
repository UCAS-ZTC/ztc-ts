import type { Command } from '../../../commands.js'
import type { MCPServerConnection, ServerResource } from '../../../services/mcp/types.js'
import type { Tool } from '../../../Tool.js'
import { uiText } from '../../../utils/uiLocale.js'

export interface ReconnectResult {
  message: string
  success: boolean
}

export function handleReconnectResult(
  result: {
    client: MCPServerConnection
    tools: Tool[]
    commands: Command[]
    resources?: ServerResource[]
  },
  serverName: string,
): ReconnectResult {
  switch (result.client.type) {
    case 'connected':
      return {
        message: uiText(
          `Reconnected to ${serverName}.`,
          `已重新连接到 ${serverName}。`,
        ),
        success: true,
      }

    case 'needs-auth':
      return {
        message: uiText(
          `${serverName} requires authentication. Use the 'Authenticate' option.`,
          `${serverName} 需要认证。请使用“认证”选项。`,
        ),
        success: false,
      }

    case 'failed':
      return {
        message: uiText(
          `Failed to reconnect to ${serverName}.`,
          `重新连接 ${serverName} 失败。`,
        ),
        success: false,
      }

    default:
      return {
        message: uiText(
          `Unknown result when reconnecting to ${serverName}.`,
          `重新连接 ${serverName} 时返回了未知结果。`,
        ),
        success: false,
      }
  }
}

export function handleReconnectError(error: unknown, serverName: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error)
  return uiText(
    `Error reconnecting to ${serverName}: ${errorMessage}`,
    `重新连接 ${serverName} 时出错：${errorMessage}`,
  )
}

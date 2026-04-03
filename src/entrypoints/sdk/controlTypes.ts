// Compatibility-first control protocol types.
// The upstream generated control types are missing in this snapshot, so we
// keep a permissive surface that preserves required fields and export names.

import type { SDKPartialAssistantMessage as CoreSDKPartialAssistantMessage } from './coreTypes.js'

type AnyRecord = Record<string, any>

export type CallToolResult = unknown
export type ToolAnnotations = AnyRecord

export type SDKControlRequestInner = {
  subtype: string
  [key: string]: any
}

export type SDKControlRequest = {
  type: 'control_request'
  request_id: string
  request: SDKControlRequestInner
  [key: string]: any
}

export type SDKControlResponseInner =
  | {
      subtype: 'success'
      request_id: string
      response?: AnyRecord
      [key: string]: any
    }
  | {
      subtype: 'error'
      request_id: string
      error: string
      pending_permission_requests?: SDKControlRequest[]
      [key: string]: any
    }

export type SDKControlResponse = {
  type: 'control_response'
  response: SDKControlResponseInner
  [key: string]: any
}

export type SDKControlCancelRequest = {
  type: 'control_cancel_request'
  request_id: string
  [key: string]: any
}

export type SDKControlInitializeRequest = AnyRecord & {
  subtype: 'initialize'
}
export type SDKControlInitializeResponse = AnyRecord
export type SDKControlPermissionRequest = AnyRecord & {
  subtype: 'can_use_tool'
  tool_name: string
  tool_use_id: string
}
export type SDKControlMcpSetServersResponse = AnyRecord
export type SDKControlReloadPluginsResponse = AnyRecord & {
  plugins?: Array<AnyRecord>
}

export type SDKPartialAssistantMessage = CoreSDKPartialAssistantMessage

export type SDKKeepAliveMessage = {
  type: 'keep_alive'
  [key: string]: any
}

export type StdinMessage = any
export type StdoutMessage = any

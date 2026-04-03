type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export function isOpenAICompatMode(): boolean {
  if (process.env.OPENAI_COMPAT === '1') return true
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  return !!baseUrl && !baseUrl.includes('anthropic.com')
}

function getOpenAIBaseUrl(): string {
  let base = process.env.ANTHROPIC_BASE_URL || ''
  base = base.replace(/\/+$/, '')
  if (!base.endsWith('/v1')) base += '/v1'
  return base
}

function getApiKey(): string {
  return process.env.ANTHROPIC_API_KEY || ''
}

// ─── Request translation ─────────────────────────────────────────────

function flattenContentToString(content: any): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text || '')
    .join('\n')
}

function translateMessages(system: any, messages: any[]): any[] {
  const out: any[] = []

  if (system) {
    const blocks = Array.isArray(system) ? system : [system]
    const text = blocks
      .map((b: any) => (typeof b === 'string' ? b : b.text || ''))
      .join('\n')
    if (text) out.push({ role: 'system', content: text })
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        out.push({ role: 'user', content: msg.content })
        continue
      }
      if (!Array.isArray(msg.content)) {
        out.push({ role: 'user', content: String(msg.content ?? '') })
        continue
      }
      const textParts: string[] = []
      for (const block of msg.content) {
        if (block.type === 'text') {
          textParts.push(block.text)
        } else if (block.type === 'tool_result') {
          const rc =
            typeof block.content === 'string'
              ? block.content
              : Array.isArray(block.content)
                ? block.content.map((c: any) => c.text || '').join('')
                : JSON.stringify(block.content ?? '')
          out.push({ role: 'tool', tool_call_id: block.tool_use_id, content: rc })
        } else if (block.type === 'image') {
          textParts.push('[image]')
        }
      }
      if (textParts.length) out.push({ role: 'user', content: textParts.join('\n') })
    } else if (msg.role === 'assistant') {
      if (typeof msg.content === 'string') {
        out.push({ role: 'assistant', content: msg.content })
        continue
      }
      if (!Array.isArray(msg.content)) {
        out.push({ role: 'assistant', content: String(msg.content ?? '') })
        continue
      }
      const textParts: string[] = []
      const toolCalls: any[] = []
      for (const block of msg.content) {
        if (block.type === 'text') {
          textParts.push(block.text)
        } else if (block.type === 'thinking' && block.thinking) {
          textParts.push(block.thinking)
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function' as const,
            function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) },
          })
        }
      }
      const assistantMsg: any = {
        role: 'assistant',
        content: textParts.length ? textParts.join('\n') : null,
      }
      if (toolCalls.length) assistantMsg.tool_calls = toolCalls
      out.push(assistantMsg)
    }
  }
  return out
}

function translateTools(tools?: any[]): any[] | undefined {
  if (!tools?.length) return undefined
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.input_schema || { type: 'object', properties: {} },
    },
  }))
}

function translateToolChoice(tc?: any): any {
  if (!tc) return undefined
  if (tc.type === 'auto') return 'auto'
  if (tc.type === 'any') return 'required'
  if (tc.type === 'tool') return { type: 'function', function: { name: tc.name } }
  return undefined
}

function buildOpenAIBody(body: any): any {
  const openaiMessages = translateMessages(body.system, body.messages || [])
  const result: any = {
    model: body.model,
    messages: openaiMessages,
    stream: body.stream ?? false,
  }
  if (body.max_tokens) result.max_tokens = body.max_tokens
  if (body.temperature !== undefined) result.temperature = body.temperature
  if (body.stop_sequences) result.stop = body.stop_sequences
  if (body.top_p !== undefined) result.top_p = body.top_p

  const tools = translateTools(body.tools)
  if (tools) {
    result.tools = tools
    const tc = translateToolChoice(body.tool_choice)
    if (tc) result.tool_choice = tc
  }

  if (body.stream) {
    result.stream_options = { include_usage: true }
  }
  return result
}

// ─── Response translation ────────────────────────────────────────────

function translateNonStreamingResponse(openai: any, model: string): any {
  const choice = openai.choices?.[0]
  const content: any[] = []

  if (choice?.message?.content) {
    content.push({ type: 'text', text: choice.message.content })
  }
  if (choice?.message?.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      let input = {}
      try { input = JSON.parse(tc.function?.arguments || '{}') } catch {}
      content.push({ type: 'tool_use', id: tc.id, name: tc.function?.name, input })
    }
  }

  const finishReason = choice?.finish_reason
  const stopReason =
    finishReason === 'tool_calls' ? 'tool_use' :
    finishReason === 'length' ? 'max_tokens' : 'end_turn'

  return {
    id: openai.id || `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content,
    model,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: openai.usage?.prompt_tokens || 0,
      output_tokens: openai.usage?.completion_tokens || 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  }
}

// ─── Streaming translation ───────────────────────────────────────────

function createAnthropicSSE(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function createStreamingTranslator(model: string): TransformStream<Uint8Array, Uint8Array> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let buffer = ''
  let sentStart = false
  let contentBlockIndex = 0
  let activeTextBlock = false
  let activeToolBlocks = new Map<number, { id: string; name: string; argBuffer: string }>()
  let inputTokens = 0
  let outputTokens = 0

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          if (activeTextBlock) {
            controller.enqueue(encoder.encode(
              createAnthropicSSE('content_block_stop', { type: 'content_block_stop', index: contentBlockIndex - 1 })
            ))
            activeTextBlock = false
          }
          for (const [idx, tb] of activeToolBlocks) {
            controller.enqueue(encoder.encode(
              createAnthropicSSE('content_block_stop', { type: 'content_block_stop', index: idx })
            ))
          }
          activeToolBlocks.clear()
          controller.enqueue(encoder.encode(
            createAnthropicSSE('message_delta', {
              type: 'message_delta',
              delta: { stop_reason: 'end_turn', stop_sequence: null },
              usage: { output_tokens: outputTokens },
            })
          ))
          controller.enqueue(encoder.encode(
            createAnthropicSSE('message_stop', { type: 'message_stop' })
          ))
          return
        }

        let parsed: any
        try { parsed = JSON.parse(data) } catch { continue }

        if (!sentStart) {
          sentStart = true
          controller.enqueue(encoder.encode(
            createAnthropicSSE('message_start', {
              type: 'message_start',
              message: {
                id: parsed.id || `msg_${Date.now()}`,
                type: 'message',
                role: 'assistant',
                content: [],
                model,
                stop_reason: null,
                stop_sequence: null,
                usage: { input_tokens: inputTokens, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
              },
            })
          ))
        }

        if (parsed.usage) {
          inputTokens = parsed.usage.prompt_tokens || inputTokens
          outputTokens = parsed.usage.completion_tokens || outputTokens
        }

        const delta = parsed.choices?.[0]?.delta
        if (!delta) {
          const finishReason = parsed.choices?.[0]?.finish_reason
          if (finishReason) {
            if (activeTextBlock) {
              controller.enqueue(encoder.encode(
                createAnthropicSSE('content_block_stop', { type: 'content_block_stop', index: contentBlockIndex - 1 })
              ))
              activeTextBlock = false
            }
            for (const [idx] of activeToolBlocks) {
              controller.enqueue(encoder.encode(
                createAnthropicSSE('content_block_stop', { type: 'content_block_stop', index: idx })
              ))
            }
            activeToolBlocks.clear()
            const stopReason =
              finishReason === 'tool_calls' ? 'tool_use' :
              finishReason === 'length' ? 'max_tokens' : 'end_turn'
            controller.enqueue(encoder.encode(
              createAnthropicSSE('message_delta', {
                type: 'message_delta',
                delta: { stop_reason: stopReason, stop_sequence: null },
                usage: { output_tokens: outputTokens },
              })
            ))
            controller.enqueue(encoder.encode(
              createAnthropicSSE('message_stop', { type: 'message_stop' })
            ))
          }
          continue
        }

        if (delta.content) {
          if (!activeTextBlock) {
            activeTextBlock = true
            controller.enqueue(encoder.encode(
              createAnthropicSSE('content_block_start', {
                type: 'content_block_start', index: contentBlockIndex,
                content_block: { type: 'text', text: '' },
              })
            ))
            contentBlockIndex++
          }
          controller.enqueue(encoder.encode(
            createAnthropicSSE('content_block_delta', {
              type: 'content_block_delta', index: contentBlockIndex - 1,
              delta: { type: 'text_delta', text: delta.content },
            })
          ))
        }

        if (delta.tool_calls) {
          if (activeTextBlock) {
            controller.enqueue(encoder.encode(
              createAnthropicSSE('content_block_stop', { type: 'content_block_stop', index: contentBlockIndex - 1 })
            ))
            activeTextBlock = false
          }
          for (const tc of delta.tool_calls) {
            const toolIdx = contentBlockIndex + (tc.index ?? 0)
            if (tc.id && tc.function?.name) {
              activeToolBlocks.set(toolIdx, { id: tc.id, name: tc.function.name, argBuffer: '' })
              controller.enqueue(encoder.encode(
                createAnthropicSSE('content_block_start', {
                  type: 'content_block_start', index: toolIdx,
                  content_block: { type: 'tool_use', id: tc.id, name: tc.function.name, input: {} },
                })
              ))
              if (toolIdx >= contentBlockIndex) contentBlockIndex = toolIdx + 1
            }
            if (tc.function?.arguments) {
              const tb = activeToolBlocks.get(toolIdx)
              if (tb) tb.argBuffer += tc.function.arguments
              controller.enqueue(encoder.encode(
                createAnthropicSSE('content_block_delta', {
                  type: 'content_block_delta', index: toolIdx,
                  delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
                })
              ))
            }
          }
        }
      }
    },

    flush(controller) {
      if (activeTextBlock) {
        controller.enqueue(encoder.encode(
          createAnthropicSSE('content_block_stop', { type: 'content_block_stop', index: contentBlockIndex - 1 })
        ))
      }
      for (const [idx] of activeToolBlocks) {
        controller.enqueue(encoder.encode(
          createAnthropicSSE('content_block_stop', { type: 'content_block_stop', index: idx })
        ))
      }
      if (sentStart) {
        controller.enqueue(encoder.encode(
          createAnthropicSSE('message_delta', {
            type: 'message_delta',
            delta: { stop_reason: 'end_turn', stop_sequence: null },
            usage: { output_tokens: outputTokens },
          })
        ))
        controller.enqueue(encoder.encode(
          createAnthropicSSE('message_stop', { type: 'message_stop' })
        ))
      }
    },
  })
}

// ─── Main adapter ────────────────────────────────────────────────────

export function createOpenAICompatFetch(innerFetch: FetchFn): FetchFn {
  const completionsUrl = getOpenAIBaseUrl() + '/chat/completions'
  const apiKey = getApiKey()

  return async (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    const isMessages = /\/v1\/messages\b/.test(url)
    if (!isMessages) return innerFetch(input, init)

    let body: any
    try {
      const raw = init?.body
      body = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (!body || typeof body !== 'object') return innerFetch(input, init)
    } catch {
      return innerFetch(input, init)
    }

    const isCountTokens = url.includes('count_tokens')
    if (isCountTokens) {
      return new Response(JSON.stringify({
        input_tokens: Math.ceil(flattenContentToString(body.messages?.[0]?.content).length / 4),
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }

    const isStreaming = body.stream === true
    const openaiBody = buildOpenAIBody(body)
    const model = body.model || 'unknown'

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }

    const resp = await innerFetch(completionsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(openaiBody),
      signal: (init as any)?.signal,
    })

    if (!resp.ok) {
      const errBody = await resp.text()
      let errJson: any
      try { errJson = JSON.parse(errBody) } catch {}

      return new Response(JSON.stringify({
        type: 'error',
        error: {
          type: resp.status === 401 ? 'authentication_error' :
                resp.status === 429 ? 'rate_limit_error' :
                resp.status === 404 ? 'not_found_error' : 'api_error',
          message: errJson?.error?.message || errBody || `API error ${resp.status}`,
        },
      }), { status: resp.status, headers: { 'content-type': 'application/json' } })
    }

    if (!isStreaming) {
      const openaiJson = await resp.json()
      const anthropicJson = translateNonStreamingResponse(openaiJson, model)
      return new Response(JSON.stringify(anthropicJson), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'request-id': resp.headers.get('x-request-id') || `req_${Date.now()}`,
        },
      })
    }

    if (!resp.body) {
      return new Response('', { status: 200, headers: { 'content-type': 'text/event-stream' } })
    }

    const translator = createStreamingTranslator(model)
    const transformed = resp.body.pipeThrough(translator)
    return new Response(transformed, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'request-id': resp.headers.get('x-request-id') || `req_${Date.now()}`,
      },
    })
  }
}

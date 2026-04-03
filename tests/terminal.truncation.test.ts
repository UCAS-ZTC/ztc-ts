import { describe, expect, test } from 'bun:test'
import { stringWidth } from '../src/ink/stringWidth.js'
import { renderTruncatedContent } from '../src/utils/terminal.js'

function extractRemainingLines(output: string): number | null {
  const matched = output.match(/\+(\d+) lines/)
  if (!matched) return null
  return Number(matched[1])
}

describe('renderTruncatedContent', () => {
  test('does not show folded tail for short content', () => {
    const output = renderTruncatedContent('第一行\n第二行', 80, true)
    expect(extractRemainingLines(output)).toBeNull()
  })

  test('estimates remaining lines correctly for CJK text', () => {
    const terminalWidth = 80
    const wrapWidth = Math.max(terminalWidth - 10, 10)
    const content = '你'.repeat(1000)
    const expected = Math.ceil(stringWidth(content) / wrapWidth) - 3

    const output = renderTruncatedContent(content, terminalWidth, true)
    const remaining = extractRemainingLines(output)

    expect(remaining).not.toBeNull()
    expect(remaining).toBe(expected)
  })
})

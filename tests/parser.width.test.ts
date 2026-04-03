import { describe, expect, test } from 'bun:test'
import { Parser } from '../src/ink/termio/parser.js'
import { stringWidth } from '../src/ink/stringWidth.js'

function parserWidth(input: string): number {
  const parser = new Parser()
  const actions = parser.feed(input)
  let width = 0

  for (const action of actions) {
    if (action.type !== 'text') continue
    for (const grapheme of action.graphemes) {
      width += grapheme.width
    }
  }

  return width
}

describe('termio parser grapheme width', () => {
  test('matches stringWidth for common mixed-width samples', () => {
    const samples = ['a\u0301', '你', '❤️', '👨‍👩‍👧‍👦', 'A你B', 'e\u0301你']

    for (const sample of samples) {
      expect(parserWidth(sample)).toBe(stringWidth(sample))
    }
  })
})

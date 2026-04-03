import { describe, expect, test } from 'bun:test'
import packageJson from '../package.json'
import { readFileSync } from 'fs'

describe('package scripts', () => {
  test('start script runs entrypoint directly (without nested bun run)', () => {
    expect(packageJson.scripts.start).toContain('src/entrypoints/cli.tsx')
    expect(packageJson.scripts.start).not.toContain(' run src/entrypoints/cli.tsx')
  })

  test('start.sh optional env vars are referenced safely under nounset', () => {
    const startScript = readFileSync('/root/project/CC/claude-code-ts/start.sh', 'utf8')

    expect(startScript).toContain('${ANTHROPIC_BASE_URL:-}')
    expect(startScript).toContain('${ANTHROPIC_MODEL:-}')
    expect(startScript).toContain('${ANTHROPIC_API_KEY:-}')
  })

  test('start.sh keeps shell env values authoritative over .env defaults', () => {
    const startScript = readFileSync('/root/project/CC/claude-code-ts/start.sh', 'utf8')

    expect(startScript).toContain('HAS_ANTHROPIC_API_KEY')
    expect(startScript).toContain('PRESERVED_ANTHROPIC_BASE_URL')
    expect(startScript).toContain('PRESERVED_ANTHROPIC_MODEL')
  })

  test('start.sh enforces UTF-8 locale fallback for CJK safety', () => {
    const startScript = readFileSync('/root/project/CC/claude-code-ts/start.sh', 'utf8')

    expect(startScript).toContain("grep -Eqi 'utf-?8'")
    expect(startScript).toContain('C.UTF-8')
  })

  test('start.sh defaults UI locale to Chinese', () => {
    const startScript = readFileSync('/root/project/CC/claude-code-ts/start.sh', 'utf8')

    expect(startScript).toContain('CLAUDE_CODE_LOCALE')
    expect(startScript).toContain('zh-CN')
  })
})

import { describe, expect, test } from 'bun:test'

const cwd = '/root/project/CC/claude-code-ts'

describe('launchers smoke', () => {
  test('direct cli entrypoint prints version', () => {
    const proc = Bun.spawnSync(
      ['bun', '--preload', './shims/preload.ts', 'src/entrypoints/cli.tsx', '--version'],
      {
        cwd,
        env: {
          ...process.env,
        },
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )

    const stdout = new TextDecoder().decode(proc.stdout)
    const stderr = new TextDecoder().decode(proc.stderr)

    expect(proc.exitCode).toBe(0)
    expect(stderr).toBe('')
    expect(stdout).toContain('(Claude Code)')
  })

  test('start script does not leak API key fragments', () => {
    const key = 'sk-ant-1234567890abcdef'
    const proc = Bun.spawnSync(['bash', '-lc', './start.sh --version'], {
      cwd,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: key,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const stdout = new TextDecoder().decode(proc.stdout)
    const stderr = new TextDecoder().decode(proc.stderr)

    expect(proc.exitCode).toBe(0)
    expect(stderr).toBe('')
    expect(stdout).toContain('API 密钥: 已配置')
    expect(stdout).not.toContain('12345678')
    expect(stdout).not.toContain('abcdef')
  })

  test('start script allows --help without API key', () => {
    const proc = Bun.spawnSync(['bash', '-lc', 'unset ANTHROPIC_API_KEY; ./start.sh --help'], {
      cwd,
      env: {
        ...process.env,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const stdout = new TextDecoder().decode(proc.stdout)
    const stderr = new TextDecoder().decode(proc.stderr)

    expect(proc.exitCode).toBe(0)
    expect(stderr).toBe('')
    expect(stdout).toContain('Usage: claude')
  })

  test('start script normalizes trailing /v1 from ANTHROPIC_BASE_URL', () => {
    const proc = Bun.spawnSync(['bash', '-lc', './start.sh --version'], {
      cwd,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: 'sk-ant-smoke',
        ANTHROPIC_BASE_URL: 'https://example-proxy.test/v1',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const stdout = new TextDecoder().decode(proc.stdout)
    const stderr = new TextDecoder().decode(proc.stderr)

    expect(proc.exitCode).toBe(0)
    expect(stderr).toBe('')
    expect(stdout).toContain('已规范化 ANTHROPIC_BASE_URL -> https://example-proxy.test')
    expect(stdout).toContain('代理地址: https://example-proxy.test')
    expect(stdout).not.toContain('代理地址: https://example-proxy.test/v1')
  })

  test('cli help prefers Chinese text when locale is zh-CN', () => {
    const proc = Bun.spawnSync(['bash', '-lc', 'CLAUDE_CODE_LOCALE=zh-CN ./start.sh --help'], {
      cwd,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: 'sk-ant-smoke',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const stdout = new TextDecoder().decode(proc.stdout)
    const stderr = new TextDecoder().decode(proc.stderr)

    expect(proc.exitCode).toBe(0)
    expect(stderr).toBe('')
    expect(stdout).toContain('你的提示词')
    expect(stdout).toContain('显示命令帮助')
  })
})

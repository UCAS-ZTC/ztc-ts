import { describe, expect, test } from 'bun:test'
import packageJson from '../package.json'

describe('package scripts', () => {
  test('start script runs entrypoint directly (without nested bun run)', () => {
    expect(packageJson.scripts.start).toContain('src/entrypoints/cli.tsx')
    expect(packageJson.scripts.start).not.toContain(' run src/entrypoints/cli.tsx')
  })
})

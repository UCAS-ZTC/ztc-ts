import { buildTool } from '../../Tool.js'

export const TungstenTool = buildTool({
  name: 'tungsten',
  async description() {
    return 'Tungsten virtual terminal tool (not available in local build)'
  },
  async prompt() {
    return ''
  },
  isEnabled() {
    return false
  },
  userFacingName() {
    return 'Tungsten'
  },
  async call() {
    return {
      type: 'text' as const,
      text: 'Tungsten tool is not available in this local build.',
    }
  },
})

export function clearTungstenCache() {}

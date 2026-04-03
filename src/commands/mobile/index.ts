import type { Command } from '../../commands.js'

const mobile = {
  type: 'local-jsx',
  name: 'mobile',
  aliases: ['ios', 'android'],
  description: '显示 Claude 移动应用下载二维码',
  load: () => import('./mobile.js'),
} satisfies Command

export default mobile

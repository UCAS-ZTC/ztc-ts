import { getInitialSettings } from '../utils/settings/settings.js'

export function getSpinnerVerbs(): string[] {
  const settings = getInitialSettings()
  const config = settings.spinnerVerbs
  if (!config) {
    return SPINNER_VERBS
  }
  if (config.mode === 'replace') {
    return config.verbs.length > 0 ? config.verbs : SPINNER_VERBS
  }
  return [...SPINNER_VERBS, ...config.verbs]
}

// Spinner verbs for loading messages
export const SPINNER_VERBS = [
  '构思中',
  '编织中',
  '酝酿中',
  '架构中',
  '烘焙中',
  '推演中',
  '探索中',
  '计算中',
  '编排中',
  '搅拌中',
  '组合中',
  '沉思中',
  '创作中',
  '烹饪中',
  '锻造中',
  '生成中',
  '酿造中',
  '构建中',
  '编码中',
  '合成中',
  '调配中',
  '凝聚中',
  '孵化中',
  '编织中',
  '描绘中',
  '打磨中',
  '推理中',
  '冶炼中',
  '调和中',
  '雕琢中',
  '织就中',
  '凝练中',
  '点化中',
  '熔铸中',
  '思索中',
  '运算中',
  '规划中',
  '调试中',
  '处理中',
  '整合中',
]

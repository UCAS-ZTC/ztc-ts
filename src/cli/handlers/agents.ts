/**
 * Agents subcommand handler — prints the list of configured agents.
 * Dynamically imported only when `claude agents` runs.
 */

import {
  AGENT_SOURCE_GROUPS,
  compareAgentsByName,
  getOverrideSourceLabel,
  type ResolvedAgent,
  resolveAgentModelDisplay,
  resolveAgentOverrides,
} from '../../tools/AgentTool/agentDisplay.js'
import {
  getActiveAgentsFromList,
  getAgentDefinitionsWithOverrides,
} from '../../tools/AgentTool/loadAgentsDir.js'
import { getCwd } from '../../utils/cwd.js'
import { uiText } from '../../utils/uiLocale.js'

function formatAgent(agent: ResolvedAgent): string {
  const model = resolveAgentModelDisplay(agent)
  const parts = [agent.agentType]
  if (model) {
    parts.push(model)
  }
  if (agent.memory) {
    parts.push(
      uiText(`${agent.memory} memory`, `${agent.memory} 记忆`),
    )
  }
  return parts.join(' · ')
}

export async function agentsHandler(): Promise<void> {
  const cwd = getCwd()
  const { allAgents } = await getAgentDefinitionsWithOverrides(cwd)
  const activeAgents = getActiveAgentsFromList(allAgents)
  const resolvedAgents = resolveAgentOverrides(allAgents, activeAgents)

  const lines: string[] = []
  let totalActive = 0

  for (const { label, source } of AGENT_SOURCE_GROUPS) {
    const groupAgents = resolvedAgents
      .filter(a => a.source === source)
      .sort(compareAgentsByName)

    if (groupAgents.length === 0) continue

    lines.push(`${label}:`)
    for (const agent of groupAgents) {
      if (agent.overriddenBy) {
        const winnerSource = getOverrideSourceLabel(agent.overriddenBy)
        lines.push(
          uiText(
            `  (shadowed by ${winnerSource}) ${formatAgent(agent)}`,
            `  （被 ${winnerSource} 覆盖）${formatAgent(agent)}`,
          ),
        )
      } else {
        lines.push(`  ${formatAgent(agent)}`)
        totalActive++
      }
    }
    lines.push('')
  }

  if (lines.length === 0) {
    // biome-ignore lint/suspicious/noConsole:: intentional console output
    console.log(uiText('No agents found.', '未找到任何 agent。'))
  } else {
    // biome-ignore lint/suspicious/noConsole:: intentional console output
    console.log(
      uiText(
        `${totalActive} active agents\n`,
        `当前激活 ${totalActive} 个 agent\n`,
      ),
    )
    // biome-ignore lint/suspicious/noConsole:: intentional console output
    console.log(lines.join('\n').trimEnd())
  }
}

import React from 'react'
import { describe, expect, test } from 'bun:test'
import { DiscoverPluginsKeyHint, EmptyStateMessage } from '../src/commands/plugin/DiscoverPlugins.js'
import { PluginTrustWarning } from '../src/commands/plugin/PluginTrustWarning.js'
import { MCPAgentServerErrorMessage } from '../src/components/mcp/MCPAgentServerMenu.js'
import { MCPListPanelFooter } from '../src/components/mcp/MCPListPanel.js'
import { MCPToolListEmptyState } from '../src/components/mcp/MCPToolListView.js'
import { renderToString } from '../src/utils/staticRender.js'

function normalizeOutput(output: string): string {
  return output
    .replaceAll('\r\n', '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

describe('中文 UI 快照', () => {
  test('plugin 主菜单提示使用中文文案', async () => {
    const output = await renderToString(
      <DiscoverPluginsKeyHint hasSelection canToggle />,
      100,
    )

    const normalized = normalizeOutput(output)
    expect(normalized).toContain('安装')
    expect(normalized).toContain('输入即可搜索')
    expect(normalized).toContain('详情')
    expect(normalized).toMatchSnapshot()
  })

  test('plugin 空态使用中文文案', async () => {
    const output = await renderToString(
      <EmptyStateMessage reason="no-marketplaces-configured" />,
      100,
    )

    const normalized = normalizeOutput(output)
    expect(normalized).toContain('当前没有可用插件')
    expect(normalized).toContain('请先在“插件市场”页签添加插件市场')
    expect(normalized).toMatchSnapshot()
  })

  test('mcp 错误态使用中文文案', async () => {
    const output = await renderToString(
      <MCPAgentServerErrorMessage error="认证失败：网络不可达" />,
      100,
    )

    const normalized = normalizeOutput(output)
    expect(normalized).toContain('错误：')
    expect(normalized).toContain('认证失败：网络不可达')
    expect(normalized).toMatchSnapshot()
  })

  test('mcp 空态使用中文文案', async () => {
    const output = await renderToString(<MCPToolListEmptyState />, 100)
    const normalized = normalizeOutput(output)
    expect(normalized).toContain('暂无可用工具')
    expect(normalized).toMatchSnapshot()
  })

  test('plugin 信任提示使用中文文案', async () => {
    const output = await renderToString(<PluginTrustWarning />, 100)
    const normalized = normalizeOutput(output)
    expect(normalized).toContain('在安装、更新或使用插件之前')
    expect(normalized).toContain('更多信息请查看各插件主页')
    expect(normalized).toMatchSnapshot()
  })

  test('mcp 主菜单底部提示使用中文文案', async () => {
    const output = await renderToString(<MCPListPanelFooter />, 100)
    const normalized = normalizeOutput(output)
    expect(normalized).toContain('导航')
    expect(normalized).toContain('确认')
    expect(normalized).toContain('取消')
    expect(normalized).toMatchSnapshot()
  })
})

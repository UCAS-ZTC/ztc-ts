import { isChineseUiLocale } from './uiLocale.js'

const EXACT_TRANSLATIONS = new Map<string, string>([
  ['Loading…', '加载中…'],
  ['Loading...', '加载中…'],
  ['Installing…', '正在安装…'],
  ['Installing...', '正在安装…'],
  ['Running validation...', '正在执行校验...'],
  ['Status: ', '状态：'],
  ['Command: ', '命令：'],
  ['Args: ', '参数：'],
  ['Config location: ', '配置位置：'],
  ['Tools: ', '工具：'],
  ['Description:', '说明：'],
  ['Parameters:', '参数：'],
  ['(required)', '（必填）'],
  ['unknown', '未知'],
  ['View tools', '查看工具'],
  ['Reconnect', '重新连接'],
  ['Disable', '禁用'],
  ['Enable', '启用'],
  ['Back', '返回'],
  ['Open homepage', '打开主页'],
  ['View on GitHub', '在 GitHub 查看'],
  ['Back to plugin list', '返回插件列表'],
  ['Install for you (user scope)', '仅为你安装（user 作用域）'],
  ['Install for all collaborators on this repository (project scope)', '为当前仓库所有协作者安装（project 作用域）'],
  ['Install for you, in this repo only (local scope)', '仅在当前仓库为你安装（local 作用域）'],
  ['Re-authenticate', '重新认证'],
  ['Authenticate', '认证'],
  ['may need', '可能需要'],
  ['[read-only]', '[只读]'],
  [' [read-only]', ' [只读]'],
  ['[destructive]', '[高风险]'],
  [' [destructive]', ' [高风险]'],
  ['open-world', '开放网络'],
  ['Error', '错误'],
  ['Warning', '警告'],
  ['[Error]', '[错误]'],
  ['[Warning]', '[警告]'],
  ['connected', '已连接'],
  ['disabled', '已禁用'],
  ['connecting…', '连接中…'],
  ['connecting...', '连接中…'],
  ['failed', '失败'],
  ['not connected', '未连接'],
  ['authenticated', '已认证'],
  ['Discover plugins', '发现插件'],
  ['Discover Plugins', '发现插件'],
  ['Community Managed', '社区维护'],
  ['No plugins available.', '暂无可用插件。'],
  ['Git is required to install marketplaces.', '安装插件市场需要 Git。'],
  ['Please install git and restart Claude Code.', '请安装 Git 后重启 Claude Code。'],
  ['Your organization policy does not allow any external marketplaces.', '你的组织策略不允许添加外部插件市场。'],
  ['Contact your administrator.', '请联系管理员。'],
  ['Your organization restricts which marketplaces can be added.', '你的组织限制可添加的插件市场来源。'],
  ['Switch to the Marketplaces tab to view allowed sources.', '请切换到“插件市场”标签查看允许的来源。'],
  ['Failed to load marketplace data.', '加载插件市场数据失败。'],
  ['Check your network connection.', '请检查网络连接。'],
  ['All available plugins are already installed.', '所有可用插件均已安装。'],
  ['Check for new plugins later or add more marketplaces.', '可稍后再检查新插件，或添加更多插件市场。'],
  ['Add a marketplace first using the Marketplaces tab.', '请先在“插件市场”标签中添加插件市场。'],
  ['No marketplaces configured.', '尚未配置插件市场。'],
  ['Please enter a marketplace source', '请输入插件市场来源'],
  ['Invalid marketplace source format. Try: owner/repo, https://..., or ./path', '插件市场来源格式无效。可尝试：owner/repo、https://... 或 ./path'],
  ['For help configuring MCP servers, see: ', '有关 MCP 服务器配置，请参阅：'],
  ['Contains warnings', '包含警告'],
  ['Failed to parse', '解析失败'],
  ['No MCP servers configured. Please run /doctor if this is unexpected. Otherwise, run `claude mcp --help` or visit https://code.claude.com/docs/en/mcp to learn more.', '未配置 MCP 服务器。如果这不是预期，请运行 /doctor；否则可运行 `claude mcp --help` 或访问 https://code.claude.com/docs/en/mcp 了解更多。'],
  ['Restarting MCP server process', '正在重启 MCP 服务器进程'],
  ['Establishing connection to MCP server', '正在建立 MCP 服务器连接'],
  ['This may take a few moments.', '这可能需要一些时间。'],
  ['agent-only', '仅 Agent 可用'],
  ['[Failed to parse] ', '[解析失败] '],
  ['[Contains warnings] ', '[包含警告] '],
  ['Press Enter to continue', '按 Enter 继续'],
  ['read-only', '只读'],
  ['go back', '返回'],
  ['back', '返回'],
  ['navigate', '导航'],
  ['select', '选择'],
  ['confirm', '确认'],
  ['details', '详情'],
  ['toggle', '切换'],
  ['install', '安装'],
  ['update', '更新'],
  ['remove', '移除'],
  ['apply changes', '应用更改'],
  ['cancel', '取消'],
])

type PatternRule = {
  regex: RegExp
  translate: (match: RegExpMatchArray) => string
}

const PATTERN_TRANSLATIONS: PatternRule[] = [
  {
    regex: /^Press (.+) again to exit$/,
    translate: match => `再次按 ${match[1]} 退出`,
  },
  {
    regex: /^Error: (.+)$/,
    translate: match => `错误：${match[1]}`,
  },
  {
    regex: /^Warning: (.+)$/,
    translate: match => `警告：${match[1]}`,
  },
  {
    regex: /^Reconnecting to (.+)$/,
    translate: match => `正在重连 ${match[1]}`,
  },
  {
    regex: /^Authenticating with (.+)…$/,
    translate: match => `正在与 ${match[1]} 进行认证…`,
  },
  {
    regex: /^Successfully reconnected to (.+)$/,
    translate: match => `已成功重连到 ${match[1]}`,
  },
  {
    regex: /^Failed to reconnect to (.+)$/,
    translate: match => `重连到 ${match[1]} 失败`,
  },
  {
    regex: /^MCP server "(.+)" not found$/,
    translate: match => `未找到 MCP 服务器 "${match[1]}"`,
  },
  {
    regex: /^(.+) requires authentication$/,
    translate: match => `${match[1]} 需要认证`,
  },
  {
    regex: /^(.+) requires authentication\. Use \/mcp to authenticate\.$/,
    translate: match => `${match[1]} 需要认证。请使用 /mcp 完成认证。`,
  },
  {
    regex: /^Failed to (enable|disable) MCP server '(.+)': (.+)$/,
    translate: match =>
      `无法${match[1] === 'enable' ? '启用' : '禁用'} MCP 服务器 "${match[2]}"：${match[3]}`,
  },
  {
    regex: /^Authentication successful\. Connected to (.+)\.$/,
    translate: match => `认证成功。已连接到 ${match[1]}。`,
  },
  {
    regex: /^Authentication successful\. Reconnected to (.+)\.$/,
    translate: match => `认证成功。已重新连接到 ${match[1]}。`,
  },
  {
    regex:
      /^Authentication successful, but server still requires authentication\. You may need to manually restart Claude Code\.$/,
    translate: () =>
      '认证成功，但服务器仍要求认证。你可能需要手动重启 Claude Code。',
  },
  {
    regex:
      /^Authentication successful, but server reconnection failed\. You may need to manually restart Claude Code for the changes to take effect\.$/,
    translate: () =>
      '认证成功，但服务器重连失败。你可能需要手动重启 Claude Code 以使更改生效。',
  },
  {
    regex: /^Disconnected from (.+)\.$/,
    translate: match => `已从 ${match[1]} 断开连接。`,
  },
  {
    regex: /^Connected to (.+)\.$/,
    translate: match => `已连接到 ${match[1]}。`,
  },
  {
    regex: /^Authentication successful for (.+)\. The server will connect when the agent runs\.$/,
    translate: match => `已完成 ${match[1]} 的认证。服务器会在 Agent 运行时连接。`,
  },
  {
    regex: /^Updating marketplace…$/,
    translate: () => '正在更新插件市场…',
  },
  {
    regex: /^Processing changes…$/,
    translate: () => '正在处理更改…',
  },
  {
    regex: /^✓ Installed (\d+) plugins?\. Run \/reload-plugins to activate\.$/,
    translate: match => `✓ 已安装 ${match[1]} 个插件。请运行 /reload-plugins 激活。`,
  },
  {
    regex: /^Plugin "(.+)" not found in any marketplace$/,
    translate: match => `在所有插件市场中均未找到插件 "${match[1]}"`,
  },
  {
    regex: /^Marketplace "(.+)" not found$/,
    translate: match => `未找到插件市场 "${match[1]}"`,
  },
  {
    regex: /^Failed to load marketplace: (.+)$/,
    translate: match => `加载插件市场失败：${match[1]}`,
  },
  {
    regex: /^Failed to load plugins$/,
    translate: () => '加载插件失败',
  },
  {
    regex: /^✓ Installed and configured (.+)\. Run \/reload-plugins to apply\.$/,
    translate: match => `✓ 已安装并完成配置 ${match[1]}。请运行 /reload-plugins 生效。`,
  },
  {
    regex: /^✓ Installed (.+)\. Run \/reload-plugins to apply\.$/,
    translate: match => `✓ 已安装 ${match[1]}。请运行 /reload-plugins 生效。`,
  },
  {
    regex: /^Installed but failed to save config: (.+)$/,
    translate: match => `已安装，但保存配置失败：${match[1]}`,
  },
]

export function localizeUiTextFallback(text: string): string {
  if (!isChineseUiLocale() || text.length === 0) {
    return text
  }

  const exactMatch = EXACT_TRANSLATIONS.get(text)
  if (exactMatch) {
    return exactMatch
  }

  for (const rule of PATTERN_TRANSLATIONS) {
    const match = text.match(rule.regex)
    if (match) {
      return rule.translate(match)
    }
  }

  return text
}

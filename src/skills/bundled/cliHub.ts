import { registerBundledSkill } from '../bundledSkills.js'
import { REGISTRY_JSON_CONTENT } from './registryContent.js'

const PROMPT = `# CLI-Hub — 发现并安装 Agent 原生 CLI 工具

CLI-Hub 是一个 agent 原生的 CLI 工具市场，让你能操控专业 GUI 软件（图像编辑、3D 建模、视频制作、音频处理、浏览器自动化、本地 AI 等）。

## 在线目录

**URL**: https://hkuds.github.io/CLI-Anything/SKILL.txt

该目录自动更新，包含所有可用 CLI 的完整列表、分类、安装命令和使用说明。

## 本地注册表

此技能的基础目录中包含 \`registry.json\`，内含所有 CLI 工具的结构化数据（名称、分类、安装命令、SKILL.md 路径等）。可直接 Read 该文件获取完整列表。

## 可用工具分类

- **创意工作流**: GIMP (图像编辑)、Blender (3D 建模)、Inkscape (矢量图形)、Krita (数字绘画)、Shotcut/Kdenlive (视频编辑)、Audacity (音频处理)、MuseScore (乐谱)、DrawIO (流程图)
- **生产力工具**: LibreOffice (办公套件)、Zotero (文献管理)、Mubu (知识管理)、OBS Studio (直播)
- **AI 平台**: Ollama (本地 LLM)、ComfyUI (图像生成)、AnyGen (AI API)、Novita (AI 服务)、NotebookLM (研究助手)
- **通信协作**: Zoom (视频会议)
- **开发工具**: Browser/DOMShell (浏览器自动化)、Mermaid (流程图生成)、WireMock (API Mock)
- **其他**: AdGuard Home (网络管理)、FreeCad (CAD)、CloudCompare (点云处理)、RenderDoc (图形调试)

## 如何使用

1. **获取目录**: Read 基础目录中的 \`registry.json\`，或用 WebFetch 抓取在线目录
2. **按类查找**: 在目录中浏览你需要的工具
3. **安装**: 使用提供的 pip install 命令

\`\`\`bash
pip install git+https://github.com/HKUDS/CLI-Anything.git#subdirectory=<software>/agent-harness
\`\`\`

4. **使用**: 所有 CLI 工具统一支持 \`--json\` 标志以获取机器可读输出

\`\`\`bash
cli-anything-<software> --json <command> [options]
\`\`\`

## 约定

- 所有工具入口为 \`cli-anything-<software>\`
- 无参数运行进入交互式 REPL
- \`--json\` 标志输出 JSON 格式结果，适合 agent 解析
- 每个工具调用真实软件后端，不是模拟或重实现
- 仓库: https://github.com/HKUDS/CLI-Anything
`

export function registerCliHubSkill(): void {
  registerBundledSkill({
    name: 'cli-hub',
    description:
      '发现并安装 agent 原生 CLI 工具（GIMP、Blender、浏览器、Ollama 等 30+ 个专业软件的命令行接口）。',
    whenToUse:
      '当用户需要操控 GUI 专业软件（图像处理、3D 建模、视频编辑、音频处理、浏览器自动化、本地 AI 推理等）时，使用此技能发现并安装对应的 CLI 工具。',
    userInvocable: true,
    disableModelInvocation: false,
    files: {
      'registry.json': REGISTRY_JSON_CONTENT,
    },
    async getPromptForCommand(_args) {
      return [{ type: 'text', text: PROMPT }]
    },
  })
}

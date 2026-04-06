import { registerBundledSkill } from '../bundledSkills.js'
import { HARNESS_MD_CONTENT } from './harnessContent.js'

const HARNESS_METHODOLOGY = `# CLI-Anything: 将 GUI 软件转化为 Agent 原生 CLI

你是一个 CLI harness 构建专家。按照以下方法论为任意 GUI 软件创建生产级的命令行接口。

## 核心原则

1. **真实软件是硬依赖** — CLI 必须调用真实应用程序（LibreOffice, Blender, GIMP 等）进行渲染和导出。绝不在 Python 中重新实现渲染。
2. **操纵原生格式** — 直接解析和修改应用的原生项目文件（MLT XML, ODF, SVG 等）作为数据层。
3. **利用现有 CLI 工具** — 使用 \`libreoffice --headless\`、\`blender --background\`、\`melt\`、\`ffmpeg\` 等作为渲染子进程。
4. **JSON 输出模式** — 每个命令必须支持 \`--json\` 标志以供 agent 解析。
5. **统一 REPL 界面** — 使用 ReplSkin 提供交互式模式，REPL 是默认行为。

## 7 阶段流水线

### Phase 1: 代码库分析
- 识别后端引擎（如 MLT for Shotcut, ImageMagick for GIMP）
- 将 GUI 动作映射到 API 调用
- 识别数据模型和文件格式
- 找到现有的 CLI 工具
- 编目命令/撤销系统

### Phase 2: CLI 架构设计
- 选择交互模型: 有状态 REPL + 子命令 CLI（推荐两者兼有）
- 定义命令分组: 项目管理、核心操作、导入/导出、配置、会话/状态管理
- 设计状态模型: 持久化策略、序列化格式（JSON 会话文件）
- 规划输出格式: 人类可读（表格、颜色）+ 机器可读（JSON），通过 \`--json\` 标志控制

### Phase 3: 实现
1. 数据层 — XML/JSON 项目文件操作
2. 探测/信息命令 — 让 agent 在修改前先检查
3. 变更命令 — 每个逻辑操作一个命令
4. 后端集成 — \`utils/<software>_backend.py\` 包装真实软件 CLI
5. 渲染/导出 — 生成有效中间文件，调用真实软件转换
6. 会话管理 — 状态持久化、撤销/重做
7. REPL + 统一皮肤 — 从 cli-anything-plugin 复制 \`repl_skin.py\`

### Phase 4: 测试计划 (TEST.md)
在写测试代码之前，创建 TEST.md 文件：测试清单、单元测试计划、E2E 测试计划、工作流场景。

### Phase 5: 测试实现
- 单元测试 (\`test_core.py\`) — 合成数据，无外部依赖
- E2E 测试 (\`test_full_e2e.py\`) — 真实文件，调用真实软件
- CLI 子进程测试 — 使用 \`_resolve_cli()\` 测试已安装命令
- 输出验证 — 魔术字节、格式校验、内容分析

### Phase 6: 测试文档 (TEST.md 续)
追加完整 pytest 输出、统计摘要、覆盖说明。

### Phase 6.5: SKILL.md 生成
生成 AI 可发现的技能定义文件：YAML frontmatter + 命令文档 + 使用示例。
输出到 \`cli_anything/<software>/skills/SKILL.md\`。

### Phase 7: PyPI 发布
- \`setup.py\` 使用 \`find_namespace_packages(include=["cli_anything.*"])\`
- 包名: \`cli-anything-<software>\`，命名空间: \`cli_anything.<software>\`
- \`cli_anything/\` 无 \`__init__.py\`（PEP 420 命名空间包）
- console_scripts 入口点安装到 PATH

## 目录结构

\`\`\`
<software>/
└── agent-harness/
    ├── <SOFTWARE>.md          # 软件特定分析和 SOP
    ├── setup.py               # PyPI 包配置
    └── cli_anything/          # 命名空间包（无 __init__.py）
        └── <software>/        # 子包（有 __init__.py）
            ├── <software>_cli.py  # 主 CLI 入口（Click + REPL）
            ├── core/              # 核心模块
            ├── utils/             # 工具函数 + 后端包装
            ├── skills/SKILL.md    # AI 可发现的技能定义
            └── tests/             # 测试套件 + TEST.md
\`\`\`

## 关键架构模式

### 渲染差距问题
GUI 应用在渲染时应用效果。当 CLI 操作项目文件时，必须处理渲染：
- 最佳: 使用应用原生渲染器（如 \`melt\` for MLT 项目）
- 次选: 构建过滤器翻译层（如 MLT 过滤器 → ffmpeg \`-filter_complex\`）
- 最后: 生成用户可手动运行的渲染脚本

### 软件后端集成示例

| 软件 | 后端 CLI | 原生格式 | 用法 |
|------|---------|---------|------|
| LibreOffice | \`libreoffice --headless\` | ODF ZIP | 生成 ODF → 转换为 PDF/DOCX |
| Blender | \`blender --background --python\` | .blend-cli.json | 生成 bpy 脚本 → 渲染 |
| GIMP | \`gimp -i -b '(script-fu ...)'\` | .xcf | Script-Fu 命令 → 处理导出 |
| Inkscape | \`inkscape --actions="..."\` | SVG XML | 操纵 SVG → 导出 PNG/PDF |
| Shotcut | \`melt\` / \`ffmpeg\` | MLT XML | 构建 MLT XML → 渲染视频 |
| Audacity | \`sox\` | .aup3 | 生成 sox 命令 → 处理音频 |

## 完整方法论参考

完整的 HARNESS.md 方法论文档已打包在此技能的基础目录中，使用 Read 工具读取 HARNESS.md 即可获取全部内容。

包含详细的：会话锁定、技能生成、PyPI 发布、MCP 后端、过滤器翻译、时间码精度等指南。
如需创建新的 CLI harness，请先完整阅读该文档。

## CLI-Anything 仓库

- 仓库: https://github.com/HKUDS/CLI-Anything
- 在线目录: https://hkuds.github.io/CLI-Anything/SKILL.txt
`

const MISSING_ARG_MESSAGE = `请提供要构建 CLI harness 的软件路径或仓库 URL。

用法:
  /cli-anything /path/to/software-source
  /cli-anything https://github.com/org/software

示例:
  /cli-anything /home/user/gimp
  /cli-anything https://github.com/blender/blender`

export function registerCliAnythingSkill(): void {
  registerBundledSkill({
    name: 'cli-anything',
    description:
      '将任意 GUI 软件转化为 agent 原生的命令行接口。遵循 HARNESS.md 方法论的 7 阶段流水线。',
    whenToUse:
      '当用户需要为某个 GUI 软件（如 GIMP、Blender、LibreOffice 等）创建新的 CLI harness 时使用。',
    argumentHint: '<software-path-or-repo>',
    userInvocable: true,
    disableModelInvocation: true,
    files: {
      'HARNESS.md': HARNESS_MD_CONTENT,
    },
    async getPromptForCommand(args) {
      const instruction = args.trim()
      if (!instruction) {
        return [{ type: 'text', text: MISSING_ARG_MESSAGE }]
      }
      return [{ type: 'text', text: HARNESS_METHODOLOGY }]
    },
  })
}

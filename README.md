# Claude Code Local

> 基于 Claude Code v2.1.89 源码的本地化改造版本。遥测移除、安全约束解锁、36+ 实验特性启用、CJK 中文显示优化。

## 快速开始

```bash
# 设置 API Key
export ANTHROPIC_API_KEY="sk-ant-xxx"

# 启动（首次自动安装依赖）
./start.sh
```

## 使用方式

### 交互模式（TUI）

```bash
./start.sh
./start.sh --dangerously-skip-permissions
```

### 非交互模式

```bash
./start.sh -p "your prompt" --dangerously-skip-permissions < /dev/null
```

### 指定模型

```bash
./start.sh --model claude-sonnet-4-6
./start.sh --model claude-opus-4-20250514
```

### 第三方代理

```bash
export ANTHROPIC_BASE_URL="https://your-proxy.com"   # 不含 /v1
export ANTHROPIC_API_KEY="your-key"

# start.sh 会自动检测代理并禁用不兼容功能
./start.sh
```

如需手动控制：

```bash
export DISABLE_PROMPT_CACHING=1
export DISABLE_INTERLEAVED_THINKING=1
export CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1
```

## 构建

除了直接从源码运行（`./start.sh`），还可编译为独立二进制：

```bash
bun run build       # 生成 ./cli
bun run build:dev   # 生成 ./cli-dev（开发版本戳）
bun run compile     # 生成 ./dist/cli
```

## 与上游的差异

本项目基于 claude-code-ts 源码快照，融合了 free-code 和 start-claude-code 的最佳实践：

### 遥测移除（来自 free-code）

- Analytics（Datadog、1P Event Logger）→ noop stub
- OpenTelemetry instrumentation → disabled
- Session/Beta tracing → noop spans
- GrowthBook → 本地默认值，不拉远程配置

### 安全约束解除（来自 free-code）

- `CYBER_RISK_INSTRUCTION` 置空（模型自身的安全训练仍生效）

### Feature Flags（两者融合）

采用运行时选择性启用（非全关），通过 `shims/bun-bundle.ts` 控制：

| 状态 | 数量 | 示例 |
|------|------|------|
| 启用 | 36+ | ULTRAPLAN, ULTRATHINK, TOKEN_BUDGET, VERIFICATION_AGENT, WEB_BROWSER_TOOL... |
| 禁用（缺失文件） | 7 | COORDINATOR_MODE, SSH_REMOTE, TEMPLATES... |
| 禁用（需 OAuth） | 5 | BRIDGE_MODE, CCR_*... |
| 禁用（平台限制） | 3 | VOICE_MODE, NATIVE_CLIPBOARD... |

可在 `shims/bun-bundle.ts` 中自由调整。设置环境变量 `CLAUDE_CODE_ENABLE_ALL_FEATURES=1` 可启用所有。

### 代理自动检测（来自 start-claude-code）

`start.sh` 检测到非 Anthropic 域名时自动设置：
- `DISABLE_PROMPT_CACHING=1`
- `DISABLE_INTERLEAVED_THINKING=1`
- `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1`

### CJK 中文显示优化

- 新增 `padEndVisual` / `padStartVisual` 按终端列宽对齐（非码元数）
- 修复 MCPTool、Feed、Stats、ResumeTask 等组件的 CJK 列错位
- 修复 ShimmeredInput 对 emoji 代理对的错误拆分

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | API 密钥 | - |
| `ANTHROPIC_BASE_URL` | API 基础 URL（不含 `/v1`） | `https://api.anthropic.com` |
| `ANTHROPIC_MODEL` | 默认模型 | `claude-sonnet-4-6` |
| `DISABLE_PROMPT_CACHING` | 禁用 prompt 缓存 | `0` |
| `DISABLE_INTERLEAVED_THINKING` | 禁用交错思考 | `0` |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | 禁用实验 beta 头 | `0` |
| `CLAUDE_CODE_ENABLE_ALL_FEATURES` | 启用所有 feature flags | `0` |

## DIY 指南

### 调整 Feature Flags

编辑 `shims/bun-bundle.ts`：
- `ENABLED_FEATURES` → 运行时启用的特性
- `DISABLED_FEATURES` → 运行时禁用的特性
- 未在两个集合中的 flag 受 `CLAUDE_CODE_ENABLE_ALL_FEATURES` 控制

### 修改系统提示

- `src/constants/prompts.ts` — 主系统提示模板
- `src/constants/cyberRiskInstruction.ts` — 安全约束（已清空）
- `src/utils/systemPrompt.ts` — 系统提示构建逻辑

### 添加/修改工具

- `src/tools/` — 各工具实现
- `src/tools.ts` — 工具注册表
- `src/commands/` — 斜杠命令实现
- `src/commands.ts` — 命令注册表

## 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | Bun |
| 语言 | TypeScript |
| 终端 UI | React + Ink |
| CLI | Commander.js |
| API | Anthropic SDK |
| 代码搜索 | ripgrep |
| 协议 | MCP, LSP |

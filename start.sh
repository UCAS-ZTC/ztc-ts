#!/usr/bin/env bash
#
# Claude Code Local - Unified Launcher
#
# Usage:
#   ./start.sh                          # Interactive TUI
#   ./start.sh -p "your prompt"         # Non-interactive
#   ./start.sh --help                   # Show help
#   ./start.sh --model claude-sonnet-4-6  # Specify model
#

set -euo pipefail

SCRIPT="$0"
[ -L "$SCRIPT" ] && SCRIPT="$(readlink -f "$SCRIPT")"
DIR="$(cd "$(dirname "$SCRIPT")" && pwd)"
cd "$DIR"

export PATH="$HOME/.bun/bin:$PATH"

# ─── Load .env if present ─────────────────────────────────────────────
if [ -f "$DIR/.env" ]; then
  set -a
  source "$DIR/.env"
  set +a
fi

# ─── Check Bun ────────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  echo "Error: Bun runtime not found."
  echo ""
  echo "  curl -fsSL https://bun.sh/install | bash"
  echo ""
  exit 1
fi

# ─── Check dependencies ──────────────────────────────────────────────
if [ ! -d "node_modules/@anthropic-ai/sdk" ]; then
  echo "First run: installing dependencies..."
  bun install
  echo ""
fi

# ─── Check API key ───────────────────────────────────────────────────
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Error: ANTHROPIC_API_KEY is not set."
  echo ""
  echo "  export ANTHROPIC_API_KEY=\"sk-ant-xxx\""
  echo ""
  echo "Or for third-party proxies:"
  echo ""
  echo "  export ANTHROPIC_BASE_URL=\"https://your-proxy.com\""
  echo "  export ANTHROPIC_API_KEY=\"your-key\""
  echo ""
  exit 1
fi

# ─── Auto-detect third-party proxy ───────────────────────────────────
if [ -n "$ANTHROPIC_BASE_URL" ] && ! echo "$ANTHROPIC_BASE_URL" | grep -q "anthropic.com"; then
  export DISABLE_PROMPT_CACHING="${DISABLE_PROMPT_CACHING:-1}"
  export DISABLE_INTERLEAVED_THINKING="${DISABLE_INTERLEAVED_THINKING:-1}"
  export CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS="${CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS:-1}"
fi

# ─── Disable telemetry & auto-updater ────────────────────────────────
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="${CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:-1}"
export DISABLE_TELEMETRY="${DISABLE_TELEMETRY:-1}"
export CLAUDE_CODE_DISABLE_AUTOUPDATER="${CLAUDE_CODE_DISABLE_AUTOUPDATER:-1}"

# ─── Show startup config ─────────────────────────────────────────────
IS_OPENAI_COMPAT=""
if [ -n "$ANTHROPIC_BASE_URL" ] && ! echo "$ANTHROPIC_BASE_URL" | grep -q "anthropic.com"; then
  IS_OPENAI_COMPAT="1"
fi

echo "┌─────────────────────────────────────────────┐"
echo "│  Claude Code Local v2.1.89                   │"
echo "├─────────────────────────────────────────────┤"
echo "│  API 密钥: 已配置"
if [ -n "$ANTHROPIC_BASE_URL" ]; then
  echo "│  代理地址: $ANTHROPIC_BASE_URL"
fi
if [ -n "$ANTHROPIC_MODEL" ]; then
  echo "│  模型: $ANTHROPIC_MODEL"
fi
if [ -n "$IS_OPENAI_COMPAT" ]; then
  echo "│  API 模式: OpenAI 兼容（自动适配）"
fi
echo "└─────────────────────────────────────────────┘"
echo ""

exec bun --preload "$DIR/shims/preload.ts" "$DIR/src/entrypoints/cli.tsx" "$@"

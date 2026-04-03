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
export CLAUDE_CODE_LOCALE="${CLAUDE_CODE_LOCALE:-zh-CN}"

contains_arg() {
  local target="$1"
  shift || true
  for arg in "$@"; do
    if [ "$arg" = "$target" ]; then
      return 0
    fi
  done
  return 1
}

# ─── Load .env if present ─────────────────────────────────────────────
# Keep shell-provided values authoritative; .env should only provide defaults.
HAS_ANTHROPIC_API_KEY=0
HAS_ANTHROPIC_BASE_URL=0
HAS_ANTHROPIC_MODEL=0
if [ "${ANTHROPIC_API_KEY+x}" = x ]; then
  HAS_ANTHROPIC_API_KEY=1
  PRESERVED_ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
fi
if [ "${ANTHROPIC_BASE_URL+x}" = x ]; then
  HAS_ANTHROPIC_BASE_URL=1
  PRESERVED_ANTHROPIC_BASE_URL="$ANTHROPIC_BASE_URL"
fi
if [ "${ANTHROPIC_MODEL+x}" = x ]; then
  HAS_ANTHROPIC_MODEL=1
  PRESERVED_ANTHROPIC_MODEL="$ANTHROPIC_MODEL"
fi

if [ -f "$DIR/.env" ]; then
  set -a
  source "$DIR/.env"
  set +a
fi

if [ "$HAS_ANTHROPIC_API_KEY" -eq 1 ]; then
  export ANTHROPIC_API_KEY="$PRESERVED_ANTHROPIC_API_KEY"
fi
if [ "$HAS_ANTHROPIC_BASE_URL" -eq 1 ]; then
  export ANTHROPIC_BASE_URL="$PRESERVED_ANTHROPIC_BASE_URL"
fi
if [ "$HAS_ANTHROPIC_MODEL" -eq 1 ]; then
  export ANTHROPIC_MODEL="$PRESERVED_ANTHROPIC_MODEL"
fi

# ─── Enforce UTF-8 locale for CJK rendering stability ─────────────────────
LOCALE_PROBE="${LC_ALL:-${LC_CTYPE:-${LANG:-}}}"
if ! printf '%s' "$LOCALE_PROBE" | grep -Eqi 'utf-?8'; then
  export LANG="${LANG:-C.UTF-8}"
  export LC_ALL="${LC_ALL:-C.UTF-8}"
  echo "提示：检测到非 UTF-8 语言环境，已强制设置 LANG/LC_ALL 为 C.UTF-8 以保证中文显示稳定。"
fi

# ─── Normalize API base URL (strip trailing /v1) ──────────────────────────
if [ -n "${ANTHROPIC_BASE_URL:-}" ]; then
  NORMALIZED_BASE_URL="$(printf '%s' "${ANTHROPIC_BASE_URL:-}" | sed -E 's#/v1/?$##')"
  if [ "$NORMALIZED_BASE_URL" != "${ANTHROPIC_BASE_URL:-}" ]; then
    export ANTHROPIC_BASE_URL="$NORMALIZED_BASE_URL"
    echo "提示：已规范化 ANTHROPIC_BASE_URL -> ${ANTHROPIC_BASE_URL:-}"
  fi
fi

# ─── Check Bun ────────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  echo "错误：未找到 Bun 运行时。"
  echo ""
  echo "  curl -fsSL https://bun.sh/install | bash"
  echo ""
  exit 1
fi

# ─── Check dependencies ──────────────────────────────────────────────
if [ ! -d "node_modules/@anthropic-ai/sdk" ]; then
  echo "首次运行：正在安装依赖（含重试）..."
  ATTEMPT=1
  until bun install; do
    if [ "$ATTEMPT" -ge 3 ]; then
      echo "错误：依赖安装重试 3 次后仍失败。"
      exit 1
    fi
    ATTEMPT=$((ATTEMPT + 1))
    SLEEP_SECONDS=$((ATTEMPT * 2))
    echo "${SLEEP_SECONDS} 秒后重试 bun install（第 ${ATTEMPT}/3 次）..."
    sleep "$SLEEP_SECONDS"
  done
  echo ""
fi

# ─── Check API key ───────────────────────────────────────────────────
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  if contains_arg "--help" "$@" || contains_arg "-h" "$@" || contains_arg "--version" "$@" || contains_arg "-v" "$@" || contains_arg "-V" "$@"; then
    :
  else
    echo "警告：未设置 ANTHROPIC_API_KEY。"
    echo "      将继续启动，并依赖 OAuth 登录或其他认证方式。"
    echo ""
  fi
fi

# ─── Auto-detect third-party proxy ───────────────────────────────────
if [ -n "${ANTHROPIC_BASE_URL:-}" ] && ! echo "${ANTHROPIC_BASE_URL:-}" | grep -q "anthropic.com"; then
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
if [ -n "${ANTHROPIC_BASE_URL:-}" ] && ! echo "${ANTHROPIC_BASE_URL:-}" | grep -q "anthropic.com"; then
  IS_OPENAI_COMPAT="1"
fi

echo "┌─────────────────────────────────────────────┐"
echo "│  Claude Code Local v2.1.89                   │"
echo "├─────────────────────────────────────────────┤"
echo "│  API 密钥: 已配置"
if [ -n "${ANTHROPIC_BASE_URL:-}" ]; then
  echo "│  代理地址: ${ANTHROPIC_BASE_URL:-}"
fi
if [ -n "${ANTHROPIC_MODEL:-}" ]; then
  echo "│  模型: ${ANTHROPIC_MODEL:-}"
fi
if [ -n "$IS_OPENAI_COMPAT" ]; then
  echo "│  API 模式: OpenAI 兼容（自动适配）"
fi
echo "└─────────────────────────────────────────────┘"
echo ""

exec bun --preload "$DIR/shims/preload.ts" "$DIR/src/entrypoints/cli.tsx" "$@"

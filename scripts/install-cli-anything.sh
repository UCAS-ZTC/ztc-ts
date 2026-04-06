#!/usr/bin/env bash
set -euo pipefail

CLI_ANYTHING_PATH="${CLI_ANYTHING_PATH:-/root/project/CC/CLI-Anything}"
SKILLS_DIR="${HOME}/.claude/skills"
REGISTRY="${CLI_ANYTHING_PATH}/registry.json"
INTERNAL_REGISTRY="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/data/cli-anything/registry.json"

SUCCESS=0
FAILED=0
SKIPPED=0
SKILLS_COPIED=0

usage() {
  cat <<'EOF'
用法: install-cli-anything.sh [选项]

将 CLI-Anything 的所有 CLI harness 和 skills 安装到系统中。

选项:
  --skills-only       仅复制 SKILL.md 文件，不执行 pip install
  --category <cat>    仅安装指定分类（如 video, ai, creative, office, image 等）
  --list              列出所有可安装的 CLI 及其分类，不执行任何操作
  --sync-harness      从 CLI-Anything 仓库同步 HARNESS.md 到 claude-code-ts 内部
  --help              显示此帮助信息

环境变量:
  CLI_ANYTHING_PATH   CLI-Anything 仓库路径（默认: /root/project/CC/CLI-Anything）

示例:
  ./install-cli-anything.sh                   # 安装所有
  ./install-cli-anything.sh --skills-only     # 仅部署 skills
  ./install-cli-anything.sh --category ai     # 仅安装 AI 分类
  ./install-cli-anything.sh --list            # 查看可安装列表
EOF
}

SKILLS_ONLY=false
FILTER_CATEGORY=""
LIST_ONLY=false
SYNC_HARNESS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skills-only)     SKILLS_ONLY=true; shift ;;
    --category)        FILTER_CATEGORY="$2"; shift 2 ;;
    --list)            LIST_ONLY=true; shift ;;
    --sync-harness)    SYNC_HARNESS=true; shift ;;
    --help|-h)         usage; exit 0 ;;
    *)                 echo "未知参数: $1"; usage; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if $SYNC_HARNESS; then
  PYTHON=$(check_python 2>/dev/null || true)
  if [[ -z "$PYTHON" ]]; then
    for candidate in python3 python; do
      if command -v "$candidate" &>/dev/null; then PYTHON="$candidate"; break; fi
    done
  fi
  HARNESS_SRC="${CLI_ANYTHING_PATH}/cli-anything-plugin/HARNESS.md"
  HARNESS_DEST="${PROJECT_ROOT}/src/skills/bundled/harnessContent.ts"
  if [[ ! -f "$HARNESS_SRC" ]]; then
    echo "错误: 找不到 HARNESS.md: ${HARNESS_SRC}"
    exit 1
  fi
  REGISTRY_DEST="${PROJECT_ROOT}/src/skills/bundled/registryContent.ts"
  REGISTRY_DATA_DEST="${PROJECT_ROOT}/data/cli-anything/registry.json"
  "$PYTHON" -c "
import json

with open('${HARNESS_SRC}') as f:
    harness = f.read()
escaped_h = json.dumps(harness)
with open('${HARNESS_DEST}', 'w') as out:
    out.write('// Auto-generated from CLI-Anything HARNESS.md\n')
    out.write('// Regenerate with: scripts/install-cli-anything.sh --sync-harness\n')
    out.write(f'export const HARNESS_MD_CONTENT: string = {escaped_h}\n')
print(f'已同步 HARNESS.md → ${HARNESS_DEST} ({len(harness)} chars)')

with open('${REGISTRY}') as f:
    reg = json.load(f)
reg_str = json.dumps(reg, indent=2, ensure_ascii=False)
escaped_r = json.dumps(reg_str)
with open('${REGISTRY_DEST}', 'w') as out:
    out.write('// Auto-generated from CLI-Anything registry.json\n')
    out.write('// Regenerate with: scripts/install-cli-anything.sh --sync-harness\n')
    out.write(f'export const REGISTRY_JSON_CONTENT: string = {escaped_r}\n')
print(f'已同步 registry.json → ${REGISTRY_DEST}')

import shutil
shutil.copy2('${REGISTRY}', '${REGISTRY_DATA_DEST}')
print(f'已同步 registry.json → ${REGISTRY_DATA_DEST}')
"
  if ! $LIST_ONLY && ! $SKILLS_ONLY && [[ -z "$FILTER_CATEGORY" ]]; then exit 0; fi
fi

if [[ ! -d "$CLI_ANYTHING_PATH" ]]; then
  echo "错误: CLI-Anything 仓库路径不存在: ${CLI_ANYTHING_PATH}"
  echo "请设置 CLI_ANYTHING_PATH 环境变量指向正确路径。"
  exit 1
fi

if [[ ! -f "$REGISTRY" ]]; then
  echo "错误: 找不到 registry.json: ${REGISTRY}"
  exit 1
fi

check_python() {
  local py=""
  for candidate in python3 python; do
    if command -v "$candidate" &>/dev/null; then
      py="$candidate"
      break
    fi
  done
  if [[ -z "$py" ]]; then
    echo "错误: 未找到 Python。请安装 Python >= 3.10。"
    exit 1
  fi
  local ver
  ver=$("$py" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
  local major minor
  major="${ver%%.*}"
  minor="${ver#*.}"
  if (( major < 3 || (major == 3 && minor < 10) )); then
    echo "错误: Python 版本过低 (${ver})，需要 >= 3.10。"
    exit 1
  fi
  echo "$py"
}

read_registry() {
  "$PYTHON" -c "
import json, sys
with open('${REGISTRY}') as f:
    data = json.load(f)
for cli in data.get('clis', []):
    cat = cli.get('category', '')
    filt = '${FILTER_CATEGORY}'
    if filt and cat != filt:
        continue
    name = cli.get('name', '')
    display = cli.get('display_name', name)
    desc = cli.get('description', '')
    skill = cli.get('skill_md') or ''
    install = cli.get('install_cmd', '')
    print(f'{name}\t{display}\t{cat}\t{desc}\t{skill}\t{install}')
"
}

if $LIST_ONLY; then
  PYTHON=$(check_python)
  printf "\n%-20s %-20s %-12s %s\n" "名称" "显示名称" "分类" "描述"
  printf '%.0s─' {1..90}; echo
  while IFS=$'\t' read -r name display cat desc skill install; do
    printf "%-20s %-20s %-12s %s\n" "$name" "$display" "$cat" "${desc:0:50}"
  done < <(read_registry)
  echo
  exit 0
fi

PYTHON=$(check_python)
echo "使用 Python: $(command -v "$PYTHON") ($("$PYTHON" --version 2>&1))"
echo "CLI-Anything 路径: ${CLI_ANYTHING_PATH}"
echo "Skills 目标: ${SKILLS_DIR}"
echo

mkdir -p "$SKILLS_DIR"

install_harness() {
  local name="$1" display="$2" skill_md="$3" install_cmd="$4"
  local harness_dir="${CLI_ANYTHING_PATH}/${name}/agent-harness"

  if ! $SKILLS_ONLY; then
    if [[ -f "${harness_dir}/setup.py" ]]; then
      echo "  [pip] 安装 ${display} ..."
      if pip install "$harness_dir" --quiet 2>/dev/null; then
        echo "  [pip] ${display} 安装成功"
        SUCCESS=$((SUCCESS + 1))
      else
        echo "  [pip] ${display} 安装失败，尝试使用 install_cmd ..."
        if [[ -n "$install_cmd" ]] && eval "$install_cmd" --quiet 2>/dev/null; then
          echo "  [pip] ${display} (远程) 安装成功"
          SUCCESS=$((SUCCESS + 1))
        else
          echo "  [pip] ${display} 安装失败"
          FAILED=$((FAILED + 1))
        fi
      fi
    else
      echo "  [skip] ${display}: 无 setup.py，跳过 pip install"
      SKIPPED=$((SKIPPED + 1))
    fi
  fi

  if [[ -n "$skill_md" ]]; then
    local src="${CLI_ANYTHING_PATH}/${skill_md}"
    if [[ -f "$src" ]]; then
      local dest_dir="${SKILLS_DIR}/cli-${name}"
      mkdir -p "$dest_dir"
      cp "$src" "${dest_dir}/SKILL.md"
      echo "  [skill] ${dest_dir}/SKILL.md"
      SKILLS_COPIED=$((SKILLS_COPIED + 1))
    fi
  fi
}

echo "═══════════════════════════════════════════════"
echo "  CLI-Anything 批量安装"
echo "═══════════════════════════════════════════════"
echo

while IFS=$'\t' read -r name display cat desc skill_md install_cmd; do
  echo "▸ ${display} (${cat})"
  install_harness "$name" "$display" "$skill_md" "$install_cmd"
  echo
done < <(read_registry)

COMMANDS_DIR="${CLI_ANYTHING_PATH}/cli-anything-plugin/commands"
if [[ -d "$COMMANDS_DIR" ]]; then
  echo
  echo "▸ 转换 CLI-Anything 命令为 skills ..."

  declare -A CMD_MAP
  CMD_MAP["cli-anything.md"]="cli-anything-build"
  CMD_MAP["list.md"]="cli-anything-list"
  CMD_MAP["validate.md"]="cli-anything-validate"
  CMD_MAP["refine.md"]="cli-anything-refine"
  CMD_MAP["test.md"]="cli-anything-test"

  declare -A CMD_DESC
  CMD_DESC["cli-anything-build"]="从零构建 CLI harness — 将 GUI 软件转化为 agent 原生命令行接口"
  CMD_DESC["cli-anything-list"]="列出所有已安装和开发中的 CLI-Anything 工具"
  CMD_DESC["cli-anything-validate"]="验证 CLI harness 是否符合 HARNESS.md 规范"
  CMD_DESC["cli-anything-refine"]="增量改进已有的 CLI harness，扩展命令覆盖"
  CMD_DESC["cli-anything-test"]="运行 CLI harness 测试并更新 TEST.md 文档"

  declare -A CMD_WHEN
  CMD_WHEN["cli-anything-build"]="当用户需要为某个 GUI 软件创建全新的 CLI harness 时使用"
  CMD_WHEN["cli-anything-list"]="当用户需要查看已安装或本地开发的 CLI-Anything 工具列表时使用"
  CMD_WHEN["cli-anything-validate"]="当用户需要检查已有 CLI harness 是否符合规范标准时使用"
  CMD_WHEN["cli-anything-refine"]="当用户需要给已有的 CLI harness 添加新命令或改进功能时使用"
  CMD_WHEN["cli-anything-test"]="当用户需要运行 CLI harness 的测试套件并生成测试报告时使用"

  for src_file in "$COMMANDS_DIR"/*.md; do
    local_name="$(basename "$src_file")"
    skill_name="${CMD_MAP[$local_name]:-}"
    if [[ -z "$skill_name" ]]; then
      continue
    fi

    dest_dir="${SKILLS_DIR}/${skill_name}"
    mkdir -p "$dest_dir"

    desc="${CMD_DESC[$skill_name]:-}"
    when="${CMD_WHEN[$skill_name]:-}"
    body="$(cat "$src_file")"

    cat > "${dest_dir}/SKILL.md" <<SKILLEOF
---
name: "${skill_name}"
description: "${desc}"
when_to_use: "${when}"
---

${body}
SKILLEOF

    echo "  [cmd→skill] ${dest_dir}/SKILL.md"
    SKILLS_COPIED=$((SKILLS_COPIED + 1))
  done
fi

echo
echo "═══════════════════════════════════════════════"
echo "  安装摘要"
echo "═══════════════════════════════════════════════"
if ! $SKILLS_ONLY; then
  echo "  pip 安装成功: ${SUCCESS}"
  echo "  pip 安装失败: ${FAILED}"
  echo "  pip 跳过:     ${SKIPPED}"
fi
echo "  Skills 部署:  ${SKILLS_COPIED}"
echo "  Skills 目录:  ${SKILLS_DIR}"
echo "═══════════════════════════════════════════════"

if (( FAILED > 0 )); then
  echo
  echo "⚠ 有 ${FAILED} 个包安装失败，请检查上方日志。"
  exit 1
fi

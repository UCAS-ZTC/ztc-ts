#!/usr/bin/env bash
set -eu

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$PROJECT_ROOT/src"

echo "=== Patching bun:bundle imports ==="

count=0
while IFS= read -r file; do
  depth=$(echo "$file" | sed "s|$SRC_DIR/||" | tr '/' '\n' | wc -l)
  rel_prefix=""
  for ((i=1; i<depth; i++)); do
    rel_prefix="../$rel_prefix"
  done
  shim_path="${rel_prefix}../shims/bun-bundle.js"
  
  rg -l "from 'bun:bundle'" "$file" > /dev/null 2>&1 && \
    sed -i "s|from 'bun:bundle'|from '$shim_path'|g" "$file" && \
    count=$((count+1))
  
  rg -l "from \"bun:bundle\"" "$file" > /dev/null 2>&1 && \
    sed -i "s|from \"bun:bundle\"|from \"$shim_path\"|g" "$file" && \
    count=$((count+1))
done < <(rg -l "bun:bundle" "$SRC_DIR" 2>/dev/null || true)

echo "Patched $count files for bun:bundle"

echo "=== Patching bun:ffi imports ==="
count=0
while IFS= read -r file; do
  depth=$(echo "$file" | sed "s|$SRC_DIR/||" | tr '/' '\n' | wc -l)
  rel_prefix=""
  for ((i=1; i<depth; i++)); do
    rel_prefix="../$rel_prefix"
  done
  shim_path="${rel_prefix}../shims/bun-ffi.js"
  
  sed -i "s|require('bun:ffi')|require('$shim_path')|g" "$file"
  sed -i "s|require(\"bun:ffi\")|require(\"$shim_path\")|g" "$file"
  sed -i "s|from 'bun:ffi'|from '$shim_path'|g" "$file"
  sed -i "s|from \"bun:ffi\"|from \"$shim_path\"|g" "$file"
  count=$((count+1))
done < <(rg -l "bun:ffi" "$SRC_DIR" 2>/dev/null || true)

echo "Patched $count files for bun:ffi"

echo "=== Done ==="

#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const SRC = path.join(PROJECT_ROOT, 'src')

const EXCLUDE = new Set([
  path.join(SRC, 'services/filePersistence/types.ts'),
  path.join(SRC, 'services/contextCollapse/index.ts'),
])

function walkDir(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walkDir(p, out)
    else if (ent.name.endsWith('.ts')) out.push(p)
  }
  return out
}

function normalizeSpecToTs(spec) {
  let s = spec
  if (s.endsWith('.js')) s = s.slice(0, -3) + '.ts'
  return s
}

function resolveModule(fromFile, spec) {
  const s = normalizeSpecToTs(spec)
  if (s.startsWith('src/')) return path.join(PROJECT_ROOT, s)
  return path.resolve(path.dirname(fromFile), s)
}

const FUNC_PREFIX =
  /^(is|get|set|run|use|init|create|handle|check|ensure|validate|has|load|find|detect|parse)/

function isAllCapsSnake(name) {
  if (name.length < 2) return false
  if (!/^[A-Z0-9_]+$/.test(name)) return false
  return name === name.toUpperCase()
}

function isRuntimeValueUsage(name, body) {
  const n = name.replace(/\\/g, '\\\\').replace(/\$/g, '\\$')
  const tests = [
    new RegExp(`\\b${n}\\s*\\(`),
    new RegExp(`\\b${n}\\s*<`),
    new RegExp(`=\\s*${n}\\b`),
    new RegExp(`!\\s*${n}\\b`),
    new RegExp(`\\b${n}\\s*\\.`),
    new RegExp(`\\b${n}\\s*\\[`),
    new RegExp(`\\bnew\\s+${n}\\b`),
    new RegExp(`\\breturn\\s+${n}\\b`),
    new RegExp(`<\\s*${n}\\b`),
  ]
  return tests.some((r) => r.test(body))
}

function blankImportExportStatements(source) {
  const sf = ts.createSourceFile(
    'tmp.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const chars = [...source]
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      for (let i = st.pos; i < st.end; i++) chars[i] = ' '
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier) {
      for (let i = st.pos; i < st.end; i++) chars[i] = ' '
    }
  }
  return chars.join('')
}

function parseStubTypeExports(stubPath) {
  const text = fs.readFileSync(stubPath, 'utf8')
  const names = new Set()
  const typeAny = /^export\s+type\s+(\w+)\s*=\s*any\s*;?\s*$/gm
  let m
  while ((m = typeAny.exec(text)) !== null) names.add(m[1])
  return { text, names }
}

function buildStubImporterIndex(allFiles, sourceCache) {
  /** @type {Map<string, Set<string>>} */
  const idx = new Map()
  const add = (stub, file) => {
    if (!idx.has(stub)) idx.set(stub, new Set())
    idx.get(stub).add(file)
  }
  for (const file of allFiles) {
    const source = sourceCache.get(file)
    if (!source) continue
    const sf = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) && st.moduleSpecifier) {
        add(resolveModule(file, st.moduleSpecifier.text), file)
      }
      if (ts.isExportDeclaration(st) && st.moduleSpecifier) {
        add(resolveModule(file, st.moduleSpecifier.text), file)
      }
    }
  }
  return idx
}

function namesNeedingRuntimeValue(stubPath, allFiles, sourceCache, importerIndex) {
  const need = new Set()
  const importers = importerIndex.get(stubPath)
  if (!importers) return need

  for (const file of importers) {
    if (file === stubPath) continue
    const source = sourceCache.get(file)
    const sf = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )

    for (const st of sf.statements) {
      if (!ts.isExportDeclaration(st) || !st.moduleSpecifier) continue
      if (resolveModule(file, st.moduleSpecifier.text) !== stubPath) continue
      if (st.isTypeOnly) continue
      const clause = st.exportClause
      if (!clause || !ts.isNamedExports(clause)) continue
      for (const el of clause.elements) {
        if (el.isTypeOnly) continue
        need.add((el.propertyName || el.name).text)
      }
    }
  }

  for (const file of importers) {
    if (file === stubPath) continue
    const source = sourceCache.get(file)
    const sf = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    const body = blankImportExportStatements(source)

    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !st.moduleSpecifier) continue
      if (resolveModule(file, st.moduleSpecifier.text) !== stubPath) continue
      const ic = st.importClause
      if (!ic || ic.isTypeOnly) continue

      if (ic.name && !ic.isTypeOnly) {
        const def = ic.name.text
        if (isRuntimeValueUsage(def, body)) need.add(def)
      }

      const nb = ic.namedBindings
      if (nb && ts.isNamespaceImport(nb)) {
        need.add(nb.name.text)
        continue
      }
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) {
          if (el.isTypeOnly) continue
          const nm = (el.propertyName || el.name).text
          if (isRuntimeValueUsage(nm, body)) need.add(nm)
        }
      }
    }
  }

  return need
}

function classifyName(name, stubPath, importerFiles, sourceCache) {
  if (isAllCapsSnake(name)) return 'const'

  let seenNew = false
  let seenJsx = false
  let seenCall = false

  for (const file of importerFiles) {
    if (file === stubPath) continue
    const source = sourceCache.get(file)
    const sf = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )
    let fromStub = false
    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) && st.moduleSpecifier) {
        if (resolveModule(file, st.moduleSpecifier.text) !== stubPath) continue
        const ic = st.importClause
        if (!ic || ic.isTypeOnly) continue
        const nb = ic.namedBindings
        if (nb && ts.isNamedImports(nb)) {
          for (const el of nb.elements) {
            if (el.isTypeOnly) continue
            if ((el.propertyName || el.name).text === name) fromStub = true
          }
        }
        if (ic.name && !ic.isTypeOnly && ic.name.text === name) fromStub = true
        if (nb && ts.isNamespaceImport(nb) && nb.name.text === name) fromStub = true
      }
      if (ts.isExportDeclaration(st) && st.moduleSpecifier) {
        if (resolveModule(file, st.moduleSpecifier.text) !== stubPath) continue
        if (st.isTypeOnly) continue
        const clause = st.exportClause
        if (clause && ts.isNamedExports(clause)) {
          for (const el of clause.elements) {
            if (el.isTypeOnly) continue
            if ((el.propertyName || el.name).text === name) fromStub = true
          }
        }
      }
    }
    if (!fromStub) continue

    const body = blankImportExportStatements(source)
    const n = name.replace(/\\/g, '\\\\').replace(/\$/g, '\\$')
    if (new RegExp(`\\bnew\\s+${n}\\b`).test(body)) seenNew = true
    if (new RegExp(`<\\s*${n}\\b`).test(body)) seenJsx = true
    if (new RegExp(`\\b${n}\\s*\\(`).test(body)) seenCall = true
  }

  if (seenNew) return 'class'
  if (seenJsx || seenCall) return 'function'
  if (/^[a-z]/.test(name) || FUNC_PREFIX.test(name)) return 'function'
  if (/^[A-Z]/.test(name)) return 'class'
  return 'function'
}

function replacementLine(name, kind) {
  switch (kind) {
    case 'const':
      return `export const ${name} = '' as any;`
    case 'class':
      return `export class ${name} {}`
    case 'function':
      return `export function ${name}(...args: any[]): any { return undefined as any; }`
    case 'namespace':
      return `export const ${name} = {} as any;`
    default:
      return `export function ${name}(...args: any[]): any { return undefined as any; }`
  }
}

function main() {
  const allFiles = walkDir(SRC)
  const sourceCache = new Map()
  for (const f of allFiles) {
    try {
      sourceCache.set(f, fs.readFileSync(f, 'utf8'))
    } catch {
      /* skip */
    }
  }

  const importerIndex = buildStubImporterIndex(allFiles, sourceCache)

  const stubFiles = allFiles.filter((f) => {
    if (EXCLUDE.has(f)) return false
    const t = sourceCache.get(f)
    if (!t) return false
    return (
      t.includes('Auto-generated stub') &&
      t.includes('missing from source snapshot')
    )
  })

  let totalFixes = 0
  const details = []

  for (const stubPath of stubFiles) {
    const { text, names } = parseStubTypeExports(stubPath)
    if (names.size === 0) continue

    const need = namesNeedingRuntimeValue(stubPath, allFiles, sourceCache, importerIndex)
    const importers = [...(importerIndex.get(stubPath) || [])]
    let newText = text
    let fileFixes = 0

    for (const name of names) {
      if (!need.has(name)) continue

      let kind = classifyName(name, stubPath, importers, sourceCache)

      for (const file of importers) {
        const sf = ts.createSourceFile(
          file,
          sourceCache.get(file),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TS,
        )
        for (const st of sf.statements) {
          if (!ts.isImportDeclaration(st) || !st.moduleSpecifier) continue
          if (resolveModule(file, st.moduleSpecifier.text) !== stubPath) continue
          const ic = st.importClause
          if (!ic || ic.isTypeOnly) continue
          const nb = ic.namedBindings
          if (nb && ts.isNamespaceImport(nb) && nb.name.text === name) {
            kind = 'namespace'
          }
        }
      }

      const oldLine = `export type ${name} = any;`
      const neu = replacementLine(name, kind)
      if (newText.includes(oldLine)) {
        newText = newText.replace(oldLine, neu)
      } else if (newText.includes(`export type ${name} = any`)) {
        newText = newText.replace(
          `export type ${name} = any`,
          neu.replace(/;$/, ''),
        )
      } else {
        continue
      }
      fileFixes++
      totalFixes++
      details.push({
        stub: path.relative(PROJECT_ROOT, stubPath),
        name,
        kind,
      })
    }

    if (fileFixes > 0 && newText !== text) {
      fs.writeFileSync(stubPath, newText, 'utf8')
    }
  }

  console.log(JSON.stringify({ totalFixes, details }, null, 2))
}

main()

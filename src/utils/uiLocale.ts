import { getSystemLocaleLanguage } from './intl.js'

function normalizeLocale(raw: string | undefined): string {
  if (!raw) return ''
  return raw.trim().replace(/_/g, '-').toLowerCase()
}

function isGenericCLocale(locale: string): boolean {
  return (
    locale === 'c' ||
    locale === 'posix' ||
    locale === 'c.utf8' ||
    locale === 'c.utf-8'
  )
}

export function getUiLocale(): string {
  const explicit = normalizeLocale(process.env.CLAUDE_CODE_LOCALE)
  if (explicit) return explicit

  const lang = normalizeLocale(process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG)
  if (lang) {
    if (isGenericCLocale(lang)) {
      // In many WSL/CI environments this resolves to C.UTF-8, which is not
      // user-intentful for UI language. Prefer Chinese-first fallback.
      return 'zh-cn'
    }
    return lang
  }

  const systemLanguage = normalizeLocale(getSystemLocaleLanguage())
  if (systemLanguage && !isGenericCLocale(systemLanguage)) return systemLanguage

  // Chinese-first fallback for this fork when environment locale is unspecified.
  return 'zh-cn'
}

export function isChineseUiLocale(): boolean {
  const locale = getUiLocale()
  return locale === 'zh' || locale.startsWith('zh-')
}

export function uiText(english: string, chinese: string): string {
  return isChineseUiLocale() ? chinese : english
}

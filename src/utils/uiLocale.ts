import { getSystemLocaleLanguage } from './intl.js'

function normalizeLocale(raw: string | undefined): string {
  if (!raw) return ''
  return raw.trim().replace(/_/g, '-').toLowerCase()
}

export function getUiLocale(): string {
  const explicit = normalizeLocale(process.env.CLAUDE_CODE_LOCALE)
  if (explicit) return explicit

  const lang = normalizeLocale(process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG)
  if (lang) return lang

  const systemLanguage = normalizeLocale(getSystemLocaleLanguage())
  if (systemLanguage) return systemLanguage

  return 'en'
}

export function isChineseUiLocale(): boolean {
  const locale = getUiLocale()
  return locale === 'zh' || locale.startsWith('zh-')
}

export function uiText(english: string, chinese: string): string {
  return isChineseUiLocale() ? chinese : english
}

import { stringWidth } from '../ink/stringWidth.js'

/**
 * Pad a string to a target visual column width using spaces.
 * Unlike String.padEnd which counts by code units, this counts by
 * terminal display columns — correct for CJK/fullwidth characters.
 */
export function padEndVisual(str: string, targetColumns: number, fill = ' '): string {
  const currentWidth = stringWidth(str)
  if (currentWidth >= targetColumns) return str
  return str + fill.repeat(targetColumns - currentWidth)
}

/**
 * Pad the start of a string to a target visual column width.
 */
export function padStartVisual(str: string, targetColumns: number, fill = ' '): string {
  const currentWidth = stringWidth(str)
  if (currentWidth >= targetColumns) return str
  return fill.repeat(targetColumns - currentWidth) + str
}

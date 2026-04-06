import { c as _c } from "react/compiler-runtime";
import React from 'react';
import Text from '../../ink/components/Text.js';
import { uiText } from '../../utils/uiLocale.js';
type Props = {
  /** The key or chord to display (e.g., "ctrl+o", "Enter", "↑/↓") */
  shortcut: string;
  /** The action the key performs (e.g., "expand", "select", "navigate") */
  action: string;
  /** Whether to wrap the hint in parentheses. Default: false */
  parens?: boolean;
  /** Whether to render the shortcut in bold. Default: false */
  bold?: boolean;
};

/**
 * Renders a keyboard shortcut hint like "ctrl+o to expand" or "(tab to toggle)"
 *
 * Wrap in <Text dimColor> for the common dim styling.
 *
 * @example
 * // Simple hint wrapped in dim Text
 * <Text dimColor><KeyboardShortcutHint shortcut="esc" action="cancel" /></Text>
 *
 * // With parentheses: "(ctrl+o to expand)"
 * <Text dimColor><KeyboardShortcutHint shortcut="ctrl+o" action="expand" parens /></Text>
 *
 * // With bold shortcut: "Enter to confirm" (Enter is bold)
 * <Text dimColor><KeyboardShortcutHint shortcut="Enter" action="confirm" bold /></Text>
 *
 * // Multiple hints with middot separator - use Byline
 * <Text dimColor>
 *   <Byline>
 *     <KeyboardShortcutHint shortcut="Enter" action="confirm" />
 *     <KeyboardShortcutHint shortcut="Esc" action="cancel" />
 *   </Byline>
 * </Text>
 */
export function KeyboardShortcutHint(t0) {
  const $ = _c(12);
  const {
    shortcut,
    action,
    parens: t1,
    bold: t2
  } = t0;
  const parens = t1 === undefined ? false : t1;
  const bold = t2 === undefined ? false : t2;
  let t3;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = uiText('to', '执行');
    $[0] = t3;
  } else {
    t3 = $[0];
  }
  const connector = t3;
  let t4;
  if ($[1] !== bold || $[2] !== shortcut) {
    t4 = bold ? <Text bold={true}>{shortcut}</Text> : shortcut;
    $[1] = bold;
    $[2] = shortcut;
    $[3] = t4;
  } else {
    t4 = $[3];
  }
  const shortcutText = t4;
  if (parens) {
    let t5;
    if ($[4] !== action || $[5] !== connector || $[6] !== shortcutText) {
      t5 = <Text>({shortcutText} {connector} {action})</Text>;
      $[4] = action;
      $[5] = connector;
      $[6] = shortcutText;
      $[7] = t5;
    } else {
      t5 = $[7];
    }
    return t5;
  }
  let t5;
  if ($[8] !== action || $[9] !== connector || $[10] !== shortcutText) {
    t5 = <Text>{shortcutText} {connector} {action}</Text>;
    $[8] = action;
    $[9] = connector;
    $[10] = shortcutText;
    $[11] = t5;
  } else {
    t5 = $[11];
  }
  return t5;
}

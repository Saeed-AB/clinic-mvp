import type { KeyboardEvent } from "react";

/**
 * تسجيل سريع بلوحة المفاتيح: Enter ينتقل للحقل التالي، و Ctrl/Cmd+Enter يحفظ.
 * يُركّب على عنصر <form onKeyDown={...}>.
 */
export function formKeyHandler(onSubmit: () => void) {
  return (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if ((e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit();
      return;
    }
    if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON" || target.getAttribute("role") === "option") return;
    if (target.tagName === "INPUT" || target.tagName === "SELECT") {
      e.preventDefault();
      const focusables = Array.from(
        e.currentTarget.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])"),
      ).filter((el) => el.offsetParent !== null);
      const idx = focusables.indexOf(target);
      const next = focusables[idx + 1];
      if (next) next.focus();
      else onSubmit();
    }
  };
}

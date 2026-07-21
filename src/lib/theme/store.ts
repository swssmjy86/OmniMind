// 화면 모드(다크/라이트/시스템) 저장소. localStorage에만 저장하고, 서버에는 보내지 않는다.
// "system"은 data-theme 속성을 아예 지워 globals.css의 prefers-color-scheme 분기를 따르게 한다.
// 저장된 값이 없는 첫 방문(신규 사용자)은 기기 설정과 무관하게 다크로 시작한다 — 기본 모드
// 결정. "시스템"은 여전히 ThemeToggle로 고를 수 있는 선택지로 남는다.

export type Theme = "light" | "dark" | "system";

export const THEME_KEY = "om-theme";

export function readStoredTheme(): Theme {
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // 저장 불가(시크릿 모드 등)여도 기본값(dark)으로 계속
  }
  return "dark";
}

export function applyTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // 저장 불가여도 이번 화면에는 적용
  }
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

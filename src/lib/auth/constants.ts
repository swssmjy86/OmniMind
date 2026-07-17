/** 무활동 자동 로그아웃 기준 — 이 시간 동안 아무 활동이 없으면 세션을 정리한다. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** 만료 검사 주기. 백그라운드 탭에서는 브라우저가 지연시킬 수 있어 visibilitychange가 보완한다. */
export const IDLE_CHECK_INTERVAL_MS = 60 * 1000;

/** 마지막 활동 시각(ms epoch). localStorage 공유로 여러 탭의 활동을 합산한다. */
export const LAST_ACTIVITY_KEY = "om_last_activity";

/** 활동으로 인정하는 사용자 입력 이벤트. */
export const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

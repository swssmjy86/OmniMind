// P4-5 성장 지표 — 이벤트 이름 정의. 클라이언트가 기록할 수 있는 것은 화이트리스트로 제한.

/** 서버에서만 기록하는 이벤트. */
export const SERVER_EVENTS = ["onboard_complete"] as const;

/** 클라이언트(서버 액션 경유)가 기록할 수 있는 이벤트 화이트리스트. */
export const CLIENT_EVENTS = ["card_open", "card_share", "card_copy_link"] as const;

export type ClientEvent = (typeof CLIENT_EVENTS)[number];

export const isClientEvent = (name: string): name is ClientEvent =>
  (CLIENT_EVENTS as readonly string[]).includes(name);

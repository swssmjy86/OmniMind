// 세션 한정 인메모리 저장소 — 입력·프로필·기록을 여기에 담는다(localStorage 대신).
//
// 왜 localStorage가 아니라 모듈 수준 Map인가:
// - **새로고침(전체 리로드)하면 JS 모듈이 새로 로드돼 이 Map이 비워진다** → 입력이 초기화된다.
// - SPA 내 클라이언트 네비게이션(탭 이동) 사이에는 유지된다 → 한 세션 안에서는 온보딩→나·마음·
//   고민 흐름이 이어진다.
// - 기기(디스크)에 아무것도 영구 저장하지 않는다(완전 세션 한정, 2026-08-01 결정).
//
// 테마(om-theme)·유입 추적(om_ref)·최초 방문·데일리 캐시처럼 "입력"이 아닌 것은 여기 담지
// 않고 localStorage에 둔다. localStorage와 같은 최소 인터페이스라 기존 저장 코드가 그대로 바꿔 쓸 수 있다.
const mem = new Map<string, string>();

// 브라우저(클라이언트)에서만 동작한다. 서버(Node)에서는 이 Map이 프로세스 전역이라 요청 간
// 공유될 수 있으므로, 서버에서는 무조건 no-op으로 막아 사용자 데이터가 섞이지 않게 한다.
const onClient = (): boolean => typeof window !== "undefined";

export const sessionStore = {
  getItem(key: string): string | null {
    return onClient() ? (mem.get(key) ?? null) : null;
  },
  setItem(key: string, value: string): void {
    if (onClient()) mem.set(key, String(value));
  },
  removeItem(key: string): void {
    if (onClient()) mem.delete(key);
  },
  clear(): void {
    if (onClient()) mem.clear();
  },
};

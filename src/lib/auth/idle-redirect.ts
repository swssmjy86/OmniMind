/** 하드 내비게이션으로 로그인 화면 이동 — RSC 캐시에 남은 로그인 상태 화면 조각까지 확실히 버린다. */
export function redirectToIdleLogin() {
  window.location.replace("/login?reason=idle");
}

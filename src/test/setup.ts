import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { sessionStore } from "@/lib/session-store";

// Web Storage 폴리필 — Node 24+는 실험적 네이티브 localStorage 전역을 심는데,
// `--localstorage-file` 없이는 undefined를 반환해 jsdom이 제공하던 window.localStorage를
// 가려 버린다(로컬 Node 26에서 window.localStorage === undefined). CI(Node 22)는 이 전역이
// 없어 통과하지만, 개발자 로컬에서 `npm run verify`가 통째로 깨진다. Node 버전과 무관하게
// 결정적으로 동작하도록 in-memory Storage를 항상 설치한다.
function installMemoryStorage(name: "localStorage" | "sessionStorage") {
  const existing = (() => {
    try {
      return (window as unknown as Record<string, unknown>)[name];
    } catch {
      return undefined;
    }
  })();
  // 이미 정상 동작하는 Storage(jsdom 제공분)가 있으면 건드리지 않는다.
  if (existing && typeof (existing as Storage).setItem === "function") return;

  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => void store.delete(key),
    setItem: (key, value) => void store.set(String(key), String(value)),
  };
  Object.defineProperty(window, name, {
    configurable: true,
    get: () => storage,
  });
}
installMemoryStorage("localStorage");
installMemoryStorage("sessionStorage");

// jsdom엔 scrollIntoView가 없다 — 채팅 등 자동 스크롤 컴포넌트 렌더 시 TypeError로 죽는 것을 막는다.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
  // 세션 한정 인메모리 저장소는 모듈 수준 Map이라 테스트 간에 유지된다 — 매 테스트 후 비운다.
  sessionStore.clear();
  // localStorage(테마·유입·데일리 캐시·최초방문)도 테스트 간 누수 방지로 함께 비운다.
  try { window.localStorage.clear(); } catch { /* jsdom 없음 등 무시 */ }
});

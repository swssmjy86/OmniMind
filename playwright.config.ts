import { defineConfig, devices } from "@playwright/test";

// E2E: 온보딩 프리뷰 흐름(인증·DB 불필요, 100% 클라이언트 계산)을 검증한다.
// dev 서버가 Supabase env(.env.local)를 필요로 하므로, CI에서는 테스트 env를 주입한다.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // 프리뷰 흐름은 인증 불필요. env가 없으면 플레이스홀더로 부팅(미들웨어는 user=null로 통과).
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
    },
  },
});

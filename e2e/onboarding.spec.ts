import { test, expect } from "@playwright/test";

// 온보딩 4단계 → 프로필 공개(프리뷰). 로그인·DB 없이 동작하는 핵심 흐름.
test("온보딩 입력 → '온전한 나' 프로필 공개", async ({ page }) => {
  await page.goto("/onboarding");

  // 0: 닉네임
  await page.getByPlaceholder("예: 다인").fill("다인");
  await page.getByRole("button", { name: "다음" }).click();

  // 1: 생년월일시
  await page.locator('input[type="date"]').fill("1995-08-20");
  await page.locator('input[type="time"]').fill("14:30");
  await page.getByRole("button", { name: "다음" }).click();

  // 2: 혈액형
  await page.getByRole("button", { name: "A형" }).click();
  await page.getByRole("button", { name: "다음" }).click();

  // 3: MBTI
  await page.getByRole("button", { name: "ENFP" }).click();
  await page.getByRole("button", { name: "다음" }).click();

  // 4: 별자리 확인(생년월일에서 자동 산출) → 공개
  await expect(page.getByText("사자자리")).toBeVisible();
  await page.getByRole("button", { name: /나를 알아보기/ }).click();

  // 공개 연출 후 프로필: 닉네임·명식표·해석 섹션 확인
  await expect(page.getByRole("heading", { name: "다인님의 이야기" })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText("사주 명식")).toBeVisible(); // 전문 명식표
  await expect(page.getByText("癸", { exact: true })).toBeVisible(); // 1995-08-20 일간 계(癸)
  await expect(page.getByRole("heading", { name: "타고난 재능과 관계" })).toBeVisible(); // 십성 섹션
});

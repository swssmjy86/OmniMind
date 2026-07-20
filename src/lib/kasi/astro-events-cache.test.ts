import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTodayAstroEvents } from "./astro-events-cache";
import { fetchAstroEvents } from "./astro-events";
import { createAdminSupabase } from "@/lib/supabase/admin";

vi.mock("./astro-events", () => ({ fetchAstroEvents: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

const DATE = { y: 2026, mo: 8, d: 12 };

function mockAdmin({
  cached,
  insertError,
}: {
  cached?: unknown;
  insertError?: boolean;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: cached ?? null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const insert = insertError
    ? vi.fn().mockRejectedValue(new Error("unique violation"))
    : vi.fn().mockResolvedValue({ data: null });
  const from = vi.fn().mockReturnValue({ select, insert });
  vi.mocked(createAdminSupabase).mockReturnValue({ from } as unknown as ReturnType<typeof createAdminSupabase>);
  return { from, select, eq, maybeSingle, insert };
}

describe("getTodayAstroEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("캐시에 있으면 KASI를 호출하지 않고 캐시값을 반환한다", async () => {
    const cachedEvents = [{ title: "캐시된 현상", time: "10:00", description: "설명" }];
    mockAdmin({ cached: { events: cachedEvents } });

    const result = await getTodayAstroEvents(DATE);
    expect(result).toEqual(cachedEvents);
    expect(fetchAstroEvents).not.toHaveBeenCalled();
  });

  it("캐시 미스면 KASI를 호출하고 결과를 기록한 뒤 반환한다", async () => {
    const { insert } = mockAdmin({ cached: undefined });
    const freshEvents = [{ title: "새 현상", time: "22:00", description: "설명" }];
    vi.mocked(fetchAstroEvents).mockResolvedValue(freshEvents);

    const result = await getTodayAstroEvents(DATE);
    expect(result).toEqual(freshEvents);
    expect(insert).toHaveBeenCalledWith({ target_date: "2026-08-12", events: freshEvents });
  });

  it("KASI 호출이 실패하면 null을 반환한다(화면 전체를 막지 않음)", async () => {
    mockAdmin({ cached: undefined });
    vi.mocked(fetchAstroEvents).mockRejectedValue(new Error("kasi:no-key"));

    const result = await getTodayAstroEvents(DATE);
    expect(result).toBeNull();
  });

  it("캐시 기록 실패(동시 요청 경합 등)도 조회 결과는 그대로 반환한다", async () => {
    mockAdmin({ cached: undefined, insertError: true });
    const freshEvents = [{ title: "새 현상", time: "22:00", description: "설명" }];
    vi.mocked(fetchAstroEvents).mockResolvedValue(freshEvents);

    const result = await getTodayAstroEvents(DATE);
    expect(result).toEqual(freshEvents);
  });

  it("createAdminSupabase 자체가 던져도(서비스키 미설정) null을 반환한다", async () => {
    vi.mocked(createAdminSupabase).mockImplementation(() => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY 미설정");
    });

    const result = await getTodayAstroEvents(DATE);
    expect(result).toBeNull();
  });
});

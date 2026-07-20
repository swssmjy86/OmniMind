import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchAstroEvents } from "./astro-events";

describe("fetchAstroEvents", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("키가 없으면 던진다(상위 캐시 레이어가 캐치해 조용히 생략)", async () => {
    vi.stubEnv("KASI_SERVICE_KEY", "");
    await expect(fetchAstroEvents({ y: 2026, mo: 8, d: 12 })).rejects.toThrow("kasi:no-key");
  });

  it("HTTP 오류면 던진다", async () => {
    vi.stubEnv("KASI_SERVICE_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchAstroEvents({ y: 2026, mo: 8, d: 12 })).rejects.toThrow("kasi:http-500");
  });

  it("요청 파라미터(solYear/solMonth)를 올바르게 담아 호출한다", async () => {
    vi.stubEnv("KASI_SERVICE_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: { body: { items: { item: [] } } } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAstroEvents({ y: 2026, mo: 8, d: 12 });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("AstroEventInfoService/getAstroEventInfo");
    expect(url).toContain("solYear=2026");
    expect(url).toContain("solMonth=08");
    expect(url).toContain("ServiceKey=test-key");
  });

  it("그날(solDay) locdate만 걸러 반환한다", async () => {
    vi.stubEnv("KASI_SERVICE_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            response: {
              body: {
                items: {
                  item: [
                    { locdate: "20260811", astroTitle: "다른 날 현상", astroTime: "01:00", astroEvent: "설명" },
                    { locdate: "20260812", astroTitle: "페르세우스 유성우 극대", astroTime: "23:00", astroEvent: "시간당 다수 관측" },
                  ],
                },
              },
            },
          }),
      }),
    );

    const events = await fetchAstroEvents({ y: 2026, mo: 8, d: 12 });
    expect(events).toEqual([
      { title: "페르세우스 유성우 극대", time: "23:00", description: "시간당 다수 관측" },
    ]);
  });

  it("그날 항목이 하나도 없으면 빈 배열(에러 아님)", async () => {
    vi.stubEnv("KASI_SERVICE_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            response: { body: { items: { item: [{ locdate: "20260811", astroTitle: "다른 날" }] } } },
          }),
      }),
    );

    const events = await fetchAstroEvents({ y: 2026, mo: 8, d: 12 });
    expect(events).toEqual([]);
  });

  it("item이 단일 객체(배열 아님)로 와도 처리한다", async () => {
    vi.stubEnv("KASI_SERVICE_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            response: {
              body: {
                items: {
                  item: { locdate: "20260812", astroTitle: "단일 현상", astroTime: "10:00", astroEvent: "설명" },
                },
              },
            },
          }),
      }),
    );

    const events = await fetchAstroEvents({ y: 2026, mo: 8, d: 12 });
    expect(events).toEqual([{ title: "단일 현상", time: "10:00", description: "설명" }]);
  });
});

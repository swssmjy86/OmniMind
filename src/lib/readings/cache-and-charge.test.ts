import { describe, expect, it, vi } from "vitest";
import { cacheAndCharge } from "./cache-and-charge";
import type { InterpretationSection } from "@/lib/interpret/types";

const sections: InterpretationSection[] = [{ title: "우리의 온도", body: "두 분의 온도는 78°예요." }];

// insert().select().single() → select().eq().eq().eq().maybeSingle() → rpc() 체인을 흉내낸다(ensure-profile.test.ts 스타일).
function makeSupabase(opts: {
  insertError?: unknown;
  insertedId?: string | null;
  existing?: { id: string; sections: InterpretationSection[] } | null;
  rpcData?: number | null;
  rpcThrows?: boolean;
}) {
  const single = vi.fn().mockResolvedValue({
    data: opts.insertError ? null : { id: opts.insertedId ?? "r-new" },
    error: opts.insertError ?? null,
  });
  const insertSelect = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select: insertSelect }));
  const maybeSingle = vi.fn().mockResolvedValue({ data: opts.existing ?? null });
  const eq3 = vi.fn(() => ({ maybeSingle }));
  const eq2 = vi.fn(() => ({ eq: eq3 }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  const from = vi.fn(() => ({ insert, select }));
  const rpc = opts.rpcThrows
    ? vi.fn().mockRejectedValue(new Error("rpc down"))
    : vi.fn().mockResolvedValue({ data: opts.rpcData ?? null });
  return { from, rpc, insert, insertSelect, single, select, maybeSingle, eq1, eq2, eq3 } as never;
}

describe("cacheAndCharge (unlock 액션 공용 머니 패스)", () => {
  it("insert 성공 + consumesCredit → RPC로 차감, remaining=RPC 반환값, outcome charged", async () => {
    const supabase = makeSupabase({ rpcData: 3 });
    const out = await cacheAndCharge({
      supabase, userId: "u1", product: "match", hash: "h1",
      sections, consumesCredit: true, remainingNow: 4,
    });
    expect(out).toEqual({
      sections, usedCredit: true, remaining: 3, outcome: "charged", readingId: "r-new",
    });
    expect((supabase as { rpc: ReturnType<typeof vi.fn> }).rpc).toHaveBeenCalledWith("consume_consult_credit");
  });

  it("insert 성공 + consumesCredit=false(프리미엄) → RPC 미호출, remaining=remainingNow", async () => {
    const supabase = makeSupabase({});
    const out = await cacheAndCharge({
      supabase, userId: "u1", product: "match", hash: "h1",
      sections, consumesCredit: false, remainingNow: 999,
    });
    expect(out).toEqual({
      sections, usedCredit: false, remaining: 999, outcome: "charged", readingId: "r-new",
    });
    expect((supabase as { rpc: ReturnType<typeof vi.fn> }).rpc).not.toHaveBeenCalled();
  });

  it("insert 실패 + 기존 행 존재 → 그 행의 sections 반환, RPC 미호출, outcome dedup", async () => {
    const existingSections: InterpretationSection[] = [{ title: "기존", body: "이미 캐시됨" }];
    const supabase = makeSupabase({
      insertError: new Error("dup"), existing: { id: "r-old", sections: existingSections },
    });
    const out = await cacheAndCharge({
      supabase, userId: "u1", product: "match", hash: "h1",
      sections, consumesCredit: true, remainingNow: 4,
    });
    expect(out).toEqual({
      sections: existingSections, usedCredit: false, remaining: 4, outcome: "dedup",
      readingId: "r-old",
    });
    expect((supabase as { rpc: ReturnType<typeof vi.fn> }).rpc).not.toHaveBeenCalled();
  });

  it("insert 실패 + 기존 행 없음 → 전달한 sections 그대로, RPC 미호출, outcome uncached", async () => {
    const supabase = makeSupabase({ insertError: new Error("migration missing"), existing: null });
    const out = await cacheAndCharge({
      supabase, userId: "u1", product: "match", hash: "h1",
      sections, consumesCredit: true, remainingNow: 4,
    });
    expect(out).toEqual({
      sections, usedCredit: false, remaining: 4, outcome: "uncached", readingId: null,
    });
    expect((supabase as { rpc: ReturnType<typeof vi.fn> }).rpc).not.toHaveBeenCalled();
  });

  it("insert 성공 + RPC null(잔액 경합) → remaining=0, usedCredit=false, outcome charged", async () => {
    const supabase = makeSupabase({ rpcData: null });
    const out = await cacheAndCharge({
      supabase, userId: "u1", product: "match", hash: "h1",
      sections, consumesCredit: true, remainingNow: 4,
    });
    expect(out).toEqual({
      sections, usedCredit: false, remaining: 0, outcome: "charged", readingId: "r-new",
    });
  });

  it("insert 성공 + RPC throw → 차감 실패로 처리(재시도 없음, remaining은 그대로, 콘텐츠는 이미 캐시됨)", async () => {
    const supabase = makeSupabase({ rpcThrows: true });
    const out = await cacheAndCharge({
      supabase, userId: "u1", product: "match", hash: "h1",
      sections, consumesCredit: true, remainingNow: 4,
    });
    expect(out).toEqual({
      sections, usedCredit: false, remaining: 4, outcome: "charged", readingId: "r-new",
    });
  });
});

// 토스페이먼츠 결제 승인 API — 서버 전용 (TOSS_SECRET_KEY 사용).
// 결제창에서 인증이 끝나면 successUrl로 paymentKey가 오고,
// 이 confirm 호출이 성공해야 실제로 돈이 결제된다.

export type TossConfirm =
  | { ok: true; raw: Record<string, unknown> }
  | { ok: false; code: string; message: string };

export async function confirmTossPayment(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirm> {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) return { ok: false, code: "NO_SECRET_KEY", message: "결제 설정이 아직 준비되지 않았어요." };

  try {
    const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      return {
        ok: false,
        code: String(body?.code ?? "CONFIRM_FAILED"),
        message: String(body?.message ?? "결제 승인에 실패했어요."),
      };
    }
    return { ok: true, raw: body ?? {} };
  } catch {
    return { ok: false, code: "NETWORK", message: "결제 승인 요청이 닿지 못했어요. 잠시 후 다시 시도해주세요." };
  }
}

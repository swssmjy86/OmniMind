"use server";

import { recordEvent, type EventProps } from "./events";
import { isClientEvent } from "./names";

/** 클라이언트발 이벤트 기록 — 화이트리스트 밖 이름은 버린다. */
export async function recordClientEvent(name: string, props: EventProps = {}): Promise<void> {
  if (!isClientEvent(name)) return;
  await recordEvent(name, props);
}

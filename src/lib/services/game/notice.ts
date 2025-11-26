// src/lib/services/game/events.ts
import { writable } from "svelte/store";

export const noticeEvent = writable<string | null>(null);

export function showNotice(message: string, duration = 2000) {
  noticeEvent.set(message);
  setTimeout(() => noticeEvent.set(null), duration);
}

import type { WarmupItem } from "./types";
import { getWarmupHistory, saveWarmupHistory, type WarmupHistoryEntry } from "./store";

/**
 * Seeded PRNG (mulberry32) — same seed = same sequence.
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function seedFromDate(dateStr: string, shuffleCounter = 0): number {
  let hash = 0;
  const s = dateStr + "_" + shuffleCounter;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return hash;
}

function pickOne<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** Build a 6-item warmup routine plus 3 cooldown items. */
export function buildRoutine(
  items: WarmupItem[],
  shuffleCounter = 0
): { routine: WarmupItem[]; cooldown: WarmupItem[] } {
  const today = todayKey();
  const seed = seedFromDate(today, shuffleCounter);
  const rand = mulberry32(seed);

  const history = getWarmupHistory();
  const recentIds = new Set(history.slice(-3).flatMap((h) => h.itemIds));

  function pickCategory(category: WarmupItem["category"]): WarmupItem {
    const pool = items.filter((i) => i.category === category && !i.tags.includes("always-first") && !i.tags.includes("cooldown"));
    const fresh = pool.filter((i) => !recentIds.has(i.id));
    const source = fresh.length > 0 ? fresh : pool;
    return pickOne(source.length > 0 ? source : items.filter((i) => i.category === category), rand);
  }

  const grounding = items.find((i) => i.tags.includes("always-first"))!;
  const breath = pickCategory("breath");
  const body1 = pickCategory("body");
  const body2 = (() => {
    const pool = items.filter((i) => i.category === "body" && i.id !== body1.id);
    const fresh = pool.filter((i) => !recentIds.has(i.id));
    const source = fresh.length > 0 ? fresh : pool;
    return pickOne(source.length > 0 ? source : items.filter((i) => i.category === "body"), rand);
  })();
  const face = pickCategory("face");
  const vocal1 = pickCategory("vocal");
  const vocal2 = (() => {
    const pool = items.filter((i) => i.category === "vocal" && i.id !== vocal1.id);
    const fresh = pool.filter((i) => !recentIds.has(i.id));
    const source = fresh.length > 0 ? fresh : pool;
    return pickOne(source.length > 0 ? source : items.filter((i) => i.category === "vocal"), rand);
  })();

  const routine = [grounding, breath, body1, body2, face, vocal1, vocal2].filter(Boolean);

  // Cooldown: shoulder rolls + 1-2 woo glides + yawns
  const cooldownPool = items.filter((i) => i.category === "cooldown" || i.tags.includes("cooldown"));
  const shoulders = cooldownPool.find((i) => i.id === "shoulder-rolls");
  const wooItems = cooldownPool.filter((i) => i.id.startsWith("woo-"));
  const woo = pickOne(wooItems.length > 0 ? wooItems : cooldownPool, rand);
  const yawns = cooldownPool.find((i) => i.id === "few-yawns") ?? cooldownPool[0];
  const cooldown = [shoulders, woo, yawns].filter(Boolean) as WarmupItem[];

  // Update history
  const allIds = [...routine, ...cooldown].map((i) => i.id);
  const existing = history.filter((h) => h.date !== today);
  saveWarmupHistory([...existing, { date: today, itemIds: allIds }]);

  return { routine, cooldown };
}

/** Get the shuffle counter for today, stored in localStorage. */
export function getShuffleCounter(): number {
  try {
    const raw = localStorage.getItem("vt_shuffle_" + todayKey());
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function incrementShuffle(): number {
  const today = todayKey();
  const next = getShuffleCounter() + 1;
  try {
    localStorage.setItem("vt_shuffle_" + today, String(next));
  } catch {}
  return next;
}

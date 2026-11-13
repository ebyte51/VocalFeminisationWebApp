"use client";
import { create } from "zustand";
import type { AppSettings, Recording, Session, CalibrationProfile } from "./types";
import { DEFAULT_SETTINGS } from "./types";

// ─── Settings store ───────────────────────────────────────────────────────────

interface SettingsState {
  settings: AppSettings;
  setSettings: (patch: Partial<AppSettings>) => void;
  loadSettings: () => void;
}

function persistSettings(s: AppSettings) {
  try {
    localStorage.setItem("vt_settings", JSON.stringify(s));
  } catch {}
}

function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem("vt_settings");
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loadSettings: () => {
    const s = readSettings();
    set({ settings: s });
  },
  setSettings: (patch) =>
    set((state) => {
      const next = { ...state.settings, ...patch };
      persistSettings(next);
      return { settings: next };
    }),
}));

// ─── Session tracker ─────────────────────────────────────────────────────────

interface SessionState {
  sessionId: string | null;
  startedAt: number | null;
  activeSeconds: number;
  techniqueIds: string[];
  recordingIds: string[];
  startSession: () => void;
  addActiveTime: (seconds: number) => void;
  addTechnique: (id: string) => void;
  addRecording: (id: string) => void;
  endSession: () => Session | null;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  startedAt: null,
  activeSeconds: 0,
  techniqueIds: [],
  recordingIds: [],
  startSession: () =>
    set({
      sessionId: makeId(),
      startedAt: Date.now(),
      activeSeconds: 0,
      techniqueIds: [],
      recordingIds: [],
    }),
  addActiveTime: (seconds) =>
    set((s) => ({ activeSeconds: s.activeSeconds + seconds })),
  addTechnique: (id) =>
    set((s) => ({
      techniqueIds: s.techniqueIds.includes(id)
        ? s.techniqueIds
        : [...s.techniqueIds, id],
    })),
  addRecording: (id) =>
    set((s) => ({ recordingIds: [...s.recordingIds, id] })),
  endSession: () => {
    const s = get();
    if (!s.sessionId || !s.startedAt) return null;
    const session: Session = {
      id: s.sessionId,
      startedAt: s.startedAt,
      endedAt: Date.now(),
      activeSeconds: s.activeSeconds,
      techniqueIds: s.techniqueIds,
      feeling: null,
      note: "",
      recordingIds: s.recordingIds,
    };
    set({ sessionId: null, startedAt: null, activeSeconds: 0, techniqueIds: [], recordingIds: [] });
    return session;
  },
}));

// ─── Warmup history ───────────────────────────────────────────────────────────

export interface WarmupHistoryEntry {
  date: string; // YYYY-MM-DD
  itemIds: string[];
}

export function getWarmupHistory(): WarmupHistoryEntry[] {
  try {
    const raw = localStorage.getItem("vt_warmup_history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWarmupHistory(history: WarmupHistoryEntry[]) {
  try {
    localStorage.setItem("vt_warmup_history", JSON.stringify(history.slice(-30)));
  } catch {}
}

// ─── Last-used technique ──────────────────────────────────────────────────────

export function getLastTechnique(): string | null {
  try {
    return localStorage.getItem("vt_last_technique");
  } catch {
    return null;
  }
}

export function setLastTechnique(id: string) {
  try {
    localStorage.setItem("vt_last_technique", id);
  } catch {}
}

// ─── Custom phrases ────────────────────────────────────────────────────────────

export interface CustomPhrase {
  id: string;
  text: string;
  techniqueIds: string[];
}

export function getCustomPhrases(): CustomPhrase[] {
  try {
    const raw = localStorage.getItem("vt_custom_phrases");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPhrases(phrases: CustomPhrase[]) {
  try {
    localStorage.setItem("vt_custom_phrases", JSON.stringify(phrases));
  } catch {}
}

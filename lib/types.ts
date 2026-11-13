// ─── Techniques ──────────────────────────────────────────────────────────────

export interface PitchPreset {
  targets: string[]; // e.g. ["E3", "F3", "G3"]
  window: number;    // seconds
  mode: "free" | "hum" | "contour" | "sirens" | "resonance";
}

export interface Technique {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  why: string;
  phrases: string[];
  pitchPreset: PitchPreset | null;
  related: string[];
  source: number;
}

// ─── Warm-ups ────────────────────────────────────────────────────────────────

export type WarmupCategory = "grounding" | "breath" | "body" | "face" | "vocal" | "cooldown";

export interface WarmupItem {
  id: string;
  category: WarmupCategory;
  title: string;
  instructions: string;
  timerSeconds: number | null;
  reps: number | null;
  tags: string[];
  tip?: string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export type TargetRangeMode = "off" | "example" | "custom";

export interface TargetRange {
  mode: TargetRangeMode;
  lowMidi: number;  // E3 = 52
  highMidi: number; // G3 = 55
}

export interface AppSettings {
  onboardingDone: boolean;
  highlightExamplePitches: boolean;
  targetRange: TargetRange;
  referenceTones: boolean;
  windowSeconds: number;
  appearance: "light" | "dark" | "system";
  reminderMinutes: number;
  reminderEnabled: boolean;
  calibrationProfileId: string | null;
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  onboardingDone: false,
  highlightExamplePitches: false,
  targetRange: { mode: "off", lowMidi: 52, highMidi: 55 },
  referenceTones: false,
  windowSeconds: 20,
  appearance: "system",
  reminderMinutes: 20,
  reminderEnabled: true,
  calibrationProfileId: null,
  reducedMotion: false,
};

// ─── Recordings ──────────────────────────────────────────────────────────────

export interface PitchPoint {
  hz: number;      // 0 = unvoiced
  clarity: number; // 0-1
}

export interface Recording {
  id: string;
  createdAt: number;
  name: string;
  techniqueId?: string;
  mime: string;
  audioBlob: Blob;
  pitchTrack: PitchPoint[]; // at ~100 pts/s
  durationMs: number;
}

// ─── Practice log ────────────────────────────────────────────────────────────

export type Feeling = "comfortable" | "tired" | "strained";

export interface Session {
  id: string;
  startedAt: number;
  endedAt: number;
  activeSeconds: number;
  techniqueIds: string[];
  feeling: Feeling | null;
  note: string;
  recordingIds: string[];
}

// ─── Calibration ─────────────────────────────────────────────────────────────

export interface ResonanceAnchors {
  warm: number;
  bright: number;
  breathy: number;
  full: number;
  check: number;
}

export interface CalibrationProfile {
  id: string;
  name: string;
  anchors: ResonanceAnchors;
  createdAt: number;
}

// ─── MIDI helpers ─────────────────────────────────────────────────────────────

/** Convert frequency in Hz to MIDI note number. */
export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

/** Convert MIDI note number to frequency in Hz. */
export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Convert MIDI note number to note name, e.g. 52 → "E3". */
export function midiToName(midi: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const name = noteNames[midi % 12];
  return `${name}${octave}`;
}

/** Parse a note name like "E3" to MIDI number. Returns null if unrecognised. */
export function nameToMidi(name: string): number | null {
  const match = name.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return null;
  const noteMap: Record<string, number> = {
    C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
    "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
  };
  const semitone = noteMap[match[1]];
  if (semitone === undefined) return null;
  const octave = parseInt(match[2], 10);
  return (octave + 1) * 12 + semitone;
}

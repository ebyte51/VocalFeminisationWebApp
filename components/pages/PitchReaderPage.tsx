"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSettingsStore } from "@/lib/store";
import { PitchReader, playTone, stopTone } from "@/lib/audio";
import { saveRecording } from "@/lib/db";
import { hzToMidi, midiToName, midiToHz, nameToMidi } from "@/lib/types";
import type { PitchPoint, Recording } from "@/lib/types";

// ─── Layout constants — every pixel calculation derives from these ────────────
const MIN_MIDI = 36; // C2  — low enough for any speaking voice
const MAX_MIDI = 72; // C5  — high enough for practice range
const TOTAL_SEMITONES = MAX_MIDI - MIN_MIDI; // 36
const ROW_PX = 24;   // pixels per semitone row — ruler and graph must match
const TOTAL_HEIGHT = TOTAL_SEMITONES * ROW_PX; // 864 px
const POINTS_PER_SECOND = 50;
const SHARP_NOTES = new Set([1, 3, 6, 8, 10]);

/** y-pixel for the centre of a given MIDI note (top of canvas = highest note) */
function midiToY(midi: number): number {
  return (MAX_MIDI - midi) * ROW_PX - ROW_PX / 2;
}

export default function PitchReaderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { settings } = useSettingsStore();

  const targetsParam  = searchParams.get("targets");
  const windowParam   = searchParams.get("window");
  const phraseParam   = searchParams.get("phrase");
  const fromParam     = searchParams.get("from");
  const windowSeconds = windowParam ? parseInt(windowParam, 10) : settings.windowSeconds;

  // ─── State ─────────────────────────────────────────────────────────────────
  const [isListening,   setIsListening]   = useState(false);
  const [isRecording,   setIsRecording]   = useState(false);
  const [currentHz,     setCurrentHz]     = useState(0);
  const [currentMidi,   setCurrentMidi]   = useState(0);
  const [currentCents,  setCurrentCents]  = useState(0);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);
  const [savedName,     setSavedName]     = useState("");
  const [showSave,      setShowSave]      = useState(false);
  const [pendingBlob,   setPendingBlob]   = useState<{
    blob: Blob; mime: string; track: PitchPoint[]; durationMs: number;
  } | null>(null);
  const [playbackAudio, setPlaybackAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying,     setIsPlaying]     = useState(false);

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const readerRef      = useRef<PitchReader | null>(null);
  const rulerRef       = useRef<HTMLCanvasElement>(null);
  const graphRef       = useRef<HTMLCanvasElement>(null);
  const pitchTrack     = useRef<PitchPoint[]>([]);
  const rafRef         = useRef<number>(0);
  const graphWidthRef  = useRef<number>(0);

  // ─── Ruler — drawn once, purely pixel-perfect ────────────────────────────
  const drawRuler = useCallback(() => {
    const canvas = rulerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set bitmap size explicitly
    canvas.width  = 60;
    canvas.height = TOTAL_HEIGHT;

    const { lowMidi, highMidi } = settings.targetRange;
    const hasTarget = settings.targetRange.mode !== "off";

    for (let midi = MIN_MIDI; midi < MAX_MIDI; midi++) {
      const y       = (MAX_MIDI - midi - 1) * ROW_PX;
      const isSharp = SHARP_NOTES.has(midi % 12);
      const isTarget = hasTarget && midi >= lowMidi && midi <= highMidi;

      ctx.fillStyle = isTarget ? "#fce7f3" : isSharp ? "#dbe8f5" : "#f8fafc";
      ctx.fillRect(0, y, 60, ROW_PX);

      // Separator line
      ctx.strokeStyle = midi % 12 === 0 ? "#94a3b8" : "#e2e8f0";
      ctx.lineWidth   = midi % 12 === 0 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(60, y);
      ctx.stroke();

      // Label every natural note
      if (!isSharp) {
        const name = midiToName(midi);
        ctx.fillStyle = isTarget ? "#1c2541" : "#6b7280";
        ctx.font = midi % 12 === 0
          ? "bold 10px Inter,system-ui,sans-serif"
          : "10px Inter,system-ui,sans-serif";
        ctx.fillText(name, 5, y + ROW_PX - 7);
      }
    }
  }, [settings.targetRange]);

  // ─── Graph — redrawn every frame via rAF ─────────────────────────────────
  const drawGraph = useCallback(() => {
    const canvas = graphRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    if (W === 0 || H === 0) {
      rafRef.current = requestAnimationFrame(drawGraph);
      return;
    }

    ctx.clearRect(0, 0, W, H);

    // Background rows
    for (let midi = MIN_MIDI; midi < MAX_MIDI; midi++) {
      const y = (MAX_MIDI - midi - 1) * ROW_PX;
      ctx.fillStyle = SHARP_NOTES.has(midi % 12) ? "#f1f5f9" : "#ffffff";
      ctx.fillRect(0, y, W, ROW_PX);
    }

    // Target band
    if (settings.targetRange.mode !== "off") {
      const { lowMidi, highMidi } = settings.targetRange;
      const bandTop = (MAX_MIDI - highMidi - 1) * ROW_PX;
      const bandH   = (highMidi - lowMidi + 1) * ROW_PX;
      ctx.fillStyle = "rgba(245,169,184,0.18)";
      ctx.fillRect(0, bandTop, W, bandH);
    }

    // Pitch line
    const track       = pitchTrack.current;
    const totalPts    = windowSeconds * POINTS_PER_SECOND;
    const startIdx    = Math.max(0, track.length - totalPts);
    const visible     = track.slice(startIdx);

    ctx.strokeStyle = "#5BCEFA";
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = "round";
    ctx.lineCap     = "round";
    ctx.beginPath();

    let inLine = false;
    visible.forEach((pt, i) => {
      const x = (i / totalPts) * W;
      if (pt.hz < 50) { inLine = false; return; }
      // midiToY gives centre of that note's row
      const y = midiToY(hzToMidi(pt.hz));
      if (!inLine) { ctx.moveTo(x, y); inLine = true; }
      else          ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Trailing dot on last voiced point
    const last = [...visible].reverse().find((p) => p.hz > 50);
    if (last) {
      const y = midiToY(hzToMidi(last.hz));
      ctx.fillStyle = "rgba(91,206,250,0.5)";
      ctx.beginPath();
      ctx.arc(W - 6, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Playback cursor
    if (isPlaying && playbackAudio) {
      const prog = playbackAudio.currentTime / (playbackAudio.duration || 1);
      ctx.strokeStyle = "#F5A9B8";
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(prog * W, 0);
      ctx.lineTo(prog * W, H);
      ctx.stroke();
    }

    rafRef.current = requestAnimationFrame(drawGraph);
  }, [settings.targetRange, windowSeconds, isPlaying, playbackAudio]);

  // ─── Size the graph canvas to match its CSS container ──────────────────────
  // This is what was broken before — the bitmap must match layout pixels.
  useEffect(() => {
    const canvas = graphRef.current;
    if (!canvas) return;

    function sync() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr  = window.devicePixelRatio || 1;
      // Bitmap width tracks the CSS width; height is always fixed to TOTAL_HEIGHT
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== TOTAL_HEIGHT) {
        canvas.width  = Math.round(rect.width * dpr);
        canvas.height = TOTAL_HEIGHT;
        // Scale context for DPR so coordinates are in CSS px
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.scale(dpr, 1);
        graphWidthRef.current = rect.width;
      }
    }

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // ─── Start rAF loop ───────────────────────────────────────────────────────
  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawGraph);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawGraph]);

  // ─── Draw ruler on mount / settings change ────────────────────────────────
  useEffect(() => { drawRuler(); }, [drawRuler]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      readerRef.current?.stop();
      stopTone();
    };
  }, []);

  // ─── Audio controls ───────────────────────────────────────────────────────
  async function startListening() {
    try {
      const r = new PitchReader();
      readerRef.current = r;
      await r.start((pt) => {
        pitchTrack.current.push(pt);
        if (pitchTrack.current.length > 5 * 60 * POINTS_PER_SECOND)
          pitchTrack.current = pitchTrack.current.slice(-5 * 60 * POINTS_PER_SECOND);
        if (pt.hz > 50) {
          setCurrentHz(pt.hz);
          const midi = hzToMidi(pt.hz);
          setCurrentMidi(Math.round(midi));
          setCurrentCents(Math.round((midi - Math.round(midi)) * 100));
        } else {
          setCurrentHz(0);
        }
      });
      setIsListening(true);
      setErrorMsg(null);
    } catch (err) {
      const e = err as Error;
      setErrorMsg(
        e.name === "NotAllowedError"
          ? "Microphone access denied. Please allow it in your browser settings."
          : "Could not start microphone: " + e.message
      );
    }
  }

  function stopListening() {
    readerRef.current?.stop();
    readerRef.current = null;
    setIsListening(false);
    setCurrentHz(0);
  }

  async function toggleRecording() {
    const r = readerRef.current;
    if (!r) return;
    if (isRecording) {
      const result = await r.stopRecordingAsync();
      setIsRecording(false);
      if (result) {
        setPendingBlob({ blob: result.blob, mime: result.mime, track: result.pitchTrack, durationMs: result.durationMs });
        setShowSave(true);
      }
    } else {
      r.startRecording();
      setIsRecording(true);
    }
  }

  async function saveCurrentRecording() {
    if (!pendingBlob) return;
    const rec: Recording = {
      id: `rec-${Date.now()}`,
      createdAt: Date.now(),
      name: savedName || `Recording ${new Date().toLocaleTimeString()}`,
      techniqueId: fromParam ?? undefined,
      mime: pendingBlob.mime,
      audioBlob: pendingBlob.blob,
      pitchTrack: pendingBlob.track,
      durationMs: pendingBlob.durationMs,
    };
    await saveRecording(rec);
    setPendingBlob(null);
    setShowSave(false);
    setSavedName("");
  }

  function playRecording() {
    if (!pendingBlob) return;
    const url   = URL.createObjectURL(pendingBlob.blob);
    const audio = new Audio(url);
    audio.onended      = () => { setIsPlaying(false); setPlaybackAudio(null); };
    audio.ontimeupdate = () => {};
    audio.play();
    setPlaybackAudio(audio);
    setIsPlaying(true);
    pitchTrack.current = pendingBlob.track;
  }

  function stopPlayback() {
    playbackAudio?.pause();
    setIsPlaying(false);
    setPlaybackAudio(null);
  }

  function clearTrack() {
    pitchTrack.current = [];
    setCurrentHz(0);
    setPendingBlob(null);
    stopPlayback();
  }

  function tapRuler(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y    = e.clientY - rect.top;
    // Each row is ROW_PX tall, top row = MAX_MIDI-1
    const midi = MAX_MIDI - 1 - Math.floor(y / ROW_PX);
    const clamped = Math.max(MIN_MIDI, Math.min(MAX_MIDI - 1, midi));
    playTone(midiToHz(clamped));
  }

  // ─── Display values ───────────────────────────────────────────────────────
  const noteLabel  = currentHz > 50 ? midiToName(currentMidi) : "—";
  const hzLabel    = currentHz > 50 ? `${Math.round(currentHz)} Hz` : "";
  const centsLabel = currentHz > 50 && currentCents !== 0
    ? `${currentCents > 0 ? "+" : ""}${currentCents}¢`
    : "";

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-navy overflow-hidden">

      {/* ── Top bar: back nav + readout + start/stop ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-navy z-10 flex-shrink-0">
        {/* Back button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-flag-blue font-semibold text-sm touch-target pr-1 flex-shrink-0"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>

        {/* Note readout */}
        <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
          <span
            className="text-3xl font-bold text-navy dark:text-white leading-none tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {noteLabel}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{hzLabel}</span>
          {centsLabel && (
            <span className={`text-xs font-mono font-semibold ${
              currentCents > 5 ? "text-orange-500" : currentCents < -5 ? "text-blue-500" : "text-green-500"
            }`}>
              {centsLabel}
            </span>
          )}
        </div>

        {/* Start / Stop */}
        {isListening ? (
          <button
            onClick={stopListening}
            className="text-sm font-semibold text-gray-500 dark:text-gray-400 touch-target px-2 flex-shrink-0"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={startListening}
            className="bg-flag-blue text-navy text-sm font-semibold px-4 py-2 rounded-xl touch-target flex-shrink-0"
          >
            Start
          </button>
        )}
      </div>

      {/* Phrase banner */}
      {phraseParam && (
        <div className="bg-tint-pink px-4 py-2 text-sm text-navy font-medium flex-shrink-0">
          🗣 &ldquo;{phraseParam}&rdquo;
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="bg-red-50 px-4 py-2 text-sm text-red-700 flex-shrink-0">{errorMsg}</div>
      )}

      {/* ── Main area: ruler + graph, both scroll together ── */}
      <div className="flex flex-1 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>

        {/* Ruler — fixed 60 px wide, bitmap is always 60×TOTAL_HEIGHT */}
        <canvas
          ref={rulerRef}
          width={60}
          height={TOTAL_HEIGHT}
          style={{ width: 60, height: TOTAL_HEIGHT, flexShrink: 0, cursor: "pointer", touchAction: "none" }}
          onClick={tapRuler}
          aria-label="Note ruler — tap to hear reference tone"
        />

        {/* Graph — fills remaining width, bitmap height always TOTAL_HEIGHT */}
        <canvas
          ref={graphRef}
          style={{ flex: 1, height: TOTAL_HEIGHT, display: "block", minWidth: 0 }}
          aria-label="Live pitch graph"
        />
      </div>

      {/* ── Controls bar ── */}
      <div className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-navy px-4 py-3 safe-pb flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Record */}
          <button
            onClick={toggleRecording}
            disabled={!isListening}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold touch-target transition-colors disabled:opacity-40 ${
              isRecording ? "bg-flag-pink text-navy" : "bg-gray-100 dark:bg-gray-700 text-navy dark:text-white"
            }`}
            aria-pressed={isRecording}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-gray-400"}`} />
            {isRecording ? "Stop" : "Record"}
          </button>

          {/* Play back */}
          {pendingBlob && !isRecording && (
            <button
              onClick={isPlaying ? stopPlayback : playRecording}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold touch-target bg-tint-blue text-navy"
            >
              {isPlaying ? "⏹" : "▶"} {isPlaying ? "Stop" : "Play"}
            </button>
          )}

          <span className="flex-1" />

          {/* Clear */}
          <button
            onClick={clearTrack}
            className="text-sm text-gray-400 touch-target px-2"
          >
            Clear
          </button>

          {/* Window */}
          <select
            defaultValue={windowSeconds}
            className="text-sm bg-gray-100 dark:bg-gray-700 text-navy dark:text-white rounded-lg px-2 py-1.5 touch-target border-none"
            aria-label="Window length"
          >
            <option value={10}>10s</option>
            <option value={20}>20s</option>
            <option value={30}>30s</option>
          </select>
        </div>

        {/* Save dialog */}
        {showSave && pendingBlob && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={savedName}
              onChange={(e) => setSavedName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveCurrentRecording()}
              placeholder={`Recording ${new Date().toLocaleTimeString()}`}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-flag-blue"
              autoFocus
            />
            <button onClick={saveCurrentRecording} className="bg-flag-blue text-navy text-sm font-semibold px-4 rounded-xl touch-target">Save</button>
            <button onClick={() => { setPendingBlob(null); setShowSave(false); }} className="text-gray-400 text-sm px-2 touch-target">Discard</button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useSettingsStore } from "@/lib/store";
import { PitchReader, playTone, stopTone, isTonePlaying } from "@/lib/audio";
import { saveRecording } from "@/lib/db";
import { hzToMidi, midiToName, midiToHz, nameToMidi } from "@/lib/types";
import type { PitchPoint, Recording } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTES_PER_OCTAVE = 12;
const MIN_MIDI = 28; // E1
const MAX_MIDI = 76; // E5
const NOTE_ROW_HEIGHT = 22; // px per semitone
const POINTS_PER_SECOND = 50; // screen resolution
const SHARP_NOTES = new Set([1, 3, 6, 8, 10]); // C#, D#, F#, G#, A#

function noteColor(midi: number) {
  return SHARP_NOTES.has(midi % 12) ? "#e8f0f8" : "#ffffff";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PitchReaderPage() {
  const searchParams = useSearchParams();
  const { settings } = useSettingsStore();

  // Parse query params
  const targetsParam = searchParams.get("targets");
  const windowParam = searchParams.get("window");
  const modeParam = searchParams.get("mode");
  const phraseParam = searchParams.get("phrase");
  const fromParam = searchParams.get("from");

  const presetTargets = targetsParam
    ? targetsParam.split(",").map((n) => nameToMidi(n.trim())).filter(Boolean) as number[]
    : [];
  const windowSeconds = windowParam ? parseInt(windowParam, 10) : settings.windowSeconds;

  // State
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentHz, setCurrentHz] = useState(0);
  const [currentMidi, setCurrentMidi] = useState(0);
  const [currentCents, setCurrentCents] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHeadphonesBanner, setShowHeadphonesBanner] = useState(false);
  const [playingToneMidi, setPlayingToneMidi] = useState<number | null>(null);
  const [savedName, setSavedName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [pendingBlob, setPendingBlob] = useState<{ blob: Blob; mime: string; track: PitchPoint[]; durationMs: number } | null>(null);
  const [playbackAudio, setPlaybackAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Refs
  const pitchReaderRef = useRef<PitchReader | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rulerRef = useRef<HTMLCanvasElement>(null);
  const pitchTrackRef = useRef<PitchPoint[]>([]);
  const rafRef = useRef<number>(0);
  const scrollMidi = useRef((MIN_MIDI + MAX_MIDI) / 2);

  // ─── Draw ruler ─────────────────────────────────────────────────────────────

  const drawRuler = useCallback(() => {
    const canvas = rulerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const totalMidi = MAX_MIDI - MIN_MIDI;
    const height = totalMidi * NOTE_ROW_HEIGHT;
    canvas.height = height;
    canvas.width = 60;

    // Target range
    const highlightLow = settings.targetRange.mode !== "off" ? settings.targetRange.lowMidi : null;
    const highlightHigh = settings.targetRange.mode !== "off" ? settings.targetRange.highMidi : null;

    for (let midi = MIN_MIDI; midi < MAX_MIDI; midi++) {
      const y = (MAX_MIDI - 1 - midi) * NOTE_ROW_HEIGHT;
      const isSharp = SHARP_NOTES.has(midi % 12);
      const isHighlighted = highlightLow !== null && midi >= highlightLow && midi <= highlightHigh!;

      ctx.fillStyle = isHighlighted
        ? "#fce7f3"
        : isSharp ? "#dbe8f5" : "#f8fafc";
      ctx.fillRect(0, y, 60, NOTE_ROW_HEIGHT);

      // Note label
      const name = midiToName(midi);
      const isC = midi % 12 === 0;
      const isE = midi % 12 === 4;
      const isG = midi % 12 === 7;

      if (!isSharp) {
        ctx.font = isC ? "bold 10px Inter, system-ui" : "10px Inter, system-ui";
        ctx.fillStyle = isHighlighted ? "#1c2541" : "#6b7280";
        ctx.fillText(name, 6, y + 15);
      }

      // Separator
      ctx.strokeStyle = isC ? "#94a3b8" : "#e2e8f0";
      ctx.lineWidth = isC ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(60, y);
      ctx.stroke();
    }
  }, [settings.targetRange]);

  // ─── Draw graph ──────────────────────────────────────────────────────────────

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const totalMidi = MAX_MIDI - MIN_MIDI;
    const totalHeight = totalMidi * NOTE_ROW_HEIGHT;
    const width = canvas.width;

    ctx.clearRect(0, 0, width, totalHeight);

    // Background bands
    for (let midi = MIN_MIDI; midi < MAX_MIDI; midi++) {
      const y = (MAX_MIDI - 1 - midi) * NOTE_ROW_HEIGHT;
      const isSharp = SHARP_NOTES.has(midi % 12);
      ctx.fillStyle = isSharp ? "#f1f5f9" : "#ffffff";
      ctx.fillRect(0, y, width, NOTE_ROW_HEIGHT);
    }

    // Highlighted target band
    if (settings.targetRange.mode !== "off") {
      const { lowMidi, highMidi } = settings.targetRange;
      const bandY = (MAX_MIDI - 1 - highMidi) * NOTE_ROW_HEIGHT;
      const bandH = (highMidi - lowMidi + 1) * NOTE_ROW_HEIGHT;
      ctx.fillStyle = "rgba(245,169,184,0.15)";
      ctx.fillRect(0, bandY, width, bandH);
    }

    // Pitch line
    const track = pitchTrackRef.current;
    const totalPoints = windowSeconds * POINTS_PER_SECOND;
    const startIdx = Math.max(0, track.length - totalPoints);
    const visiblePoints = track.slice(startIdx);

    if (visiblePoints.length < 2) {
      rafRef.current = requestAnimationFrame(drawGraph);
      return;
    }

    ctx.strokeStyle = "#5BCEFA";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();

    let inLine = false;
    visiblePoints.forEach((pt, i) => {
      const x = (i / totalPoints) * width;
      if (pt.hz < 50) {
        inLine = false;
        return;
      }
      const midi = hzToMidi(pt.hz);
      const y = (MAX_MIDI - 1 - midi) * NOTE_ROW_HEIGHT + NOTE_ROW_HEIGHT / 2;
      if (!inLine) {
        ctx.moveTo(x, y);
        inLine = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Last voiced dot
    const lastVoiced = [...visiblePoints].reverse().find((p) => p.hz > 50);
    if (lastVoiced) {
      const midi = hzToMidi(lastVoiced.hz);
      const y = (MAX_MIDI - 1 - midi) * NOTE_ROW_HEIGHT + NOTE_ROW_HEIGHT / 2;
      ctx.fillStyle = "rgba(91,206,250,0.4)";
      ctx.beginPath();
      ctx.arc(width - 4, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Playback cursor
    if (isPlaying && playbackAudio) {
      const prog = playbackAudio.currentTime / (playbackAudio.duration || 1);
      const cx = prog * width;
      ctx.strokeStyle = "#F5A9B8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, totalHeight);
      ctx.stroke();
    }

    rafRef.current = requestAnimationFrame(drawGraph);
  }, [settings.targetRange, windowSeconds, isPlaying, playbackAudio]);

  // ─── Start / stop pitch detection ────────────────────────────────────────────

  async function startListening() {
    try {
      const reader = new PitchReader();
      pitchReaderRef.current = reader;
      await reader.start((pt) => {
        pitchTrackRef.current.push(pt);
        // Keep last 5 minutes worth
        if (pitchTrackRef.current.length > 5 * 60 * POINTS_PER_SECOND) {
          pitchTrackRef.current = pitchTrackRef.current.slice(-5 * 60 * POINTS_PER_SECOND);
        }
        if (pt.hz > 50) {
          setCurrentHz(pt.hz);
          const midi = hzToMidi(pt.hz);
          setCurrentMidi(Math.round(midi));
          const cents = (midi - Math.round(midi)) * 100;
          setCurrentCents(Math.round(cents));
        }
      });
      setIsListening(true);
      setErrorMsg(null);
    } catch (err) {
      const e = err as Error;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setErrorMsg("Microphone access denied. Please allow it in your browser settings.");
      } else {
        setErrorMsg("Could not start the microphone: " + e.message);
      }
    }
  }

  function stopListening() {
    pitchReaderRef.current?.stop();
    pitchReaderRef.current = null;
    setIsListening(false);
    setCurrentHz(0);
  }

  async function toggleRecording() {
    const reader = pitchReaderRef.current;
    if (!reader) return;
    if (isRecording) {
      const result = await reader.stopRecordingAsync();
      setIsRecording(false);
      if (result) {
        setPendingBlob({ blob: result.blob, mime: result.mime, track: result.pitchTrack, durationMs: result.durationMs });
        setShowSave(true);
      }
    } else {
      reader.startRecording();
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
    const url = URL.createObjectURL(pendingBlob.blob);
    const audio = new Audio(url);
    audio.onended = () => {
      setIsPlaying(false);
      setPlaybackProgress(0);
    };
    audio.ontimeupdate = () => {
      setPlaybackProgress(audio.currentTime / (audio.duration || 1));
    };
    audio.play();
    setPlaybackAudio(audio);
    setIsPlaying(true);
    // Overlay pitch track for playback
    pitchTrackRef.current = pendingBlob.track;
  }

  function stopPlayback() {
    playbackAudio?.pause();
    setIsPlaying(false);
    setPlaybackAudio(null);
  }

  function clearTrack() {
    pitchTrackRef.current = [];
    setCurrentHz(0);
    setPendingBlob(null);
    setIsPlaying(false);
    setPlaybackAudio(null);
  }

  function tapNote(midi: number) {
    if (!settings.referenceTones && modeParam !== "hum") {
      setShowHeadphonesBanner(true);
      setTimeout(() => setShowHeadphonesBanner(false), 3000);
    }
    if (playingToneMidi === midi) {
      stopTone();
      setPlayingToneMidi(null);
    } else {
      playTone(midiToHz(midi));
      setPlayingToneMidi(midi);
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  useEffect(() => {
    drawRuler();
  }, [drawRuler]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawGraph);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawGraph]);

  useEffect(() => {
    return () => {
      pitchReaderRef.current?.stop();
      stopTone();
    };
  }, []);

  // ─── Current note display ──────────────────────────────────────────────────

  const noteLabel = currentHz > 50 ? midiToName(currentMidi) : "—";
  const hzLabel = currentHz > 50 ? `${Math.round(currentHz)} Hz` : "";
  const centsLabel =
    currentCents !== 0 && currentHz > 50
      ? `${currentCents > 0 ? "+" : ""}${currentCents}¢`
      : "";

  const totalHeight = (MAX_MIDI - MIN_MIDI) * NOTE_ROW_HEIGHT;

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-navy overflow-hidden">
      {/* Readout bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-navy z-10">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-navy dark:text-white leading-none" aria-live="polite" aria-atomic="true">
            {noteLabel}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{hzLabel}</span>
          {centsLabel && (
            <span className={`text-xs font-mono ${currentCents > 5 ? "text-orange-400" : currentCents < -5 ? "text-blue-400" : "text-green-400"}`}>
              {centsLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isListening ? (
            <button
              onClick={stopListening}
              className="text-xs text-gray-500 dark:text-gray-400 touch-target"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={startListening}
              className="bg-flag-blue text-navy text-sm font-semibold px-4 py-2 rounded-xl touch-target"
            >
              Start
            </button>
          )}
        </div>
      </div>

      {/* Phrase banner */}
      {phraseParam && (
        <div className="bg-tint-pink px-4 py-2 text-sm text-navy font-medium">
          🗣 &ldquo;{phraseParam}&rdquo;
        </div>
      )}

      {/* Headphones banner */}
      {showHeadphonesBanner && (
        <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-200">
          🎧 Headphones recommended when using reference tones — to avoid feedback.
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 text-xs text-red-700 dark:text-red-200">
          {errorMsg}
        </div>
      )}

      {/* Main pitch display */}
      <div className="flex flex-1 overflow-hidden">
        {/* Note ruler */}
        <div className="overflow-y-auto flex-shrink-0" style={{ width: 64 }}>
          <canvas
            ref={rulerRef}
            width={64}
            height={totalHeight}
            style={{ display: "block", cursor: "pointer", touchAction: "none" }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const midi = MAX_MIDI - 1 - Math.floor(y / NOTE_ROW_HEIGHT);
              tapNote(Math.max(MIN_MIDI, Math.min(MAX_MIDI - 1, midi)));
            }}
            aria-label="Note ruler — tap to hear reference tone"
          />
        </div>

        {/* Graph */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <canvas
            ref={canvasRef}
            height={totalHeight}
            style={{ width: "100%", display: "block" }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-navy px-4 py-3 safe-pb">
        <div className="flex items-center justify-between gap-2">
          {/* Record / Play */}
          <div className="flex gap-2">
            <button
              onClick={toggleRecording}
              disabled={!isListening}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold touch-target transition-colors ${
                isRecording
                  ? "bg-flag-pink text-navy"
                  : "bg-gray-100 dark:bg-gray-700 text-navy dark:text-white disabled:opacity-40"
              }`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              aria-pressed={isRecording}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-gray-400"}`} />
              {isRecording ? "Stop" : "Record"}
            </button>

            {pendingBlob && !isRecording && (
              <button
                onClick={isPlaying ? stopPlayback : playRecording}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold touch-target bg-tint-blue text-navy"
              >
                {isPlaying ? "⏹" : "▶"} {isPlaying ? "Stop" : "Play"}
              </button>
            )}
          </div>

          {/* Clear */}
          <button
            onClick={clearTrack}
            className="text-xs text-gray-400 touch-target px-2"
            aria-label="Clear pitch graph"
          >
            Clear
          </button>

          {/* Window length */}
          <select
            defaultValue={windowSeconds}
            className="text-xs bg-gray-100 dark:bg-gray-700 text-navy dark:text-white rounded-lg px-2 py-1.5 touch-target border-none"
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
            <button
              onClick={saveCurrentRecording}
              className="bg-flag-blue text-navy text-sm font-semibold px-4 rounded-xl touch-target"
            >
              Save
            </button>
            <button
              onClick={() => { setPendingBlob(null); setShowSave(false); }}
              className="text-gray-400 text-sm px-2 touch-target"
            >
              Discard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

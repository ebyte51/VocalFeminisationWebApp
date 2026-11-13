"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/lib/db";
import { PitchReader } from "@/lib/audio";
import { midiToHz } from "@/lib/types";
import type { CalibrationProfile, ResonanceAnchors } from "@/lib/types";
import PageHeader from "@/components/PageHeader";

const STEPS = [
  {
    key: "warm" as keyof ResonanceAnchors,
    title: "Warm",
    prompt: 'Say a relaxed "oh"',
    guidance: 'It should sound quite dark. Relaxed jaw, no tension.',
    icon: "🌊",
  },
  {
    key: "bright" as keyof ResonanceAnchors,
    title: "Bright",
    prompt: 'Say a small, cute "key"',
    guidance: 'Think of a little mouse or a cute character. Bright, forward.',
    icon: "✨",
  },
  {
    key: "breathy" as keyof ResonanceAnchors,
    title: "Breathy",
    prompt: 'Purse lips into an "o" and sustain a foghorn "ooo", then let more air through',
    guidance: 'Breathy and full are not the same as quiet and loud — keep the pitch steady.',
    icon: "💨",
  },
  {
    key: "full" as keyof ResonanceAnchors,
    title: "Full",
    prompt: 'The same foghorn "ooo", pushed from the diaphragm, louder',
    guidance: 'Push from the diaphragm. Keep pitch the same as the breathy step.',
    icon: "💪",
  },
  {
    key: "check" as keyof ResonanceAnchors,
    title: "Check",
    prompt: 'Remember how "key" felt, and say "oh" the same way',
    guidance: 'It should sound brighter than your first "oh". This tests the calibration.',
    icon: "🎯",
  },
];

function makeId() {
  return `profile-${Date.now()}`;
}

export default function CalibratePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [recording, setRecording] = useState(false);
  const [anchors, setAnchors] = useState<Partial<ResonanceAnchors>>({});
  const [profileName, setProfileName] = useState("My voice");
  const [done, setDone] = useState(false);
  const readerRef = useRef<PitchReader | null>(null);
  const [statusMsg, setStatusMsg] = useState("");

  async function startStep() {
    try {
      setStatusMsg("Starting microphone…");
      const reader = new PitchReader();
      readerRef.current = reader;
      let hzSum = 0;
      let count = 0;
      await reader.start((pt) => {
        if (pt.hz > 100 && pt.hz < 400) {
          hzSum += pt.hz;
          count++;
        }
      });
      reader.startRecording();
      setRecording(true);
      setStatusMsg("Recording… say the sound now");

      await new Promise((r) => setTimeout(r, 3000));

      await reader.stopRecordingAsync();
      setRecording(false);
      await reader.stop();
      readerRef.current = null;

      const avg = count > 0 ? hzSum / count : 0;
      const key = STEPS[step].key;
      setAnchors((prev) => ({ ...prev, [key]: avg }));
      setStatusMsg(`Done — recorded ${key}`);

      if (step >= STEPS.length - 1) {
        setDone(true);
      } else {
        setStep((s) => s + 1);
        setStatusMsg("");
      }
    } catch (err) {
      setStatusMsg("Microphone error — please try again.");
      setRecording(false);
    }
  }

  async function saveCalibration() {
    const profile: CalibrationProfile = {
      id: makeId(),
      name: profileName,
      anchors: anchors as ResonanceAnchors,
      createdAt: Date.now(),
    };
    await saveProfile(profile);
    router.push("/settings");
  }

  if (done) {
    return <ResultsScreen anchors={anchors as ResonanceAnchors} profileName={profileName} onNameChange={setProfileName} onSave={saveCalibration} onRetry={() => { setStep(0); setDone(false); setAnchors({}); }} />;
  }

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen flex flex-col px-4 py-2 bg-white dark:bg-navy">
      <PageHeader backHref="/techniques" backLabel="Techniques" showHome />
      <h1 className="text-2xl font-bold text-navy dark:text-white mb-1">Resonance calibration</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Step {step + 1} of {STEPS.length}
      </p>

      {/* Progress */}
      <div className="flex gap-1.5 mb-6">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`h-1 flex-1 rounded-full ${
              i < step ? "bg-flag-blue" : i === step ? "bg-flag-pink" : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>

      {/* Current step */}
      <div className="flex-1">
        <div className="text-5xl mb-4" aria-hidden="true">{currentStep.icon}</div>
        <h2 className="text-xl font-bold text-navy dark:text-white mb-2">{currentStep.title}</h2>
        <p className="text-base text-navy dark:text-white mb-2 font-medium">{currentStep.prompt}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">{currentStep.guidance}</p>

        {statusMsg && (
          <div className={`rounded-xl p-3 mb-4 text-sm text-center ${recording ? "bg-flag-pink/20 text-navy" : "bg-tint-blue text-navy/80"}`}>
            {statusMsg}
          </div>
        )}

        <button
          onClick={startStep}
          disabled={recording}
          className={`w-full py-4 rounded-2xl font-semibold text-base touch-target transition-colors ${
            recording
              ? "bg-flag-pink text-navy animate-pulse"
              : "bg-flag-blue text-navy"
          }`}
        >
          {recording ? "Recording…" : "Record this sound"}
        </button>
      </div>

      <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400">
        <strong>Tips:</strong> Quiet room. Phone held steady, same position each time. All sounds at the same pitch (around E3).
      </div>
    </div>
  );
}

function ResultsScreen({
  anchors,
  profileName,
  onNameChange,
  onSave,
  onRetry,
}: {
  anchors: ResonanceAnchors;
  profileName: string;
  onNameChange: (n: string) => void;
  onSave: () => void;
  onRetry: () => void;
}) {
  // Simple quadrant visualisation
  const { warm, bright, breathy, full, check } = anchors;

  function normalise(val: number, lo: number, hi: number) {
    if (hi <= lo) return 0.5;
    return Math.max(0, Math.min(1, (val - lo) / (hi - lo)));
  }

  const checkBright = normalise(check, warm, bright);
  const checkFull = normalise(check, breathy, full);
  const checkOk = checkBright > 0.3 && checkBright < 0.9;

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 bg-white dark:bg-navy">
      <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">Calibration results</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Your voice has been measured against these four anchors.
      </p>

      {/* Quadrant */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-6">
        <div className="relative w-full" style={{ paddingBottom: "100%" }}>
          <div className="absolute inset-0">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Axes */}
              <line x1="50" y1="0" x2="50" y2="100" stroke="#e2e8f0" strokeWidth="0.5" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.5" />
              {/* Axis labels */}
              <text x="50" y="6" textAnchor="middle" fontSize="4" fill="#6b7280">Bright</text>
              <text x="50" y="97" textAnchor="middle" fontSize="4" fill="#6b7280">Warm</text>
              <text x="3" y="51" textAnchor="start" fontSize="4" fill="#6b7280">Breathy</text>
              <text x="97" y="51" textAnchor="end" fontSize="4" fill="#6b7280">Full</text>
              {/* Anchors */}
              {[
                { label: "W", x: 50, y: 90, color: "#5BCEFA" },
                { label: "Br", x: 50, y: 10, color: "#F5A9B8" },
                { label: "By", x: 10, y: 50, color: "#5BCEFA" },
                { label: "Fu", x: 90, y: 50, color: "#F5A9B8" },
              ].map((p) => (
                <g key={p.label}>
                  <circle cx={p.x} cy={p.y} r="3" fill={p.color} opacity={0.6} />
                  <text x={p.x + 4} y={p.y + 1.5} fontSize="3.5" fill="#6b7280">{p.label}</text>
                </g>
              ))}
              {/* Check dot */}
              <circle
                cx={checkFull * 80 + 10}
                cy={(1 - checkBright) * 80 + 10}
                r="4"
                fill="#1c2541"
                opacity={0.8}
              />
              <text
                x={checkFull * 80 + 10 + 5}
                y={(1 - checkBright) * 80 + 10 + 1.5}
                fontSize="3.5"
                fill="#1c2541"
              >
                Check
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Check verdict */}
      {checkOk ? (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 mb-4 text-sm text-green-700 dark:text-green-300">
          ✓ The check sound landed in a good position — calibration looks solid.
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-4 text-sm text-amber-700 dark:text-amber-200">
          The check sound was {checkBright < 0.3 ? "not quite bright enough" : "very bright"}. You might want to retry step 5, or try exaggerating the contrast between warm and bright sounds.
        </div>
      )}

      {/* Save */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-navy dark:text-white mb-1">Profile name</label>
        <input
          type="text"
          value={profileName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-flag-blue"
        />
        <p className="text-xs text-gray-400 mt-1">e.g. "phone mic" or "headset"</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="flex-1 bg-flag-blue text-navy font-semibold rounded-2xl py-4 touch-target"
        >
          Save profile
        </button>
        <button
          onClick={onRetry}
          className="px-4 bg-gray-100 dark:bg-gray-700 text-navy dark:text-white font-medium rounded-2xl touch-target"
        >
          Retry
        </button>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
        Recalibrate when you change device or room, or after a few weeks of practice.
      </p>
    </div>
  );
}

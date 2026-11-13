"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/lib/store";

export default function WelcomePage() {
  const [screen, setScreen] = useState<1 | 2>(1);
  const [highlightPitches, setHighlightPitches] = useState(false);
  const router = useRouter();
  const { setSettings } = useSettingsStore();

  function finish() {
    setSettings({
      onboardingDone: true,
      highlightExamplePitches: highlightPitches,
      targetRange: highlightPitches
        ? { mode: "example", lowMidi: 52, highMidi: 55 }
        : { mode: "off", lowMidi: 52, highMidi: 55 },
    });
    router.replace("/");
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-navy px-6 py-8">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        <div className={`w-2 h-2 rounded-full ${screen === 1 ? "bg-flag-blue" : "bg-gray-200"}`} />
        <div className={`w-2 h-2 rounded-full ${screen === 2 ? "bg-flag-blue" : "bg-gray-200"}`} />
      </div>

      {screen === 1 ? (
        <SafetyScreen onNext={() => setScreen(2)} />
      ) : (
        <PitchScreen
          highlightPitches={highlightPitches}
          onToggle={setHighlightPitches}
          onFinish={finish}
        />
      )}
    </div>
  );
}

function SafetyScreen({ onNext }: { onNext: () => void }) {
  const tips = [
    {
      icon: "💧",
      title: "Drink water",
      text: "About 2 L a day, and limit caffeine.",
    },
    {
      icon: "🌊",
      title: "Plain water steaming",
      text: "Inhale the steam from a mug of plain water.",
    },
    {
      icon: "🚭",
      title: "Don't smoke",
      text: "It is hard on your voice.",
    },
    {
      icon: "🌅",
      title: "Warm up and cool down",
      text: "Every session, consistently.",
    },
    {
      icon: "⛔",
      title: "Stop if it strains",
      text: "Pain, tightness or a hoarse, scratchy voice means stop and rest. Training should feel comfortable, never forced. If it lingers, check with a doctor or voice professional.",
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <p className="text-sm text-flag-blue font-medium mb-2">Welcome · 1 of 2</p>
      <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">
        Look after your voice
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Voice training works best when it is gentle and consistent. A few basics before you start.
      </p>

      <div className="space-y-4 flex-1">
        {tips.map((tip) => (
          <div key={tip.title} className="flex gap-3 items-start bg-tint-blue rounded-xl p-4">
            <span className="text-2xl" aria-hidden="true">{tip.icon}</span>
            <div>
              <p className="font-semibold text-navy dark:text-white text-sm">{tip.title}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{tip.text}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="mt-8 w-full bg-flag-blue text-navy font-semibold rounded-2xl py-4 touch-target text-base"
      >
        Next
      </button>
    </div>
  );
}

function PitchScreen({
  highlightPitches,
  onToggle,
  onFinish,
}: {
  highlightPitches: boolean;
  onToggle: (v: boolean) => void;
  onFinish: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <p className="text-sm text-flag-pink font-medium mb-2">Welcome · 2 of 2</p>
      <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">
        About target pitches
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        People training for a more feminine voice often aim for specific pitches. Here's what that means.
      </p>

      <div className="space-y-3 flex-1">
        <div className="bg-tint-pink rounded-xl p-4">
          <p className="font-semibold text-navy dark:text-white text-sm mb-1">Common example targets</p>
          <div className="flex gap-3 mt-2">
            {[["E3", "164.8 Hz"], ["F3", "174.6 Hz"], ["G3", "196 Hz"]].map(([note, hz]) => (
              <div key={note} className="flex-1 bg-white dark:bg-navy rounded-lg p-2 text-center">
                <p className="font-bold text-flag-blue text-lg">{note}</p>
                <p className="text-xs text-gray-500">{hz}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-tint-blue rounded-xl p-4 space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <p>
            These are <strong>example targets, not an absolute truth.</strong> Voices are varied, and pitch is only one part of voice.
          </p>
          <p>
            Resonance, intonation and breath support matter too. Use these as a starting point, not a verdict.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <span className="flex-1">
              <span className="font-medium text-navy dark:text-white text-sm block">
                Highlight example pitches
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Shades the E3–G3 rows in the Pitch Reader as a visual reference.
              </span>
            </span>
            <button
              role="switch"
              aria-checked={highlightPitches}
              onClick={() => onToggle(!highlightPitches)}
              className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors ${
                highlightPitches ? "bg-flag-blue" : "bg-gray-200 dark:bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  highlightPitches ? "translate-x-6" : "translate-x-1"
                }`}
              />
              <span className="sr-only">{highlightPitches ? "On" : "Off"}</span>
            </button>
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            You can change this any time in Settings.
          </p>
        </div>
      </div>

      <button
        onClick={onFinish}
        className="mt-8 w-full bg-flag-blue text-navy font-semibold rounded-2xl py-4 touch-target text-base"
      >
        Get started
      </button>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/lib/store";
import Toggle from "@/components/Toggle";

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
        <div className={`w-2 h-2 rounded-full ${screen === 1 ? "bg-flag-blue" : "bg-gray-300"}`} />
        <div className={`w-2 h-2 rounded-full ${screen === 2 ? "bg-flag-blue" : "bg-gray-300"}`} />
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
    { icon: "💧", title: "Drink water",           text: "About 2 L a day, and limit caffeine." },
    { icon: "🌊", title: "Plain water steaming",  text: "Inhale the steam from a mug of plain water." },
    { icon: "🚭", title: "Don't smoke",            text: "It is hard on your voice." },
    { icon: "🌅", title: "Warm up and cool down", text: "Every session, consistently." },
    { icon: "⛔", title: "Stop if it strains",    text: "Pain, tightness or a hoarse, scratchy voice means stop and rest. Training should feel comfortable, never forced. If it lingers, check with a doctor or voice professional." },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <p className="text-sm text-flag-blue font-semibold mb-2">Welcome · 1 of 2</p>
      <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">Look after your voice</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Voice training works best when it is gentle and consistent. A few basics before you start.
      </p>

      <div className="space-y-3 flex-1">
        {tips.map((tip) => (
          <div key={tip.title} className="flex gap-3 items-start bg-tint-blue rounded-xl p-4">
            <span className="text-2xl flex-shrink-0" aria-hidden="true">{tip.icon}</span>
            <div>
              <p className="font-semibold text-navy text-sm">{tip.title}</p>
              <p className="text-sm text-navy/70 mt-0.5 leading-relaxed">{tip.text}</p>
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
      <p className="text-sm text-flag-pink font-semibold mb-2">Welcome · 2 of 2</p>
      <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">About target pitches</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        People training for a more feminine voice often aim for specific pitches. Here's what that means.
      </p>

      <div className="space-y-3 flex-1">
        {/* Target note cards */}
        <div className="bg-tint-pink rounded-xl p-4">
          <p className="font-semibold text-navy text-sm mb-2">Common example targets</p>
          <div className="flex gap-3">
            {[["E3", "164.8 Hz"], ["F3", "174.6 Hz"], ["G3", "196 Hz"]].map(([note, hz]) => (
              <div key={note} className="flex-1 bg-white rounded-lg p-2 text-center shadow-sm">
                <p className="font-bold text-flag-blue text-lg leading-tight">{note}</p>
                <p className="text-xs text-gray-500 mt-0.5">{hz}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-tint-blue rounded-xl p-4 space-y-2">
          <p className="text-sm text-navy leading-relaxed">
            These are <strong>example targets, not an absolute truth.</strong> Voices are varied, and pitch is only one part of voice.
          </p>
          <p className="text-sm text-navy/70 leading-relaxed">
            Resonance, intonation and breath support matter too. Use these as a starting point, not a verdict.
          </p>
        </div>

        {/* Toggle */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <Toggle
            label="Highlight example pitches"
            description="Shades the E3–G3 rows in the Pitch Reader as a visual reference."
            checked={highlightPitches}
            onChange={onToggle}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
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

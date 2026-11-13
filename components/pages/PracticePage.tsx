"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import techniquesData from "@/data/techniques.json";
import { getCustomPhrases, saveCustomPhrases, type CustomPhrase } from "@/lib/store";
import type { Technique } from "@/lib/types";

const techniques = techniquesData as Technique[];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const ASPECTS = [
  "Breath support — am I breathing from the abdomen?",
  "Pitch — am I staying around E3?",
  "Larynx — does it feel raised?",
  "Resonance — is there brightness in the sound?",
  "Intonation — am I varying pitch expressively?",
  "Relaxation — is my throat relaxed, not forced?",
];

const SCENARIOS = [
  { title: "GP appointment", phrase: "Hi, I have an appointment at 10 o'clock." },
  { title: "Restaurant booking", phrase: "I'd like to make a reservation for two, please." },
  { title: "Wrong order", phrase: "I'm sorry, I think there's been a mix-up with my order." },
  { title: "Calling a friend", phrase: "Hey! How are you? I was just thinking about you." },
  { title: "Answering the phone", phrase: "Hello? Yes, speaking. How can I help?" },
  { title: "Paying at a shop", phrase: "Could I get a receipt please? Thank you!" },
  { title: "Asking for directions", phrase: "Excuse me, could you tell me how to get to the station?" },
];

export default function PracticePage() {
  const [todayAspect, setTodayAspect] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [everStarted, setEverStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [everydayPhrases, setEverydayPhrases] = useState<CustomPhrase[]>([]);
  const [newPhrase, setNewPhrase] = useState("");

  useEffect(() => {
    // Pick today's aspect by day of year
    const day = Math.floor(Date.now() / 86400000);
    setTodayAspect(ASPECTS[day % ASPECTS.length]);
    setEverydayPhrases(getCustomPhrases().filter((p) => p.techniqueIds.includes("everyday")));
  }, []);

  function toggleTimer() {
    if (running) {
      clearInterval(intervalRef.current!);
      setRunning(false);
    } else {
      setEverStarted(true);
      setRunning(true);
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    }
  }

  function resetTimer() {
    clearInterval(intervalRef.current!);
    setRunning(false);
    setElapsed(0);
    setEverStarted(false);
  }

  function addPhrase() {
    if (!newPhrase.trim()) return;
    const phrase: CustomPhrase = {
      id: makeId(),
      text: newPhrase.trim(),
      techniqueIds: ["everyday"],
    };
    const all = getCustomPhrases();
    all.push(phrase);
    saveCustomPhrases(all);
    setEverydayPhrases((prev) => [...prev, phrase]);
    setNewPhrase("");
  }

  function removePhrase(id: string) {
    const all = getCustomPhrases().filter((p) => p.id !== id);
    saveCustomPhrases(all);
    setEverydayPhrases((prev) => prev.filter((p) => p.id !== id));
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-navy dark:text-white">Practice</h1>

      {/* 10-30 second rule */}
      <section className="bg-tint-blue rounded-2xl p-5">
        <h2 className="font-semibold text-navy dark:text-white mb-1">The 10-30 second rule</h2>
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
          For the first 10–30 seconds of a conversation, focus on <strong>one</strong> specific aspect.
          Focus on <em>how</em> you speak, not what you say. When it feels easy, extend to 1–2 minutes.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Today's focus</p>
          <p className="text-sm font-medium text-navy dark:text-white">{todayAspect}</p>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-3">
          <div
            className="text-3xl font-mono font-bold text-navy dark:text-white"
            aria-live="polite"
            aria-label={`${minutes} minutes ${seconds} seconds`}
          >
            {pad(minutes)}:{pad(seconds)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleTimer}
              className={`px-4 py-2 rounded-xl text-sm font-semibold touch-target ${
                running
                  ? "bg-flag-pink text-navy"
                  : "bg-flag-blue text-navy"
              }`}
            >
              {running ? "Pause" : everStarted ? "Resume" : "Start"}
            </button>
            {everStarted && (
              <button
                onClick={resetTimer}
                className="px-3 py-2 rounded-xl text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 touch-target"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {elapsed >= 10 && elapsed < 30 && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">Great — you're in the 10–30 second zone!</p>
        )}
        {elapsed >= 30 && elapsed < 90 && (
          <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">Nice — pushing past 30 seconds now.</p>
        )}
        {elapsed >= 90 && (
          <p className="text-xs text-flag-blue mt-2">Excellent — building towards natural speech.</p>
        )}
      </section>

      {/* Everyday phrases */}
      <section>
        <h2 className="font-semibold text-navy dark:text-white mb-1">Functional phrases</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Pick 5 sentences you say every day and practise them often. Reading emails aloud also works well.
        </p>

        <div className="space-y-2 mb-3">
          {everydayPhrases.length === 0 && (
            <p className="text-sm text-gray-400 italic">No phrases yet — add some below.</p>
          )}
          {everydayPhrases.map((p) => (
            <div key={p.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5">
              <p className="flex-1 text-sm text-navy dark:text-white">{p.text}</p>
              <Link
                href={`/pitch?phrase=${encodeURIComponent(p.text)}`}
                className="text-xs text-flag-blue font-medium touch-target px-2"
              >
                Practise
              </Link>
              <button
                onClick={() => removePhrase(p.id)}
                className="text-gray-300 hover:text-gray-500 touch-target"
                aria-label="Remove phrase"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newPhrase}
            onChange={(e) => setNewPhrase(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPhrase()}
            placeholder="Add a phrase you say every day…"
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-flag-blue"
          />
          <button
            onClick={addPhrase}
            className="bg-flag-blue text-navy text-sm font-semibold px-4 rounded-xl touch-target"
          >
            Add
          </button>
        </div>
      </section>

      {/* Scenario work */}
      <section>
        <h2 className="font-semibold text-navy dark:text-white mb-1">Scenario work</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Higher-stakes moments to practise. Start with the opening line, then improvise.
        </p>
        <div className="space-y-2">
          {SCENARIOS.map((s) => (
            <div
              key={s.title}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3"
            >
              <p className="font-semibold text-navy dark:text-white text-sm">{s.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">&ldquo;{s.phrase}&rdquo;</p>
              <Link
                href={`/pitch?phrase=${encodeURIComponent(s.phrase)}`}
                className="inline-block mt-2 text-xs text-flag-blue font-medium touch-target"
              >
                Open in Pitch Reader →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Chanting */}
      <section>
        <h2 className="font-semibold text-navy dark:text-white mb-1">Phrase chanting</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Chant phrases while applying all your skills, then work towards natural speech.
          This bridges the gap between exercises and conversation.
        </p>
        <Link
          href="/techniques/intonation-curves"
          className="flex items-center gap-2 bg-tint-pink rounded-xl px-4 py-3 touch-target"
        >
          <span className="text-sm font-medium text-navy dark:text-white">Intonation and pitch curves →</span>
        </Link>
      </section>
    </div>
  );
}

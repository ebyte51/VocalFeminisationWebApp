"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import techniquesData from "@/data/techniques.json";
import type { Technique } from "@/lib/types";
import { setLastTechnique, getCustomPhrases, saveCustomPhrases, type CustomPhrase } from "@/lib/store";

const techniques = techniquesData as Technique[];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function TechniquePage({ id }: { id: string }) {
  const router = useRouter();
  const tech = techniques.find((t) => t.id === id);
  const [customPhrases, setCustomPhrases] = useState<CustomPhrase[]>([]);
  const [newPhrase, setNewPhrase] = useState("");
  const [showPhraseInput, setShowPhraseInput] = useState(false);

  useEffect(() => {
    if (tech) setLastTechnique(tech.id);
    setCustomPhrases(getCustomPhrases().filter((p) => p.techniqueIds.includes(id)));
  }, [id, tech]);

  if (!tech) {
    return (
      <div className="px-4 py-6">
        <p className="text-gray-500">Technique not found.</p>
        <Link href="/techniques" className="text-flag-blue mt-4 block">← Techniques</Link>
      </div>
    );
  }

  const related = tech.related
    .map((rid) => techniques.find((t) => t.id === rid))
    .filter(Boolean) as Technique[];

  function openInPitchReader() {
    if (!tech?.pitchPreset) return;
    const params = new URLSearchParams();
    if (tech.pitchPreset.targets.length > 0) params.set("targets", tech.pitchPreset.targets.join(","));
    params.set("window", String(tech.pitchPreset.window));
    params.set("mode", tech.pitchPreset.mode);
    params.set("from", tech.id);
    router.push(`/pitch?${params.toString()}`);
  }

  function practisePhrase(phrase: string) {
    if (!tech) return;
    const params = new URLSearchParams();
    params.set("phrase", phrase);
    if (tech.pitchPreset) {
      if (tech.pitchPreset.targets.length > 0) params.set("targets", tech.pitchPreset.targets.join(","));
      params.set("window", String(tech.pitchPreset.window));
      params.set("mode", tech.pitchPreset.mode);
    }
    params.set("from", tech.id);
    router.push(`/pitch?${params.toString()}`);
  }

  function addPhrase() {
    if (!newPhrase.trim()) return;
    const phrase: CustomPhrase = {
      id: makeId(),
      text: newPhrase.trim(),
      techniqueIds: [id],
    };
    const all = getCustomPhrases();
    all.push(phrase);
    saveCustomPhrases(all);
    setCustomPhrases((prev) => [...prev, phrase]);
    setNewPhrase("");
    setShowPhraseInput(false);
  }

  function removePhrase(phraseId: string) {
    const all = getCustomPhrases().filter((p) => p.id !== phraseId);
    saveCustomPhrases(all);
    setCustomPhrases((prev) => prev.filter((p) => p.id !== phraseId));
  }

  return (
    <div className="px-4 py-6 pb-8">
      {/* Back */}
      <Link href="/techniques" className="flex items-center gap-1 text-sm text-flag-blue mb-4 touch-target -ml-1">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Techniques
      </Link>

      {/* Title */}
      <h1 className="text-2xl font-bold text-navy dark:text-white mb-1">{tech.title}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">{tech.summary}</p>

      {/* Open in Pitch Reader */}
      {tech.pitchPreset && (
        <button
          onClick={openInPitchReader}
          className="w-full flex items-center justify-center gap-2 bg-flag-blue text-navy font-semibold rounded-2xl py-3.5 touch-target mb-6"
        >
          <WaveIcon className="w-5 h-5" />
          Open in Pitch Reader
        </button>
      )}

      {/* Stop reminder */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3 mb-6 text-xs text-amber-800 dark:text-amber-200">
        Stop if anything hurts or feels strained. Training should feel comfortable.
      </div>

      {/* Steps */}
      <section className="mb-6">
        <h2 className="font-semibold text-navy dark:text-white mb-3">Steps</h2>
        <ol className="space-y-3">
          {tech.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-flag-pink/20 text-navy font-semibold text-xs flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Why it works */}
      <section className="mb-6">
        <h2 className="font-semibold text-navy dark:text-white mb-3">Why it works</h2>
        <div className="bg-tint-blue rounded-2xl p-4 text-sm text-navy/80 dark:text-blue-100 leading-relaxed">
          {tech.why}
        </div>
      </section>

      {/* Phrases */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-navy dark:text-white">Suggested phrases</h2>
          <button
            onClick={() => setShowPhraseInput(!showPhraseInput)}
            className="text-xs text-flag-blue font-medium touch-target"
            aria-label="Add your own phrase"
          >
            + Add yours
          </button>
        </div>

        {showPhraseInput && (
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPhrase()}
              placeholder="Type a phrase…"
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-flag-blue"
            />
            <button
              onClick={addPhrase}
              className="bg-flag-blue text-navy text-sm font-semibold px-4 rounded-xl touch-target"
            >
              Add
            </button>
          </div>
        )}

        <div className="space-y-2">
          {tech.phrases.map((phrase, i) => (
            <PhraseCard
              key={i}
              phrase={phrase}
              onPractise={() => practisePhrase(phrase)}
            />
          ))}
          {customPhrases.map((cp) => (
            <PhraseCard
              key={cp.id}
              phrase={cp.text}
              onPractise={() => practisePhrase(cp.text)}
              onRemove={() => removePhrase(cp.id)}
              isCustom
            />
          ))}
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold text-navy dark:text-white mb-3">Related techniques</h2>
          <div className="space-y-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/techniques/${r.id}`}
                className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 touch-target"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy dark:text-white">{r.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.summary}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cooldown reminder */}
      <div className="bg-tint-pink rounded-xl p-3 text-xs text-navy/70 dark:text-pink-100 text-center">
        🌙 Remember to cool down — shoulder rolls, woo glides, a few yawns.
      </div>
    </div>
  );
}

function PhraseCard({
  phrase,
  onPractise,
  onRemove,
  isCustom = false,
}: {
  phrase: string;
  onPractise: () => void;
  onRemove?: () => void;
  isCustom?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5">
      {isCustom && (
        <span className="text-xs bg-flag-pink/20 text-navy/70 rounded px-1.5 py-0.5 flex-shrink-0">yours</span>
      )}
      <p className="flex-1 text-sm text-navy dark:text-white leading-snug">{phrase}</p>
      <button
        onClick={onPractise}
        className="flex-shrink-0 text-xs text-flag-blue font-medium touch-target px-2"
        aria-label={`Practise phrase: ${phrase}`}
      >
        Practise
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-gray-500 touch-target"
          aria-label="Remove phrase"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M2 12h2l3-7 4 14 3-9 2 4 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

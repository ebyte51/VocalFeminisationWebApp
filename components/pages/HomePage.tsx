"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSettingsStore, getLastTechnique } from "@/lib/store";
import { buildRoutine, getShuffleCounter } from "@/lib/warmupRotation";
import techniquesData from "@/data/techniques.json";
import warmupsData from "@/data/warmups.json";
import type { Technique, WarmupItem } from "@/lib/types";

const techniques = techniquesData as Technique[];
const warmups = warmupsData as WarmupItem[];

export default function HomePage() {
  const { settings } = useSettingsStore();
  const [lastTechId, setLastTechId] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<WarmupItem[]>([]);

  useEffect(() => {
    setLastTechId(getLastTechnique());
    const { routine } = buildRoutine(warmups, getShuffleCounter());
    setPreviewItems(routine.slice(0, 3));
  }, []);

  const lastTech = techniques.find((t) => t.id === lastTechId);
  const greeting = getGreeting();

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-2xl font-bold text-navy dark:text-white mt-1">{greeting}</h1>
      </div>

      {/* Quick access to Pitch Reader */}
      <Link
        href="/pitch"
        className="flex items-center gap-4 bg-flag-blue rounded-2xl p-5 touch-target"
      >
        <div className="w-12 h-12 bg-white/30 rounded-xl flex items-center justify-center flex-shrink-0">
          <WaveIcon className="w-6 h-6 text-navy" />
        </div>
        <div>
          <p className="font-bold text-navy text-base">Open Pitch Reader</p>
          <p className="text-sm text-navy/70">Live pitch tracking · tap a note to hear it</p>
        </div>
        <ChevronIcon className="ml-auto w-5 h-5 text-navy/60" />
      </Link>

      {/* Today's warm-up preview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-navy dark:text-white">Today's warm-up</h2>
          <Link href="/warmups" className="text-sm text-flag-blue font-semibold">See all</Link>
        </div>
        <div className="bg-tint-blue rounded-2xl p-4 space-y-2">
          {previewItems.length === 0 ? (
            <p className="text-sm text-navy/50 italic">Loading…</p>
          ) : (
            previewItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm text-navy font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-navy/40 flex-shrink-0" aria-hidden="true" />
                {item.title}
              </div>
            ))
          )}
          <Link
            href="/warmups"
            className="block mt-3 bg-flag-blue text-navy text-sm font-semibold text-center rounded-xl py-2.5 touch-target"
          >
            Start warm-up
          </Link>
        </div>
      </section>

      {/* Last technique */}
      {lastTech && (
        <section>
          <h2 className="font-semibold text-navy dark:text-white mb-3">Continue</h2>
          <Link
            href={`/techniques/${lastTech.id}`}
            className="flex items-center gap-4 bg-tint-pink rounded-2xl p-4 touch-target"
          >
            <div className="w-10 h-10 bg-flag-pink/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <MicIcon className="w-5 h-5 text-navy" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy text-sm truncate">{lastTech.title}</p>
              <p className="text-sm text-navy/60 truncate mt-0.5">{lastTech.summary}</p>
            </div>
            <ChevronIcon className="w-5 h-5 text-navy/40" />
          </Link>
        </section>
      )}

      {/* Techniques grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-navy dark:text-white">Techniques</h2>
          <Link href="/techniques" className="text-sm text-flag-blue font-semibold">All 10</Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {techniques.slice(0, 4).map((t) => (
            <Link
              key={t.id}
              href={`/techniques/${t.id}`}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 touch-target"
            >
              <p className="font-semibold text-navy dark:text-white text-sm leading-tight">{t.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug line-clamp-2">{t.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Safety reminder */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 text-sm text-gray-600 dark:text-gray-300 text-center">
        Stop if anything hurts or feels strained. Training should feel comfortable.
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M2 12h2l3-7 4 14 3-9 2 4 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

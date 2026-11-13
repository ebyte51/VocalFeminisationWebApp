import Link from "next/link";
import techniquesData from "@/data/techniques.json";
import type { Technique } from "@/lib/types";

const techniques = techniquesData as Technique[];

const SESSION_LABELS: Record<number, string> = {
  1: "Session 1",
  2: "Session 2",
  3: "Session 3",
};

export default function TechniquesIndexPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold text-navy dark:text-white mb-1">Techniques</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Ten exercises from your vocal feminisation sessions.
      </p>

      <div className="space-y-3">
        {techniques.map((tech) => (
          <Link
            key={tech.id}
            href={`/techniques/${tech.id}`}
            className="flex items-start gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 touch-target"
          >
            <div className="w-10 h-10 rounded-xl bg-tint-pink flex items-center justify-center flex-shrink-0 text-sm font-bold text-navy">
              {techniques.indexOf(tech) + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-navy dark:text-white text-sm leading-snug">{tech.title}</p>
                <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                  {SESSION_LABELS[tech.source]}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{tech.summary}</p>
            </div>
            <ChevronIcon className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
          </Link>
        ))}
      </div>

      {/* Calibrate resonance */}
      <Link
        href="/calibrate"
        className="mt-6 flex items-center gap-3 bg-tint-blue rounded-2xl p-4 touch-target"
      >
        <div className="w-10 h-10 rounded-xl bg-flag-blue/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xl" aria-hidden="true">🎛</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-navy dark:text-white text-sm">Calibrate resonance</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Set up the resonance quadrant for your voice</p>
        </div>
        <ChevronIcon className="w-5 h-5 text-gray-400" />
      </Link>
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

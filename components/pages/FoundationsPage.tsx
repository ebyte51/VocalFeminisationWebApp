import Link from "next/link";

export default function FoundationsPage() {
  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-navy dark:text-white">Foundations</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        The core concepts and voice care advice from your sessions.
      </p>

      {/* Voice care */}
      <section>
        <h2 className="font-semibold text-navy dark:text-white mb-3">Voice care</h2>
        <div className="space-y-2">
          {[
            { icon: "💧", title: "Drink water", text: "About 2 L a day, and limit caffeine." },
            { icon: "🌊", title: "Plain water steaming", text: "Inhale the steam from a mug of plain water — not too hot." },
            { icon: "🚭", title: "Don't smoke", text: "It is hard on your voice." },
            { icon: "🌅", title: "Warm up and cool down", text: "Every session, consistently." },
            { icon: "⛔", title: "Stop if it strains", text: "Pain, tightness or a hoarse voice means stop and rest. If it lingers, check with a doctor or voice professional." },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 items-start bg-tint-blue rounded-xl p-4">
              <span className="text-xl" aria-hidden="true">{item.icon}</span>
              <div>
                <p className="font-semibold text-navy dark:text-white text-sm">{item.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core concepts */}
      <section>
        <h2 className="font-semibold text-navy dark:text-white mb-3">Core concepts</h2>

        <div className="bg-tint-pink rounded-2xl p-4 mb-3">
          <p className="font-semibold text-navy dark:text-white text-sm mb-1">The goal</p>
          <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">
            Vocal feminisation works by stretching and thinning the vocal folds. This raises pitch and changes the quality of the voice. It takes time and consistent practice.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 mb-3">
          <p className="font-semibold text-navy dark:text-white text-sm mb-3">Three ingredients of voice</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Power", sub: "Breath", techniques: "Breath support" },
              { label: "Source", sub: "Vocal folds", techniques: "Larynx height, Sirens" },
              { label: "Filter", sub: "Resonance", techniques: "Key shape, Smiletone" },
            ].map((item) => (
              <div key={item.label} className="bg-tint-blue rounded-xl p-2">
                <p className="font-bold text-navy dark:text-white text-sm">{item.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Techniques address each ingredient — often more than one at once.
          </p>
        </div>

        <div className="space-y-2">
          {[
            {
              icon: "🎵",
              title: "Pitch is only part of voice",
              text: "Resonance, intonation and air support matter just as much. Focusing only on pitch can produce a high but thin or strained sound.",
            },
            {
              icon: "😄",
              title: "False vocal folds and smiling",
              text: "Above the true vocal folds are the false folds, which can compensate during exercises and create tension. Smiling during exercises (especially sirens) helps avoid relying on them.",
            },
            {
              icon: "📍",
              title: "Target pitches",
              text: "E3 (164.8 Hz), F3 (174.6 Hz) and G3 (196 Hz) are common example targets. These are starting points, not absolutes — voices vary, and what matters is how yours feels and sounds to you.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 items-start bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <span className="text-xl" aria-hidden="true">{item.icon}</span>
              <div>
                <p className="font-semibold text-navy dark:text-white text-sm">{item.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Links */}
      <div className="flex gap-2 pt-2">
        <Link href="/resources" className="flex-1 bg-tint-blue rounded-xl px-4 py-3 text-sm font-medium text-navy dark:text-white text-center touch-target">
          Resources
        </Link>
        <Link href="/techniques" className="flex-1 bg-tint-pink rounded-xl px-4 py-3 text-sm font-medium text-navy dark:text-white text-center touch-target">
          Techniques
        </Link>
      </div>
    </div>
  );
}

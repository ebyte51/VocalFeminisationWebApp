import Link from "next/link";

const MORE_ITEMS = [
  { href: "/foundations", icon: "📚", label: "Foundations", description: "Voice care and core concepts" },
  { href: "/resources", icon: "🔗", label: "Resources", description: "Recommended apps, books and people" },
  { href: "/log", icon: "📋", label: "Practice log", description: "Past sessions and recordings" },
  { href: "/calibrate", icon: "🎛", label: "Calibrate resonance", description: "Set up the resonance quadrant" },
  { href: "/settings", icon: "⚙️", label: "Settings", description: "Appearance, reminders, data" },
];

export default function MorePage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold text-navy dark:text-white mb-6">More</h1>
      <div className="space-y-2">
        {MORE_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 touch-target"
          >
            <span className="text-2xl w-10 text-center flex-shrink-0" aria-hidden="true">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy dark:text-white text-sm">{item.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>
            </div>
            <svg className="w-5 h-5 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p className="font-medium text-navy dark:text-white">About Voice Trainer</p>
        <p>A personal voice training companion based on vocal feminisation sessions 1–3.</p>
        <p>All audio is processed on your device. Nothing is uploaded.</p>
      </div>
    </div>
  );
}

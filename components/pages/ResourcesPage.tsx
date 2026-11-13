export default function ResourcesPage() {
  const tools = [
    {
      name: "TrueVox",
      description: "Well-researched app for pitch and resonance tracking. Recommended in your sessions.",
      category: "App",
      url: null,
    },
    {
      name: "Voice Tools",
      description: "iOS pitch monitor and voice training tool, recommended in your sessions.",
      category: "App",
      url: null,
    },
    {
      name: "Am pitch",
      description: "The pitch monitor app that inspired the Pitch Reader in this app.",
      category: "App",
      url: null,
    },
  ];

  const people = [
    {
      name: "Renee Yoxon",
      description: "Vocal health focus. Has a practice games workbook. Recommended in your sessions.",
      category: "Instructor / Author",
    },
    {
      name: "Katherine Isaacson",
      description: "Author of Gender Affirming Voice Training: A Unique Curriculum.",
      category: "Author",
    },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-navy dark:text-white">Resources</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Apps, books and people recommended in your sessions.
      </p>

      <section>
        <h2 className="font-semibold text-navy dark:text-white mb-3">Apps</h2>
        <div className="space-y-3">
          {tools.map((t) => (
            <div key={t.name} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <p className="font-semibold text-navy dark:text-white text-sm">{t.name}</p>
                <span className="text-xs bg-tint-blue text-navy/70 rounded px-2 py-0.5 flex-shrink-0 ml-2">{t.category}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{t.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-navy dark:text-white mb-3">People and books</h2>
        <div className="space-y-3">
          {people.map((p) => (
            <div key={p.name} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <p className="font-semibold text-navy dark:text-white text-sm">{p.name}</p>
                <span className="text-xs bg-tint-pink text-navy/70 rounded px-2 py-0.5 flex-shrink-0 ml-2">{p.category}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400">
        The lessons are your instructor's work. This app is personal — please don't redistribute the content.
      </div>
    </div>
  );
}

"use client";

export default function KnowledgeGraphPanel({
  knowledge,
  isRealtime,
}: {
  knowledge: { topics?: string[] } | null;
  isRealtime?: boolean;
}) {
  if (!knowledge) {
    return (
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Knowledge Graph</h2>
        <p className="text-dark-400 text-sm">Generate a knowledge graph.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-4">Knowledge Graph</h2>
      <div className="bg-dark-800/50 rounded-xl h-[300px] p-4">
        <div className="flex flex-wrap gap-2">
          {knowledge.topics?.map((topic: string) => (
            <span
              key={topic}
              className="px-3 py-1 bg-purple-600/30 text-purple-400 rounded-full text-sm"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

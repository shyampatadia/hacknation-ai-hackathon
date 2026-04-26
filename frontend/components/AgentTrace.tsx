type AgentTraceProps = {
  onSelectQuery?: (query: string) => void;
};

const exampleQueries = [
  "Emergency C-section near Ranchi",
  "Cardiac care in rural Bihar",
  "Blood bank near Patna",
];

export function AgentTrace({ onSelectQuery }: AgentTraceProps) {
  return (
    <aside className="panel trace-panel">
      <span className="eyebrow">Starting points</span>
      <h3>Queries that match the product well</h3>
      <div className="prompt-list">
        {exampleQueries.map((query) => (
          <button
            key={query}
            type="button"
            className="prompt-item prompt-button"
            onClick={() => onSelectQuery?.(query)}
          >
            {query}
          </button>
        ))}
      </div>
      <div className="trace-note">
        Results prioritize readable evidence, trust signals, and nearby options instead of decorative analytics.
      </div>
    </aside>
  );
}

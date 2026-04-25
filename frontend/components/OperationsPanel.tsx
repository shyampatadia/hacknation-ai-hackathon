const operationalItems = [
  {
    title: "Retrieval stack",
    detail: "Semantic retrieval and verification must stay readable as a workflow, not a black box.",
  },
  {
    title: "Coverage pressure",
    detail: "Scarcity, missing evidence, and radius expansion have to remain visible at a glance.",
  },
  {
    title: "Operator session",
    detail: "Identity, saved queries, and role-aware actions belong to Supabase-backed app state.",
  },
];

export function OperationsPanel() {
  return (
    <aside className="panel rail-panel">
      <span className="eyebrow">Network posture</span>
      <h3>Operator context</h3>
      <div className="district-list">
        {operationalItems.map((item) => (
          <div key={item.title} className="district-item">
            <strong>{item.title}</strong>
            {item.detail}
          </div>
        ))}
      </div>
    </aside>
  );
}

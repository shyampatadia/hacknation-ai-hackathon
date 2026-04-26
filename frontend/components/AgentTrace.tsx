const traceSteps = [
  {
    name: "Language detector",
    detail: "Hindi input recognized, routed into English reasoning layer.",
    state: "done",
  },
  {
    name: "Query parser",
    detail: "Specialty, urgency, location, and radius extracted.",
    state: "done",
  },
  {
    name: "Databricks retriever",
    detail: "25 candidates retrieved from the semantic shortlist.",
    state: "done",
  },
  {
    name: "Trust filter",
    detail: "18 dropped, 5 survived trust and geography gates.",
    state: "done",
  },
  {
    name: "Capability verifier",
    detail: "Final ranking underway against emergency maternal requirements.",
    state: "live",
  },
];

export function AgentTrace() {
  return (
    <aside className="panel trace-panel">
      <span className="eyebrow">Agent trace</span>
      <h3>Visible reasoning, always on</h3>
      <p>The trace should be a product surface, not a hidden debugging drawer.</p>
      <div className="trace-list">
        {traceSteps.map((step, index) => (
          <div key={step.name} className="trace-step" data-state={step.state}>
            <span className="trace-index">{index + 1}</span>
            <div>
              <strong>{step.name}</strong>
              <p>{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

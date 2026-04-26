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
      {/* <span className="eyebrow">Agent trace</span>
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
      </div> */}
      <div className="prompt-row">
        <span className="prompt-label">Try:</span>
        <span className="prompt-item">Emergency C-section near Ranchi</span>
        <span className="prompt-item">Cardiac care in rural Bihar</span>
        <span className="prompt-item">Blood bank near Patna</span>
      </div>
      <div className="network-grid">
        <div className="metric-block">
          <strong>10,000</strong>
          <span>Facilities indexed</span>
        </div>
        <div className="metric-block">
          <strong>6,847</strong>
          <span>Verified trust &gt; 60</span>
        </div>
        <div className="metric-block">
          <strong>312</strong>
          <span>Deserts identified</span>
        </div>
      </div>
    </aside>
  );
}

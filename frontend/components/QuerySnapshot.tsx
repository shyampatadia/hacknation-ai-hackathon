const checkpoints = [
  { label: "Specialty", value: "Emergency obstetric surgery" },
  { label: "Location", value: "Ranchi corridor, Jharkhand" },
  { label: "Policy", value: "Trust > 50, emergency bias, 62km" },
  { label: "Fallback", value: "1.5x radius expansion below 0.6 confidence" },
];

export function QuerySnapshot() {
  return (
    <section className="panel query-panel">
      <span className="eyebrow">Incident state</span>
      <h3>Active interpretation</h3>
      <div className="checkpoint-list">
        {checkpoints.map((checkpoint) => (
          <div key={checkpoint.label} className="checkpoint-item">
            <span>{checkpoint.label}</span>
            <strong>{checkpoint.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

import { AgentTrace } from "@/components/AgentTrace";
import { DesertAlert } from "@/components/DesertAlert";
import { FacilityCard } from "@/components/FacilityCard";
import { OperationsPanel } from "@/components/OperationsPanel";
import { QuerySnapshot } from "@/components/QuerySnapshot";
import { SearchBar } from "@/components/SearchBar";
import { mockFacilities, quickFilters } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <>
      <section className="ask-stage">
        <div className="hero-console">
          <span className="eyebrow">Ask in any language</span>
          <h1>Find verified care, instantly.</h1>
          <p className="hero-copy">
            One search input. One urgent decision. Surface trust, distance, contradictions, and escalation
            pressure without burying the operator in noise.
          </p>
          <SearchBar
            placeholder="Emergency C-section near Ranchi"
            cta="Run query"
            chips={quickFilters}
          />
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
        </div>

        <div className="right-rail">
          <AgentTrace />
          <OperationsPanel />
        </div>
      </section>

      <section className="result-stage">
        <div className="stack">
          <QuerySnapshot />
          <DesertAlert
            district="Palamu district, Jharkhand"
            message="Only two verified candidates remain within the preferred radius. Expansion and desert escalation should trigger next."
          />
          <div className="stream-header">
            <div>
              <span className="eyebrow">Live shortlist</span>
              <h2>Top facilities for the current incident</h2>
            </div>
            <p>Mocked now, but shaped to the intended live crisis response.</p>
          </div>
          <div className="results">
            {mockFacilities.slice(0, 3).map((facility) => (
              <FacilityCard key={facility.id} facility={facility} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

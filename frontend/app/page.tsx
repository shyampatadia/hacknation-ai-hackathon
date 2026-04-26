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
        </div>

        <div className="right-rail">
          <AgentTrace />
          {/* <OperationsPanel /> */}
        </div>
      </section>

      {/* <section className="result-stage">
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
      </section> */}
    </>
  );
}

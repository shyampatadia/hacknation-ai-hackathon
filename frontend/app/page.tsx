"use client";

import { AgentTrace } from "@/components/AgentTrace";
import { SearchBar } from "@/components/SearchBar";
import { quickFilters } from "@/lib/mock-data";
import { useState } from "react";

export default function HomePage() {
  const [prefillQuery, setPrefillQuery] = useState<string | null>(null);
  return (
    <>
      <section className="ask-stage">
        <div className="hero-console">
          <span className="eyebrow">Clinical query</span>
          <h1>Find verified care without the clutter.</h1>
          <p className="hero-copy">
            Search facilities, compare evidence, and route urgent care with a calmer working surface.
            Trust, distance, and contradictions stay visible without turning the screen into a dashboard wall.
          </p>
          <SearchBar
            placeholder="Emergency C-section near Ranchi"
            cta="Run query"
            chips={quickFilters}
            prefillQuery={prefillQuery}
          />
        </div>

        <div className="right-rail">
          <AgentTrace onSelectQuery={setPrefillQuery} />
        </div>
      </section>
    </>
  );
}

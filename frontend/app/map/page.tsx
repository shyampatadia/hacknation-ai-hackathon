import { DesertMap } from "@/components/DesertMap";
import { districtSnapshots } from "@/lib/mock-data";

export default function MapPage() {
  return (
    <section className="stack">
        <div className="page-intro">
          <span className="eyebrow">District coverage</span>
          <h1>See coverage gaps before they become urgent failures.</h1>
          <p>
            The map stays focused on district scarcity and specialty gaps, with enough context to decide where
            to investigate next.
          </p>
        </div>
        <DesertMap districts={districtSnapshots} />
    </section>
  );
}

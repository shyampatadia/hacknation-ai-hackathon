import type { DistrictSnapshot } from "@/lib/mock-data";

type DesertMapProps = {
  districts: DistrictSnapshot[];
};

export function DesertMap({ districts }: DesertMapProps) {
  return (
    <section className="panel map-board">
      <div className="map-toolbar">
        <button className="chip" data-active="true">
          Cardiac
        </button>
        <button className="chip">Dialysis</button>
        <button className="chip">Neonatal</button>
        <button className="chip">Trauma</button>
      </div>
      <div className="map-canvas">
        <div className="map-ambient map-ambient-a" />
        <div className="map-ambient map-ambient-b" />
        <div className="map-grid">
          {districts.map((district) => (
            <article key={district.name} className="map-card" data-status={district.status}>
              <strong>{district.name}</strong>
              <p>{district.summary}</p>
              <span>Desert score {district.desertScore}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

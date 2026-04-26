import { DesertMap } from "@/components/DesertMap";
import { districtSnapshots } from "@/lib/mock-data";

export default function MapPage() {
  return (
    <section className="map-layout">
      <div className="stack">
        <div className="page-intro">
          <span className="eyebrow">District coverage</span>
          <h1>See healthcare absence before it becomes an emergency.</h1>
          <p>
            The map surface should make scarcity obvious. Specialty filters, district pressure, and nearby
            verified alternatives need to read clearly in seconds.
          </p>
        </div>
        <DesertMap districts={districtSnapshots} />
      </div>

      <div className="right-rail">
        <section className="panel rail-panel">
          <span className="eyebrow">Filters</span>
          <h3>Current focus</h3>
          <div className="checkpoint-list">
            <div className="checkpoint-item">
              <span>Specialty</span>
              <strong>Cardiac</strong>
            </div>
            <div className="checkpoint-item">
              <span>Trust threshold</span>
              <strong>60+</strong>
            </div>
            <div className="checkpoint-item">
              <span>View mode</span>
              <strong>District pressure</strong>
            </div>
          </div>
        </section>

        <section className="panel rail-panel">
          <span className="eyebrow">Worst gaps</span>
          <h3>Current critical districts</h3>
          <div className="district-list">
            <div className="district-item">
              <strong>Palamu, Jharkhand</strong>
              0 verified cardiac facilities within 112km.
            </div>
            <div className="district-item">
              <strong>Sheohar, Bihar</strong>
              Neonatal access is sparse and routing options are weak.
            </div>
            <div className="district-item">
              <strong>Surguja, Chhattisgarh</strong>
              Dialysis alternatives require multi-district travel.
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

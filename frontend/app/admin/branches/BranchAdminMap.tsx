"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { BranchOverviewRow } from "@/types";
import { branchShortName } from "@/lib/branch";

// perfColour maps a health score to the pin colour (green / amber / red).
function scoreColour(v: number): string {
  if (v >= 90) return "#16A34A";
  if (v >= 80) return "#F59E0B";
  return "#DC2626";
}

/**
 * Admin branch map — Leaflet CircleMarkers at each branch, coloured by
 * performance, with a quick-preview popup. Driven by live overview rows (not the
 * marketing map's hard-coded pins). Rendered client-only via dynamic import.
 */
export default function BranchAdminMap({ rows, onOpen }: { rows: BranchOverviewRow[]; onOpen: (slug: string) => void }) {
  const pins = rows.filter((r) => r.lat && r.lng);
  const center: [number, number] = pins.length
    ? [pins.reduce((s, r) => s + (r.lat ?? 0), 0) / pins.length, pins.reduce((s, r) => s + (r.lng ?? 0), 0) / pins.length]
    : [51.61, -0.35];

  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: 560, width: "100%", borderRadius: "0.75rem" }}>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {pins.map((r) => (
        <CircleMarker
          key={r.slug}
          center={[r.lat as number, r.lng as number]}
          radius={14}
          pathOptions={{ color: "#fff", weight: 2, fillColor: scoreColour(r.performance), fillOpacity: 0.9 }}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <p style={{ fontWeight: 700, margin: "0 0 4px", fontSize: 14 }}>{branchShortName(r)}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2px 10px", fontSize: 12 }}>
                <span>Performance</span><b style={{ color: scoreColour(r.performance) }}>{r.performance}%</b>
                <span>Occupancy</span><b>{r.occupancy}%</b>
                <span>Children</span><b>{r.children}</b>
                <span>Staff present</span><b>{r.staff_present}/{r.staff}</b>
                <span>Attendance</span><b>{r.attendance_today}%</b>
                {r.rating > 0 && (<><span>Google</span><b>{r.rating.toFixed(1)}★</b></>)}
              </div>
              <button
                type="button"
                onClick={() => onOpen(r.slug)}
                style={{ marginTop: 8, width: "100%", background: "#0f766e", color: "#fff", border: 0, borderRadius: 6, padding: "5px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Open branch →
              </button>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

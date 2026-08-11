"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { api } from "@/lib/api";
import { branchShortName } from "@/lib/branch";
import { BRANCH_FALLBACKS } from "@/lib/branch-public";
import type { Branch } from "@/types";

interface BranchPin {
  id:        string;
  name:      string;
  address:   string;
  phone:     string;
  hours:     string;
  lat:       number;
  lng:       number;
  colour:    string;
  letter:    string;
  mapUrl:    string;
  comingSoon?: boolean;
}

// Fallback pins derive from the ONE shared roster (lib/branch-public.ts);
// only the marker styling (colour / letter) stays local to the map.
const PIN_STYLE: Record<string, { colour: string; letter: string }> = {
  harrow:         { colour: "#3aada9", letter: "H" },
  borehamwood:    { colour: "#5fc8c7", letter: "B" },
  pinner:         { colour: "#cf7d9c", letter: "P" },
  aldershot:      { colour: "#e0965f", letter: "A" },
  "pinner-green": { colour: "#5fa46e", letter: "P" },
  northwood:      { colour: "#c49a00", letter: "N" },
};

const PINS: BranchPin[] = BRANCH_FALLBACKS.map((fb) => {
  const style = PIN_STYLE[fb.slug] ?? { colour: "#3aada9", letter: (fb.label[0] || "B").toUpperCase() };
  return {
    id:      fb.slug,
    name:    fb.label,
    address: fb.address + ", " + fb.postcode,
    phone:   fb.phone ?? "",
    hours:   fb.comingSoon ? "Opening soon" : "Mon\u2013Fri, 07:30\u201318:30",
    lat:     fb.lat,
    lng:     fb.lng,
    colour:  style.colour,
    letter:  style.letter,
    mapUrl:  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(fb.address + " " + fb.postcode),
    comingSoon: fb.comingSoon,
  };
});

function makeIcon(colour: string, letter: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${colour};color:#fff;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:13px;font-family:sans-serif;
      box-shadow:0 3px 10px rgba(0,0,0,0.22);
      border:2.5px solid #fff;
    ">${letter}</div>`,
    iconSize:   [36, 36],
    iconAnchor: [18, 18],
    popupAnchor:[0, -20],
  });
}

export default function LeafletMap({ focusBranch }: { focusBranch?: string }) {
  // Live branch data overrides the static fallback pins: phone, address,
  // coordinates and status come from the backend, so a change made in the
  // admin (or a brand-new branch) reaches the map without a code change.
  const [pins, setPins] = useState<BranchPin[]>(PINS);
  useEffect(() => {
    let alive = true;
    api.getBranches()
      .then((raw) => {
        if (!alive) return;
        const branches = (raw as Branch[]) ?? [];
        if (!Array.isArray(branches) || branches.length === 0) return;
        setPins((prev) => {
          const bySlug = new Map(branches.map((b) => [b.slug, b]));
          const merged = prev.map((pin) => {
            const b = bySlug.get(pin.id);
            if (!b) return pin;
            bySlug.delete(pin.id);
            return {
              ...pin,
              name: branchShortName(b),
              address: b.contact?.address || pin.address,
              phone: b.contact?.phone || pin.phone,
              lat: b.lat || pin.lat,
              lng: b.lng || pin.lng,
              mapUrl: b.google?.maps_url || pin.mapUrl,
              comingSoon: b.status === "coming_soon",
            };
          });
          // Branches the static table doesn't know about yet still get a pin.
          for (const b of bySlug.values()) {
            if (!b.lat || !b.lng) continue;
            merged.push({
              id: b.slug, name: branchShortName(b),
              address: b.contact?.address || "", phone: b.contact?.phone || "",
              hours: "Mon–Fri, 07:30–18:30", lat: b.lat, lng: b.lng,
              colour: "#3aada9", letter: (branchShortName(b)[0] || "B").toUpperCase(),
              mapUrl: b.google?.maps_url || "", comingSoon: b.status === "coming_soon",
            });
          }
          return merged;
        });
      })
      .catch(() => { /* keep the static fallback pins */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    // Fix default icon path broken by webpack
    const proto = L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown };
    delete proto._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);

  const focused = focusBranch ? pins.find((p) => p.id === focusBranch) : undefined;
  const visiblePins = focused ? [focused] : pins;
  const center: [number, number] = focused ? [focused.lat, focused.lng] : [51.62, -0.35];
  const zoom = focused ? 15 : 11;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ width: "100%", height: "100%" }}
      className="rounded-[1.4rem]"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      {visiblePins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={makeIcon(pin.colour, pin.letter)}>
          <Popup className="bn-popup">
            <div style={{ minWidth: 180, fontFamily: "Nunito, sans-serif", padding: "2px 0" }}>
              <p style={{ fontWeight: 800, fontSize: 14, color: pin.colour, marginBottom: 4 }}>
                {pin.name}
                {pin.comingSoon && (
                  <span style={{ marginLeft: 6, fontSize: 10, background: "#f7d774", color: "#7a5800", borderRadius: 99, padding: "1px 6px", fontWeight: 700 }}>
                    Coming Soon
                  </span>
                )}
              </p>
              <p style={{ fontSize: 12, color: "#5a4a42", margin: "2px 0" }}>{pin.address}</p>
              <p style={{ fontSize: 12, color: "rgba(90,74,66,0.6)", margin: "2px 0" }}>{pin.hours}</p>
              {!pin.comingSoon && (
                <p style={{ fontSize: 12, margin: "4px 0 0" }}>
                  <a href={`tel:${pin.phone.replace(/\s/g,"")}`} style={{ color: pin.colour, fontWeight: 700 }}>{pin.phone}</a>
                </p>
              )}
              <a
                href={pin.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display:"inline-block", marginTop:6, fontSize:11, color: pin.colour, fontWeight:700, textDecoration:"underline" }}
              >
                Get Directions →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

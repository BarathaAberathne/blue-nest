"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

const PINS: BranchPin[] = [
  {
    id:      "harrow",
    name:    "Harrow",
    address: "29 Churchfield Close, Harrow, HA2 6BD",
    phone:   "020 8861 5574",
    hours:   "Mon–Fri, 07:30–18:30",
    lat:     51.5836,
    lng:     -0.3364,
    colour:  "#3aada9",
    letter:  "H",
    mapUrl:  "https://www.google.com/maps/search/?api=1&query=29+Churchfield+Close+Harrow+HA2+6BD",
  },
  {
    id:      "pinner",
    name:    "Pinner",
    address: "Pinner, London, HA5",
    phone:   "020 8861 5574",
    hours:   "Mon–Fri, 07:30–18:30",
    lat:     51.5919,
    lng:     -0.3795,
    colour:  "#cf7d9c",
    letter:  "P",
    mapUrl:  "https://www.google.com/maps/search/?api=1&query=Pinner+HA5",
  },
  {
    id:      "borehamwood",
    name:    "Borehamwood",
    address: "Borehamwood, Hertfordshire, WD6",
    phone:   "020 8861 5574",
    hours:   "Mon–Fri, 07:30–18:30",
    lat:     51.6594,
    lng:     -0.2724,
    colour:  "#5fc8c7",
    letter:  "B",
    mapUrl:  "https://www.google.com/maps/search/?api=1&query=Borehamwood+WD6",
  },
  {
    id:        "pinner-green",
    name:      "Pinner Green",
    address:   "Pinner Green, London, HA5",
    phone:     "020 8861 5574",
    hours:     "Opening soon",
    lat:       51.5972,
    lng:       -0.3878,
    colour:    "#5fa46e",
    letter:    "P",
    mapUrl:    "https://www.google.com/maps/search/?api=1&query=Pinner+Green+HA5",
    comingSoon: true,
  },
  {
    id:        "northwood",
    name:      "Northwood",
    address:   "Northwood, London, HA6",
    phone:     "020 8861 5574",
    hours:     "Opening soon",
    lat:       51.6091,
    lng:       -0.4186,
    colour:    "#c49a00",
    letter:    "N",
    mapUrl:    "https://www.google.com/maps/search/?api=1&query=Northwood+HA6",
    comingSoon: true,
  },
];

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

  const focused = focusBranch ? PINS.find((p) => p.id === focusBranch) : undefined;
  const visiblePins = focused ? [focused] : PINS;
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

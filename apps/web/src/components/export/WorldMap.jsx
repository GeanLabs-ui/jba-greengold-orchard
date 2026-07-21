import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const GHANA = [7.9465, -1.0232];

const DESTINATIONS = [
  { name: 'United Kingdom', flag: '🇬🇧', pos: [55.3781, -3.4360] },
  { name: 'Netherlands', flag: '🇳🇱', pos: [52.1326, 5.2913] },
  { name: 'UAE', flag: '🇦🇪', pos: [23.4241, 53.8478] },
  { name: 'Saudi Arabia', flag: '🇸🇦', pos: [23.8859, 45.0792] },
  { name: 'Germany', flag: '🇩🇪', pos: [51.1657, 10.4515] },
  { name: 'France', flag: '🇫🇷', pos: [46.6034, 1.8883] },
  { name: 'Qatar', flag: '🇶🇦', pos: [25.3548, 51.1839] },
  { name: 'China', flag: '🇨🇳', pos: [35.8617, 104.1954] },
];

export default function WorldMap() {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-border bg-[#0f2e1d]">
      <MapContainer
        center={[28, 20]}
        zoom={2}
        minZoom={2}
        maxZoom={4}
        scrollWheelZoom={false}
        dragging={true}
        style={{ height: '100%', width: '100%', background: '#0f2e1d' }}
        worldCopyJump={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {DESTINATIONS.map((d) => (
          <div key={d.name}>
            <Polyline
              positions={[GHANA, d.pos]}
              pathOptions={{ color: '#F59E0B', weight: 1.5, opacity: 0.5, dashArray: '6 8' }}
            />
            <CircleMarker
              center={d.pos}
              radius={7}
              pathOptions={{ color: '#F59E0B', fillColor: '#F59E0B', fillOpacity: 0.85, weight: 2 }}
            >
              <Popup>
                <span style={{ fontSize: '14px' }}>{d.flag} {d.name}</span>
              </Popup>
            </CircleMarker>
          </div>
        ))}
        {/* Ghana origin marker */}
        <CircleMarker
          center={GHANA}
          radius={9}
          pathOptions={{ color: '#22C55E', fillColor: '#22C55E', fillOpacity: 0.9, weight: 3 }}
        >
          <Popup>
            <span style={{ fontSize: '14px' }}>🇬🇭 Ghana — Origin</span>
          </Popup>
        </CircleMarker>
      </MapContainer>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
        🟢 Origin: Ghana &nbsp;·&nbsp; 🟠 Export destinations
      </div>
    </div>
  );
}
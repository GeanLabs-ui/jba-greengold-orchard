import React, { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

function FitFarmBounds({ farms }) {
  const map = useMap();

  useEffect(() => {
    if (farms.length === 1) {
      map.setView([farms[0].lat, farms[0].lng], 12);
      return;
    }
    const bounds = L.latLngBounds(farms.map((farm) => [farm.lat, farm.lng]));
    map.fitBounds(bounds, { padding: [38, 38], maxZoom: 8 });
  }, [farms, map]);

  return null;
}

function farmMarkerIcon(number) {
  return L.divIcon({
    className: '',
    html: `<span style="display:flex;width:34px;height:34px;align-items:center;justify-content:center;border:3px solid #f4d487;border-radius:9999px;background:#063c2b;color:#f2b438;font:700 13px Inter,Arial,sans-serif;box-shadow:0 5px 16px rgba(0,0,0,.28)">${number}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
}

export default function LiveFarmMap({ farms, className = '' }) {
  const center = farms.length === 1 ? [farms[0].lat, farms[0].lng] : [7.7, -1.05];

  return (
    <MapContainer center={center} zoom={farms.length === 1 ? 12 : 7} scrollWheelZoom className={`h-full w-full ${className}`}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitFarmBounds farms={farms} />
      {farms.map((farm) => (
        <Marker key={farm.id} position={[farm.lat, farm.lng]} icon={farmMarkerIcon(farm.id)}>
          <Popup>
            <div className="min-w-52 text-[#123c2b]">
              <p className="text-base font-bold">{farm.name}</p>
              <p className="mt-1 text-xs">{farm.region}</p>
              <p className="mt-1 text-xs">{farm.acres} acres · {farm.coordinates}</p>
              <Link to={`/farms/${encodeURIComponent(farm.slug)}`} className="mt-3 inline-flex text-xs font-bold text-[#a66b0b] hover:underline">Read more about farm →</Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

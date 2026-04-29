'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, CircleMarker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon URLs under Next.js bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error — Leaflet internal API
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src ?? markerIcon2x,
  iconUrl: markerIcon.src ?? markerIcon,
  shadowUrl: markerShadow.src ?? markerShadow,
});

export interface LatLng { lat: number; lng: number }

export interface ZoneShape {
  id: string;
  name: string;
  color?: string | null;
  baseFee?: number;
  isActive?: boolean;
  coordinates: LatLng[];
}

const DEFAULT_CENTER: [number, number] = [33.6844, 73.0479];

const ClickAdder: React.FC<{ onAdd: (p: LatLng) => void }> = ({ onAdd }) => {
  useMapEvents({
    click(e) { onAdd({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
};

interface ZoneMapProps {
  zones: ZoneShape[];
  /** Editable polygon — when provided, renders draw mode + remove-on-click vertices */
  editing?: { value: LatLng[]; onChange: (v: LatLng[]) => void; color?: string };
  height?: number | string;
  center?: [number, number];
  zoom?: number;
}

const ZoneMap: React.FC<ZoneMapProps> = ({ zones, editing, height = 460, center = DEFAULT_CENTER, zoom = 12 }) => {
  const mapRef = useRef<L.Map | null>(null);

  // Re-fit on polygon completion
  useEffect(() => {
    if (mapRef.current && editing && editing.value.length >= 3) {
      try {
        const bounds = L.latLngBounds(editing.value.map(p => [p.lat, p.lng] as [number, number]));
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch { /* ignore */ }
    }
  }, [editing?.value.length]);

  const editColor = editing?.color || '#dc2626';

  return (
    <div style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', cursor: editing ? 'crosshair' : 'grab' }}
        scrollWheelZoom
        ref={(instance: any) => { mapRef.current = instance; }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Existing zones */}
        {zones.map(z => (
          <Polygon
            key={z.id}
            positions={z.coordinates.map(c => [c.lat, c.lng] as [number, number])}
            pathOptions={{
              color: z.color || '#94a3b8',
              fillColor: z.color || '#94a3b8',
              fillOpacity: z.isActive === false ? 0.05 : 0.18,
              weight: 2,
              dashArray: z.isActive === false ? '6 4' : undefined,
            }}
          >
            <Popup>
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 700 }}>{z.name}</div>
                {typeof z.baseFee === 'number' && <div style={{ fontSize: 12 }}>Base fee: ${z.baseFee.toFixed(2)}</div>}
                {z.isActive === false && <div style={{ fontSize: 11, color: '#9ca3af' }}>Inactive</div>}
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* Editor polygon */}
        {editing && editing.value.length >= 3 && (
          <Polygon
            positions={editing.value.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: editColor, fillColor: editColor, fillOpacity: 0.25, weight: 3 }}
          />
        )}
        {editing && editing.value.length === 2 && (
          <Polyline positions={editing.value.map(p => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: editColor, weight: 3 }} />
        )}
        {editing && editing.value.map((p, i) => (
          <CircleMarker
            key={`vertex-${i}`}
            center={[p.lat, p.lng]}
            radius={7}
            pathOptions={{ color: 'white', fillColor: editColor, fillOpacity: 1, weight: 2 }}
            eventHandlers={{
              click: () => editing.onChange(editing.value.filter((_, idx) => idx !== i)),
            }}
          >
            <Popup>Point {i + 1} — click to remove</Popup>
          </CircleMarker>
        ))}

        {editing && <ClickAdder onAdd={(p) => editing.onChange([...editing.value, p])} />}
      </MapContainer>
    </div>
  );
};

export default ZoneMap;

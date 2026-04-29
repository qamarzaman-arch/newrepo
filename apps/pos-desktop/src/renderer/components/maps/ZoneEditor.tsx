import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, Polyline, useMapEvents, useMap, Marker, Popup } from 'react-leaflet';
import { Trash2, Undo2, MapPin, Crosshair } from 'lucide-react';
import { L } from './LeafletSetup';

export interface ZonePoint { lat: number; lng: number }

interface ZoneEditorProps {
  /** Initial polygon coordinates — empty = drawing a new zone */
  value: ZonePoint[];
  onChange: (coords: ZonePoint[]) => void;
  /** Render other (read-only) zones for context */
  otherZones?: { id: string; name: string; color?: string | null; coordinates: ZonePoint[] }[];
  color?: string;
  height?: string | number;
  /** Optional reference markers (e.g. restaurant location) */
  referenceMarkers?: { id: string; lat: number; lng: number; label: string; emoji?: string }[];
}

const DEFAULT_CENTER: [number, number] = [33.6844, 73.0479];

const ClickHandler: React.FC<{ onAdd: (p: ZonePoint) => void }> = ({ onAdd }) => {
  useMapEvents({
    click(e) {
      onAdd({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

const RecenterButton: React.FC<{ onRecenter: () => void }> = ({ onRecenter }) => {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRecenter();
        // Bubble result back into Leaflet — handled by parent setting center/bounds
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      title="Center on current location"
      style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
        padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 12, fontWeight: 600, color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <Crosshair size={14} /> Locate me
    </button>
  );
};

function emojiIcon(emoji: string): L.DivIcon {
  return L.divIcon({
    className: 'pos-emoji-marker',
    html: `<div style="font-size:24px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const ZoneEditor: React.FC<ZoneEditorProps> = ({
  value,
  onChange,
  otherZones = [],
  color = '#dc2626',
  height = 460,
  referenceMarkers = [],
}) => {
  const [hoverPoint, setHoverPoint] = useState<ZonePoint | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Center map on existing polygon, then references, then default
  const initialCenter: [number, number] = (() => {
    if (value.length > 0) return [value[0].lat, value[0].lng];
    if (referenceMarkers.length > 0) return [referenceMarkers[0].lat, referenceMarkers[0].lng];
    return DEFAULT_CENTER;
  })();

  const addPoint = (p: ZonePoint) => onChange([...value, p]);
  const removePoint = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const undo = () => onChange(value.slice(0, -1));
  const clear = () => onChange([]);

  useEffect(() => {
    // When the user pastes or programmatically sets a polygon, fit to it
    if (mapRef.current && value.length >= 3) {
      try {
        const bounds = L.latLngBounds(value.map(p => [p.lat, p.lng] as [number, number]));
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch { /* ignore */ }
    }
  }, [value]);

  const recenterOnSelf = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 15);
      },
      () => { /* permission denied */ }
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="flex items-center justify-between mb-2 text-sm">
        <div className="flex items-center gap-2 text-neutral-600">
          <MapPin size={14} />
          {value.length === 0 && <span>Click on the map to start drawing the zone polygon.</span>}
          {value.length > 0 && value.length < 3 && <span>{value.length} point{value.length === 1 ? '' : 's'} — need at least 3 to form a polygon.</span>}
          {value.length >= 3 && <span className="font-semibold text-emerald-600">{value.length} points · polygon ready.</span>}
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={undo} disabled={value.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40">
            <Undo2 size={12} /> Undo
          </button>
          <button type="button" onClick={clear} disabled={value.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-40">
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      <div style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', position: 'relative' }}>
        <MapContainer
          center={initialCenter}
          zoom={value.length > 0 ? 14 : 12}
          style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
          scrollWheelZoom
          ref={(instance: any) => { mapRef.current = instance; }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Other zones for context (read-only) */}
          {otherZones.map(z => (
            <Polygon key={z.id} positions={z.coordinates.map(c => [c.lat, c.lng] as [number, number])}
              pathOptions={{ color: z.color || '#94a3b8', fillColor: z.color || '#94a3b8', fillOpacity: 0.08, weight: 1, dashArray: '4 4' }}>
              <Popup><div style={{ fontWeight: 600 }}>{z.name}</div><div style={{ fontSize: 11, color: '#888' }}>existing zone</div></Popup>
            </Polygon>
          ))}

          {/* Reference markers */}
          {referenceMarkers.map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={emojiIcon(m.emoji || '🏠')}>
              <Popup>{m.label}</Popup>
            </Marker>
          ))}

          {/* The polygon being edited */}
          {value.length >= 3 && (
            <Polygon positions={value.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 3 }} />
          )}

          {/* Edge lines for incomplete polygons */}
          {value.length >= 2 && value.length < 3 && (
            <Polyline positions={value.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color, weight: 3 }} />
          )}

          {/* Vertex markers — click to remove */}
          {value.map((p, i) => (
            <CircleMarker
              key={`${i}-${p.lat}-${p.lng}`}
              center={[p.lat, p.lng]}
              radius={7}
              pathOptions={{ color: 'white', fillColor: color, fillOpacity: 1, weight: 2 }}
              eventHandlers={{ click: (e) => { (e as any).originalEvent?.stopPropagation?.(); removePoint(i); } }}
            >
              <Popup>Point {i + 1} — click to remove</Popup>
            </CircleMarker>
          ))}

          <ClickHandler onAdd={addPoint} />
          <RecenterButton onRecenter={recenterOnSelf} />
        </MapContainer>
      </div>

      {value.length > 0 && (
        <details className="mt-2 text-xs text-neutral-500">
          <summary className="cursor-pointer font-bold uppercase tracking-wider">Coordinates ({value.length})</summary>
          <pre className="mt-1 p-2 bg-neutral-50 rounded-lg text-[10px] max-h-32 overflow-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ZoneEditor;

import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import { L } from './LeafletSetup';
import { toNum } from '@restaurant-pos/shared-types';

export interface MapZone {
  id: string;
  name: string;
  color?: string | null;
  coordinates: { lat: number; lng: number }[];
  baseFee?: number;
  isActive?: boolean;
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type?: 'rider' | 'delivery' | 'restaurant' | 'self';
  status?: string;
  popup?: React.ReactNode;
  isStale?: boolean;
}

interface DeliveryMapProps {
  zones?: MapZone[];
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string | number;
  className?: string;
  /** Re-frame the view to fit zones + markers whenever inputs change. */
  autoFit?: boolean;
}

const DEFAULT_CENTER: [number, number] = [33.6844, 73.0479]; // Islamabad as a sensible default

const TYPE_ICON: Record<string, string> = {
  rider: '🛵',
  delivery: '📦',
  restaurant: '🏠',
  self: '📍',
};

function emojiIcon(emoji: string, isStale = false): L.DivIcon {
  return L.divIcon({
    className: 'pos-emoji-marker',
    html: `<div style="
      font-size: 28px;
      line-height: 1;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      ${isStale ? 'opacity: 0.5;' : ''}
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

const FitBoundsOnChange: React.FC<{ bounds: L.LatLngBoundsExpression | null }> = ({ bounds }) => {
  const map = useMap();
  const lastFitRef = useRef<string | null>(null);
  useEffect(() => {
    if (!bounds) return;
    const key = JSON.stringify(bounds);
    if (key === lastFitRef.current) return;
    lastFitRef.current = key;
    try {
      map.fitBounds(bounds as any, { padding: [40, 40], maxZoom: 16, animate: true });
    } catch {
      /* ignore — invalid bounds */
    }
  }, [map, bounds]);
  return null;
};

const DeliveryMap: React.FC<DeliveryMapProps> = ({
  zones = [],
  markers = [],
  center,
  zoom = 13,
  height = 480,
  className,
  autoFit = true,
}) => {
  const initialCenter = center || DEFAULT_CENTER;

  const fitBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (!autoFit) return null;
    const points: [number, number][] = [];
    zones.forEach(z => z.coordinates.forEach(c => points.push([c.lat, c.lng])));
    markers.forEach(m => points.push([m.lat, m.lng]));
    if (points.length === 0) return null;
    if (points.length === 1) {
      const [lat, lng] = points[0];
      return [
        [lat - 0.01, lng - 0.01],
        [lat + 0.01, lng + 0.01],
      ];
    }
    return points;
  }, [autoFit, zones, markers]);

  return (
    <div className={className} style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <MapContainer center={initialCenter} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {zones.map(zone => (
          <Polygon
            key={zone.id}
            positions={zone.coordinates.map(c => [c.lat, c.lng] as [number, number])}
            pathOptions={{
              color: zone.color || '#dc2626',
              fillColor: zone.color || '#dc2626',
              fillOpacity: zone.isActive === false ? 0.05 : 0.18,
              weight: 2,
              dashArray: zone.isActive === false ? '6 4' : undefined,
            }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{zone.name}</div>
                {typeof zone.baseFee === 'number' && (
                  <div style={{ fontSize: 12, color: '#555' }}>Base fee: ${toNum(zone.baseFee).toFixed(2)}</div>
                )}
                {zone.isActive === false && (
                  <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>Inactive</div>
                )}
              </div>
            </Popup>
          </Polygon>
        ))}
        {markers.map(m => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={emojiIcon(TYPE_ICON[m.type || 'rider'] || '📍', m.isStale)}
          >
            <Popup>
              {m.popup ?? (
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontWeight: 700 }}>{m.label}</div>
                  {m.status && <div style={{ fontSize: 12, color: '#555' }}>{m.status}</div>}
                  {m.isStale && <div style={{ fontSize: 11, color: '#dc2626' }}>Location stale</div>}
                </div>
              )}
            </Popup>
          </Marker>
        ))}
        {fitBounds && <FitBoundsOnChange bounds={fitBounds} />}
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;

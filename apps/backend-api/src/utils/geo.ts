/**
 * Geographic utilities — point-in-polygon, distance, zone resolution.
 *
 * DeliveryZone.coordinates is stored as JSON: an array of {lat, lng} points
 * forming a polygon ring. The ring may be open (last point != first); we
 * close it implicitly during point-in-polygon checks.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Standard ray-casting point-in-polygon test.
 * Edge cases (point exactly on edge) are not strictly defined; for
 * delivery-zone purposes either inclusive or exclusive is acceptable.
 */
export function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  const { lat: y, lng: x } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Haversine great-circle distance in km between two points.
 */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Coerce raw JSON coordinates into a typed LatLng[]. Tolerates either
 * {lat, lng} objects or [lat, lng] tuples. Returns null if the shape
 * isn't recognizable.
 */
export function parseZoneCoordinates(raw: unknown): LatLng[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: LatLng[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object' && 'lat' in item && 'lng' in item) {
      const lat = Number((item as any).lat);
      const lng = Number((item as any).lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
    } else if (Array.isArray(item) && item.length >= 2) {
      const lat = Number(item[0]);
      const lng = Number(item[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
    }
  }
  return out.length >= 3 ? out : null;
}

/**
 * Find the first active zone whose polygon contains the given point.
 * `zones` is the raw rows from prisma; this helper takes care of parsing.
 */
export function findZoneForPoint(
  point: LatLng,
  zones: Array<{ id: string; coordinates: any; isActive?: boolean }>
): { id: string } | null {
  for (const zone of zones) {
    if (zone.isActive === false) continue;
    const poly = parseZoneCoordinates(zone.coordinates);
    if (!poly) continue;
    if (pointInPolygon(point, poly)) return { id: zone.id };
  }
  return null;
}

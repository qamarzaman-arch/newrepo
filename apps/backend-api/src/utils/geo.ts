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
 * Robust ray-casting point-in-polygon test.
 *
 * QA A36: the previous implementation added `+ 1e-12` to the denominator to
 * dodge division-by-zero on horizontal edges. That hides the actual edge
 * crossings on horizontal ring segments, producing wrong "outside" answers
 * along the edge. Here we early-skip horizontal edges (yi == yj) — the
 * standard W. Randolph Franklin formulation — which gives a deterministic
 * answer regardless of polygon orientation.
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

    // Skip horizontal edges; they cannot be crossed by a horizontal ray.
    if (yi === yj) continue;

    const yiAbove = yi > y;
    const yjAbove = yj > y;
    if (yiAbove === yjAbove) continue; // both endpoints same side of ray

    const xIntersect = xi + ((y - yi) * (xj - xi)) / (yj - yi);
    if (x < xIntersect) inside = !inside;
  }
  return inside;
}

/**
 * Self-intersection check using O(n^2) segment crossings. For typical
 * delivery-zone polygons (under ~50 vertices) this is fine; it would need a
 * sweep-line for very large polygons. Touching edges that share a vertex
 * (consecutive segments) are intentionally NOT flagged as self-intersecting.
 */
export function polygonHasSelfIntersection(polygon: LatLng[]): boolean {
  const n = polygon.length;
  if (n < 4) return false;

  const segments: Array<[LatLng, LatLng]> = [];
  for (let i = 0; i < n; i++) {
    segments.push([polygon[i], polygon[(i + 1) % n]]);
  }

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      // Adjacent segments share an endpoint by construction; skip.
      if (j === i + 1) continue;
      // First and last share the start/end vertex when the polygon closes.
      if (i === 0 && j === segments.length - 1) continue;

      if (segmentsIntersect(segments[i][0], segments[i][1], segments[j][0], segments[j][1])) {
        return true;
      }
    }
  }
  return false;
}

function ccw(a: LatLng, b: LatLng, c: LatLng): number {
  return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
}

function segmentsIntersect(p1: LatLng, p2: LatLng, p3: LatLng, p4: LatLng): boolean {
  const d1 = ccw(p3, p4, p1);
  const d2 = ccw(p3, p4, p2);
  const d3 = ccw(p1, p2, p3);
  const d4 = ccw(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

export interface PolygonValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Comprehensive polygon validator for DeliveryZone.coordinates.
 *
 * QA A35: zones were stored without validating ≥3 points or self-intersection,
 * which silently broke point-in-polygon and made deliveries fall through to
 * a "no zone" path with no error surfaced to ops.
 */
export function validateDeliveryPolygon(raw: unknown): PolygonValidationResult {
  const poly = parseZoneCoordinates(raw);
  if (!poly) return { ok: false, reason: 'Polygon must have at least 3 valid {lat,lng} points' };
  if (poly.length < 3) return { ok: false, reason: 'Polygon must have at least 3 points' };
  if (poly.length > 1000) return { ok: false, reason: 'Polygon exceeds maximum 1000 vertices' };

  for (const p of poly) {
    if (p.lat < -90 || p.lat > 90) return { ok: false, reason: `Latitude out of range: ${p.lat}` };
    if (p.lng < -180 || p.lng > 180) return { ok: false, reason: `Longitude out of range: ${p.lng}` };
  }

  // Check self-intersection first: a bowtie has signed area = 0 even though
  // its real-world coverage is non-zero, so the area check below would flag
  // it with the wrong reason.
  if (polygonHasSelfIntersection(poly)) {
    return { ok: false, reason: 'Polygon has self-intersecting edges' };
  }

  // Reject degenerate (zero-area) polygons: all points colinear.
  const area = polygonSignedArea(poly);
  if (Math.abs(area) < 1e-10) return { ok: false, reason: 'Polygon is degenerate (zero area)' };

  return { ok: true };
}

function polygonSignedArea(poly: LatLng[]): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    area += a.lng * b.lat - b.lng * a.lat;
  }
  return area / 2;
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

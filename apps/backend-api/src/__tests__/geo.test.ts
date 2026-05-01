import {
  pointInPolygon,
  polygonHasSelfIntersection,
  validateDeliveryPolygon,
  parseZoneCoordinates,
  distanceKm,
  LatLng,
} from '../utils/geo';

describe('geo utils', () => {
  const square: LatLng[] = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 10 },
    { lat: 10, lng: 10 },
    { lat: 10, lng: 0 },
  ];

  describe('pointInPolygon', () => {
    it('returns false for fewer than 3 points', () => {
      expect(pointInPolygon({ lat: 1, lng: 1 }, [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }])).toBe(false);
    });

    it('detects points inside a square', () => {
      expect(pointInPolygon({ lat: 5, lng: 5 }, square)).toBe(true);
    });

    it('detects points outside a square', () => {
      expect(pointInPolygon({ lat: 11, lng: 5 }, square)).toBe(false);
      expect(pointInPolygon({ lat: -1, lng: 5 }, square)).toBe(false);
    });

    it('handles a polygon with horizontal top edge correctly (QA A36)', () => {
      // Old code's `+ 1e-12` denominator hack misclassified along horizontal edges.
      // Here we ask about a point well below the horizontal top edge but inside the square.
      expect(pointInPolygon({ lat: 9.999, lng: 5 }, square)).toBe(true);
    });
  });

  describe('polygonHasSelfIntersection', () => {
    it('returns false for a simple square', () => {
      expect(polygonHasSelfIntersection(square)).toBe(false);
    });

    it('detects a bowtie (figure-8) polygon', () => {
      const bowtie: LatLng[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 0 },
        { lat: 10, lng: 10 },
      ];
      expect(polygonHasSelfIntersection(bowtie)).toBe(true);
    });
  });

  describe('validateDeliveryPolygon', () => {
    it('rejects fewer than 3 points', () => {
      expect(validateDeliveryPolygon([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }]).ok).toBe(false);
    });

    it('rejects out-of-range latitude', () => {
      const r = validateDeliveryPolygon([
        { lat: 100, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 0 },
      ]);
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/Latitude/);
    });

    it('rejects self-intersecting polygons', () => {
      const r = validateDeliveryPolygon([
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 0 },
        { lat: 10, lng: 10 },
      ]);
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/self-intersect/);
    });

    it('rejects degenerate (zero-area) polygons', () => {
      const r = validateDeliveryPolygon([
        { lat: 0, lng: 0 },
        { lat: 0, lng: 5 },
        { lat: 0, lng: 10 },
      ]);
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/degenerate/);
    });

    it('accepts a valid square', () => {
      expect(validateDeliveryPolygon(square).ok).toBe(true);
    });
  });

  describe('parseZoneCoordinates', () => {
    it('parses {lat,lng} objects', () => {
      const out = parseZoneCoordinates([{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, { lat: 5, lng: 6 }]);
      expect(out).toHaveLength(3);
      expect(out![0]).toEqual({ lat: 1, lng: 2 });
    });

    it('parses [lat, lng] tuples', () => {
      const out = parseZoneCoordinates([[1, 2], [3, 4], [5, 6]]);
      expect(out).toHaveLength(3);
    });

    it('returns null for non-arrays', () => {
      expect(parseZoneCoordinates('nope')).toBeNull();
      expect(parseZoneCoordinates(null)).toBeNull();
    });
  });

  describe('distanceKm', () => {
    it('is approximately 0 for the same point', () => {
      expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBeCloseTo(0, 6);
    });

    it('is symmetric', () => {
      const a = { lat: 33.6844, lng: 73.0479 }; // Islamabad
      const b = { lat: 24.8607, lng: 67.0011 }; // Karachi
      expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 6);
    });
  });
});

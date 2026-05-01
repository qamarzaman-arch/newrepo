import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bike,
  CheckCircle2,
  DollarSign,
  Loader2,
  MapPin,
  Phone,
  Truck,
  Package,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { riderService } from '../services/riderService';
import { deliveryZoneService } from '../services/deliveryZoneService';
import { useAuthStore } from '../stores/authStore';
import DeliveryMap, { MapMarker, MapZone } from '../components/maps/DeliveryMap';
import { toNum } from '@restaurant-pos/shared-types';

interface DeliveryItem {
  id: string;
  orderId: string;
  status: string;
  riderId?: string | null;
  fee?: number | null;
  deliveryFee?: number | null;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  deliveryAddress?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  deliveredAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
  order?: {
    id: string;
    orderNumber?: string;
    totalAmount?: number;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
  };
}

const RED = '#E53935';

function haversineKm(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null,
): number | null {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  )
    return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const RiderDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [zones, setZones] = useState<MapZone[]>([]);
  const locationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load delivery zones once for the map
  useEffect(() => {
    let cancelled = false;
    deliveryZoneService
      .getZones()
      .then((res: any) => {
        if (cancelled) return;
        const zonesList = res?.data?.data?.zones || [];
        const mapped: MapZone[] = (zonesList as any[])
          .filter((z) => Array.isArray(z?.coordinates) && z.coordinates.length >= 3)
          .map((z) => ({
            id: z.id,
            name: z.name,
            color: z.color,
            baseFee: Number(z.baseFee || 0),
            isActive: z.isActive !== false,
            coordinates: z.coordinates.map((c: any) => ({ lat: Number(c.lat), lng: Number(c.lng) })),
          }));
        setZones(mapped);
      })
      .catch(() => { /* not critical */ });
    return () => { cancelled = true; };
  }, []);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load rider info for availability
      try {
        const meRes = await api.get(`/riders/${user.id}`);
        const r = meRes.data?.data?.rider;
        if (r && typeof r.isAvailable === 'boolean') setIsAvailable(r.isAvailable);
      } catch {
        // ignore
      }
      // Load deliveries
      const res = await api.get('/delivery');
      const list: DeliveryItem[] = res.data?.data?.deliveries ?? [];
      setDeliveries(list);
    } catch {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 20000);
    return () => clearInterval(t);
  }, [loadAll]);

  // Geolocation tracking
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation not supported');
      return;
    }

    const sendLocation = (pos: GeolocationPosition) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(c);
      setGpsError(null);
      riderService
        .updateLocation({ latitude: c.lat, longitude: c.lng, accuracy: pos.coords.accuracy })
        .catch(() => {
          /* ignore network errors */
        });
    };

    const onError = (err: GeolocationPositionError) => {
      setGpsError(err.message || 'Location permission denied');
    };

    navigator.geolocation.getCurrentPosition(sendLocation, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    locationTimerRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendLocation, onError, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    }, 30000);

    return () => {
      if (locationTimerRef.current) clearInterval(locationTimerRef.current);
    };
  }, []);

  const myActive = useMemo(
    () =>
      deliveries.find(
        (d) =>
          d.riderId === user?.id &&
          (d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT' || d.status === 'ASSIGNED'),
      ),
    [deliveries, user],
  );

  const myToday = useMemo(
    () =>
      deliveries.filter((d) => {
        if (d.riderId !== user?.id) return false;
        const ts = d.deliveredAt || d.updatedAt || d.createdAt;
        if (!ts) return false;
        return new Date(ts).getTime() >= todayStart.getTime();
      }),
    [deliveries, user, todayStart],
  );

  const stats = useMemo(() => {
    const todays = myToday;
    const onRoute = todays.filter(
      (d) => d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT' || d.status === 'ASSIGNED',
    ).length;
    const completed = todays.filter((d) => d.status === 'DELIVERED').length;
    const earnings = todays
      .filter((d) => d.status === 'DELIVERED')
      .reduce((s, d) => s + Number(d.deliveryFee ?? d.fee ?? 0), 0);
    return { count: todays.length, onRoute, completed, earnings };
  }, [myToday]);

  const available = useMemo(
    () => deliveries.filter((d) => d.status === 'READY' && !d.riderId),
    [deliveries],
  );

  const completedToday = useMemo(
    () => myToday.filter((d) => d.status === 'DELIVERED'),
    [myToday],
  );

  const toggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    try {
      await riderService.updateAvailability(next);
      toast.success(next ? 'You are now available' : 'You are now offline');
    } catch {
      setIsAvailable(!next);
      toast.error('Failed to update availability');
    }
  };

  const updateStatus = async (
    id: string,
    status: 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED',
  ) => {
    setUpdatingId(id);
    try {
      await api.patch(`/delivery/${id}/status`, { status });
      toast.success(`Marked as ${status.replace('_', ' ')}`);
      await loadAll();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const acceptDelivery = async (d: DeliveryItem) => {
    if (!user) return;
    setUpdatingId(d.id);
    try {
      await api.patch(`/delivery/${d.id}/assign-rider`, { riderId: user.id });
      await api.patch(`/delivery/${d.id}/status`, { status: 'PICKED_UP' });
      toast.success('Delivery accepted');
      await loadAll();
    } catch {
      toast.error('Failed to accept delivery');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatPKR = (n: number) =>
    new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);

  const orderNum = (d: DeliveryItem) => d.order?.orderNumber || d.orderId.slice(-6);
  const custName = (d: DeliveryItem) => d.customerName || d.order?.customerName || 'Customer';
  const custPhone = (d: DeliveryItem) => d.customerPhone || d.order?.customerPhone || '';
  const addr = (d: DeliveryItem) => d.deliveryAddress || d.address || d.order?.deliveryAddress || '';
  const fee = (d: DeliveryItem) => Number(d.deliveryFee ?? d.fee ?? 0);

  // Build markers for the rider's map: self + active delivery dropoff
  const mapMarkers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    if (coords) {
      out.push({ id: 'me', lat: coords.lat, lng: coords.lng, label: 'You', type: 'self' });
    }
    deliveries
      .filter(d => d.riderId === user?.id && ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status))
      .forEach(d => {
        const lat = Number(d.dropoffLat ?? (d as any).latitude);
        const lng = Number(d.dropoffLng ?? (d as any).longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          out.push({
            id: `delivery-${d.id}`,
            lat,
            lng,
            label: `${custName(d)} · #${d.order?.orderNumber || d.id.slice(-6)}`,
            type: 'delivery',
            status: d.status,
          });
        }
      });
    return out;
  }, [coords, deliveries, user]);

  return (
    <div className="p-3 sm:p-4 max-w-3xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-xs text-gray-500">Welcome back</p>
          <p className="font-bold text-lg">{user?.fullName ?? 'Rider'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            {gpsError ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" /> GPS off
              </span>
            ) : coords ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 font-semibold">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                GPS Active
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-500 font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> GPS...
              </span>
            )}
          </div>
          <button
            onClick={toggleAvailability}
            className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${
              isAvailable
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {isAvailable ? 'Available' : 'Offline'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <StatCard label="Today" value={stats.count} icon={<Package className="w-4 h-4" />} />
        <StatCard label="On Route" value={stats.onRoute} icon={<Truck className="w-4 h-4" />} />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatCard
          label="Earnings"
          value={formatPKR(stats.earnings)}
          icon={<DollarSign className="w-4 h-4" />}
          small
        />
      </div>

      {/* Live Map: rider position + zones + active delivery dropoff */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Your live map</p>
          {gpsError && <span className="text-[11px] text-amber-600 font-semibold">{gpsError}</span>}
        </div>
        <DeliveryMap
          zones={zones}
          markers={mapMarkers}
          height={280}
          center={coords ? [coords.lat, coords.lng] : undefined}
          zoom={coords ? 14 : 12}
        />
      </div>

      {/* Active Delivery */}
      {myActive && (
        <div
          className="rounded-2xl text-white p-4 mb-4 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${RED}, #B71C1C)` }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bike className="w-5 h-5" />
              <span className="text-xs uppercase tracking-wide font-bold opacity-90">
                Active Delivery
              </span>
            </div>
            <span className="bg-primary-600/30 px-2 py-0.5 rounded-full text-xs font-bold">
              {myActive.status}
            </span>
          </div>
          <p className="text-2xl font-extrabold">#{orderNum(myActive)}</p>
          <p className="text-white/90 mb-1">{custName(myActive)}</p>
          {custPhone(myActive) && (
            <a
              href={`tel:${custPhone(myActive)}`}
              className="inline-flex items-center gap-1 text-sm bg-primary-600/30 hover:bg-primary-600/50 rounded-md px-2 py-1 mb-2"
            >
              <Phone className="w-3.5 h-3.5" /> {custPhone(myActive)}
            </a>
          )}
          {addr(myActive) && (
            <p className="text-sm text-white/90 flex items-start gap-1 mb-3">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{addr(myActive)}</span>
            </p>
          )}
          <p className="text-sm font-bold mb-3">Fee: {formatPKR(fee(myActive))}</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              disabled={updatingId === myActive.id}
              onClick={() => updateStatus(myActive.id, 'PICKED_UP')}
              className="bg-primary-600/30 hover:bg-primary-600/50 disabled:opacity-50 py-2.5 rounded-lg font-bold text-sm"
            >
              Picked Up
            </button>
            <button
              disabled={updatingId === myActive.id}
              onClick={() => updateStatus(myActive.id, 'IN_TRANSIT')}
              className="bg-primary-600/30 hover:bg-primary-600/50 disabled:opacity-50 py-2.5 rounded-lg font-bold text-sm"
            >
              En Route
            </button>
            <button
              disabled={updatingId === myActive.id}
              onClick={() => updateStatus(myActive.id, 'DELIVERED')}
              className="bg-white dark:bg-neutral-800 text-primary-700 hover:bg-gray-100 disabled:opacity-50 py-2.5 rounded-lg font-bold text-sm"
            >
              Delivered
            </button>
          </div>
        </div>
      )}

      {/* Available pickups */}
      <Section title="Available Pickups">
        {loading ? (
          <Loading />
        ) : available.length === 0 ? (
          <Empty text="No deliveries available right now." />
        ) : (
          <div className="space-y-2">
            {available.map((d) => {
              const dist = haversineKm(
                coords?.lat,
                coords?.lng,
                d.pickupLat ?? d.dropoffLat,
                d.pickupLng ?? d.dropoffLng,
              );
              return (
                <div
                  key={d.id}
                  className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">#{orderNum(d)}</p>
                    <p className="text-sm text-gray-600 truncate">{custName(d)}</p>
                    {addr(d) && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" /> {addr(d)}
                      </p>
                    )}
                    <div className="flex gap-2 text-xs mt-1">
                      <span className="font-semibold" style={{ color: RED }}>
                        {formatPKR(fee(d))}
                      </span>
                      {dist != null && (
                        <span className="text-gray-500">{toNum(dist).toFixed(1)} km away</span>
                      )}
                    </div>
                  </div>
                  <button
                    disabled={updatingId === d.id || !!myActive}
                    onClick={() => acceptDelivery(d)}
                    className="text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50"
                    style={{ background: RED }}
                    title={myActive ? 'Finish current delivery first' : ''}
                  >
                    Accept
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Today's history */}
      <Section title="Today's History">
        {completedToday.length === 0 ? (
          <Empty text="No completed deliveries yet today." />
        ) : (
          <div className="space-y-2">
            {completedToday.map((d) => (
              <div
                key={d.id}
                className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 p-3 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">#{orderNum(d)}</p>
                  <p className="text-xs text-gray-500 truncate">{custName(d)}</p>
                  <p className="text-xs text-gray-400">
                    {d.deliveredAt
                      ? new Date(d.deliveredAt).toLocaleTimeString()
                      : d.updatedAt
                      ? new Date(d.updatedAt).toLocaleTimeString()
                      : ''}
                  </p>
                </div>
                <span className="font-bold" style={{ color: RED }}>
                  {formatPKR(fee(d))}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  small?: boolean;
}> = ({ label, value, icon, small }) => (
  <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 p-3">
    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
      {icon} {label}
    </div>
    <p className={`font-extrabold ${small ? 'text-base' : 'text-xl'}`} style={{ color: RED }}>
      {value}
    </p>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-4">
    <h2 className="font-bold text-gray-700 mb-2">{title}</h2>
    {children}
  </section>
);

const Loading: React.FC = () => (
  <div className="flex justify-center py-6">
    <Loader2 className="w-6 h-6 animate-spin" style={{ color: RED }} />
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-white dark:bg-neutral-800 rounded-xl border border-dashed border-gray-200 dark:border-neutral-700 py-6 text-center text-sm text-gray-500">
    {text}
  </div>
);

export default RiderDashboard;

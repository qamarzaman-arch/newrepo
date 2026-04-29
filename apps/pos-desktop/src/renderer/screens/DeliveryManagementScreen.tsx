import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, MapPin, Clock, DollarSign, Phone, Mail,
  User, Navigation, Package, TrendingUp, Plus,
  Search, Filter, CheckCircle, MoreVertical, X, Star, Edit, Trash2, Eye, Calendar, Map as MapIcon, Activity
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import { deliveryService, CreateDeliveryData } from '../services/deliveryService';
import { deliveryZoneService } from '../services/deliveryZoneService';
import { staffService } from '../services/staffService';
import { useWebSocket } from '../hooks/useWebSocket';
import DeliveryMap, { MapZone, MapMarker } from '../components/maps/DeliveryMap';
import ZoneEditor from '../components/maps/ZoneEditor';
import toast from 'react-hot-toast';

const DeliveryManagementScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'deliveries' | 'riders' | 'zones' | 'live-map' | 'analytics'>('deliveries');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryList, setDeliveryList] = useState<any[]>([]);
  const [, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDeliveryData>({
    orderId: '',
    customerName: '',
    customerPhone: '',
    address: '',
  });
  const { formatCurrency } = useCurrencyFormatter();

  // Modals state
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<any>(null);
  const [showZoneEditModal, setShowZoneEditModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const emptyZoneForm = {
    name: '',
    description: '',
    baseFee: '0',
    minimumOrder: '0',
    freeDeliveryThreshold: '',
    estimatedTimeMin: '20',
    estimatedTimeMax: '45',
    color: '#dc2626',
    isActive: true,
    coordinates: [] as { lat: number; lng: number }[],
  };
  const [zoneFormData, setZoneFormData] = useState(emptyZoneForm);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Live rider tracking (WebSocket-driven)
  const [liveRiderLocations, setLiveRiderLocations] = useState<Record<string, {
    lat: number; lng: number; timestamp: string; fullName?: string; status?: string;
  }>>({});

  // Load deliveries when tab changes to deliveries or on mount
  useEffect(() => {
    if (activeTab === 'deliveries') {
      loadDeliveries();
    }
  }, [activeTab, statusFilter]);
  
  // Load deliveries on initial mount
  useEffect(() => {
    loadDeliveries();
  }, []);

  // ── Live rider tracking via WebSocket ──
  const { subscribe, joinRoom, isConnected: wsConnected } = useWebSocket();
  useEffect(() => {
    joinRoom('delivery-tracking');
    const unsubscribe = subscribe('rider:location', (payload: any) => {
      if (!payload?.riderId || !payload?.location) return;
      setLiveRiderLocations((prev) => ({
        ...prev,
        [payload.riderId]: {
          lat: Number(payload.location.lat),
          lng: Number(payload.location.lng),
          timestamp: payload.timestamp || new Date().toISOString(),
          fullName: payload.fullName,
          status: payload.status,
        },
      }));
    });
    return () => { unsubscribe?.(); };
  }, [subscribe, joinRoom]);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const response = await deliveryService.getDeliveries({ 
        status: statusFilter !== 'all' ? statusFilter : undefined 
      });
      setDeliveryList(response.data.data?.deliveries || []);
    } catch (error) {
      console.error('Failed to load deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDelivery = async () => {
    try {
      await deliveryService.createDelivery(formData);
      toast.success('Delivery created successfully');
      setShowDeliveryModal(false);
      setFormData({ orderId: '', customerName: '', customerPhone: '', address: '' });
      loadDeliveries();
    } catch (error) {
      console.error('Failed to create delivery:', error);
      toast.error('Failed to create delivery');
    }
  };

  const { data: staffList } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const response = await staffService.getStaff();
      return response.data.data.staff || [];
    },
  });

  const { data: zoneData } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const response = await deliveryService.getZones();
      return response.data.data.zones || [];
    },
  });

  const displayDeliveries = deliveryList;
  const riders = staffList?.filter((s: any) => s.role === 'RIDER') || [];

  // Dynamic analytics derived from active data
  const deliveredCount = displayDeliveries.filter((d: any) => d.status === 'DELIVERED').length;
  
  // Calculate average delivery time from actual delivered orders
  const calculateAvgDeliveryTime = () => {
    if (deliveredCount === 0) return '0 min';
    
    const deliveredWithTimes = displayDeliveries.filter((d: any) => 
      d.status === 'DELIVERED' && d.startedAt && d.deliveredAt
    );
    
    if (deliveredWithTimes.length === 0) {
      // Fallback: estimate based on createdAt and deliveredAt
      const withDeliveredAt = displayDeliveries.filter((d: any) => 
        d.status === 'DELIVERED' && d.deliveredAt
      );
      if (withDeliveredAt.length === 0) return '0 min';
      
      const totalMinutes = withDeliveredAt.reduce((sum: number, d: any) => {
        const start = new Date(d.createdAt || d.orderedAt).getTime();
        const end = new Date(d.deliveredAt).getTime();
        return sum + Math.floor((end - start) / 60000);
      }, 0);
      
      const avg = Math.round(totalMinutes / withDeliveredAt.length);
      return avg > 60 ? `${Math.floor(avg / 60)}h ${avg % 60}m` : `${avg} min`;
    }
    
    const totalMinutes = deliveredWithTimes.reduce((sum: number, d: any) => {
      const start = new Date(d.startedAt).getTime();
      const end = new Date(d.deliveredAt).getTime();
      return sum + Math.floor((end - start) / 60000);
    }, 0);
    
    const avg = Math.round(totalMinutes / deliveredWithTimes.length);
    return avg > 60 ? `${Math.floor(avg / 60)}h ${avg % 60}m` : `${avg} min`;
  };
  
  // Calculate on-time rate based on estimated delivery times
  const calculateOnTimeRate = () => {
    if (deliveredCount === 0) return 0;
    
    const deliveredWithTimes = displayDeliveries.filter((d: any) => 
      d.status === 'DELIVERED' && d.estimatedTime && d.deliveredAt
    );
    
    if (deliveredWithTimes.length === 0) return 100; // Assume on-time if no data
    
    const onTimeCount = deliveredWithTimes.filter((d: any) => {
      const estimated = new Date(d.estimatedTime).getTime();
      const actual = new Date(d.deliveredAt).getTime();
      return actual <= estimated;
    }).length;
    
    return Math.round((onTimeCount / deliveredWithTimes.length) * 100);
  };
  
  // Calculate dynamic fees and tips from delivery data
  const calculateFeesAndTips = () => {
    const totalFees = displayDeliveries.reduce((sum: number, d: any) => sum + (d.deliveryFee || 0), 0);
    const totalTips = displayDeliveries.reduce((sum: number, d: any) => sum + (d.tipAmount || 0), 0);
    return { totalFees, totalTips };
  };

  const { totalFees, totalTips } = calculateFeesAndTips();

  const analytics = {
    totalDeliveries: displayDeliveries.length,
    avgDeliveryTime: calculateAvgDeliveryTime(),
    onTimeRate: calculateOnTimeRate(),
    totalRevenue: displayDeliveries.reduce((sum: number, d: any) => sum + (d.orderTotal || 0), 0),
    avgOrderValue: displayDeliveries.length > 0 ? displayDeliveries.reduce((sum: number, d: any) => sum + (d.orderTotal || 0), 0) / displayDeliveries.length : 0,
    activeRiders: riders.filter((r: any) => r.isActive).length,
    totalFees,
    totalTips,
  };

  const stats = {
    pending: displayDeliveries.filter((d: any) => d.status === 'PENDING').length,
    preparing: displayDeliveries.filter((d: any) => d.status === 'PREPARING').length,
    inTransit: displayDeliveries.filter((d: any) => d.status === 'IN_TRANSIT').length,
    delivered: deliveredCount,
  };

  const zones = zoneData || [];

  // Handlers
  const handleViewRider = (rider: any) => {
    setSelectedRider(rider);
    setShowRiderModal(true);
  };

  const handleEditZone = (zone: any) => {
    setSelectedZone(zone);
    setZoneFormData({
      name: zone.name || '',
      description: zone.description || '',
      baseFee: String(zone.baseFee ?? 0),
      minimumOrder: String(zone.minimumOrder ?? 0),
      freeDeliveryThreshold: zone.freeDeliveryThreshold != null ? String(zone.freeDeliveryThreshold) : '',
      estimatedTimeMin: String(zone.estimatedTimeMin ?? 20),
      estimatedTimeMax: String(zone.estimatedTimeMax ?? 45),
      color: zone.color || '#dc2626',
      isActive: zone.isActive !== false,
      coordinates: Array.isArray(zone.coordinates)
        ? zone.coordinates.map((c: any) => ({ lat: Number(c.lat), lng: Number(c.lng) }))
        : [],
    });
    setShowZoneEditModal(true);
  };

  const handleSaveZone = async () => {
    if (!zoneFormData.name.trim()) {
      toast.error('Zone name is required');
      return;
    }
    if (zoneFormData.coordinates.length < 3) {
      toast.error('Draw at least 3 points on the map to form a zone polygon');
      return;
    }

    const payload = {
      name: zoneFormData.name.trim(),
      description: zoneFormData.description.trim() || undefined,
      baseFee: parseFloat(zoneFormData.baseFee) || 0,
      minimumOrder: parseFloat(zoneFormData.minimumOrder) || 0,
      freeDeliveryThreshold: zoneFormData.freeDeliveryThreshold
        ? parseFloat(zoneFormData.freeDeliveryThreshold)
        : undefined,
      estimatedTimeMin: parseInt(zoneFormData.estimatedTimeMin, 10) || 20,
      estimatedTimeMax: parseInt(zoneFormData.estimatedTimeMax, 10) || 45,
      color: zoneFormData.color,
      isActive: zoneFormData.isActive,
      coordinates: zoneFormData.coordinates,
    };

    try {
      if (selectedZone?.id) {
        await deliveryZoneService.updateZone(selectedZone.id, payload);
        toast.success('Zone updated');
      } else {
        await deliveryZoneService.createZone(payload);
        toast.success('Zone created');
      }
      setShowZoneEditModal(false);
      setSelectedZone(null);
      setZoneFormData(emptyZoneForm);
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save zone');
    }
  };

  const handleNewZone = () => {
    setSelectedZone(null);
    setZoneFormData(emptyZoneForm);
    setShowZoneEditModal(true);
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;
    try {
      await deliveryZoneService.deleteZone(zoneId);
      toast.success('Zone deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
    } catch (error) {
      toast.error('Failed to delete zone');
    }
  };

  // Normalize zones for the map display
  const zonesForMap: MapZone[] = useMemo(() => {
    return (zones || [])
      .filter((z: any) => Array.isArray(z?.coordinates) && z.coordinates.length >= 3)
      .map((z: any) => ({
        id: z.id,
        name: z.name,
        color: z.color,
        baseFee: Number(z.baseFee || 0),
        isActive: z.isActive !== false,
        coordinates: z.coordinates.map((c: any) => ({ lat: Number(c.lat), lng: Number(c.lng) })),
      }));
  }, [zones]);

  // Build live map markers from rider locations + active deliveries with coords
  const liveMarkers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    const now = Date.now();
    Object.entries(liveRiderLocations).forEach(([riderId, loc]) => {
      const ageMs = now - new Date(loc.timestamp).getTime();
      out.push({
        id: `rider-${riderId}`,
        lat: loc.lat,
        lng: loc.lng,
        label: loc.fullName || 'Rider',
        type: 'rider',
        status: loc.status || 'live',
        isStale: ageMs > 5 * 60 * 1000,
      });
    });
    // Also include riders who haven't pushed via WS yet but have a stored last-known location
    riders.forEach((rider: any) => {
      if (out.find(m => m.id === `rider-${rider.id}`)) return;
      const lat = Number(rider.lastLocationLat);
      const lng = Number(rider.lastLocationLng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const ageMs = rider.lastLocationAt ? now - new Date(rider.lastLocationAt).getTime() : Infinity;
      out.push({
        id: `rider-${rider.id}`,
        lat,
        lng,
        label: rider.fullName || rider.name || 'Rider',
        type: 'rider',
        status: rider.status || 'offline',
        isStale: ageMs > 10 * 60 * 1000,
      });
    });
    // Active deliveries with coords as drop pins
    displayDeliveries.forEach((d: any) => {
      const lat = Number(d.latitude);
      const lng = Number(d.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (d.status === 'DELIVERED' || d.status === 'CANCELLED') return;
      out.push({
        id: `delivery-${d.id}`,
        lat,
        lng,
        label: `#${d.deliveryNumber || d.id?.slice(-6)}`,
        type: 'delivery',
        status: d.status,
      });
    });
    return out;
  }, [liveRiderLocations, riders, displayDeliveries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-manrope">Delivery Management</h1>
          <p className="text-gray-600 mt-1">Manage displayDeliveries, riders, and delivery zones</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowDeliveryModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          New Delivery
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Deliveries</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.totalDeliveries}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Delivery Time</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{analytics.avgDeliveryTime}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">On-Time Rate</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{analytics.onTimeRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Delivery Revenue</p>
              <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(analytics.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 inline-flex flex-wrap">
        {[
          { id: 'deliveries', label: 'Active Deliveries', icon: Truck },
          { id: 'live-map', label: 'Live Map', icon: MapIcon },
          { id: 'riders', label: 'Riders', icon: User },
          { id: 'zones', label: 'Delivery Zones', icon: MapPin },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* Filters - Only for Deliveries tab */}
      {activeTab === 'deliveries' && (
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search displayDeliveries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PREPARING">Preparing</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
          </select>

          <button 
            onClick={() => setShowFilterModal(true)}
            className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary transition-colors"
          >
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* DELIVERIES TAB */}
      {activeTab === 'deliveries' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending', count: stats.pending, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
            { label: 'Preparing', count: stats.preparing, color: 'bg-blue-100 text-blue-700 border-blue-300' },
            { label: 'In Transit', count: stats.inTransit, color: 'bg-purple-100 text-purple-700 border-purple-300' },
            { label: 'Delivered', count: stats.delivered, color: 'bg-green-100 text-green-700 border-green-300' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-2xl p-4 border-2 ${stat.color}`}
            >
              <p className="text-sm font-semibold">{stat.label}</p>
              <p className="text-3xl font-bold mt-1">{stat.count}</p>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          {displayDeliveries.map((delivery: any, index: number) => (
            <motion.div
              key={delivery.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    delivery.status === 'DELIVERED' ? 'bg-green-100' :
                    delivery.status === 'IN_TRANSIT' ? 'bg-purple-100' :
                    delivery.status === 'PREPARING' ? 'bg-blue-100' :
                    'bg-yellow-100'
                  }`}>
                    <Package className={`w-8 h-8 ${
                      delivery.status === 'DELIVERED' ? 'text-green-600' :
                      delivery.status === 'IN_TRANSIT' ? 'text-purple-600' :
                      delivery.status === 'PREPARING' ? 'text-blue-600' :
                      'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{delivery.id}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                        delivery.status === 'IN_TRANSIT' ? 'bg-purple-100 text-purple-700' :
                        delivery.status === 'PREPARING' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {(delivery.status || 'UNKNOWN').replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{delivery.customer}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {delivery.address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {delivery.phone}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(delivery.orderTotal)}</p>
                  <p className="text-sm text-gray-500 mt-1">Est: {delivery.estimatedTime}</p>
                  {delivery.rider && (
                    <p className="text-xs text-gray-600 mt-1">Rider: {delivery.rider}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* RIDERS TAB */}
      {activeTab === 'riders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {riders.map((rider: any, index: number) => (
            <motion.div
              key={rider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary-container/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{rider.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      rider.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                      rider.status === 'ON_DELIVERY' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {(rider.status || 'UNKNOWN').replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="font-bold text-gray-900">{rider.rating}</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  {rider.phone}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  {rider.email}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Package className="w-4 h-4" />
                  {rider.totalDeliveries} displayDeliveries
                </div>
                {rider.currentDelivery && (
                  <div className="flex items-center gap-2 text-blue-600 font-semibold">
                    <Navigation className="w-4 h-4" />
                    {rider.currentDelivery}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleViewRider(rider)}
                  className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors"
                >
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* LIVE MAP TAB */}
      {activeTab === 'live-map' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-neutral-600">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-neutral-200 font-bold">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'}`} />
              {wsConnected ? 'Live tracking connected' : 'Connecting…'}
            </div>
            <span className="text-neutral-500">
              <Activity className="w-4 h-4 inline-block mr-1" />
              {liveMarkers.filter(m => m.type === 'rider').length} rider(s) ·
              {' '}{liveMarkers.filter(m => m.type === 'delivery').length} active deliveries ·
              {' '}{zonesForMap.length} zones
            </span>
          </div>
          <DeliveryMap zones={zonesForMap} markers={liveMarkers} height={560} />
        </div>
      )}

      {/* ZONES TAB */}
      {activeTab === 'zones' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Delivery Zones ({zones.length})</h2>
              <p className="text-sm text-gray-500">Define geo-fenced polygons. New deliveries auto-assign to the matching zone.</p>
            </div>
            <button
              onClick={handleNewZone}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold shadow-lg"
            >
              <Plus className="w-4 h-4" /> New Zone
            </button>
          </div>

          {/* Map preview of all zones */}
          <DeliveryMap zones={zonesForMap} height={360} />

          {/* Zone cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.length === 0 && (
              <div className="md:col-span-2 lg:col-span-3 bg-white rounded-2xl p-10 text-center border-2 border-dashed border-neutral-200">
                <MapPin className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <p className="font-bold text-neutral-700">No delivery zones yet</p>
                <p className="text-sm text-neutral-500 mt-1">Click "New Zone" to draw your first geo-fenced area on the map.</p>
              </div>
            )}
            {zones.map((zone: any, index: number) => {
              const polygonValid = Array.isArray(zone.coordinates) && zone.coordinates.length >= 3;
              return (
                <motion.div
                  key={zone.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color || '#dc2626' }} />
                        <h3 className="text-base font-bold text-gray-900 truncate">{zone.name}</h3>
                        {!zone.isActive && <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Inactive</span>}
                      </div>
                      {zone.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{zone.description}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm mb-3">
                    <div className="flex justify-between"><span className="text-gray-500">Base fee</span><span className="font-bold text-primary">{formatCurrency(Number(zone.baseFee || 0))}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Min order</span><span className="font-semibold">{formatCurrency(Number(zone.minimumOrder || 0))}</span></div>
                    {zone.freeDeliveryThreshold != null && (
                      <div className="flex justify-between"><span className="text-gray-500">Free above</span><span className="font-semibold text-emerald-600">{formatCurrency(Number(zone.freeDeliveryThreshold))}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-gray-500">ETA</span><span className="font-semibold">{zone.estimatedTimeMin}–{zone.estimatedTimeMax} min</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Polygon</span>
                      <span className={`font-semibold ${polygonValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {polygonValid ? `${zone.coordinates.length} points` : 'Not drawn'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleEditZone(zone)} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">Edit</button>
                    <button onClick={() => handleDeleteZone(zone.id)} className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Delivery Performance
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Total Deliveries Today</span>
                <span className="text-2xl font-bold text-gray-900">{analytics.totalDeliveries}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Average Delivery Time</span>
                <span className="text-2xl font-bold text-green-600">{analytics.avgDeliveryTime}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">On-Time Delivery Rate</span>
                <span className="text-2xl font-bold text-blue-600">{analytics.onTimeRate}%</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Active Riders</span>
                <span className="text-2xl font-bold text-purple-600">{analytics.activeRiders}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Revenue Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Total Delivery Revenue</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(analytics.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Average Order Value</span>
                <span className="text-2xl font-bold text-green-600">{formatCurrency(analytics.avgOrderValue)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Delivery Fees Collected</span>
                <span className="text-2xl font-bold text-blue-600">{formatCurrency(analytics.totalFees)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Tips Received</span>
                <span className="text-2xl font-bold text-purple-600">{formatCurrency(analytics.totalTips)}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Create New Delivery</h2>
              <button onClick={() => setShowDeliveryModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Order ID</label>
                <input type="text" value={formData.orderId} onChange={(e) => setFormData({ ...formData, orderId: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl" placeholder="Enter order ID" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Name</label>
                <input type="text" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Phone</label>
                <input type="tel" value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Delivery Address</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDeliveryModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold">Cancel</button>
              <button onClick={handleCreateDelivery} className="flex-1 py-3 gradient-btn rounded-xl font-semibold">Create Delivery</button>
            </div>
          </div>
        </div>
      )}

      {/* Rider Details Modal */}
      {showRiderModal && selectedRider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Rider Details</h2>
              <button onClick={() => setShowRiderModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary-container/20 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedRider.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedRider.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                      selectedRider.status === 'ON_DELIVERY' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedRider.status?.replace('_', ' ') || 'Unknown'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-gray-900">{selectedRider.rating || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-semibold text-gray-900">{selectedRider.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-900">{selectedRider.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Package className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Total Deliveries</p>
                    <p className="font-semibold text-gray-900">{selectedRider.totalDeliveries || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Truck className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-semibold text-gray-900">{selectedRider.role || 'Rider'}</p>
                  </div>
                </div>
              </div>

              {selectedRider.currentDelivery && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    Current Delivery
                  </h4>
                  <p className="text-blue-700">{selectedRider.currentDelivery}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Zone Create / Edit Modal */}
      {showZoneEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="bg-white rounded-2xl p-6 w-full max-w-5xl my-8 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedZone ? 'Edit Delivery Zone' : 'Create Delivery Zone'}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Click on the map to draw the polygon. Click a vertex to remove it.</p>
              </div>
              <button onClick={() => setShowZoneEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Form fields */}
              <div className="lg:col-span-1 space-y-3 text-sm">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Zone Name *</label>
                  <input type="text" value={zoneFormData.name}
                    onChange={(e) => setZoneFormData({ ...zoneFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none"
                    placeholder="e.g., Downtown Core" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Description</label>
                  <textarea value={zoneFormData.description}
                    onChange={(e) => setZoneFormData({ ...zoneFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none"
                    rows={2} placeholder="Notes for this zone (optional)" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Base Fee ($)</label>
                    <input type="number" step="0.01" min="0" value={zoneFormData.baseFee}
                      onChange={(e) => setZoneFormData({ ...zoneFormData, baseFee: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Min Order ($)</label>
                    <input type="number" step="0.01" min="0" value={zoneFormData.minimumOrder}
                      onChange={(e) => setZoneFormData({ ...zoneFormData, minimumOrder: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Free Delivery Above ($)</label>
                  <input type="number" step="0.01" min="0" value={zoneFormData.freeDeliveryThreshold}
                    onChange={(e) => setZoneFormData({ ...zoneFormData, freeDeliveryThreshold: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none"
                    placeholder="Leave blank to disable" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">ETA Min (min)</label>
                    <input type="number" min="0" value={zoneFormData.estimatedTimeMin}
                      onChange={(e) => setZoneFormData({ ...zoneFormData, estimatedTimeMin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">ETA Max (min)</label>
                    <input type="number" min="0" value={zoneFormData.estimatedTimeMax}
                      onChange={(e) => setZoneFormData({ ...zoneFormData, estimatedTimeMax: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={zoneFormData.color}
                      onChange={(e) => setZoneFormData({ ...zoneFormData, color: e.target.value })}
                      className="h-10 w-14 border border-gray-200 rounded-lg cursor-pointer" />
                    <input type="text" value={zoneFormData.color}
                      onChange={(e) => setZoneFormData({ ...zoneFormData, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none font-mono text-xs" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="zoneActive" checked={zoneFormData.isActive}
                    onChange={(e) => setZoneFormData({ ...zoneFormData, isActive: e.target.checked })}
                    className="w-4 h-4" />
                  <label htmlFor="zoneActive" className="text-gray-700 font-semibold">Zone is active</label>
                </div>
              </div>

              {/* Polygon editor */}
              <div className="lg:col-span-2">
                <ZoneEditor
                  value={zoneFormData.coordinates}
                  onChange={(coords) => setZoneFormData({ ...zoneFormData, coordinates: coords })}
                  otherZones={zonesForMap.filter((z) => z.id !== selectedZone?.id)}
                  color={zoneFormData.color}
                  height={460}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
              <button onClick={() => setShowZoneEditModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button onClick={handleSaveZone} className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold disabled:opacity-50"
                disabled={zoneFormData.coordinates.length < 3 || !zoneFormData.name.trim()}>
                {selectedZone ? 'Update Zone' : 'Create Zone'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Filter Deliveries</h2>
              <button onClick={() => setShowFilterModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <div className="space-y-2">
                  {['all', 'PENDING', 'PREPARING', 'IN_TRANSIT', 'DELIVERED'].map((status) => (
                    <label key={status} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input 
                        type="radio" 
                        name="statusFilter" 
                        value={status}
                        checked={statusFilter === status}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="capitalize">{status.replace('_', ' ').toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date Range</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-xl">
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowFilterModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Cancel</button>
              <button 
                onClick={() => setShowFilterModal(false)} 
                className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DeliveryManagementScreen;

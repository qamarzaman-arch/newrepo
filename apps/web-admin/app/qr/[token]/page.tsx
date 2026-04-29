'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, ShoppingCart, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../lib/currency';

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL as string | undefined) || 'http://localhost:3001/api/v1';

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  categoryId: string;
  isAvailable?: boolean;
}

interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

interface SessionInfo {
  id: string;
  token: string;
  status: string;
  expiresAt: string;
  table?: { id: string; number: string | number } | null;
  branch?: { id: string; name: string } | null;
}

interface CartLine {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface OrderResponse {
  orderNumber: string;
  totalAmount: number;
}

interface SessionOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    menuItem?: { name: string };
  }>;
}

const RED = '#E53935';

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.6 + Math.random() * 1.2,
        color: ['#E53935', '#FFFFFF', '#FFD54F', '#43A047'][i % 4],
        rotate: Math.random() * 360,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', rotate: p.rotate, opacity: 0 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            left: `${p.left}%`,
            background: p.color,
            position: 'absolute',
            top: 0,
            width: 10,
            height: 14,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

export default function QrOrderingPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<OrderResponse | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackedOrders, setTrackedOrders] = useState<SessionOrder[]>([]);
  const trackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setSessionError(null);
    try {
      const sRes = await publicApi.get(`/qr-ordering/sessions/${token}`);
      setSession(sRes.data?.data?.session ?? null);
      const mRes = await publicApi.get(`/qr-ordering/menu/${token}`);
      const cats: Category[] = mRes.data?.data?.categories ?? [];
      setCategories(cats);
      if (cats.length > 0) setActiveCat(cats[0].id);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 404) {
        setSessionError('expired');
      } else {
        setSessionError('error');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const totalQty = useMemo(
    () => Object.values(cart).reduce((s, l) => s + l.quantity, 0),
    [cart],
  );
  const subtotal = useMemo(
    () => Object.values(cart).reduce((s, l) => s + l.price * l.quantity, 0),
    [cart],
  );

  const addItem = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const qty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [item.id]: {
          menuItemId: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: qty,
        },
      };
    });
  };
  const decItem = (id: string) => {
    setCart((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      if (cur.quantity <= 1) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: { ...cur, quantity: cur.quantity - 1 } };
    });
  };
  const removeItem = (id: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const placeOrder = async () => {
    if (!token) return;
    if (!customerName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (Object.keys(cart).length === 0) return;
    setPlacing(true);
    try {
      const res = await publicApi.post(`/qr-ordering/orders/${token}`, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        items: Object.values(cart).map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          notes: l.notes,
        })),
      });
      const data = res.data?.data;
      setPlacedOrder({
        orderNumber: data.orderNumber,
        totalAmount: Number(data.totalAmount),
      });
      setCart({});
      setDrawerOpen(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e.response?.data?.error?.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const fetchTrackedOrders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await publicApi.get(`/qr-ordering/orders/${token}`);
      setTrackedOrders(res.data?.data?.orders ?? []);
    } catch {
      // ignore polling errors
    }
  }, [token]);

  const openTracking = () => {
    setTrackingOpen(true);
    fetchTrackedOrders();
    if (trackTimerRef.current) clearInterval(trackTimerRef.current);
    trackTimerRef.current = setInterval(fetchTrackedOrders, 5000);
  };

  useEffect(() => {
    return () => {
      if (trackTimerRef.current) clearInterval(trackTimerRef.current);
    };
  }, []);

  // Render states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: RED }} />
      </div>
    );
  }

  if (sessionError === 'expired') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: RED }}
        >
          <AlertTriangle className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: RED }}>
          Session expired
        </h1>
        <p className="text-gray-600 mb-2 max-w-sm">
          This QR code is no longer valid. Please ask your server for a new one.
        </p>
        <p className="text-sm text-gray-400">POSLytic Restaurant</p>
      </div>
    );
  }

  if (sessionError === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: RED }}>
          Could not load menu
        </h1>
        <p className="text-gray-600 mb-4">Please check your connection and try again.</p>
        <button
          onClick={loadAll}
          className="px-6 py-3 rounded-lg text-white font-semibold"
          style={{ background: RED }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="text-white" style={{ background: RED }}>
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">POSLytic</h1>
              <p className="text-sm text-white/80">
                {session?.branch?.name ?? 'Restaurant'}
              </p>
            </div>
            {session?.table && (
              <div className="bg-white/15 rounded-xl px-4 py-2 text-right">
                <p className="text-xs text-white/80">Table</p>
                <p className="text-xl font-bold">#{String(session.table.number)}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Category tabs */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-2 overflow-x-auto">
          <div className="flex gap-2 py-3 whitespace-nowrap">
            {categories.map((cat) => {
              const active = cat.id === activeCat;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCat(cat.id);
                    const el = document.getElementById(`cat-${cat.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    active
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={active ? { background: RED } : undefined}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Menu */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {categories.length === 0 && (
          <p className="text-center text-gray-500 py-12">No menu items available right now.</p>
        )}
        {categories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="mb-8 scroll-mt-20">
            <h2 className="text-xl font-bold text-gray-900 mb-3">{cat.name}</h2>
            <div className="space-y-3">
              {cat.items.map((item) => {
                const inCart = cart[item.id]?.quantity ?? 0;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex gap-3"
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold"
                        style={{ background: RED }}
                      >
                        {item.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                      )}
                      <p className="font-bold mt-1" style={{ color: RED }}>
                        {formatCurrency(Number(item.price))}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {inCart === 0 ? (
                        <button
                          onClick={() => addItem(item)}
                          className="text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-1"
                          style={{ background: RED }}
                        >
                          <Plus className="w-4 h-4" /> Add
                        </button>
                      ) : (
                        <div
                          className="flex items-center gap-2 rounded-lg p-1"
                          style={{ background: RED }}
                        >
                          <button
                            onClick={() => decItem(item.id)}
                            className="bg-white/20 hover:bg-white/30 text-white w-8 h-8 rounded-md flex items-center justify-center"
                            aria-label="decrease"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-white font-bold w-6 text-center">{inCart}</span>
                          <button
                            onClick={() => addItem(item)}
                            className="bg-white/20 hover:bg-white/30 text-white w-8 h-8 rounded-md flex items-center justify-center"
                            aria-label="increase"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Floating cart */}
      {totalQty > 0 && !placedOrder && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-5 right-5 z-40 text-white rounded-full shadow-lg flex items-center gap-3 px-5 py-3"
          style={{ background: RED }}
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ color: RED }}>
              {totalQty}
            </span>
          </div>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </button>
      )}

      {/* Cart drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:max-w-md bg-white z-50 flex flex-col"
            >
              <div
                className="flex items-center justify-between px-4 py-4 text-white"
                style={{ background: RED }}
              >
                <h2 className="text-lg font-bold">Your Cart</h2>
                <button onClick={() => setDrawerOpen(false)} aria-label="close">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {Object.values(cart).length === 0 && (
                  <p className="text-center text-gray-500 py-8">Cart is empty</p>
                )}
                {Object.values(cart).map((line) => (
                  <div
                    key={line.menuItemId}
                    className="flex items-center gap-3 py-3 border-b border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{line.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(line.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decItem(line.menuItemId)}
                        className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-bold">{line.quantity}</span>
                      <button
                        onClick={() =>
                          setCart((p) => ({
                            ...p,
                            [line.menuItemId]: { ...line, quantity: line.quantity + 1 },
                          }))
                        }
                        className="w-8 h-8 rounded-md text-white flex items-center justify-center"
                        style={{ background: RED }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(line.menuItemId)}
                        className="ml-1 text-gray-400 hover:text-gray-600"
                        aria-label="remove"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-6 space-y-3">
                  <input
                    type="text"
                    placeholder="Your name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': RED } as React.CSSProperties}
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:ring-2"
                  />
                </div>
              </div>
              <div className="border-t border-gray-200 px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-bold text-lg">{formatCurrency(subtotal)}</span>
                </div>
                <button
                  disabled={placing || Object.keys(cart).length === 0}
                  onClick={placeOrder}
                  className="w-full text-white font-bold py-4 rounded-xl text-lg disabled:opacity-60"
                  style={{ background: RED }}
                >
                  {placing ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Order placed success */}
      <AnimatePresence>
        {placedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6 text-center"
          >
            <Confetti />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="rounded-full w-28 h-28 flex items-center justify-center mb-6"
              style={{ background: RED }}
            >
              <CheckCircle2 className="w-16 h-16 text-white" strokeWidth={2.5} />
            </motion.div>
            <h1 className="text-3xl font-extrabold mb-2" style={{ color: RED }}>
              Order #{placedOrder.orderNumber} placed!
            </h1>
            <p className="text-2xl font-bold text-gray-900 mb-2">
              Total: {formatCurrency(placedOrder.totalAmount)}
            </p>
            <p className="text-gray-600 mb-8 max-w-sm">
              Your order has been sent to the kitchen.
            </p>
            <button
              onClick={openTracking}
              className="px-6 py-3 rounded-lg text-white font-semibold"
              style={{ background: RED }}
            >
              Track Order
            </button>
            <button
              onClick={() => {
                setPlacedOrder(null);
              }}
              className="mt-3 text-sm text-gray-500 underline"
            >
              Order more
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tracking modal */}
      <AnimatePresence>
        {trackingOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/60 flex items-end sm:items-center justify-center"
            onClick={() => {
              setTrackingOpen(false);
              if (trackTimerRef.current) clearInterval(trackTimerRef.current);
            }}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Order Status</h2>
                <button
                  onClick={() => {
                    setTrackingOpen(false);
                    if (trackTimerRef.current) clearInterval(trackTimerRef.current);
                  }}
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4">Auto-refreshes every 5s</p>
              {trackedOrders.length === 0 && (
                <p className="text-center text-gray-500 py-8">No orders yet</p>
              )}
              <div className="space-y-3">
                {trackedOrders.map((o) => (
                  <div key={o.id} className="border border-gray-200 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold">#{o.orderNumber}</p>
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full text-white"
                        style={{ background: RED }}
                      >
                        {o.status}
                      </span>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {o.items.map((it) => (
                        <li key={it.id}>
                          {it.quantity} × {it.menuItem?.name ?? 'Item'}
                        </li>
                      ))}
                    </ul>
                    <p className="text-right font-bold mt-2">
                      {formatCurrency(Number(o.totalAmount))}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

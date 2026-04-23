import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Clock, RefreshCw, Trash2, WifiOff, X } from 'lucide-react';
import { getOfflineQueueManager, QueuedOrder } from '../services/offlineQueueManager';

const queueManager = getOfflineQueueManager();

const OfflineQueueStatus: React.FC = () => {
  const [queueStatus, setQueueStatus] = useState(queueManager.getQueueStatus());
  const [queue, setQueue] = useState<QueuedOrder[]>(queueManager.getQueue());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setQueueStatus(queueManager.getQueueStatus());
      setQueue(queueManager.getQueue());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (queueStatus.total === 0 && queueStatus.isOnline) {
    return null;
  }

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setShowDetails(true)}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold shadow-lg ${
          queueStatus.failed > 0
            ? 'bg-red-600 text-white'
            : queueStatus.isSyncing
            ? 'bg-red-500 text-white'
            : 'bg-white text-red-700 ring-1 ring-red-200'
        }`}
      >
        {queueStatus.isSyncing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <WifiOff className="h-5 w-5" />}
        <div className="text-left">
          <p className="text-xs opacity-80">{queueStatus.isSyncing ? 'Syncing Orders' : 'Offline Queue'}</p>
          <p className="text-sm font-bold">
            {queueStatus.total} order{queueStatus.total !== 1 ? 's' : ''}
          </p>
        </div>
      </motion.button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                    <WifiOff className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Offline Order Queue</h2>
                    <p className="text-sm text-gray-500">
                      {queueStatus.total} order{queueStatus.total !== 1 ? 's' : ''} waiting to sync
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-600">Pending</p>
                  <p className="mt-2 text-3xl font-black text-red-700">{queueStatus.pending}</p>
                </div>
                <div className="rounded-2xl border border-red-100 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-600">Syncing</p>
                  <p className="mt-2 text-3xl font-black text-red-700">{queueStatus.syncing}</p>
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-900 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-100">Failed</p>
                  <p className="mt-2 text-3xl font-black text-white">{queueStatus.failed}</p>
                </div>
              </div>

              <div
                className={`mb-6 rounded-2xl border p-4 ${
                  queueStatus.isOnline ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <p className={`text-sm font-semibold ${queueStatus.isOnline ? 'text-emerald-700' : 'text-red-700'}`}>
                  {queueStatus.isOnline
                    ? 'Online. Orders will sync automatically.'
                    : 'Offline. Orders stay queued until the connection returns.'}
                </p>
              </div>

              <div className="mb-6 space-y-3">
                {queue.map((order) => (
                  <div
                    key={order.id}
                    className={`rounded-2xl border p-4 ${
                      order.status === 'failed'
                        ? 'border-red-200 bg-red-50'
                        : order.status === 'syncing'
                        ? 'border-red-200 bg-white'
                        : 'border-red-100 bg-rose-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-bold text-gray-900">#{order.id.slice(-8)}</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
                            {order.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{new Date(order.timestamp).toLocaleString()}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {order.orderData.items?.length || 0} item{order.orderData.items?.length !== 1 ? 's' : ''}
                          {order.orderData.customerName ? ` • ${order.orderData.customerName}` : ''}
                        </p>
                        {order.error && (
                          <p className="mt-2 text-xs text-red-600">
                            Error: {order.error} (Retry {order.retryCount}/3)
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {order.status === 'failed' && (
                          <button
                            onClick={() => queueManager.retryOrder(order.id)}
                            className="rounded-lg bg-white p-2 text-red-600 transition-colors hover:bg-red-100"
                            title="Retry"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Remove this order from the queue?')) {
                              queueManager.removeFromQueue(order.id);
                            }
                          }}
                          className="rounded-lg bg-white p-2 text-red-600 transition-colors hover:bg-red-100"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {queue.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-red-200 p-10 text-center text-gray-500">
                    <Clock className="mx-auto mb-3 h-10 w-10 text-red-300" />
                    No queued orders.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 rounded-2xl bg-gray-100 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Close
                </button>
                {queueStatus.isOnline && !queueStatus.isSyncing && queueStatus.total > 0 && (
                  <button
                    onClick={() => queueManager.syncQueue()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-3 font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Sync Now
                  </button>
                )}
                {queueStatus.total > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all queued orders?')) {
                        queueManager.clearQueue();
                      }
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-950 py-3 font-semibold text-white transition-colors hover:bg-black"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Clear Queue
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OfflineQueueStatus;

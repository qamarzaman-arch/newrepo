import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Trash2, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { getOfflineQueueManager } from '../services/offlineQueueManager';

const OfflineQueueStatus: React.FC = () => {
  const [queueStatus, setQueueStatus] = useState(getOfflineQueueManager().getQueueStatus());
  const [showDetails, setShowDetails] = useState(false);
  const [queue, setQueue] = useState(getOfflineQueueManager().getQueue());

  useEffect(() => {
    const interval = setInterval(() => {
      setQueueStatus(getOfflineQueueManager().getQueueStatus());
      setQueue(getOfflineQueueManager().getQueue());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSync = () => {
    getOfflineQueueManager().syncQueue();
  };

  const handleClearQueue = () => {
    if (confirm('Are you sure you want to clear all queued orders? This cannot be undone.')) {
      getOfflineQueueManager().clearQueue();
    }
  };

  const handleRetry = (orderId: string) => {
    getOfflineQueueManager().retryOrder(orderId);
  };

  const handleRemove = (orderId: string) => {
    if (confirm('Remove this order from the queue?')) {
      getOfflineQueueManager().removeFromQueue(orderId);
    }
  };

  if (queueStatus.total === 0 && queueStatus.isOnline) {
    return null;
  }

  return (
    <>
      {/* Queue Status Badge */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setShowDetails(true)}
        className={`fixed bottom-6 right-6 z-40 px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 font-semibold ${
          queueStatus.failed > 0
            ? 'bg-red-500 text-white'
            : queueStatus.isSyncing
            ? 'bg-blue-500 text-white'
            : 'bg-amber-500 text-white'
        }`}
      >
        {queueStatus.isSyncing ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : (
          <WifiOff className="w-5 h-5" />
        )}
        <div className="text-left">
          <p className="text-xs opacity-90">
            {queueStatus.isSyncing ? 'Syncing...' : 'Offline Queue'}
          </p>
          <p className="text-sm font-bold">
            {queueStatus.total} order{queueStatus.total !== 1 ? 's' : ''}
          </p>
        </div>
      </motion.button>

      {/* Queue Details Modal */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <WifiOff className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Offline Queue</h2>
                    <p className="text-sm text-gray-500">
                      {queueStatus.total} order{queueStatus.total !== 1 ? 's' : ''} waiting to sync
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs font-semibold text-yellow-700">Pending</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-700">{queueStatus.pending}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-semibold text-blue-700">Syncing</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{queueStatus.syncing}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-xs font-semibold text-red-700">Failed</p>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{queueStatus.failed}</p>
                </div>
              </div>

              {/* Connection Status */}
              <div className={`mb-6 p-4 rounded-xl border ${
                queueStatus.isOnline
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm font-semibold ${
                  queueStatus.isOnline ? 'text-green-700' : 'text-red-700'
                }`}>
                  {queueStatus.isOnline ? '✓ Online' : '⚠ Offline'} - {
                    queueStatus.isOnline
                      ? 'Orders will sync automatically'
                      : 'Orders will sync when connection is restored'
                  }
                </p>
              </div>

              {/* Queue Items */}
              {queue.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="font-bold text-gray-900">Queued Orders</h3>
                  {queue.map((order) => (
                    <div
                      key={order.id}
                      className={`p-4 rounded-xl border-2 ${
                        order.status === 'failed'
                          ? 'border-red-200 bg-red-50'
                          : order.status === 'syncing'
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900">
                              #{order.id.slice(-8)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              order.status === 'failed'
                                ? 'bg-red-200 text-red-700'
                                : order.status === 'syncing'
                                ? 'bg-blue-200 text-blue-700'
                                : 'bg-yellow-200 text-yellow-700'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {new Date(order.timestamp).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {order.data.items?.length || 0} item{order.data.items?.length !== 1 ? 's' : ''}
                            {order.data.customerName && ` • ${order.data.customerName}`}
                          </p>
                          {order.error && (
                            <p className="text-xs text-red-600 mt-2">
                              Error: {order.error} (Retry {order.retryCount}/3)
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'failed' && (
                            <button
                              onClick={() => handleRetry(order.id)}
                              className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                              title="Retry"
                            >
                              <RefreshCw className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(order.id)}
                            className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                {queueStatus.total > 0 && (
                  <>
                    {queueStatus.isOnline && !queueStatus.isSyncing && (
                      <button
                        onClick={handleSync}
                        className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Sync Now
                      </button>
                    )}
                    <button
                      onClick={handleClearQueue}
                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      Clear Queue
                    </button>
                  </>
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

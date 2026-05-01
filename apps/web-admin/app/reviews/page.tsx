'use client';

import React, { useEffect, useState } from 'react';
import { Star, MessageCircle, EyeOff, Reply } from 'lucide-react';
import { Button, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  customerName?: string;
  source: string;
  orderId?: string;
  orderNumber?: string;
  reply?: string;
  isHidden?: boolean;
  createdAt: string;
}

interface Summary {
  averageRating: number;
  totalReviews: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

const SOURCES = ['IN_APP', 'GOOGLE', 'FOODPANDA', 'FACEBOOK'];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [replyModal, setReplyModal] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (filterRating) params.rating = filterRating;
      if (filterSource) params.source = filterSource;
      const [revRes, sumRes] = await Promise.all([
        apiClient.get('/reviews', { params }),
        apiClient.get('/reviews/summary'),
      ]);
      const d = revRes.data?.data;
      setReviews(d?.reviews || d?.items || d || []);
      setSummary(sumRes.data?.data || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterRating, filterSource]);

  const handleReply = async () => {
    if (!replyModal) return;
    if (!replyText.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.put(`/reviews/${replyModal.id}/reply`, { reply: replyText });
      toast.success('Reply posted');
      setReplyModal(null);
      setReplyText('');
      fetchData();
    } catch {
      toast.error('Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  // QA C55: confirmHide marks the row as pending-hide; the inline custom
  // modal in the JSX renders a real dialog instead of a native confirm() that
  // looks out of place in the design system.
  const [pendingHideId, setPendingHideId] = useState<string | null>(null);

  const requestHide = (id: string) => setPendingHideId(id);

  const handleHide = async () => {
    if (!pendingHideId) return;
    const id = pendingHideId;
    setPendingHideId(null);
    try {
      await apiClient.put(`/reviews/${id}/hide`);
      toast.success('Review hidden');
      fetchData();
    } catch {
      toast.error('Failed to hide review');
    }
  };

  const renderStars = (rating: number, size = 16) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={size}
          className={s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );

  const sourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      IN_APP: 'bg-red-100 text-red-700',
      GOOGLE: 'bg-blue-100 text-blue-700',
      FOODPANDA: 'bg-pink-100 text-pink-700',
      FACEBOOK: 'bg-indigo-100 text-indigo-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[source] || 'bg-gray-100 text-gray-700'}`}>
        {source}
      </span>
    );
  };

  const distMax = summary ? Math.max(...Object.values(summary.distribution || {}), 1) : 1;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-black tracking-tight text-gray-900">Customer Reviews</h1>
        <p className="text-gray-500 mt-2 font-medium">Manage feedback and respond to customers</p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          {error} — <button onClick={fetchData} className="underline">Retry</button>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col items-center justify-center">
            <div className="text-6xl font-black text-[#E53935]">{Number(summary.averageRating || 0).toFixed(1)}</div>
            {renderStars(Math.round(summary.averageRating || 0), 24)}
            <p className="text-sm text-gray-500 mt-2 font-medium">Average Rating</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col items-center justify-center">
            <div className="text-6xl font-black text-gray-900">{summary.totalReviews || 0}</div>
            <p className="text-sm text-gray-500 mt-2 font-medium">Total Reviews</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3">Rating Distribution</p>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map(star => {
                const count = (summary.distribution as any)?.[star] || 0;
                const pct = (count / distMax) * 100;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="font-bold w-6">{star}★</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right font-semibold text-gray-600">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterRating(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterRating === null ? 'bg-[#E53935] text-white border-[#E53935]' : 'bg-white text-gray-600 border-neutral-200 hover:border-red-300'}`}
          >All Ratings</button>
          {[5, 4, 3, 2, 1].map(s => (
            <button
              key={s}
              onClick={() => setFilterRating(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterRating === s ? 'bg-[#E53935] text-white border-[#E53935]' : 'bg-white text-gray-600 border-neutral-200 hover:border-red-300'}`}
            >{s}★</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterSource(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterSource === null ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-neutral-200 hover:border-gray-400'}`}
          >All Sources</button>
          {SOURCES.map(src => (
            <button
              key={src}
              onClick={() => setFilterSource(src)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold border ${filterSource === src ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-neutral-200 hover:border-gray-400'}`}
            >{src}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-20 text-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <div className="w-12 h-12 border-4 border-[#E53935] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-16 text-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  {renderStars(r.rating)}
                  <span className="font-bold text-gray-900">{r.customerName || 'Anonymous'}</span>
                  {sourceBadge(r.source)}
                  {r.reply && <span className="text-xs font-bold text-green-600">REPLIED</span>}
                </div>
                <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="text-gray-700 mb-3">{r.comment}</p>}
              {r.orderNumber && (
                <p className="text-xs text-gray-500 mb-3">Order: <span className="font-mono font-bold">{r.orderNumber}</span></p>
              )}
              {r.reply && (
                <div className="bg-gray-50 border-l-4 border-[#E53935] p-3 rounded mb-3">
                  <p className="text-xs font-bold text-gray-500 mb-1">Your reply:</p>
                  <p className="text-sm text-gray-700">{r.reply}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setReplyModal(r); setReplyText(r.reply || ''); }}
                  className="px-3 py-1.5 bg-red-50 text-[#E53935] rounded-lg text-xs font-bold hover:bg-red-100 flex items-center gap-1"
                >
                  <Reply size={14} /> {r.reply ? 'Edit Reply' : 'Reply'}
                </button>
                {!r.isHidden && (
                  <button
                    onClick={() => requestHide(r.id)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 flex items-center gap-1"
                  >
                    <EyeOff size={14} /> Hide
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!replyModal} onClose={() => { setReplyModal(null); setReplyText(''); }} title="Reply to Review">
        {replyModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              {renderStars(replyModal.rating)}
              <p className="text-sm text-gray-700 mt-2">{replyModal.comment}</p>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={5}
              placeholder="Write a thoughtful reply..."
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-[#E53935] rounded-xl focus:outline-none"
            />
            <div className="flex gap-4">
              <Button variant="outline" type="button" className="flex-1" onClick={() => { setReplyModal(null); setReplyText(''); }}>Cancel</Button>
              <Button type="button" className="flex-1 bg-[#E53935] hover:bg-[#c62b28] text-white" onClick={handleReply} disabled={isSubmitting}>
                {isSubmitting ? 'Posting...' : 'Post Reply'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* QA C55: custom confirm modal for hiding reviews. */}
      <Modal
        isOpen={!!pendingHideId}
        onClose={() => setPendingHideId(null)}
        title="Hide this review?"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-neutral-300">
            The review will no longer appear in customer-facing surfaces. You can restore it from
            the moderation queue.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setPendingHideId(null)}>Cancel</Button>
            <Button variant="danger" type="button" onClick={handleHide}>Hide review</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

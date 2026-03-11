"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/app/components/AdminLayout";

interface FeedbackItem {
  id: string;
  user_id: string;
  rating: number;
  message: string;
  created_at: string;
  user_name?: string;
  organization_name?: string;
  group_name?: string;
}

interface FeedbackStats {
  total: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Import authenticatedFetch to include auth headers
      const { authenticatedFetch } = await import('@/lib/utils/api-helpers');
      
      const [feedbackRes, statsRes] = await Promise.all([
        authenticatedFetch("/api/admin/feedback"),
        authenticatedFetch("/api/admin/feedback?stats=true")
      ]);

      console.log('Feedback response status:', feedbackRes.status);
      console.log('Stats response status:', statsRes.status);

      if (feedbackRes.ok) {
        const data = await feedbackRes.json();
        console.log('Feedback data:', data);
        setFeedback(data);
      } else {
        const errorText = await feedbackRes.text();
        console.error('Feedback error:', feedbackRes.status, errorText);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('Stats data:', statsData);
        setStats(statsData);
      } else {
        const errorText = await statsRes.text();
        console.error('Stats error:', statsRes.status, errorText);
      }
    } catch (error) {
      console.error("Error loading feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (feedbackId: string) => {
    setDeletingId(feedbackId);
    try {
      const { authenticatedFetch } = await import('@/lib/utils/api-helpers');
      const response = await authenticatedFetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        setFeedback(prev => prev.filter(item => item.id !== feedbackId));
        // Reload stats
        const statsRes = await authenticatedFetch("/api/admin/feedback?stats=true");
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } else {
        const errorData = await response.json();
        console.error('Error deleting feedback:', errorData);
        alert(errorData.error || 'שגיאה במחיקת המשוב');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('שגיאה במחיקת המשוב');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const filteredFeedback = filterRating
    ? feedback.filter((item) => item.rating === filterRating)
    : feedback;

  // Debug: Log when feedback state changes
  useEffect(() => {
    console.log('Feedback state updated:', feedback);
    console.log('Feedback count:', feedback.length);
  }, [feedback]);

  const renderStars = (rating: number) => {
    return "⭐".repeat(rating);
  };

  return (
    <AdminLayout
      title="משובים מהקורס"
      description="צפייה וניהול משובים מהתלמידות"
      icon={
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      }
    >
      <div className="space-y-2">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3" dir="ltr">
          {/* Right Column - Feedback List */}
          <div className="space-y-2" dir="rtl">
            {/* Filters */}
            <div className="bg-white rounded border border-slate-200 p-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-slate-600">סינון:</span>
                <button
                  onClick={() => setFilterRating(null)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    filterRating === null
                      ? "bg-amber-100 text-amber-700 font-medium"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  הכל
                </button>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setFilterRating(rating)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      filterRating === rating
                        ? "bg-amber-100 text-amber-700 font-medium"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {rating}⭐
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Items */}
            {loading ? (
              <div className="bg-white rounded border border-slate-200 p-6 text-center text-xs text-slate-500">
                טוען משובים...
              </div>
            ) : filteredFeedback.length === 0 ? (
              <div className="bg-white rounded border border-slate-200 p-6 text-center text-xs text-slate-500">
                {filterRating ? `אין משובים עם דירוג ${filterRating}⭐` : "אין משובים עדיין"}
              </div>
            ) : (
              <>
                {filteredFeedback.map((item) => (
                  <div key={item.id} className="bg-white rounded border border-slate-200 p-2 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-medium text-sm text-slate-900 truncate">
                          {item.user_name || "לא צוין"}
                        </span>
                        {(item.organization_name || item.group_name) && (
                          <>
                            <span className="text-[11px] text-slate-400">•</span>
                            <span className="text-[11px] text-slate-500 truncate">
                              {[item.organization_name, item.group_name].filter(Boolean).join(" • ")}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[18px]">{renderStars(item.rating)}</span>
                        <span className="text-[12px] text-slate-400 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleTimeString("he-IL", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                          {" "}
                          {new Date(item.created_at).toLocaleDateString("he-IL", {
                            day: "numeric",
                            month: "numeric",
                            year: "numeric"
                          })}
                        </span>
                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="px-2 py-1 text-[11px] bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {deletingId === item.id ? "מוחק..." : "אישור"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={deletingId === item.id}
                              className="px-2 py-1 text-[11px] bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-50"
                            >
                              ביטול
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="מחק משוב"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 leading-relaxed pr-1 whitespace-pre-wrap">
                      {item.message}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Left Column - Stats */}
          {stats && (
            <div className="space-y-2 lg:sticky lg:top-4 lg:self-start" dir="rtl">
              <div className="bg-white rounded border border-slate-200 p-3">
                <div className="text-xs text-slate-500 mb-1">סה"כ משובים</div>
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              </div>
              <div className="bg-white rounded border border-slate-200 p-3">
                <div className="text-xs text-slate-500 mb-1">דירוג ממוצע</div>
                <div className="text-2xl font-bold text-amber-600">
                  {stats.averageRating.toFixed(1)} ⭐
                </div>
              </div>
              <div className="bg-white rounded border border-slate-200 p-3">
                <div className="text-xs text-slate-500 mb-2">התפלגות דירוגים</div>
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-1.5 text-xs">
                      <span className="w-7">{rating}⭐</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-amber-400 h-1.5 rounded-full"
                          style={{
                            width: `${((stats.ratingDistribution[rating] || 0) / stats.total) * 100}%`
                          }}
                        />
                      </div>
                      <span className="w-6 text-slate-600 text-left">
                        {stats.ratingDistribution[rating] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

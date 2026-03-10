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

  const filteredFeedback = filterRating
    ? feedback.filter((item) => item.rating === filterRating)
    : feedback;

  // Debug: Log when feedback state changes
  useEffect(() => {
    console.log('Feedback state updated:', feedback);
    console.log('Feedback count:', feedback.length);
  }, [feedback]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

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
      <div className="space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-sm text-slate-600 mb-1">סה"כ משובים</div>
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-sm text-slate-600 mb-1">דירוג ממוצע</div>
              <div className="text-3xl font-bold text-amber-600">
                {stats.averageRating.toFixed(1)} ⭐
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="text-sm text-slate-600 mb-2">התפלגות דירוגים</div>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-2 text-sm">
                    <span className="w-8">{rating}⭐</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-amber-400 h-2 rounded-full"
                        style={{
                          width: `${((stats.ratingDistribution[rating] || 0) / stats.total) * 100}%`
                        }}
                      />
                    </div>
                    <span className="w-8 text-slate-600">
                      {stats.ratingDistribution[rating] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">סינון לפי דירוג:</span>
            <button
              onClick={() => setFilterRating(null)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filterRating === null
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              הכל
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => setFilterRating(rating)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  filterRating === rating
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {rating}⭐
              </button>
            ))}
          </div>
        </div>

        {/* Feedback List */}
        <div className="bg-white rounded-xl border border-slate-200">
          {loading ? (
            <div className="p-12 text-center text-slate-500">טוען משובים...</div>
          ) : filteredFeedback.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              {filterRating ? `אין משובים עם דירוג ${filterRating}⭐` : "אין משובים עדיין"}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredFeedback.map((item) => (
                <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {item.user_name || "לא צוין"}
                      </div>
                      <div className="text-sm text-slate-600">
                        {item.organization_name && `${item.organization_name} • `}
                        {item.group_name || "ללא קבוצה"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg mb-1">{renderStars(item.rating)}</div>
                      <div className="text-xs text-slate-500">
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-slate-700 whitespace-pre-wrap">
                    {item.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

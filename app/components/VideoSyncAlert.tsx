"use client";

import { useState, useEffect } from 'react';
import { useUserRole } from '@/lib/hooks/useUserRole';

interface VideoSyncAlertProps {
  userRole?: string | null;
}

export default function VideoSyncAlert({ userRole }: VideoSyncAlertProps) {
  const { role: hookRole } = useUserRole();
  const role = userRole || hookRole;
  const [needsSync, setNeedsSync] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only check for admins
    if (role !== 'admin') {
      setLoading(false);
      return;
    }

    // Check if already dismissed in this session
    if (sessionStorage.getItem('video-sync-alert-dismissed')) {
      setDismissed(true);
      setLoading(false);
      return;
    }

    const checkSyncStatus = async () => {
      try {
        const response = await fetch('/api/debug/video-lessons-status');
        if (response.ok) {
          const data = await response.json();
          setNeedsSync(data.recommendations?.needsSync || false);
        }
      } catch (error) {
        console.error('Error checking sync status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSyncStatus();
  }, [role]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('video-sync-alert-dismissed', 'true');
  };

  const handleGoToSync = () => {
    window.open('/admin/video-sync', '_blank');
  };

  if (loading || !needsSync || dismissed || role !== 'admin') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800 mb-1">
              נדרש סנכרון טבלאות וידאו
            </h3>
            <p className="text-sm text-yellow-700 mb-3">
              מערכת מעקב הוידאו זקוקה לסנכרון כדי לעבוד כראוי.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleGoToSync}
                className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
              >
                פתח סנכרון
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded hover:bg-yellow-200 transition-colors"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
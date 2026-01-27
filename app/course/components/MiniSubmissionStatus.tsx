'use client';

import { useState, useEffect } from 'react';
import { assignmentService } from '../../../lib/services/assignmentService';

interface MiniSubmissionStatusProps {
  userId: string;
  className?: string;
  onToggleDetails?: () => void;
}

export default function MiniSubmissionStatus({ userId, className = '', onToggleDetails }: MiniSubmissionStatusProps) {
  const [submissionRate, setSubmissionRate] = useState<number>(0);
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        setLoading(true);
        
        const [submissions, allAssignments] = await Promise.all([
          assignmentService.getSubmissionsByUser(userId),
          assignmentService.getAllAssignments()
        ]);

        const submitted = submissions.length;
        const total = allAssignments.length;
        const rate = total > 0 ? (submitted / total) * 100 : 0;
        
        setSubmissionRate(rate);
        setSubmittedCount(submitted);
        setTotalCount(total);
      } catch (err) {
        console.error('Error fetching quick stats:', err);
        setSubmissionRate(0);
        setSubmittedCount(0);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchQuickStats();
    }
  }, [userId]);

  if (loading) {
    return (
      <button 
        className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm transition-colors ${className}`}
        disabled
      >
        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
        <span className="text-gray-400">טוען סטטוס...</span>
      </button>
    );
  }

  // More friendly approach - show neutral colors and focus on progress
  const getDisplayText = () => {
    if (totalCount === 0) return 'אין מטלות';
    if (submittedCount === 0) return 'התחל הגשות';
    if (submittedCount === totalCount) return 'הושלם!';
    return `${submittedCount}/${totalCount} מטלות`;
  };

  const getStatusIcon = () => {
    if (totalCount === 0) return '📝';
    if (submittedCount === 0) return '🚀';
    if (submittedCount === totalCount) return '🎉';
    return '📊';
  };

  const getButtonStyle = () => {
    if (submittedCount === totalCount) {
      return 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700';
    }
    return 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700';
  };

  return (
    <button 
      onClick={onToggleDetails}
      className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-sm ${getButtonStyle()} ${className}`}
      title="לחץ לצפייה בפרטי ההתקדמות"
    >
      <span>{getStatusIcon()}</span>
      <span>{getDisplayText()}</span>
      <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
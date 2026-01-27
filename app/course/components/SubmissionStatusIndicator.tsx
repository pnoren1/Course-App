'use client';

import { useState, useEffect } from 'react';
import { assignmentService } from '../../../lib/services/assignmentService';
import { Assignment, AssignmentSubmission } from '../../../lib/types/assignment';

interface SubmissionStatusIndicatorProps {
  userId: string;
  className?: string;
}

interface SubmissionStats {
  totalAssignments: number;
  submittedAssignments: number;
  pendingAssignments: number;
  submissionRate: number;
}

export default function SubmissionStatusIndicator({ userId, className = '' }: SubmissionStatusIndicatorProps) {
  const [stats, setStats] = useState<SubmissionStats>({
    totalAssignments: 0,
    submittedAssignments: 0,
    pendingAssignments: 0,
    submissionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissionStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get all user submissions
        const submissions = await assignmentService.getSubmissionsByUser(userId);
        
        // Get all assignments
        const allAssignments = await assignmentService.getAllAssignments();

        const totalAssignments = allAssignments.length;
        const submittedAssignments = submissions.length;
        const pendingAssignments = totalAssignments - submittedAssignments;
        const submissionRate = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;

        setStats({
          totalAssignments,
          submittedAssignments,
          pendingAssignments,
          submissionRate
        });
      } catch (err: any) {
        console.error('Error fetching submission stats:', err);
        setError('שגיאה בטעינת נתוני ההגשות');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchSubmissionStats();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  const getStatusColor = (submitted: number, total: number) => {
    if (total === 0) return 'text-gray-600 bg-gray-50 border-gray-200';
    if (submitted === total) return 'text-green-600 bg-green-50 border-green-200';
    if (submitted === 0) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-indigo-600 bg-indigo-50 border-indigo-200';
  };

  const getStatusIcon = (submitted: number, total: number) => {
    if (total === 0) return '📝';
    if (submitted === total) return '🎉';
    if (submitted === 0) return '🚀';
    return '📈';
  };

  const getStatusMessage = (submitted: number, total: number) => {
    if (total === 0) return 'אין מטלות זמינות כרגע';
    if (submitted === total) return 'כל הכבוד! השלמת את כל המטלות';
    if (submitted === 0) return 'מוכן להתחיל? יש מטלות מעניינות שמחכות לך';
    const remaining = total - submitted;
    return `התקדמת יפה! נותרו ${remaining} מטלות נוספות`;
  };

  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-900">התקדמות במטלות</h3>
        <span className="text-2xl">{getStatusIcon(stats.submittedAssignments, stats.totalAssignments)}</span>
      </div>
      
      <div className={`rounded-lg border p-3 ${getStatusColor(stats.submittedAssignments, stats.totalAssignments)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">התקדמות</span>
          <span className="text-xl font-bold">{Math.round(stats.submissionRate)}%</span>
        </div>
        
        <div className="w-full bg-white bg-opacity-50 rounded-full h-2 mb-3">
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${stats.submissionRate}%`,
              backgroundColor: stats.submittedAssignments === stats.totalAssignments ? '#10b981' : 
                             stats.submittedAssignments === 0 ? '#3b82f6' : '#6366f1'
            }}
          ></div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="font-semibold">{stats.totalAssignments}</div>
            <div className="opacity-75">סה"כ מטלות</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{stats.submittedAssignments}</div>
            <div className="opacity-75">הוגשו</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{stats.pendingAssignments}</div>
            <div className="opacity-75">נותרו</div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-sm text-slate-600">
        <p>{getStatusMessage(stats.submittedAssignments, stats.totalAssignments)}</p>
      </div>
    </div>
  );
}
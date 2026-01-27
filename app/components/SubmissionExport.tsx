"use client";

import { useState } from 'react';
import { Assignment, AssignmentSubmission } from '@/lib/types/assignment';
import { UserProfile } from '@/lib/types/database.types';

interface SubmissionWithDetails extends AssignmentSubmission {
  assignment: Assignment;
  user_profile: UserProfile;
  files_count: number;
}

interface SubmissionExportProps {
  submissions: SubmissionWithDetails[];
}

export default function SubmissionExport({ submissions }: SubmissionExportProps) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = async () => {
    try {
      setExporting(true);

      // Prepare CSV data
      const headers = [
        'מזהה הגשה',
        'שם המטלה',
        'שם המשתמש',
        'אימייל',
        'תאריך הגשה',
        'סטטוס',
        'מספר קבצים'
      ];

      const statusLabels = {
        'submitted': 'הוגשה',
        'reviewed': 'נבדקה',
        'needs_revision': 'דורשת תיקון',
        'approved': 'אושרה'
      };

      const csvData = submissions.map(submission => [
        submission.id.toString(),
        submission.assignment.title,
        submission.user_profile?.user_name || 'לא ידוע',
        submission.user_profile?.email || 'לא ידוע',
        new Date(submission.submission_date).toLocaleDateString('he-IL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        statusLabels[submission.status as keyof typeof statusLabels] || submission.status,
        submission.files_count.toString()
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n');

      // Add BOM for Hebrew support
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

      // Download file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `הגשות_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={exportToCSV}
      disabled={exporting || submissions.length === 0}
      className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
    >
      {exporting ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          מייצא...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          ייצא ל-CSV
        </>
      )}
    </button>
  );
}
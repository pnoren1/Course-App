"use client";

import { useState } from 'react';
import { rlsSupabase } from '@/lib/supabase';

interface ExportUsersCSVProps {
  organizations?: Array<{ id: string; name: string }>;
  className?: string;
}

export default function ExportUsersCSV({ organizations = [], className = '' }: ExportUsersCSVProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');

  const exportUsers = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      // בניית שאילתה עם סינונים
      let query = rlsSupabase.raw
        .from('user_profile')
        .select(`
          email,
          user_name,
          role,
          organization_id,
          organizations (
            name
          )
        `);

      // הוספת סינונים
      if (selectedOrganization) {
        query = query.eq('organization_id', selectedOrganization);
      }
      
      if (selectedRole) {
        query = query.eq('role', selectedRole);
      }

      const { data: users, error: fetchError } = await query.order('email');

      if (fetchError) {
        throw new Error('שגיאה בשליפת נתוני המשתמשים');
      }

      if (!users || users.length === 0) {
        setError('לא נמצאו משתמשים לייצוא');
        return;
      }

      // הכנת הנתונים לייצוא
      const csvHeaders = 'email,username,role,organization\n';
      const csvRows = users.map(user => {
        const email = user.email || '';
        const username = user.user_name || '';
        const role = user.role || 'student';
        const organization = user.organizations?.name || '';
        
        // הימנעות מבעיות עם פסיקים בנתונים
        const escapeCsvField = (field: string) => {
          if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        };

        return [
          escapeCsvField(email),
          escapeCsvField(username),
          escapeCsvField(role),
          escapeCsvField(organization)
        ].join(',');
      }).join('\n');

      const csvContent = csvHeaders + csvRows;

      // יצירת קובץ להורדה
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const now = new Date();
      const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // יצירת שם קובץ עם סינונים
      let filename = `users_export_${timestamp}`;
      if (selectedOrganization) {
        const orgName = organizations.find(o => o.id === selectedOrganization)?.name || 'org';
        filename += `_${orgName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
      if (selectedRole) {
        filename += `_${selectedRole}`;
      }
      filename += '.csv';
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      setSuccess(`ייצוא הושלם בהצלחה! ${users.length} משתמשים נוצאו לקובץ.`);
      
      // הסתרת הודעת ההצלחה אחרי 3 שניות
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('Error exporting users:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בייצוא המשתמשים');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={className}>
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-xs">
          {success}
        </div>
      )}
      
      <div className="relative">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:bg-slate-100 border border-emerald-200 disabled:border-slate-200 text-emerald-700 disabled:text-slate-400 rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          ייצוא ל-CSV
          <svg className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showFilters && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-10 p-4">
            <h4 className="font-medium text-slate-900 mb-3">סינון לייצוא</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ארגון
                </label>
                <select
                  value={selectedOrganization}
                  onChange={(e) => setSelectedOrganization(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="">כל הארגונים</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  תפקיד
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="">כל התפקידים</option>
                  <option value="student">סטודנט</option>
                  <option value="instructor">מרצה</option>
                  <option value="moderator">מנחה</option>
                  <option value="admin">מנהל</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={exportUsers}
                  disabled={exporting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
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
                    'ייצא'
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setSelectedOrganization('');
                    setSelectedRole('');
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  איפוס
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
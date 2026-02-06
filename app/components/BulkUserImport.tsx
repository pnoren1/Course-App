"use client";

import { useState, useRef, useEffect } from 'react';
import { RoleType, Organization, Group } from '@/lib/types/database.types';
import { rlsSupabase } from '@/lib/supabase';

interface BulkUserImportProps {
  organizations: Organization[];
  groups: Group[];
  onUsersAdded: () => void;
  className?: string;
}

interface UserRow {
  email: string;
  userName: string;
  password?: string;
  role: RoleType;
  organizationId: string;
  groupId: string;
  organizationName?: string;
  groupName?: string;
  isValid: boolean;
  errors: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; email: string; error: string }>;
  emailsSent?: number;
  emailsFailed?: number;
}

export default function BulkUserImport({ organizations, groups, onUsersAdded, className = '' }: BulkUserImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<'invite' | 'create'>('invite');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): UserRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('קובץ CSV חייב לכלול לפחות שורת כותרות ושורת נתונים אחת');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['email'];
    const optionalHeaders = ['username', 'password', 'role', 'organization_id', 'group_id'];

    // בדיקת כותרות נדרשות
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`חסרות כותרות נדרשות: ${missingHeaders.join(', ')}`);
    }

    const emailIndex = headers.indexOf('email');
    const userNameIndex = headers.indexOf('username');
    const passwordIndex = headers.indexOf('password');
    const roleIndex = headers.indexOf('role');
    const organizationIndex = headers.indexOf('organization_id');
    const groupIndex = headers.indexOf('group_id');

    const users: UserRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const errors: string[] = [];

      const email = values[emailIndex] || '';
      const userName = values[userNameIndex] || email;
      const password = values[passwordIndex] || '';
      const roleStr = values[roleIndex] || 'student';
      const organizationId = values[organizationIndex] || '';
      const groupId = values[groupIndex] || '';

      // ולידציה של מייל
      if (!email) {
        errors.push('כתובת מייל נדרשת');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('כתובת מייל לא תקינה');
      }

      // ולידציה של תפקיד
      const validRoles: RoleType[] = ['student', 'instructor', 'moderator', 'org_admin', 'admin'];
      const role = validRoles.includes(roleStr as RoleType) ? roleStr as RoleType : 'student';
      if (roleStr && !validRoles.includes(roleStr as RoleType)) {
        errors.push(`תפקיד לא תקין: ${roleStr}. תפקידים תקינים: ${validRoles.join(', ')}`);
      }

      // ולידציה של ארגון (UUID)
      let validOrganizationId = '';
      let organizationName = '';
      if (organizationId) {
        // בדיקה שזה UUID תקין
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(organizationId)) {
          const org = organizations.find(o => o.id === organizationId);
          if (org) {
            validOrganizationId = organizationId;
            organizationName = org.name;
          } else {
            errors.push(`ארגון עם ID ${organizationId} לא נמצא`);
          }
        } else {
          errors.push(`ID ארגון לא תקין: ${organizationId} (חייב להיות UUID)`);
        }
      }

      // ולידציה של קבוצה (UUID)
      let validGroupId = '';
      let groupName = '';
      if (groupId) {
        // בדיקה שזה UUID תקין
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(groupId)) {
          const group = groups.find(g => g.id === groupId);
          if (group) {
            validGroupId = groupId;
            groupName = group.name;
            
            // בדיקה שהקבוצה שייכת לארגון הנכון (אם צוין ארגון)
            if (validOrganizationId && group.organization_id !== validOrganizationId) {
              errors.push(`הקבוצה ${group.name} לא שייכת לארגון שצוין`);
            }
          } else {
            errors.push(`קבוצה עם ID ${groupId} לא נמצאה`);
          }
        } else {
          errors.push(`ID קבוצה לא תקין: ${groupId} (חייב להיות UUID)`);
        }
      }

      // ולידציה של סיסמה (רק במצב יצירה ישירה)
      if (mode === 'create' && (!password || password.length < 6)) {
        errors.push('סיסמה נדרשת באורך של לפחות 6 תווים');
      }

      users.push({
        email,
        userName,
        password: mode === 'create' ? password : undefined,
        role,
        organizationId: validOrganizationId,
        groupId: validGroupId,
        organizationName,
        groupName,
        isValid: errors.length === 0,
        errors
      });
    }

    return users;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('יש להעלות קובץ CSV בלבד');
      return;
    }

    setCsvFile(file);
    setError(null);
    setImportResult(null);
    setLoading(true);

    try {
      // קריאת הקובץ עם UTF-8 encoding מפורש
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(arrayBuffer);
      
      const users = parseCSV(text);
      setParsedData(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בפענוח קובץ CSV');
      setParsedData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    const validUsers = parsedData.filter(user => user.isValid);
    if (validUsers.length === 0) {
      setError('אין משתמשים תקינים לייבוא');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      // קבלת המשתמש הנוכחי
      const { user } = await rlsSupabase.getCurrentUser();
      if (!user) {
        setError('נדרשת התחברות למערכת');
        return;
      }

      const endpoint = mode === 'create' ? '/api/admin/bulk-create-users' : '/api/admin/bulk-invite-users';
      
      // הכנת נתוני המשתמשים לשליחה
      const usersData = validUsers.map(userData => ({
        email: userData.email,
        userName: userData.userName,
        password: userData.password,
        role: userData.role,
        organizationId: userData.organizationId || null,
        groupId: userData.groupId || null
      }));

      const requestBody = mode === 'create' 
        ? {
            users: usersData,
            currentUserId: user.id
          }
        : {
            users: usersData
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'שגיאה בייבוא המשתמשים');
      }

      // עדכון תוצאות הייבוא
      setImportResult({
        success: result.result.success,
        failed: result.result.failed,
        emailsSent: result.result.emailsSent || 0,
        emailsFailed: result.result.emailsFailed || 0,
        errors: result.result.errors.map((err: any, idx: number) => ({
          row: idx + 2, // +2 כי אנחנו מתחילים משורה 1 (כותרות) ו-idx מתחיל מ-0
          email: err.email,
          error: err.error
        }))
      });
      
      if (result.result.success > 0) {
        onUsersAdded();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בייבוא המשתמשים');
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setCsvFile(null);
    setParsedData([]);
    setError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const templateFile = mode === 'create' 
      ? '/csv-templates/users-template-create.csv'
      : '/csv-templates/users-template-invite.csv';
    
    const link = document.createElement('a');
    link.href = templateFile;
    link.download = `template_${mode}_users.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // הוספת מאזין למקש Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // מניעת גלילה ברקע כשהמודאל פתוח
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        ייבוא משתמשים מ-CSV
      </button>
    );
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsOpen(false);
          }
        }}
      >
        <div 
          className="bg-white rounded-lg border border-slate-200 w-full max-w-4xl sm:max-w-4xl max-h-[90vh] sm:max-h-[90vh] overflow-y-auto shadow-xl animate-in slide-in-from-bottom-4 duration-300 mx-2 sm:mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">ייבוא משתמשים מ-CSV</h3>
                  <p className="text-sm text-slate-600">העלאת רשימת משתמשים מקובץ CSV</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mode Selection */}
            <div className="mb-4">
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('create');
                    resetForm();
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    mode === 'create'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  יצירה ישירה
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('invite');
                    resetForm();
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    mode === 'invite'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  שליחת הזמנות
                </button>
              </div>
            </div>

            {/* Template Download */}
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm text-amber-700">
                    הורד תבנית CSV עם הכותרות הנדרשות
                  </span>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-sm font-medium transition-colors"
                >
                  הורדת תבנית
                </button>
              </div>
            </div>

            {/* Encoding Warning */}
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9-.75a9 9 0 1118 0 9 9 0 01-18 0zm9 3.75h.008v.008H12V15.75z" />
                </svg>
                <div className="text-sm text-red-700">
                  <p className="font-medium mb-1">חשוב לגבי תווים בעברית:</p>
                  <p>כדי שתווים בעברית יוצגו נכון, שמור את הקובץ עם encoding UTF-8:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li>• <strong>Excel:</strong> "שמירה בשם" → "CSV UTF-8 (מופרד בפסיקים)"</li>
                    <li>• <strong>Google Sheets:</strong> "הורדה" → "CSV (.csv)"</li>
                    <li>• <strong>LibreOffice:</strong> בחר "UTF-8" בתור Character Set</li>
                  </ul>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {importResult && (
              <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">תוצאות הייבוא:</h4>
                <div className="space-y-2 text-sm">
                  {importResult.success > 0 && (
                    <div className="flex items-center gap-2 text-green-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">
                        {importResult.success} משתמשים {mode === 'create' ? 'נוצרו' : 'הוזמנו'} בהצלחה
                      </span>
                    </div>
                  )}
                  
                  {/* הצגת סטטוס מיילים רק במצב יצירה ישירה */}
                  {mode === 'create' && importResult.success > 0 && (
                    <div className="space-y-1">
                      {importResult.emailsSent && importResult.emailsSent > 0 && (
                        <div className="flex items-center gap-2 text-blue-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm">
                            ✅ {importResult.emailsSent} מיילי ברוכים הבאים נשלחו
                          </span>
                        </div>
                      )}
                      {importResult.emailsFailed && importResult.emailsFailed > 0 && (
                        <div className="flex items-center gap-2 text-amber-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-sm">
                            ⚠️ {importResult.emailsFailed} מיילים לא נשלחו
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {importResult.failed > 0 && (
                    <div className="text-red-700">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="font-medium">{importResult.failed} משתמשים נכשלו</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx} className="text-xs bg-red-100 p-2 rounded">
                            <span className="font-medium">{err.email}:</span> {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {importResult.success === 0 && importResult.failed === 0 && (
                    <div className="text-amber-700">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        לא בוצע ייבוא - אין משתמשים תקינים
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                בחירת קובץ CSV
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* Data Preview */}
            {loading && (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 text-slate-600">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">מעבד קובץ CSV...</span>
                </div>
              </div>
            )}

            {parsedData.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-slate-900 mb-2">
                  תצוגה מקדימה ({parsedData.filter(u => u.isValid).length} תקינים מתוך {parsedData.length})
                </h4>
                <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-right">סטטוס</th>
                        <th className="px-3 py-2 text-right">מייל</th>
                        <th className="px-3 py-2 text-right">שם משתמש</th>
                        <th className="px-3 py-2 text-right">תפקיד</th>
                        <th className="px-3 py-2 text-right">ארגון</th>
                        <th className="px-3 py-2 text-right">קבוצה</th>
                        {mode === 'create' && <th className="px-3 py-2 text-right">סיסמה</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.map((user, idx) => (
                        <tr key={idx} className={user.isValid ? 'bg-green-50' : 'bg-red-50'}>
                          <td className="px-3 py-2">
                            {user.isValid ? (
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="group relative">
                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-black text-white text-xs rounded p-2 whitespace-nowrap z-10">
                                  {user.errors.join(', ')}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">{user.email}</td>
                          <td className="px-3 py-2">{user.userName}</td>
                          <td className="px-3 py-2">{user.role}</td>
                          <td className="px-3 py-2">{user.organizationName || 'ללא ארגון'}</td>
                          <td className="px-3 py-2">{user.groupName || 'ללא קבוצה'}</td>
                          {mode === 'create' && (
                            <td className="px-3 py-2">
                              {user.password ? '••••••' : 'חסרה'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleImport}
                disabled={importing || parsedData.filter(u => u.isValid).length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {importing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {mode === 'create' ? 'יוצר משתמשים...' : 'שולח הזמנות...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {mode === 'create' ? 'יצירת משתמשים' : 'שליחת הזמנות'}
                    {parsedData.filter(u => u.isValid).length > 0 && 
                      ` (${parsedData.filter(u => u.isValid).length})`
                    }
                  </>
                )}
              </button>
              
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                איפוס
              </button>
              
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                ביטול
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">הוראות שימוש:</p>
                  <ul className="space-y-1">
                    <li>• הורד את תבנית ה-CSV המתאימה למצב שבחרת</li>
                    <li>• מלא את הנתונים בקובץ (email נדרש, שאר השדות אופציונליים)</li>
                    <li>• <strong>חשוב:</strong> שמור את הקובץ עם encoding UTF-8 (בExcel: "CSV UTF-8")</li>
                    <li>• תפקידים תקינים: student, instructor, moderator, org_admin, admin</li>
                    <li>• organization_id וגם group_id חייבים להיות UUID תקינים של ארגון/קבוצה קיימים במערכת</li>
                    <li>• אם מציינים קבוצה, היא חייבת להיות שייכת לארגון שצוין (אם צוין)</li>
                    {mode === 'create' && <li>• במצב יצירה ישירה, סיסמה נדרשת (לפחות 6 תווים)</li>}
                  </ul>
                </div>
              </div>
            </div>

            {/* Organizations List */}
            {organizations.length > 0 && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <div className="text-xs text-slate-700 flex-1">
                    <p className="font-medium mb-2">ארגונים זמינים:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {organizations.map(org => (
                        <div key={org.id} className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="font-medium">{org.name}</span>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{org.id}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Groups List */}
            {groups.length > 0 && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="text-xs text-slate-700 flex-1">
                    <p className="font-medium mb-2">קבוצות זמינות:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {groups.map(group => {
                        const org = organizations.find(o => o.id === group.organization_id);
                        return (
                          <div key={group.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex flex-col">
                              <span className="font-medium">{group.name}</span>
                              <span className="text-xs text-slate-500">{org?.name || 'ארגון לא ידוע'}</span>
                            </div>
                            <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{group.id}</code>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
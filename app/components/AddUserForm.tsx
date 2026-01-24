"use client";

import { useState, useEffect } from 'react';
import { rlsSupabase } from '@/lib/supabase';
import { RoleType, Organization } from '@/lib/types/database.types';
import { fetchWithAuth, debugAuthStorage } from '@/lib/auth-utils';

interface AddUserFormProps {
  organizations: Organization[];
  onUserAdded: () => void;
  className?: string;
}

type AddUserMode = 'invite' | 'create';

export default function AddUserForm({ organizations, onUserAdded, className = '' }: AddUserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AddUserMode>('invite'); // התחל עם הזמנה כברירת מחדל
  const [directCreationAvailable, setDirectCreationAvailable] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    userName: '',
    password: '',
    role: 'student' as RoleType,
    organizationId: ''
  });

  // בדיקת זמינות יצירה ישירה בעת טעינת הקומפוננט
  useEffect(() => {
    const checkDirectCreationAvailability = async () => {
      try {
        // דיבוג - מה יש ב-storage
        debugAuthStorage();
        
        // קבלת המשתמש הנוכחי מ-Supabase client
        const { user } = await rlsSupabase.getCurrentUser();
        
        if (!user) {
          console.log('No user found');
          setDirectCreationAvailable(false);
          return;
        }

        console.log('Current user:', user.id);

        // שליחת בקשה עם מזהה המשתמש
        const response = await fetch('/api/admin/simple-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: user.id })
        });
        
        const result = await response.json();
        
        console.log('Simple check result:', result);
        
        setDirectCreationAvailable(result.available);
        
        // אם יצירה ישירה זמינה, עבור אליה כברירת מחדל
        if (result.available) {
          setMode('create');
        }
      } catch (error) {
        console.error('Error checking direct creation availability:', error);
        setDirectCreationAvailable(false);
      } finally {
        setCheckingAvailability(false);
      }
    };

    if (isOpen) {
      checkDirectCreationAvailability();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      setError('נדרש להזין כתובת מייל');
      return;
    }

    if (mode === 'create' && (!formData.password || formData.password.length < 6)) {
      setError('נדרש להזין סיסמה באורך של לפחות 6 תווים');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // קבלת המשתמש הנוכחי
      const { user } = await rlsSupabase.getCurrentUser();
      
      if (!user) {
        setError('נדרשת התחברות למערכת');
        return;
      }

      const endpoint = mode === 'create' ? '/api/admin/create-user' : '/api/admin/invite-user';
      const finalUserName = formData.userName.trim();// || formData.email.trim();
      const requestBody = mode === 'create' 
        ? {
            email: formData.email.trim(),
            userName: finalUserName,
            password: formData.password,
            role: formData.role,
            organizationId: formData.organizationId || null,
            currentUserId: user.id
          }
        : {
            email: formData.email.trim(),
            userName: finalUserName,
            role: formData.role,
            organizationId: formData.organizationId || null
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || 'שגיאה בהוספת המשתמש';
        
        // אם Service Role Key לא זמין, השבת את מצב היצירה הישירה
        if (mode === 'create' && errorMessage.includes('Service Role Key')) {
          setDirectCreationAvailable(false);
          setMode('invite');
          setError('יצירה ישירה לא זמינה. עבר למצב הזמנה.');
          return;
        }
        
        throw new Error(errorMessage);
      }

      setSuccess(result.message || `משתמש ${mode === 'create' ? 'נוצר' : 'הוזמן'} בהצלחה`);
      
      // איפוס הטופס
      setFormData({
        email: '',
        userName: '',
        password: '',
        role: 'student',
        organizationId: ''
      });
      
      // קריאה לפונקציה להתעדכנות
      onUserAdded();
      
      // סגירת הטופס אחרי 2 שניות
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
      }, 2000);

    } catch (error) {
      console.error('Error adding user:', error);
      setError(error instanceof Error ? error.message : 'שגיאה בהוספת המשתמש');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        הוספת משתמש חדש
      </button>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">הוספת משתמש חדש</h3>
            <p className="text-sm text-slate-600">
              {mode === 'create' ? 'יצירת משתמש חדש במערכת' : 'הזמנת משתמש חדש למערכת'}
            </p>
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
      {checkingAvailability ? (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-slate-600">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">בודק זמינות אפשרויות...</span>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('create')}
              disabled={!directCreationAvailable}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'create'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : directCreationAvailable 
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              יצירה ישירה
              {!directCreationAvailable && (
                <span className="block text-xs text-slate-400 mt-1">לא זמין</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMode('invite')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'invite'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              שליחת הזמנה
            </button>
          </div>
          {!directCreationAvailable && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              יצירה ישירה דורשת הגדרת Service Role Key והרשאות מנהל
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            כתובת מייל *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="user@example.com"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-slate-700 mb-1">
            שם משתמש
          </label>
          <input
            type="text"
            id="userName"
            value={formData.userName}
            onChange={(e) => handleInputChange('userName', e.target.value)}
            placeholder="שם מלא (אופציונלי - אם לא יוזן ישתמש בכתובת המייל)"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
        </div>

        {mode === 'create' && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              סיסמה *
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="לפחות 6 תווים"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              required
              minLength={6}
            />
          </div>
        )}

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
            תפקיד
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => handleInputChange('role', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
          >
            <option value="student">סטודנט</option>
            <option value="instructor">מרצה</option>
            <option value="moderator">מנחה</option>
            <option value="admin">מנהל</option>
          </select>
        </div>

        <div>
          <label htmlFor="organization" className="block text-sm font-medium text-slate-700 mb-1">
            ארגון
          </label>
          <select
            id="organization"
            value={formData.organizationId}
            onChange={(e) => handleInputChange('organizationId', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white"
          >
            <option value="">ללא ארגון</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {mode === 'create' ? 'יוצר משתמש...' : 'שולח הזמנה...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mode === 'create' ? "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" : "M12 19l9 2-9-18-9 18 9-2zm0 0v-8"} />
                </svg>
                {mode === 'create' ? 'יצירת משתמש' : 'שליחת הזמנה'}
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            ביטול
          </button>
        </div>
      </form>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">הערה:</p>
            {mode === 'create' ? (
              <p>המשתמש יווצר ישירות במערכת עם הסיסמה שהוזנה ויוכל להתחבר מיד.</p>
            ) : (
              <p>המשתמש יקבל הזמנה במייל עם קישור להרשמה למערכת. לאחר ההרשמה, התפקיד והארגון שנבחרו יוקצו אוטומטית.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
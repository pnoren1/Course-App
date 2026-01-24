"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { rlsSupabase } from '@/lib/supabase';

interface InvitationData {
  email: string;
  user_name: string;
  role: string;
  organization_name?: string;
  invited_by_name?: string;
  expires_at: string;
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);

  useEffect(() => {
    if (!token) {
      setError('טוקן הזמנה לא תקין');
      setLoading(false);
      return;
    }

    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      // בדיקה אם המשתמש מחובר
      const { user } = await rlsSupabase.getCurrentUser();
      
      if (!user) {
        // הפניה לדף התחברות עם החזרה לדף זה
        router.push(`/login?redirect=/accept-invitation?token=${token}`);
        return;
      }

      // שליפת פרטי ההזמנה
      const result = await rlsSupabase.rpc('get_invitation_by_token', {
        p_invitation_token: token
      });

      if (result.error) {
        throw result.error;
      }

      const invitation = result.data?.[0];
      
      if (!invitation) {
        setError('הזמנה לא תקינה או שפג תוקפה');
        return;
      }

      setInvitationData({
        email: invitation.email,
        user_name: invitation.user_name,
        role: invitation.role,
        organization_name: invitation.organization_name || undefined,
        invited_by_name: invitation.invited_by_name || undefined,
        expires_at: invitation.expires_at
      });

    } catch (error) {
      console.error('Error validating invitation:', error);
      setError('שגיאה בבדיקת ההזמנה');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!token) return;

    try {
      setAccepting(true);
      setError(null);

      const result = await rlsSupabase.rpc('accept_user_invitation', {
        p_invitation_token: token
      });

      if (result.error) {
        throw result.error;
      }

      const response = result.data?.[0];
      
      if (!response?.success) {
        setError(response?.message || 'שגיאה בקבלת ההזמנה');
        return;
      }

      setSuccess(true);
      
      // הפניה לדף הקורס אחרי 2 שניות
      setTimeout(() => {
        router.push('/course');
      }, 2000);

    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('שגיאה בקבלת ההזמנה');
    } finally {
      setAccepting(false);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'מנהל';
      case 'instructor': return 'מרצה';
      case 'moderator': return 'מנחה';
      case 'student': return 'סטודנט';
      default: return role;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">בודק הזמנה...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-lg border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12V15.75z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">שגיאה בהזמנה</h1>
          </div>
          
          <p className="text-sm text-red-600 mb-4">{error}</p>
          
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/login')}
              className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              התחברות
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              דף הבית
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-lg border border-green-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">הזמנה התקבלה בהצלחה!</h1>
          </div>
          
          <p className="text-sm text-slate-600 mb-4">
            ברוך הבא למערכת! הפרופיל שלך נוצר בהצלחה ואתה מועבר לדף הקורס.
          </p>
          
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            מעביר לדף הקורס...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900">הזמנה למערכת</h1>
        </div>

        {invitationData && (
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h2 className="font-medium text-slate-900 mb-2">פרטי ההזמנה</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">שם:</span>
                  <span className="font-medium">{invitationData.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">מייל:</span>
                  <span className="font-medium">{invitationData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">תפקיד:</span>
                  <span className="font-medium">{getRoleText(invitationData.role)}</span>
                </div>
                {invitationData.organization_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">ארגון:</span>
                    <span className="font-medium">{invitationData.organization_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">תוקף עד:</span>
                  <span className="font-medium">{formatDate(invitationData.expires_at)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-yellow-700">
                  <p className="font-medium mb-1">שים לב:</p>
                  <p>לאחר קבלת ההזמנה, יווצר עבורך פרופיל במערכת עם התפקיד והארגון שצוינו.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={acceptInvitation}
            disabled={accepting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {accepting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                מקבל הזמנה...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                קבלת הזמנה
              </>
            )}
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">טוען...</span>
        </div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
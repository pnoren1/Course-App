"use client";

import React from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import AuthDebugPanel from '@/app/components/AuthDebugPanel';
import { useAuthDebug } from '@/lib/hooks/useAuthDebug';

export default function AdminDebugAuthPage() {
  const { debugInfo, isLoading, runDebug } = useAuthDebug();

  return (
    <AdminLayout title="בדיקת אימות">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🔍 Authentication Debug</h1>
          <p className="text-gray-600">
            כלי לבדיקת מצב האימות ופתרון בעיות במערכת מעקב הווידאו
          </p>
        </div>

        {/* Quick Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">📋 מידע כללי</h2>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• כלי זה עוזר לזהות בעיות אימות במערכת מעקב הווידאו</p>
            <p>• הוא בודק את מצב האימות בצד הלקוח ובצד השרת</p>
            <p>• השתמש בו כאשר משתמשים מדווחים על שגיאות "Authentication required"</p>
          </div>
        </div>

        {/* Debug Panel */}
        <AuthDebugPanel className="w-full" />

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">📖 הוראות שימוש</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <h3 className="font-medium text-gray-900">1. הרצת בדיקה:</h3>
              <p>לחץ על "Run Debug" כדי לבדוק את מצב האימות הנוכחי</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">2. פרשנות התוצאות:</h3>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li><span className="text-green-600">✅</span> - הכל תקין</li>
                <li><span className="text-red-600">❌</span> - יש בעיה שדורשת תיקון</li>
                <li>בדוק שיש טוקן תקף בצד הלקוח והשרת</li>
                <li>וודא שתאריך התפוגה עדיין בתוקף</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">3. פתרון בעיות נפוצות:</h3>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>אם אין טוקן - המשתמש צריך להתחבר מחדש</li>
                <li>אם הטוקן פג תוקף - רענון הדף או התחברות מחדש</li>
                <li>אם השרת לא מזהה את הטוקן - בדוק cookies ו-headers</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Common Issues */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-900 mb-3">⚠️ בעיות נפוצות ופתרונות</h2>
          <div className="space-y-3 text-sm text-yellow-800">
            <div>
              <h3 className="font-medium">שגיאה: "Authentication required. Please log in again"</h3>
              <p className="mr-4">
                <strong>סיבה:</strong> הטוקן לא מועבר נכון לשרת או פג תוקף<br/>
                <strong>פתרון:</strong> בדוק שיש טוקן תקף בצד הלקוח, נקה cookies והתחבר מחדש
              </p>
            </div>
            
            <div>
              <h3 className="font-medium">שגיאה: "Failed to start video tracking session"</h3>
              <p className="mr-4">
                <strong>סיבה:</strong> בעיה באימות או בטבלת video_lessons<br/>
                <strong>פתרון:</strong> בדוק אימות, הרץ סנכרון video_lessons אם נדרש
              </p>
            </div>
            
            <div>
              <h3 className="font-medium">השרת לא מוצא טוקן</h3>
              <p className="mr-4">
                <strong>סיבה:</strong> הטוקן לא נשלח ב-Authorization header<br/>
                <strong>פתרון:</strong> בדוק שהפונקציה authenticatedFetch עובדת נכון
              </p>
            </div>
          </div>
        </div>

        {/* Recent Changes */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-green-900 mb-3">🔧 תיקונים אחרונים</h2>
          <div className="text-sm text-green-800 space-y-1">
            <p>• תוקן טיפול בטוקנים בצד השרת (lib/supabase-server.ts)</p>
            <p>• שופרה העברת טוקנים ב-API calls (lib/utils/api-helpers.ts)</p>
            <p>• נוספו לוגים מפורטים לדיבוג (app/api/video/sessions/route.ts)</p>
            <p>• נוסף endpoint debug חדש (/api/debug/video-auth)</p>
            <p>• נוספו כלי debug בממשק המשתמש</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
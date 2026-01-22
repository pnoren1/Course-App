"use client";

import Link from "next/link";
import { Suspense } from "react";
import AuthGuard from "../../components/AuthGuardClient";

function AudioHelpContent() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/course" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            חזרה לקורס
          </Link>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            מדריך להגברת שמע
          </h1>
          <p className="text-slate-600">
            דרכים שונות להגביר את עוצמת השמע מעבר לרמה המקורית
          </p>
        </div>

        {/* Important Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-amber-900 mb-2">הערה חשובה</h3>
              <p className="text-amber-800">
                מכיון שהשיעורים מוצגים ב-iframe, לא ניתן להגביר את השמע ישירות מהאתר. 
                השיטות הבאות יעזרו לך להגביר את השמע ברמת המערכת או הדפדפן.
              </p>
            </div>
          </div>
        </div>

        {/* Methods Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Method 1 - Browser Controls */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <span className="text-blue-700 font-bold text-lg">1</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">בקרי הדפדפן</h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-slate-600 mb-4">
                השתמש בבקרי השמע המובנים של הדפדפן
              </p>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Chrome/Edge:</h4>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• חפש סמל רמקול בכרטיסייה</li>
                  <li>• לחץ עליו והגבר את העוצמה</li>
                  <li>• או לחץ ימין על הכרטיסייה → "השתק אתר"</li>
                </ul>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Firefox:</h4>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• לחץ על סמל המידע (🛈) בשורת הכתובת</li>
                  <li>• בחר "הרשאות" → "השמע"</li>
                  <li>• ודא שהשמע מותר</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Method 2 - System Volume Mixer */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                <span className="text-green-700 font-bold text-lg">2</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">מערבל עוצמת קול</h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-slate-600 mb-4">
                הגבר את עוצמת הקול של הדפדפן במערכת
              </p>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Windows:</h4>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• לחץ ימין על סמל הרמקול בשורת המשימות</li>
                  <li>• בחר "פתח מערבל עוצמת קול"</li>
                  <li>• הגבר את עוצמת הקול של הדפדפן עד 100%</li>
                </ul>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Mac:</h4>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• פתח הגדרות מערכת → שמע</li>
                  <li>• הגבר את עוצמת הקול הראשית</li>
                  <li>• בדוק את רמת הקול ביישומים</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Method 3 - External Hardware */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                <span className="text-purple-700 font-bold text-lg">3</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">חומרה חיצונית</h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-slate-600 mb-4">
                השתמש בציוד חיצוני להגברת השמע
              </p>
              
              <ul className="text-sm text-slate-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>אוזניות או רמקולים עם הגברה עצמאית</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>רמקולים חיצוניים עם בקרת עוצמה</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>מגברי שמע USB</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  <span>כרטיסי קול חיצוניים</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Method 4 - Software Solutions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                <span className="text-orange-700 font-bold text-lg">4</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">תוכנות עזר</h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-slate-600 mb-4">
                תוכנות מתקדמות להגברת ושיפור השמע
              </p>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Windows:</h4>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• <strong>VoiceMeeter</strong> - מערבל שמע מתקדם</li>
                  <li>• <strong>Equalizer APO</strong> - אקולייזר מערכת</li>
                  <li>• <strong>FxSound</strong> - שיפור איכות שמע</li>
                  <li>• <strong>Boom 3D</strong> - הגברת שמע תלת מימדי</li>
                </ul>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Mac:</h4>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• <strong>SoundSource</strong> - בקרת שמע מתקדמת</li>
                  <li>• <strong>eqMac</strong> - אקולייזר למק</li>
                  <li>• <strong>Background Music</strong> - בקרת עוצמה לכל אפליקציה</li>
                  <li>• <strong>Boom 3D</strong> - הגברת שמע תלת מימדי</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            טיפים מהירים
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-blue-900 mb-2">לפני שמתחילים:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• ודא שהשמע של המערכת פועל</li>
                <li>• בדוק שהדפדפן לא מושתק</li>
                <li>• סגור יישומים אחרים שמשתמשים בשמע</li>
                <li>• נסה לרענן את הדף</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-900 mb-2">לאיכות מיטבית:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• השתמש באוזניות איכותיות</li>
                <li>• הימנע מהגברה מוגזמת</li>
                <li>• התאם את האקולייזר לפי הצורך</li>
                <li>• בדוק את הגדרות השמע של הדפדפן</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Safety Warning */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">אזהרת בטיחות</h3>
              <p className="text-red-800">
                הגברת שמע מעבר לרמה הרגילה עלולה לפגוע בשמיעה. השתמש בזהירות ובעוצמה מתונה. 
                אם אתה חש אי נוחות או כאב באוזניים, הנמך מיד את עוצמת הקול.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Course */}
        <div className="text-center mt-8">
          <Link 
            href="/course"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            חזרה לקורס
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function AudioHelpPage() {
  return (
    <Suspense fallback={
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">טוען...</span>
        </div>
      </div>
    }>
      <AuthGuard>
        <AudioHelpContent />
      </AuthGuard>
    </Suspense>
  );
}
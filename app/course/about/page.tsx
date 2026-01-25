"use client";

import AuthGuard from "../../components/AuthGuardClient";
import { rlsSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { useUserRole } from "@/lib/hooks/useUserRole";
import Link from "next/link";

function AboutContent({ userRoleData }: { userRoleData: any }) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await rlsSupabase.raw.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error('Error signing out:', error);
      // Force navigation even if sign out fails
      router.push("/");
    }
  };

  return (
    <div className="bg-slate-50">
      <main className="max-w-4xl mx-auto px-4 py-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/course"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-medium text-sm transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span>חזרה לקורס</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-medium text-sm transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>יציאה</span>
            </button>
          </div>

          <div className="bg-gradient-to-r from-white via-white to-slate-50 rounded-3xl shadow-lg border border-slate-200 p-8">
            <div className="flex items-start gap-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 via-indigo-50 to-blue-50 rounded-2xl border-2 border-indigo-200 shadow-sm">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">אודות הקורס</h1>
                <p className="text-base text-slate-600 leading-relaxed">
                  מידע חשוב על מבנה הקורס, אופן הלמידה והנחיות לשימוש במערכת
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Section 1 - מבנה הקורס */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-50 rounded-xl border border-indigo-200">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">מבנה הקורס</h2>
                <div className="text-slate-700 leading-relaxed space-y-4">
                  <p>
                    החומר מחולק ליחידות לימוד, כאשר כל יחידה מכילה נושא מרכזי ומהותי. בסיום כל יחידה תמצאו מטלה מעשית ליישום.
                  </p>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      כל יחידה מכילה:
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>הסרטות לצפייה</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>מצגת עם החומר שנלמד בהסרטות</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>משימת יישום לביצוע</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                    <h3 className="font-semibold text-indigo-900 mb-3">יחידות הלימוד:</h3>
                    <ol className="space-y-2 text-sm text-slate-700">
                      <li className="flex gap-3">
                        <span className="font-semibold text-indigo-700 min-w-[2rem]">01</span>
                        <span>היכרות עם עולם הענן, מושגי בסיס, תהליך פתיחת חשבון ב-AWS</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-semibold text-indigo-700 min-w-[2rem]">02</span>
                        <span>תהליך פתיחת חשבון ב-AWS</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-semibold text-indigo-700 min-w-[2rem]">03</span>
                        <span>IAM - ניהול המשתמשים וההרשאות</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-semibold text-indigo-700 min-w-[2rem]">04</span>
                        <span>S3 - שירות האיחסון של AWS</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-semibold text-indigo-700 min-w-[2rem]">05</span>
                        <span>DB ב-AWS</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-semibold text-indigo-700 min-w-[2rem]">06</span>
                        <span>Lambda</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-semibold text-indigo-700 min-w-[2rem]">07</span>
                        <span>Containers On AWS</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-semibold text-indigo-700 min-w-[2rem]">08</span>
                        <span>היכרות וכתיבת תהליכי CI/CD אפליקטיביים</span>
                      </li>
                    </ol>
                  </div>

                  <p className="text-sm text-slate-600 italic">
                    בסיום הקורס תהיה מטלת סיכום כוללת.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 - חשבון AWS והוצאות */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-50 rounded-xl border border-amber-200">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">חשוב! פתיחת חשבון AWS</h2>
                <div className="text-slate-700 leading-relaxed space-y-4">
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <p className="font-semibold text-amber-900 mb-2">ביצוע מטלות הקורס מצריך פתיחת חשבון ב-AWS</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>פתיחת חשבון ב-AWS מצריכה הזנת פרטי כרטיס אשראי</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium">לא נעשה שום חיוב בתהליך הרישום</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <h3 className="font-semibold text-emerald-900 mb-2">המסגרת החינמית:</h3>
                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>AWS מאפשרים שימוש חינם בחשבון עד מסגרת של 100$ או עד 6 חודשים (הראשון מביניהם)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>מטלות הקורס אינן מצריכות תשלום, כל עוד הן נעשות בדיוק לפי מה שנדרש במטלה</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>כל מעבר לתכנית בתשלום נעשה באופן ידני ומפורש</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <p className="text-sm text-red-800 flex items-start gap-2">
                      <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span><strong>שימו לב:</strong> כל שימוש אחר או נוסף מעבר למטלות יכול לגרום להגיע למצב בו המסגרת החינמית יכולה להסתיים</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 italic">
                    המתווה הזה הוא חדש ולא יצא עדיין להתנסות בו לאורך זמן, אולם כך לדברי AWS התכנית החינמית מתנהלת בחודשים האחרונים וזה בטוח יותר לשימוש וחריגות.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 - הגשת מטלות */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-50 rounded-xl border border-blue-200">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">הגשת מטלות</h2>
                <div className="text-slate-700 leading-relaxed space-y-4">
                  <p>
                    בסיום כל יחידה, המטלה תיעשה על חשבון AWS אותו תידרשו לפתוח (פרטים והוראות בקורס עצמו).
                  </p>
                  
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3">דרישות להגשה:</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>צילומי מסך <strong>מלאים של כל החלון</strong>, בו רואים את שם המשתמש ואת מספר החשבון</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>צילומי המסך הנדרשים בכל מטלה יפורטו בנפרד</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 - שאלות נפוצות */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-50 rounded-xl border border-purple-200">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">שאלות נפוצות</h2>
                <div className="text-slate-700 leading-relaxed space-y-3">
                  <p>
                    {/* [כאן תוכל להוסיף שאלות ותשובות נפוצות] */}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 - יצירת קשר */}
          {/* <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-xl border border-emerald-200">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">יצירת קשר ותמיכה</h2>
                <div className="text-slate-700 leading-relaxed space-y-3">
                  <p>
                    [כאן תוכל להוסיף פרטי יצירת קשר ואפשרויות תמיכה]
                  </p>
                </div>
              </div>
            </div>
          </section> */}
        </div>
      </main>
    </div>
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={
      <div className="bg-slate-50 flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">טוען...</span>
        </div>
      </div>
    }>
      <AboutPageWithAuth />
    </Suspense>
  );
}

function AboutPageWithAuth() {
  const userRoleData = useUserRole();
  
  return (
    <AuthGuard userRoleData={userRoleData}>
      <AboutContent userRoleData={userRoleData} />
    </AuthGuard>
  );
}

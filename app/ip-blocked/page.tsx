import Link from 'next/link';

interface IpBlockedPageProps {
  searchParams: Promise<{ ip?: string }>;
}

/**
 * /ip-blocked — shown when a user's IP address is not on their group's allow-list.
 * Server Component (no 'use client') — renders Hebrew RTL content.
 */
export default async function IpBlockedPage({ searchParams }: IpBlockedPageProps) {
  const { ip } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-sm w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl mb-6">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">הגישה חסומה</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            הגישה למערכת מכתובת IP זו אינה מורשית עבור הקבוצה שלך
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {ip && (
            <div className="mb-6">
              <p className="text-xs font-medium text-slate-500 mb-2">כתובת ה-IP שלך</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center">
                <span className="font-mono text-sm font-semibold text-slate-800">{ip}</span>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <p className="text-sm text-amber-800 leading-relaxed">
                אנא פנה למנהל המערכת לקבלת גישה
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="block w-full text-center py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors duration-200"
          >
            חזרה לדף הכניסה
          </Link>
        </div>
      </div>
    </main>
  );
}

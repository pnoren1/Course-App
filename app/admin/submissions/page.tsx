"use client";

import AdminLayout from '@/app/components/AdminLayout';

export default function SubmissionsManagementPage() {
  return (
    <AdminLayout 
      title="ניהול הגשות" 
      description="צפייה וניהול הגשות המטלות"
      icon={
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      }
    >
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">ניהול הגשות - בפיתוח</h3>
        <p className="text-slate-600 mb-6">
          תכונה זו תאפשר לך לצפות ולנהל את כל הגשות המטלות של הסטודנטים.<br />
          כולל אפשרות לבדיקה, מתן ציונים והערות.
        </p>
        <div className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          בקרוב
        </div>
      </div>
    </AdminLayout>
  );
}
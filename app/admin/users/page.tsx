"use client";

import AdminLayout from '@/app/components/AdminLayout';
import UserRoleManager from '@/app/components/UserRoleManager';

export default function UsersManagementPage() {
  return (
    <AdminLayout 
      title="ניהול משתמשים" 
      description="הוספה, עריכה וניהול משתמשים ותפקידים"
      icon={
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      }
    >
      <UserRoleManager />
    </AdminLayout>
  );
}
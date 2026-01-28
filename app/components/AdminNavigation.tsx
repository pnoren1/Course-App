"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { useUserRole } from '@/lib/hooks/useUserRole';

interface NavigationItem {
  id: string;
  name: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  orgAdminDescription?: string; // תיאור מיוחד למנהלי אירגון
  adminOnly?: boolean; // האם הפריט זמין רק למנהלי מערכת
  badge?: string;
}

  const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    name: 'לוח בקרה',
    href: '/admin',
    description: 'סקירה כללית של המערכת',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0a2 2 0 01-2 2H10a2 2 0 01-2-2v0z" />
      </svg>
    )
  },
  {
    id: 'users',
    name: 'ניהול משתמשים',
    href: '/admin/users',
    description: 'הוספה, עריכה וניהול משתמשים',
    orgAdminDescription: 'רק מנהלי מערכת יכולים לנהל משתמשים',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    )
  },
  {
    id: 'groups',
    name: 'ארגונים וקבוצות',
    href: '/admin/groups',
    description: 'יצירה וניהול ארגונים וקבוצות',
    orgAdminDescription: 'רק מנהלי מערכת יכולים לנהל ארגונים וקבוצות',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    id: 'assignments',
    name: 'ניהול מטלות',
    href: '/admin/assignments',
    description: 'יצירה ועריכה של מטלות',
    orgAdminDescription: 'רק מנהלי מערכת יכולים לנהל מטלות',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    id: 'student-progress',
    name: 'התקדמות תלמידים',
    href: '/admin/student-progress',
    description: 'מעקב אחר סטטוס הגשות וצפייה בסרטונים',
    orgAdminDescription: 'מעקב אחר התקדמות תלמידי הארגון',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
  {
    id: 'units',
    name: 'ניהול יחידות',
    href: '/admin/units',
    description: 'ניהול יחידות הקורס',
    orgAdminDescription: 'רק מנהלי מערכת יכולים לנהל יחידות',
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    id: 'submissions',
    name: 'ניהול הגשות',
    href: '/admin/submissions',
    description: 'צפייה וניהול הגשות המטלות',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  // {
  //   id: 'reports',
  //   name: 'דוחות וסטטיסטיקות',
  //   href: '/admin/reports',
  //   description: 'צפייה בנתוני השימוש',
  //   badge: 'בקרוב',
  //   icon: (
  //     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  //     </svg>
  //   )
  // }
];

interface AdminNavigationProps {
  className?: string;
}

export default function AdminNavigation({ className = '' }: AdminNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { role } = useUserRole();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const shouldDisableItem = (item: NavigationItem) => {
    return item.adminOnly && role === 'org_admin';
  };

  const getItemDescription = (item: NavigationItem) => {
    if (role === 'org_admin' && item.orgAdminDescription) {
      return item.orgAdminDescription;
    }
    return item.description;
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`hidden lg:block bg-white border-b border-slate-200 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8 space-x-reverse">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.badge !== 'בקרוב' && !shouldDisableItem(item)) {
                      router.push(item.href);
                    }
                  }}
                  disabled={item.badge === 'בקרוב' || shouldDisableItem(item)}
                  className={`
                    relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : item.badge === 'בקרוב' || shouldDisableItem(item)
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  <span className={isActive(item.href) ? 'text-blue-600' : ''}>{item.icon}</span>
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {item.badge}
                    </span>
                  )}
                  {isActive(item.href) && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Menu Button */}
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            תפריט ניהול
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed top-0 right-0 bottom-0 w-80 bg-white shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">תפריט ניהול</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.badge !== 'בקרוב' && !shouldDisableItem(item)) {
                        router.push(item.href);
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    disabled={item.badge === 'בקרוב' || shouldDisableItem(item)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200
                      ${isActive(item.href)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : item.badge === 'בקרוב' || shouldDisableItem(item)
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }
                    `}
                  >
                    <span className={isActive(item.href) ? 'text-blue-600' : ''}>{item.icon}</span>
                    <div className="flex-1 text-right">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{getItemDescription(item)}</div>
                    </div>
                    {item.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
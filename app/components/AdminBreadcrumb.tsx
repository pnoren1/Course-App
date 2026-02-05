"use client";

import { useRouter, usePathname } from 'next/navigation';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface AdminBreadcrumbProps {
  items?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export default function AdminBreadcrumb({ items, actions }: AdminBreadcrumbProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Generate breadcrumb items based on current path if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { name: 'פאנל ניהול', href: '/admin' }
    ];

    if (pathSegments.length > 1) {
      const currentPage = pathSegments[pathSegments.length - 1];
      
      switch (currentPage) {
        case 'users':
          breadcrumbs.push({ name: 'ניהול משתמשים' });
          break;
        case 'groups':
          breadcrumbs.push({ name: 'ארגונים וקבוצות' });
          break;
        case 'assignments':
          breadcrumbs.push({ name: 'ניהול מטלות' });
          break;
        case 'student-progress':
          breadcrumbs.push({ name: 'התקדמות תלמידים' });
          break;
        case 'units':
          breadcrumbs.push({ name: 'ניהול יחידות' });
          break;
        case 'submissions':
          breadcrumbs.push({ name: 'ניהול הגשות' });
          break;
        case 'reports':
          breadcrumbs.push({ name: 'דוחות וסטטיסטיקות' });
          break;
        default:
          breadcrumbs.push({ name: currentPage });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();

  if (breadcrumbItems.length <= 1 && !actions) {
    return null;
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <nav className="flex items-center space-x-1 space-x-reverse text-sm text-slate-600">
        {breadcrumbItems.map((item, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <svg className="w-4 h-4 mx-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            )}
            {item.href ? (
              <button
                onClick={() => router.push(item.href!)}
                className="hover:text-blue-600 transition-colors"
              >
                {item.name}
              </button>
            ) : (
              <span className="text-slate-900 font-medium">{item.name}</span>
            )}
          </div>
        ))}
      </nav>
      
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
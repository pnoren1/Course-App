"use client";

import { useUserRole, getRoleLabel, getRoleColor, getRoleIcon } from "@/lib/hooks/useUserRole";
import { RoleType } from "@/lib/types/database.types";

interface UserRoleBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  role?: RoleType | null; // אפשרות להעביר תפקיד ישירות במקום לשלוף מה-hook
}

export default function UserRoleBadge({ 
  size = 'md', 
  showIcon = true, 
  className = '',
  role: propRole 
}: UserRoleBadgeProps) {
  const { role: hookRole, isLoading } = useUserRole();
  
  // אם הועבר תפקיד כ-prop, נשתמש בו, אחרת נשתמש ב-hook
  const role = propRole !== undefined ? propRole : hookRole;

  if (isLoading && propRole === undefined) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-100 animate-pulse ${className}`}>
        <div className="w-4 h-4 bg-gray-300 rounded"></div>
        <div className="w-12 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg font-medium border ${getRoleColor(role)} ${sizeClasses[size]} ${className}`}>
      {showIcon && (
        <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={getRoleIcon(role)} />
        </svg>
      )}
      <span>{getRoleLabel(role)}</span>
    </div>
  );
}

// קומפוננט עזר לתצוגת מידע מפורט על המשתמש
interface UserInfoProps {
  userName?: string;
  showRole?: boolean;
  showOrganization?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  className?: string;
  onSignOut?: () => void; // פונקציה ליציאה
  showSignOut?: boolean; // האם להציג כפתור יציאה
}

export function UserInfo({ 
  userName, 
  showRole = true, 
  showOrganization = true, 
  size = 'md',
  layout = 'horizontal',
  className = '',
  onSignOut,
  showSignOut = false
}: UserInfoProps) {
  const { organizationName } = useUserRole();
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-end gap-2 ${className}`}>
        {/* First row: User name with sign out button - in regular text size */}
        {userName && (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 text-slate-600">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-slate-700 font-medium text-sm">שלום, {userName}</span>
            </div>
            
            {/* Sign Out Button - only if showSignOut is true */}
            {showSignOut && onSignOut && (
              <button
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>יציאה</span>
              </button>
            )}
          </div>
        )}
        
        {/* Second row: Role and Organization */}
        {(showRole || (showOrganization && organizationName)) && (
          <div className="flex items-center gap-2">
            {showRole && <UserRoleBadge size={size} />}
            {showOrganization && organizationName && (
              <div className="inline-flex items-center gap-2 px-2 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium">
                <svg className={`${iconSizes[size]} text-slate-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-xs">{organizationName}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Horizontal layout (original)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showRole && <UserRoleBadge size={size} />}
      
      {showOrganization && organizationName && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium">
          <svg className={`${iconSizes[size]} text-slate-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className={sizeClasses[size]}>{organizationName}</span>
        </div>
      )}
      
      {userName && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 text-slate-600">
          <svg className={`${iconSizes[size]} text-slate-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className={`text-slate-700 font-medium ${sizeClasses[size]}`}>שלום, {userName}</span>
        </div>
      )}
    </div>
  );
}
"use client";

import { useUserRole, getRoleLabel, getRoleColor, getRoleIcon } from "@/lib/hooks/useUserRole";
import { RoleType } from "@/lib/types/database.types";
import UserGroupDisplay from "./UserGroupDisplay";

interface UserRoleBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  role?: RoleType | null; // אפשרות להעביר תפקיד ישירות במקום לשלוף מה-hook
  userRoleData?: {
    role: any;
    userName: string | null;
    userEmail: string | null;
    organizationName: string | null;
    organizationId: string | null;
    groupName: string | null;
    groupId: string | null;
    userId: string | null;
    isLoading: boolean;
    error: string | null;
  };
}

export default function UserRoleBadge({ 
  size = 'md', 
  showIcon = true, 
  className = '',
  role: propRole,
  userRoleData
}: UserRoleBadgeProps) {
  const hookData = useUserRole();
  
  // אם הועברו נתונים כ-props, נשתמש בהם, אחרת נשתמש ב-hook
  const { role: hookRole, isLoading, error } = userRoleData || hookData;
  const role = propRole !== undefined ? propRole : hookRole;

  if (isLoading && propRole === undefined) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-100 animate-pulse ${className}`}>
        <div className="w-4 h-4 bg-gray-300 rounded"></div>
        <div className="w-12 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  // אם יש שגיאה של משתמש שלא קיים, נציג הודעת שגיאה עם כפתור יציאה
  if (error?.includes('User from sub claim in JWT does not exist')) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200 ${className}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span>שגיאת משתמש</span>
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
  userRoleData?: {
    role: any;
    userName: string | null;
    userEmail: string | null;
    organizationName: string | null;
    organizationId: string | null;
    groupName: string | null;
    groupId: string | null;
    userId: string | null;
    isLoading: boolean;
    error: string | null;
  };
}

export function UserInfo({ 
  userName, 
  showRole = true, 
  showOrganization = true, 
  size = 'md',
  layout = 'horizontal',
  className = '',
  onSignOut,
  showSignOut = false,
  userRoleData
}: UserInfoProps) {
  const hookData = useUserRole();
  
  // אם הועברו נתונים כ-props, נשתמש בהם, אחרת נשתמש ב-hook
  const { organizationName, groupName, error } = userRoleData || hookData;
  
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

  // יצירת אובייקט משתמש עבור UserGroupDisplay
  const userForGroupDisplay = {
    id: userRoleData?.userId || hookData.userId || '',
    user_id: userRoleData?.userId || hookData.userId || '',
    user_name: userName || userRoleData?.userName || hookData.userName,
    email: userRoleData?.userEmail || hookData.userEmail,
    role: userRoleData?.role || hookData.role || 'student',
    organization_id: userRoleData?.organizationId || hookData.organizationId,
    group_id: userRoleData?.groupId || hookData.groupId,
    granted_at: new Date().toISOString(),
    granted_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // הוספת המידע על הארגון והקבוצה מה-userRoleData
    organization: userRoleData?.organizationName || hookData.organizationName ? {
      id: userRoleData?.organizationId || hookData.organizationId,
      name: userRoleData?.organizationName || hookData.organizationName
    } : undefined,
    group: userRoleData?.groupName || hookData.groupName ? {
      id: userRoleData?.groupId || hookData.groupId,
      name: userRoleData?.groupName || hookData.groupName
    } : undefined
  };

  // אם יש שגיאה של משתמש שלא קיים, נציג הודעת שגיאה עם כפתור יציאה חירום
  if (error?.includes('User from sub claim in JWT does not exist')) {
    return (
      <div className={`flex flex-col items-end gap-2 ${className}`}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>שגיאת משתמש</span>
        </div>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 border border-red-200 text-red-700 hover:text-red-900 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>יציאה</span>
          </button>
        )}
      </div>
    );
  }

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
        
        {/* Second row: Role and Organization/Group */}
        {(showRole || showOrganization) && (
          <div className="flex items-center gap-2">
            {showRole && <UserRoleBadge size={size} userRoleData={userRoleData} />}
            {showOrganization && (
              <UserGroupDisplay 
                user={userForGroupDisplay}
                showOrganization={true}
                size={size}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // Horizontal layout (original)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showRole && <UserRoleBadge size={size} userRoleData={userRoleData} />}
      
      {showOrganization && (
        <UserGroupDisplay 
          user={userForGroupDisplay}
          showOrganization={true}
          size={size}
        />
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
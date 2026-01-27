"use client";

import { UserProfile } from '@/lib/types/database.types';
import { UserWithGroup } from '@/lib/services/userService';

interface UserGroupDisplayProps {
  user: UserProfile | UserWithGroup;
  showOrganization?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function UserGroupDisplay({
  user,
  showOrganization = true,
  className = '',
  size = 'md'
}: UserGroupDisplayProps) {
  // Type guard to check if user has extended group/organization info
  const userWithGroup = user as UserWithGroup;
  
  // Get organization name - check multiple possible sources
  const organizationName = userWithGroup.organization?.name || 
    (user as any).organizationName ||
    (user.organization_id ? 'ארגון לא ידוע' : null);
  
  // Get group name - check multiple possible sources
  const groupName = userWithGroup.group?.name || 
    (user as any).groupName ||
    (user.group_id ? 'קבוצה לא ידועה' : null);

  // Size-based styling
  const sizeClasses = {
    sm: {
      container: 'text-xs',
      icon: 'w-3 h-3',
      spacing: 'gap-1'
    },
    md: {
      container: 'text-sm',
      icon: 'w-4 h-4',
      spacing: 'gap-2'
    },
    lg: {
      container: 'text-base',
      icon: 'w-5 h-5',
      spacing: 'gap-2'
    }
  };

  const styles = sizeClasses[size];

  // If no organization and no group, show appropriate message
  if (!user.organization_id && !user.group_id) {
    return (
      <div className={`inline-flex items-center ${styles.spacing} text-slate-500 ${styles.container} ${className}`}>
        <svg className={`${styles.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>ללא שיוך ארגוני</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${styles.spacing} ${styles.container} ${className}`}>
      {/* Organization Icon */}
      {showOrganization && user.organization_id && (
        <>
          <svg className={`${styles.icon} text-slate-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="text-slate-700 font-medium">
            {organizationName}
          </span>
        </>
      )}

      {/* Separator if both organization and group are shown */}
      {showOrganization && user.organization_id && user.group_id && (
        <span className="text-slate-400">•</span>
      )}

      {/* Group Info - Only show if user has a group */}
      {user.group_id && (
        <>
          <svg className={`${styles.icon} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-blue-700 font-medium">
            {groupName}
          </span>
        </>
      )}
    </div>
  );
}
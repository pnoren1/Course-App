"use client";

import { useState } from 'react';
import { useSubmissionNotifications } from '@/lib/hooks/useSubmissionNotifications';

export default function SubmissionNotifications() {
  const { notifications, unreadCount, markAsRead } = useSubmissionNotifications();
  const [isOpen, setIsOpen] = useState(false);

  if (unreadCount === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  הגשות חדשות ({unreadCount})
                </h3>
                <button
                  onClick={() => {
                    markAsRead();
                    setIsOpen(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  סמן כנקרא
                </button>
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        הגשה חדשה: {notification.assignment_title}
                      </p>
                      <p className="text-xs text-slate-600">
                        מאת: {notification.user_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(notification.submission_date).toLocaleString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-3 border-t border-slate-200">
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/admin/submissions';
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                צפה בכל ההגשות
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
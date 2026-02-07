"use client";

import { useEffect, useState, useRef } from 'react';
import { courseAcknowledgmentService } from '../../../lib/services/courseAcknowledgmentService';
import { WelcomePopupProps, WelcomePopupState, AcknowledgmentData } from '../../../lib/types/database.types';
import AcknowledgmentForm from './AcknowledgmentForm';
import UserRoleBadge from '../../components/UserRoleBadge';

export default function WelcomePopup({ userId, userName, courseId, onAcknowledged, userRoleData }: WelcomePopupProps) {
  const [state, setState] = useState<WelcomePopupState>({
    isVisible: false,
    isLoading: true,
    hasAcknowledged: false,
  });

  const [showCloseMessage, setShowCloseMessage] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management and keyboard navigation
  useEffect(() => {
    if (state.isVisible) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus the dialog
      if (dialogRef.current) {
        dialogRef.current.focus();
      }

      // Handle escape key (though it won't close the popup due to persistence requirement)
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          handleCloseAttempt();
        }
        
        // Trap focus within the dialog
        if (event.key === 'Tab') {
          const focusableElements = dialogRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
            
            if (event.shiftKey && document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // Restore focus when popup is closed
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [state.isVisible]);

  // Check acknowledgment status on component mount
  useEffect(() => {
    const checkAcknowledgmentStatus = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        const hasAcknowledged = await courseAcknowledgmentService.checkAcknowledgment(userId, courseId);
        
        setState(prev => ({
          ...prev,
          hasAcknowledged,
          isVisible: !hasAcknowledged, // Show popup if not acknowledged
          isLoading: false,
        }));
      } catch (error) {
        console.error('Error checking acknowledgment status:', error);
        // On error, show popup as safety measure (per requirements 4.3)
        setState(prev => ({
          ...prev,
          hasAcknowledged: false,
          isVisible: true,
          isLoading: false,
        }));
      }
    };

    if (userId && courseId) {
      checkAcknowledgmentStatus();
    }
  }, [userId, courseId]);

  // Handle form submission
  const handleAcknowledgmentSubmit = async (data: AcknowledgmentData) => {
    if (!data.termsAgreed || !data.messageRead) {
      return; // Form validation should prevent this, but safety check
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Get current user email
      const { rlsSupabase } = await import('../../../lib/supabase');
      const { user } = await rlsSupabase.getCurrentUser();
      const userEmail = user?.email || 'unknown@example.com';
      
      // Pass userName and userEmail to the service, with fallback if undefined
      await courseAcknowledgmentService.saveAcknowledgment(
        userId, 
        courseId, 
        userName || 'משתמש לא ידוע',
        userEmail
      );
      
      setState(prev => ({
        ...prev,
        hasAcknowledged: true,
        isVisible: false,
        isLoading: false,
      }));

      // Notify parent component
      onAcknowledged();
    } catch (error) {
      console.error('Error saving acknowledgment:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      // Keep popup visible on error
    }
  };

  // Handle popup close without acknowledgment - should keep popup persistent
  const handleCloseAttempt = () => {
    // Per Requirements 3.1: popup should appear again if closed without acknowledgment
    // We don't actually close the popup, just show a message or do nothing
    // This ensures persistence for unacknowledged users
    setShowCloseMessage(true);
    setTimeout(() => setShowCloseMessage(false), 5000); // Hide message after 5 seconds
  };

  // Don't render anything if not visible or still loading initial check
  if (!state.isVisible || (state.isLoading && !state.isVisible)) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-popup-title"
      aria-describedby="welcome-popup-description"
    >
      <div 
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 relative"
        dir="rtl"
        tabIndex={-1}
      >
        {/* Header with close and logout buttons */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  const { rlsSupabase } = await import('../../../lib/supabase');
                  await rlsSupabase.raw.auth.signOut();
                  window.location.href = '/login';
                } catch (error) {
                  console.error('Error signing out:', error);
                  // Fallback - redirect to login anyway
                  window.location.href = '/login';
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
              title="יציאה מהמערכת"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              יציאה
            </button>
            
          </div>
          
          <button
            onClick={handleCloseAttempt}
            className="text-gray-400 hover:text-gray-600 focus:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="לא ניתן לסגור - נדרש אישור תנאים"
            title="לא ניתן לסגור ללא אישור תנאים"
            type="button"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          {/* Close attempt message */}
          {showCloseMessage && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">לא ניתן לסגור את החלון</p>
                  <p>יש לאשר את תנאי השימוש לפני המשך. לחלופין, ניתן ללחוץ על "יציאה" להתנתק מהמערכת.</p>
                </div>
              </div>
            </div>
          )}

          {/* Minimal Header */}
          <div className="text-center mb-4 sm:mb-5">
            <div className="flex items-center justify-center gap-3 mb-3">
              <h1 
                id="welcome-popup-title"
                className="text-lg sm:text-xl font-bold text-gray-900"
              >
                {userName ? `שלום ${userName}!` : 'ברוכות הבאות לקורס'}
              </h1>
              <UserRoleBadge size="sm" userRoleData={userRoleData} />
            </div>
            <p 
              id="welcome-popup-description"
              className="text-sm text-gray-600"
            >
              נא לקרוא את ההנחיות והתנאים לפני תחילת הלמידה
            </p>
            <p className="text-xs text-gray-500 mt-2">
              לא ניתן לסגור חלון זה ללא אישור התנאים. ניתן לצאת מהמערכת באמצעות כפתור "יציאה" למעלה.
            </p>
          </div>

          {/* Course Guidelines - Requirement 1.2 */}
          <section className="mb-4 sm:mb-5" aria-labelledby="guidelines-heading">
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-100">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center ml-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 
                  id="guidelines-heading"
                  className="text-base sm:text-lg font-semibold text-gray-900"
                >
                  הנחיות הקורס
                </h2>
              </div>
              <div className="text-sm text-gray-700">את הנחיות הקורס יש לקרוא בעיון, הקישור אליהן נמצא בדף הקורס, בחלקו העליון</div>
            </div>
          </section>

          {/* Terms of Use - Requirement 1.2 */}
          <section className="mb-4 sm:mb-5" aria-labelledby="terms-heading">
            <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-200">
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-red-500 rounded-md flex items-center justify-center ml-2">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 
                  id="terms-heading"
                  className="text-base sm:text-lg font-semibold text-red-800"
                >
                  תנאי שימוש - חשוב!
                </h2>
              </div>
              <div className="text-sm text-red-800 space-y-1">
                <div><strong>אסור בהחלט:</strong> להעתיק, לצלם, להעביר או להקליט את תכני הקורס</div>
                <div><strong>אסור בהחלט:</strong> לשתף חומרי הקורס עם אנשים שאינם רשומים לקורס</div>
              </div>
            </div>
          </section>

          {/* Acknowledgment Form */}
          <AcknowledgmentForm 
            onSubmit={handleAcknowledgmentSubmit}
            isSubmitting={state.isLoading}
          />
        </div>
      </div>
    </div>
  );
}
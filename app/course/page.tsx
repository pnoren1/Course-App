"use client";

import AuthGuard from "../components/AuthGuardClient";
import SessionTimeoutProvider from "../components/SessionTimeoutProvider";
import { rlsSupabase, supabaseUtils } from "@/lib/supabase";
import { courseAcknowledgmentService } from "../../lib/services/courseAcknowledgmentService";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import WelcomePopup from "./components/WelcomePopup";
// import data from "./lessons.json";

import CourseHeader from "./components/CourseHeader";
import UnitSection from "./components/UnitSection";
import SubmissionStatusIndicator from "./components/SubmissionStatusIndicator";
import type { Lesson, Unit } from "./types";
import { useUserRole } from "@/lib/hooks/useUserRole";
import type { VideoView } from "@/lib/types/videoView";

function CourseContent({ userRoleData }: { userRoleData: any }) {
  const router = useRouter();
  // הסרנו את הקריאה ל-useUserRole כי אנחנו מקבלים את הנתונים כ-props
  const [openUnit, setOpenUnit] = useState<number | string | null>(null);
  const [openLesson, setOpenLesson] = useState<number | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [acknowledgmentLoading, setAcknowledgmentLoading] = useState(true);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [userSubmissions, setUserSubmissions] = useState<Map<number, any>>(new Map());
  const [showSubmissionDetails, setShowSubmissionDetails] = useState(false);
  const [videoViews, setVideoViews] = useState<VideoView[]>([]);
  const [videoViewsLoading, setVideoViewsLoading] = useState(false);
  const [videoViewsError, setVideoViewsError] = useState<string | null>(null);

  // Get user from userRoleData instead of separate API call
  useEffect(() => {
    if (userRoleData && !userRoleData.isLoading && !userRoleData.error && userRoleData.userId) {
      // Create a user object from userRoleData
      const userFromRoleData = {
        id: userRoleData.userId,
        email: userRoleData.userEmail,
        user_metadata: {
          full_name: userRoleData.userName,
          display_name: userRoleData.userName
        }
      };
      setUser(userFromRoleData);
    } else if (userRoleData && userRoleData.error) {
      console.error('Error from userRoleData:', userRoleData.error);
      if (userRoleData.error.includes('User from sub claim in JWT does not exist')) {
        // המשתמש נמחק - AuthGuard יטפל בהפניה
        console.log('User deleted error in course page, AuthGuard will handle redirect');
        return;
      } else if (userRoleData.error.includes('Authentication') || userRoleData.error.includes('התחבר')) {
        router.push('/login?error=session_expired');
      }
    } else if (userRoleData && !userRoleData.isLoading && !userRoleData.userId) {
      // אין משתמש - AuthGuard יטפל בהפניה
      console.log('No user found, AuthGuard will handle redirect');
    }
  }, [userRoleData, router]);

  // Load user submissions when user is available
  useEffect(() => {
    const loadUserSubmissions = async () => {
      if (!user?.id) return;
      
      try {
        const { assignmentService } = await import('../../lib/services/assignmentService');
        const submissions = await assignmentService.getSubmissionsByUser(user.id);
        const submissionMap = new Map<number, any>();
        
        submissions.forEach((submission: any) => {
          submissionMap.set(submission.assignment_id, submission);
        });
        
        setUserSubmissions(submissionMap);
      } catch (error) {
        console.error('Failed to load user submissions:', error);
      }
    };

    loadUserSubmissions();
  }, [user?.id]);

  // Fetch video views when user is available
  useEffect(() => {
    const fetchVideoViews = async () => {
      if (!user?.id) return;
      
      try {
        setVideoViewsLoading(true);
        setVideoViewsError(null);
        
        // Use authenticatedFetch to include Authorization header
        const { authenticatedFetch } = await import('@/lib/utils/api-helpers');
        const response = await authenticatedFetch('/api/course/video-views');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to fetch video views');
        }
        
        const data = await response.json();
        setVideoViews(data.views || []);
      } catch (error) {
        console.error('Error fetching video views:', error);
        setVideoViewsError(error instanceof Error ? error.message : 'Failed to load video views');
        // Don't block the UI if video views fail to load
        setVideoViews([]);
      } finally {
        setVideoViewsLoading(false);
      }
    };

    fetchVideoViews();
  }, [user?.id]);

  // Function to refresh user submissions
  const refreshUserSubmissions = async () => {
    if (!user?.id) return;
    
    try {
      const { assignmentService } = await import('../../lib/services/assignmentService');
      const submissions = await assignmentService.getSubmissionsByUser(user.id);
      const submissionMap = new Map<number, any>();
      
      submissions.forEach((submission: any) => {
        submissionMap.set(submission.assignment_id, submission);
      });
      
      setUserSubmissions(submissionMap);
    } catch (error) {
      console.error('Failed to refresh user submissions:', error);
    }
  };

  // Auto-refresh submissions every 30 seconds to catch status updates
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      refreshUserSubmissions();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user?.id]);

  // Also refresh when the page becomes visible again (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        refreshUserSubmissions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id]);

  // Check acknowledgment status when user is available
  useEffect(() => {
    const checkAcknowledgmentStatus = async () => {
      if (!user) return;
      
      try {
        setAcknowledgmentLoading(true);
        const acknowledged = await courseAcknowledgmentService.checkAcknowledgment(user.id, "aws-course");
        setHasAcknowledged(acknowledged);
      } catch (error) {
        console.error('Error checking acknowledgment status:', error);
        // On error, default to not acknowledged (safety measure per requirements 4.3)
        setHasAcknowledged(false);
      } finally {
        setAcknowledgmentLoading(false);
      }
    };

    checkAcknowledgmentStatus();
  }, [user]);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        // Try to fetch directly from database first
        const { data: units, error: unitsError } = await rlsSupabase.select('units', '*');
        
        if (!unitsError && units && units.length > 0) {
          // Fetch lessons
          const { data: lessons, error: lessonsError } = await rlsSupabase.select('lessons', '*');
          
          if (!lessonsError && lessons) {
            // Fetch assignments
            const { data: assignments, error: assignmentsError } = await rlsSupabase.select('assignments', '*');
            
            // Build the response structure to match the original JSON format
            const formattedUnits = units.map((unit: any) => {
              // Find lessons for this unit
              const unitLessons = (lessons || [])
                .filter((lesson: any) => lesson.unit_id === unit.id)
                .map((lesson: any) => ({
                  id: lesson.id,
                  title: lesson.title,
                  slug: `lesson-${lesson.id}`,
                  embedUrl: lesson.embedUrl || lesson.embed_url || '',
                  duration: lesson.duration || '0:00',
                  durationSeconds: parseDuration(lesson.duration || '0:00'),
                  locked: lesson.locked || false,
                  order: lesson.order,
                  description: lesson.description || '',
                  is_lab: lesson.is_lab || false, // Add is_lab field for lab lessons styling
                  resources: []
                }))
                .sort((a, b) => a.order - b.order);

              // Find assignments for this unit
              const unitAssignments = assignments 
                ? assignments.filter((assignment: any) => assignment.unit_id === unit.id)
                : [];

              return {
                id: unit.id,
                title: unit.title,
                description: unit.description || '',
                order: unit.order,
                lessons: unitLessons,
                assignments: unitAssignments as any[]
              };
            }).sort((a, b) => a.order - b.order);

            setUnits(formattedUnits);
            setLoading(false);
            return;
          }
        }
      } catch (err: any) {
        console.error('Error fetching course data:', err);
        setError(err.message ?? 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    // Helper function to parse duration string to seconds
    const parseDuration = (duration: string): number => {
      if (!duration) return 0;
      const parts = duration.split(':');
      if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10) || 0;
        const seconds = parseInt(parts[1], 10) || 0;
        return minutes * 60 + seconds;
      }
      return 0;
    };

    fetchUnits();
  }, []);
  

  const handleSignOut = async () => {
    try {
      await rlsSupabase.raw.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error('Error signing out:', error);
      // Force navigation even if sign out fails
      router.push("/");
    }
  };

  const handleWelcomeAcknowledged = () => {
    // Update acknowledgment status when user acknowledges welcome popup
    setHasAcknowledged(true);
  };

  // Helper function to check if a lesson is watched
  const isLessonWatched = (lessonId: number): boolean => {
    return videoViews.some(view => view.lesson_id === String(lessonId));
  };

  return (
    <div className="bg-slate-50">
      {/* Welcome Popup - Requirements 3.1, 3.2 */}
      {user && (
        <WelcomePopup
          userId={user.id}
          userName={
            user.user_metadata?.full_name || 
            user.user_metadata?.display_name || 
            user.email || 
            'Unknown User'
          }
          courseId="aws-course" // Using static course ID for now
          onAcknowledged={handleWelcomeAcknowledged}
          userRoleData={userRoleData}
        />
      )}
      
      <main className="max-w-4xl mx-auto px-4 py-8 pb-16">
        <CourseHeader 
          onSignOut={handleSignOut} 
          userRoleData={userRoleData}
          onToggleSubmissionDetails={() => setShowSubmissionDetails(!showSubmissionDetails)}
        />

        {/* Show loading state during acknowledgment check - Requirement 3.3 */}
        {acknowledgmentLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-slate-600">
              <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium">בודק הרשאות גישה...</span>
            </div>
          </div>
        )}

        {/* Block content access until acknowledgment - Requirement 3.3 */}
        {!acknowledgmentLoading && !hasAcknowledged && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <div className="mb-4">
                <svg className="w-16 h-16 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-9a2 2 0 00-2-2M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2m-6 4h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                נדרש אישור תנאי השימוש
              </h3>
              <p className="text-slate-600 text-sm">
                כדי לגשת לתכני הקורס, יש לקרוא ולאשר את הנחיות הקורס ותנאי השימוש בחלון הצף שמופיע.
              </p>
            </div>
          </div>
        )}

        {/* Show course content only after acknowledgment */}
        {!acknowledgmentLoading && hasAcknowledged && (
          <>
            {/* Submission Status Indicator - Only show when toggled */}
            {user?.id && showSubmissionDetails && (
              <div className="mb-6">
                <SubmissionStatusIndicator userId={user.id} />
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-slate-600">
                  <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">טוען קורס...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-8 rounded-xl bg-red-50 border border-red-100 p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800 mb-1">שגיאה בטעינת הקורס</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-6">
                {units.map((unit) => {
                  const unitOpen = openUnit === unit.id;
                  return (
                    <UnitSection
                      key={unit.id}
                      unit={unit}
                      unitOpen={unitOpen}
                      onToggleUnit={(next) => {
                        setOpenUnit(next);
                        if (!next) {
                          setOpenLesson((ol) => (unit.lessons.some((l) => l.id === ol) ? null : ol));
                        }
                      }}
                      openLesson={openLesson}
                      setOpenLesson={(next) => setOpenLesson(next)}
                      setOpenUnit={(id) => setOpenUnit(id)}
                      userId={user?.id}
                      userSubmissions={userSubmissions}
                      onRefreshSubmissions={refreshUserSubmissions}
                      watchedLessons={videoViews}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function CoursePage() {
  return (
    <SessionTimeoutProvider>
      <Suspense fallback={
        <div className="bg-slate-50 flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-600">
            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">טוען...</span>
          </div>
        </div>
      }>
        <CoursePageWithAuth />
      </Suspense>
    </SessionTimeoutProvider>
  );
}

function CoursePageWithAuth() {
  const userRoleData = useUserRole(); // קריאה אחת לכל העמוד
  
  return (
    <AuthGuard userRoleData={userRoleData}>
      <CourseContent userRoleData={userRoleData} />
    </AuthGuard>
  );
}

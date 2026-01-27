"use client";

import { useState, useEffect } from 'react';
import { rlsSupabase } from '../supabase';

interface SubmissionNotification {
  id: number;
  assignment_title: string;
  user_name: string;
  submission_date: string;
}

export function useSubmissionNotifications() {
  const [notifications, setNotifications] = useState<SubmissionNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check for new submissions every 30 seconds
    const checkNewSubmissions = async () => {
      try {
        const { user } = await rlsSupabase.getCurrentUser();
        if (!user) return;

        const { isAdmin } = await rlsSupabase.isAdmin();
        if (!isAdmin) return;

        // Get submissions from the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        // Use separate queries like in the main submissions page
        const { data: submissionsData, error: submissionsError } = await rlsSupabase
          .from('assignment_submissions')
          .select('*')
          .gte('submission_date', fiveMinutesAgo)
          .eq('status', 'submitted')
          .order('submission_date', { ascending: false });

        if (submissionsError) {
          console.error('Error checking new submissions:', submissionsError);
          return;
        }

        if (!submissionsData || submissionsData.length === 0) {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }

        // Get assignments for these submissions
        const assignmentIds = [...new Set(submissionsData.map((s: any) => s.assignment_id))];
        const { data: assignmentsData } = await rlsSupabase
          .from('assignments')
          .select('*')
          .in('id', assignmentIds);

        // Get user profiles for these submissions
        const userIds = [...new Set(submissionsData.map((s: any) => s.user_id))];
        const { data: profilesData } = await rlsSupabase
          .from('user_profile')
          .select('*')
          .in('user_id', userIds);

        const newNotifications = submissionsData.map((submission: any) => {
          const assignment = assignmentsData?.find((a: any) => a.id === submission.assignment_id);
          const user_profile = profilesData?.find((p: any) => p.user_id === submission.user_id);
          
          return {
            id: submission.id,
            assignment_title: (assignment as any)?.title || 'מטלה לא ידועה',
            user_name: (user_profile as any)?.user_name || 'משתמש לא ידוע',
            submission_date: submission.submission_date
          };
        });

        setNotifications(newNotifications);
        setUnreadCount(newNotifications.length);
      } catch (error) {
        console.error('Error in submission notifications:', error);
      }
    };

    // Initial check
    checkNewSubmissions();

    // Set up interval
    const interval = setInterval(checkNewSubmissions, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const markAsRead = () => {
    setUnreadCount(0);
    setNotifications([]);
  };

  return {
    notifications,
    unreadCount,
    markAsRead
  };
}
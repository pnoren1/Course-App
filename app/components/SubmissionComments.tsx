"use client";

import { useState, useEffect } from 'react';
import { rlsSupabase } from '@/lib/supabase';
import UserGroupDisplay from './UserGroupDisplay';
import { SubmissionComment } from '@/lib/types/assignment';

interface SubmissionCommentsProps {
  submissionId: number;
  onCommentAdded?: () => void;
  showAddForm?: boolean; // Allow hiding the add comment form
}

export default function SubmissionComments({ submissionId, onCommentAdded, showAddForm = true }: SubmissionCommentsProps) {
  const [comments, setComments] = useState<SubmissionComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentsAvailable, setCommentsAvailable] = useState(true);
  const [canAddComments, setCanAddComments] = useState(false);

  useEffect(() => {
    loadComments();
    checkPermissions();
  }, [submissionId]);

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await rlsSupabase.auth.getUser();
      if (!user) {
        setCanAddComments(false);
        return;
      }

      const { data: profile } = await rlsSupabase
        .from('user_profile')
        .select('role')
        .eq('user_id', user.id)
        .single();

      setCanAddComments((profile as any)?.role === 'admin' || (profile as any)?.role === 'org_admin');
    } catch (error) {
      console.error('Error checking permissions:', error);
      setCanAddComments(false);
    }
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      
      // Get comments first
      const { data: commentsData, error: commentsError } = await rlsSupabase
        .from('submission_comments')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true });

      if (commentsError) {
        // If table doesn't exist, just show empty state
        if (commentsError.code === '42P01' || commentsError.message?.includes('does not exist')) {
          setComments([]);
          setCommentsAvailable(false);
          return;
        }
        console.error('Error loading comments:', {
          message: commentsError.message,
          code: commentsError.code,
          details: commentsError.details,
          hint: commentsError.hint,
          fullError: commentsError
        });
        return;
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Get user profiles for comment authors with organization and group information
      const userIds = [...new Set(commentsData.map((c: any) => c.user_id))];
      const { data: profilesData, error: profilesError } = await rlsSupabase
        .from('user_profile')
        .select(`
          *,
          organization:organizations(id, name),
          group:groups(id, name)
        `)
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error loading user profiles for comments:', profilesError);
      }

      // Manual join
      const commentsWithProfiles = commentsData.map((comment: any) => ({
        ...comment,
        user_profile: profilesData?.find((p: any) => p.user_id === comment.user_id) || null
      }));

      setComments(commentsWithProfiles as any[]);
    } catch (error) {
      console.error('Error in loadComments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      
      // Get current user ID
      const { data: { user } } = await rlsSupabase.auth.getUser();

      if (!user) {
        alert('יש להתחבר כדי להוסיף הערה');
        return;
      }

      // Check user profile for debugging
      const { data: profile, error: profileError } = await rlsSupabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      const { data: commentData, error } = await rlsSupabase
        .from('submission_comments')
        .insert({
          submission_id: submissionId,
          user_id: user.id,
          comment: newComment.trim(),
          is_internal: isInternal
        })
        .select('*')
        .single();

      if (error) {
        // If table doesn't exist, show helpful message
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setCommentsAvailable(false);
          return;
        }
        
        // Check for permission errors
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('RLS')) {
          console.error('Permission denied for adding comment');
          alert('אין לך הרשאה להוסיף הערות. רק מנהלים ומנהלי ארגון יכולים להוסיף הערות.');
          return;
        }
        
        console.error('Error adding comment:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        alert(`שגיאה בהוספת הערה: ${error.message || 'שגיאה לא ידועה'}`);
        return;
      }

      // Get user profile for the new comment with organization and group information
      const { data: profileData } = await rlsSupabase
        .from('user_profile')
        .select(`
          *,
          organization:organizations(id, name),
          group:groups(id, name)
        `)
        .eq('user_id', user.id)
        .single();

      const commentWithProfile = {
        ...commentData,
        user_profile: profileData || null
      };

      setComments(prev => [...prev, commentWithProfile as any]);
      setNewComment('');
      setIsInternal(false);
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error in addComment:', error);
      alert(`שגיאה בהוספת הערה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-600">הערות</div>
      
      {!commentsAvailable ? (
        <div className="text-xs text-yellow-600 bg-yellow-50 rounded p-2">
          תכונת ההערות תהיה זמינה לאחר הרצת המיגרציות
        </div>
      ) : (
        <>
          {/* Comments List */}
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {loading ? (
              <div className="text-xs text-slate-500 text-center py-2">טוען...</div>
            ) : comments.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-2">אין הערות</div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-2 rounded text-xs ${
                    comment.is_internal 
                      ? 'bg-yellow-50 border border-yellow-200' 
                      : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-slate-900">
                        {(comment as any).user_profile?.user_name || 'מנהל'}
                      </span>
                      {comment.is_internal && (
                        <span className="px-1 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                          פנימי
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500">
                      {new Date(comment.created_at).toLocaleDateString('he-IL', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {comment.comment}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Form */}
          {showAddForm && canAddComments && (
            <div className="border-t border-slate-200 pt-2">
              <div className="space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="הוסף הערה..."
                  rows={2}
                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs resize-none"
                />
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-xs text-slate-600">פנימי</span>
                  </label>
                  
                  <button
                    onClick={addComment}
                    disabled={!newComment.trim() || submitting}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 text-xs"
                  >
                    {submitting ? 'שולח...' : 'שלח'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAddForm && !canAddComments && commentsAvailable && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 text-center">
              רק מנהלים יכולים להוסיף הערות
            </div>
          )}
        </>
      )}
    </div>
  );
}
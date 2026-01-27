"use client";

import { useState, useEffect } from 'react';
import { rlsSupabase } from '@/lib/supabase';
import UserGroupDisplay from './UserGroupDisplay';
import { SubmissionComment } from '@/lib/types/assignment';

interface SubmissionCommentsProps {
  submissionId: number;
  onCommentAdded?: () => void;
}

export default function SubmissionComments({ submissionId, onCommentAdded }: SubmissionCommentsProps) {
  const [comments, setComments] = useState<SubmissionComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentsAvailable, setCommentsAvailable] = useState(true);

  useEffect(() => {
    loadComments();
  }, [submissionId]);

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
          console.log('Comments table not available yet');
          setComments([]);
          setCommentsAvailable(false);
          return;
        }
        console.error('Error loading comments:', commentsError);
        return;
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Get user profiles for comment authors
      const userIds = [...new Set(commentsData.map((c: any) => c.user_id))];
      const { data: profilesData, error: profilesError } = await rlsSupabase
        .from('user_profile')
        .select('*')
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

      const { data: commentData, error } = await rlsSupabase
        .from('submission_comments')
        .insert({
          submission_id: submissionId,
          comment: newComment.trim(),
          is_internal: isInternal
        })
        .select('*')
        .single();

      if (error) {
        // If table doesn't exist, show helpful message
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('Comments feature not available yet - please run migrations');
          setCommentsAvailable(false);
          return;
        }
        console.error('Error adding comment:', error);
        return;
      }

      // Get user profile for the new comment
      const { data: profileData } = await rlsSupabase
        .from('user_profile')
        .select('*')
        .eq('user_id', (commentData as any).user_id)
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-slate-700">הערות ומשוב</h4>
      
      {!commentsAvailable ? (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            תכונת ההערות תהיה זמינה לאחר הרצת המיגרציות
          </div>
        </div>
      ) : (
        <>
          {/* Comments List */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 text-slate-600">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  טוען הערות...
                </div>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-sm">
                אין הערות עדיין
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-3 rounded-lg border ${
                    comment.is_internal 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {(comment as any).user_profile?.user_name || 'מנהל'}
                        </span>
                        {comment.is_internal && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            פנימי
                          </span>
                        )}
                      </div>
                      {(comment as any).user_profile && (
                        <UserGroupDisplay 
                          user={(comment as any).user_profile}
                          showOrganization={true}
                          size="sm"
                        />
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(comment.created_at).toLocaleString('he-IL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {comment.comment}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Form */}
          <div className="border-t border-slate-200 pt-4">
            <div className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="הוסף הערה או משוב..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
              />
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">הערה פנימית (לא תוצג לתלמיד)</span>
                </label>
                
                <button
                  onClick={addComment}
                  disabled={!newComment.trim() || submitting}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      שולח...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      שלח הערה
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
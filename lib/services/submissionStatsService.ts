import { rlsSupabase } from '../supabase';
import { Assignment, AssignmentSubmission } from '../types/assignment';

export interface UserSubmissionStats {
  userId: string;
  userName: string;
  userEmail: string;
  totalAssignments: number;
  submittedAssignments: number;
  pendingAssignments: number;
  submissionRate: number;
  lastSubmissionDate?: string;
  // Future: video viewing stats
  totalLessons?: number;
  watchedLessons?: number;
  viewingRate?: number;
}

export interface DetailedSubmissionStatus {
  assignmentId: number;
  assignmentTitle: string;
  unitId: number;
  unitTitle: string;
  unitOrder: number;
  isSubmitted: boolean;
  submissionDate?: string;
  submissionStatus?: string;
}

export class SubmissionStatsService {
  
  /**
   * Get submission statistics for a specific user
   */
  async getUserSubmissionStats(userId: string): Promise<UserSubmissionStats> {
    try {
      // Get user profile with explicit typing
      const { data: userProfile, error: userError } = await rlsSupabase
        .from('user_profile')
        .select('user_name, email')
        .eq('user_id', userId)
        .single() as { 
          data: {
            user_name: string;
            email: string;
          } | null;
          error: any;
        };

      if (userError) {
        throw new Error(`Error fetching user profile: ${userError.message}`);
      }

      // Get all assignments with explicit typing
      const { data: assignments, error: assignmentsError } = await rlsSupabase
        .from('assignments')
        .select('id, title, unit_id')
        .order('unit_id', { ascending: true }) as { 
          data: Array<{
            id: number;
            title: string;
            unit_id: number;
          }> | null;
          error: any;
        };

      if (assignmentsError) {
        throw new Error(`Error fetching assignments: ${assignmentsError.message}`);
      }

      // Get user submissions with explicit typing
      const { data: submissions, error: submissionsError } = await rlsSupabase
        .from('assignment_submissions')
        .select('assignment_id, submission_date, status')
        .eq('user_id', userId) as { 
          data: Array<{
            assignment_id: number;
            submission_date: string;
            status: string;
          }> | null;
          error: any;
        };

      if (submissionsError) {
        throw new Error(`Error fetching submissions: ${submissionsError.message}`);
      }

      const totalAssignments = assignments?.length || 0;
      const submittedAssignments = submissions?.length || 0;
      const pendingAssignments = totalAssignments - submittedAssignments;
      const submissionRate = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;

      // Find last submission date with proper typing
      let lastSubmissionDate: string | undefined;
      if (submissions && submissions.length > 0) {
        const sortedSubmissions = [...submissions].sort((a, b) => {
          const dateA = new Date(a.submission_date).getTime();
          const dateB = new Date(b.submission_date).getTime();
          return dateB - dateA;
        });
        lastSubmissionDate = sortedSubmissions[0].submission_date;
      }

      return {
        userId,
        userName: userProfile?.user_name || 'Unknown',
        userEmail: userProfile?.email || 'Unknown',
        totalAssignments,
        submittedAssignments,
        pendingAssignments,
        submissionRate,
        lastSubmissionDate
      };
    } catch (error) {
      console.error('Error in getUserSubmissionStats:', error);
      throw error;
    }
  }

  /**
   * Get detailed submission status for a user (which assignments submitted/pending)
   * Assignments are sorted by unit order (order_number) and then by assignment ID
   */
  async getUserDetailedSubmissionStatus(userId: string): Promise<DetailedSubmissionStatus[]> {
    try {
      // Get all assignments with unit information with explicit typing
      const { data: assignmentsWithUnits, error: assignmentsError } = await rlsSupabase
        .from('assignments')
        .select(`
          id,
          title,
          unit_id,
          units!inner(title, order_number)
        `)
        .order('unit_id', { ascending: true }) as { 
          data: Array<{
            id: number;
            title: string;
            unit_id: number;
            units: { title: string; order_number: number };
          }> | null;
          error: any;
        };

      if (assignmentsError) {
        throw new Error(`Error fetching assignments: ${assignmentsError.message}`);
      }

      // Get user submissions with explicit typing
      const { data: submissions, error: submissionsError } = await rlsSupabase
        .from('assignment_submissions')
        .select('assignment_id, submission_date, status')
        .eq('user_id', userId) as { 
          data: Array<{
            assignment_id: number;
            submission_date: string;
            status: string;
          }> | null;
          error: any;
        };

      if (submissionsError) {
        throw new Error(`Error fetching submissions: ${submissionsError.message}`);
      }

      // Create submission map for quick lookup
      const submissionMap = new Map(
        submissions?.map(sub => [sub.assignment_id, sub]) || []
      );

      // Build detailed status array and sort by unit order
      const detailedStatus: DetailedSubmissionStatus[] = (assignmentsWithUnits || []).map(assignment => {
        const submission = submissionMap.get(assignment.id);
        return {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          unitId: assignment.unit_id,
          unitTitle: assignment.units?.title || 'Unknown Unit',
          unitOrder: assignment.units?.order_number || 999,
          isSubmitted: !!submission,
          submissionDate: submission?.submission_date,
          submissionStatus: submission?.status
        };
      });

      // Sort by unit order, then by assignment ID within each unit
      detailedStatus.sort((a, b) => {
        if (a.unitOrder !== b.unitOrder) {
          return a.unitOrder - b.unitOrder;
        }
        return a.assignmentId - b.assignmentId;
      });

      return detailedStatus;
    } catch (error) {
      console.error('Error in getUserDetailedSubmissionStatus:', error);
      throw error;
    }
  }

  /**
   * Get submission statistics for all users (admin view)
   */
  async getAllUsersSubmissionStats(): Promise<UserSubmissionStats[]> {
    try {
      // Get all users with student role with explicit typing
      const { data: users, error: usersError } = await rlsSupabase
        .from('user_profile')
        .select('user_id, user_name, email, role')
        .eq('role', 'student')
        .order('user_name', { ascending: true }) as { 
          data: Array<{
            user_id: string;
            user_name: string;
            email: string;
            role: string;
          }> | null;
          error: any;
        };

      if (usersError) {
        throw new Error(`Error fetching users: ${usersError.message}`);
      }

      // Get all assignments count with explicit typing
      const { data: assignments, error: assignmentsError } = await rlsSupabase
        .from('assignments')
        .select('id') as { 
          data: Array<{ id: number }> | null;
          error: any;
        };

      if (assignmentsError) {
        throw new Error(`Error fetching assignments: ${assignmentsError.message}`);
      }

      const totalAssignments = assignments?.length || 0;

      // Get all submissions grouped by user with explicit typing
      const { data: allSubmissions, error: submissionsError } = await rlsSupabase
        .from('assignment_submissions')
        .select('user_id, assignment_id, submission_date, status') as { 
          data: Array<{
            user_id: string;
            assignment_id: number;
            submission_date: string;
            status: string;
          }> | null;
          error: any;
        };

      if (submissionsError) {
        throw new Error(`Error fetching submissions: ${submissionsError.message}`);
      }

      // Group submissions by user
      const submissionsByUser = new Map<string, Array<{
        user_id: string;
        assignment_id: number;
        submission_date: string;
        status: string;
      }>>();
      allSubmissions?.forEach(submission => {
        if (!submissionsByUser.has(submission.user_id)) {
          submissionsByUser.set(submission.user_id, []);
        }
        submissionsByUser.get(submission.user_id)!.push(submission);
      });

      // Build stats for each user
      const userStats: UserSubmissionStats[] = (users || []).map(user => {
        const userSubmissions = submissionsByUser.get(user.user_id) || [];
        const submittedAssignments = userSubmissions.length;
        const pendingAssignments = totalAssignments - submittedAssignments;
        const submissionRate = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;

        // Find last submission date with proper typing
        let lastSubmissionDate: string | undefined;
        if (userSubmissions.length > 0) {
          const sortedSubmissions = [...userSubmissions].sort((a, b) => {
            const dateA = new Date(a.submission_date).getTime();
            const dateB = new Date(b.submission_date).getTime();
            return dateB - dateA;
          });
          lastSubmissionDate = sortedSubmissions[0].submission_date;
        }

        return {
          userId: user.user_id,
          userName: user.user_name || 'Unknown',
          userEmail: user.email || 'Unknown',
          totalAssignments,
          submittedAssignments,
          pendingAssignments,
          submissionRate,
          lastSubmissionDate
        };
      });

      return userStats;
    } catch (error) {
      console.error('Error in getAllUsersSubmissionStats:', error);
      throw error;
    }
  }

  /**
   * Get submission statistics by unit
   */
  async getSubmissionStatsByUnit(): Promise<Array<{
    unitId: number;
    unitTitle: string;
    totalAssignments: number;
    totalSubmissions: number;
    averageSubmissionRate: number;
  }>> {
    try {
      // Get units with their assignments and submission counts with explicit typing
      const { data: unitsData, error: unitsError } = await rlsSupabase
        .from('units')
        .select(`
          id,
          title,
          assignments(
            id,
            assignment_submissions(count)
          )
        `)
        .order('order_number', { ascending: true }) as { 
          data: Array<{
            id: number;
            title: string;
            assignments: Array<{
              id: number;
              assignment_submissions: Array<{ count: number }>;
            }>;
          }> | null;
          error: any;
        };

      if (unitsError) {
        throw new Error(`Error fetching units data: ${unitsError.message}`);
      }

      // Get total number of students for rate calculation with explicit typing
      const { data: studentsCount, error: studentsError } = await rlsSupabase
        .from('user_profile')
        .select('user_id', { count: 'exact' })
        .eq('role', 'student') as { 
          data: Array<{ user_id: string }> | null;
          error: any;
        };

      if (studentsError) {
        throw new Error(`Error fetching students count: ${studentsError.message}`);
      }

      const totalStudents = studentsCount?.length || 1; // Avoid division by zero

      const unitStats = (unitsData || []).map(unit => {
        const assignments = unit.assignments || [];
        const totalAssignments = assignments.length;
        
        // Calculate total submissions across all assignments in this unit
        const totalSubmissions = assignments.reduce((sum: number, assignment) => {
          return sum + (assignment.assignment_submissions?.[0]?.count || 0);
        }, 0);

        // Calculate average submission rate for this unit
        const maxPossibleSubmissions = totalAssignments * totalStudents;
        const averageSubmissionRate = maxPossibleSubmissions > 0 
          ? (totalSubmissions / maxPossibleSubmissions) * 100 
          : 0;

        return {
          unitId: unit.id,
          unitTitle: unit.title,
          totalAssignments,
          totalSubmissions,
          averageSubmissionRate
        };
      });

      return unitStats;
    } catch (error) {
      console.error('Error in getSubmissionStatsByUnit:', error);
      throw error;
    }
  }
}

export const submissionStatsService = new SubmissionStatsService();
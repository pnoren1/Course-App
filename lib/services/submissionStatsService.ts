import { rlsSupabase } from '../supabase';
import { Assignment, AssignmentSubmission } from '../types/assignment';
import { authenticatedFetch } from '../utils/api-helpers';

export interface UserSubmissionStats {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId?: string;
  organizationName?: string;
  groupId?: string;
  groupName?: string;
  totalAssignments: number;
  submittedAssignments: number;
  pendingAssignments: number;
  submissionRate: number;
  lastSubmissionDate?: string;
  hasLoggedIn?: boolean; // Whether user has a record in course_acknowledgments
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
      // Get user profile - fetch basic data first
      const { data: userProfile, error: userError } = await rlsSupabase
        .from('user_profile')
        .select(`
          user_name, 
          email,
          organization_id,
          group_id
        `)
        .eq('user_id', userId)
        .single() as { 
          data: {
            user_name: string;
            email: string;
            organization_id?: string;
            group_id?: string;
          } | null;
          error: any;
        };

      if (userError) {
        throw new Error(`Error fetching user profile: ${userError.message}`);
      }

      // Check if user has logged in (has record in course_acknowledgments)
      const { data: acknowledgments, error: ackError } = await rlsSupabase
        .from('course_acknowledgments')
        .select('id')
        .eq('user_id', userId)
        .limit(1) as {
          data: Array<{ id: number }> | null;
          error: any;
        };

      const hasLoggedIn = !ackError && acknowledgments && acknowledgments.length > 0;

      // Get organization name if user has one
      let organizationName: string | undefined;
      if (userProfile?.organization_id) {
        const { data: org } = await rlsSupabase
          .from('organizations')
          .select('name')
          .eq('id', userProfile.organization_id)
          .single() as { data: { name: string } | null; error: any };
        organizationName = org?.name;
      }

      // Get group name if user has one
      let groupName: string | undefined;
      if (userProfile?.group_id) {
        const { data: group } = await rlsSupabase
          .from('groups')
          .select('name')
          .eq('id', userProfile.group_id)
          .single() as { data: { name: string } | null; error: any };
        groupName = group?.name;
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
        organizationId: userProfile?.organization_id,
        organizationName,
        groupId: userProfile?.group_id,
        groupName,
        totalAssignments,
        submittedAssignments,
        pendingAssignments,
        submissionRate,
        lastSubmissionDate,
        hasLoggedIn
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
          units!inner(title, order)
        `) as { 
          data: Array<{
            id: number;
            title: string;
            unit_id: number;
            units: { title: string; order: number };
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
          unitOrder: assignment.units?.order || 999,
          isSubmitted: !!submission,
          submissionDate: submission?.submission_date,
          submissionStatus: submission?.status
        };
      });

      // Sort by unit order, then by assignment ID within each unit
      // This ensures consistent ordering across all views
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
   * Get submission statistics for users in a specific organization (org admin view)
   */
  async getOrganizationUsersSubmissionStats(organizationId: string): Promise<UserSubmissionStats[]> {
    try {
      console.log('🔍 getOrganizationUsersSubmissionStats called with organizationId:', organizationId);
      
      // Use API endpoint to get students (bypasses RLS issues)
      const response = await authenticatedFetch('/api/admin/organization-students');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch organization students');
      }
      
      const { students, organizationId: userOrgId } = await response.json();
      
      console.log('👥 API response - students:', students?.length || 0);
      console.log('📋 Students details:', students?.map((s: any) => ({ 
        id: s.user_id, 
        name: s.user_name, 
        role: s.role,
        orgId: s.organization_id 
      })));

      if (!students || students.length === 0) {
        console.log('📊 No students found for organization');
        return [];
      }

      // Get organization name
      const { data: organization, error: orgError } = await rlsSupabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single() as {
          data: { name: string } | null;
          error: any;
        };

      if (orgError) {
        console.warn('Error fetching organization:', orgError.message);
      }

      // Get all groups in this organization
      const { data: groups, error: groupsError } = await rlsSupabase
        .from('groups')
        .select('id, name')
        .eq('organization_id', organizationId) as {
          data: Array<{ id: string; name: string }> | null;
          error: any;
        };

      if (groupsError) {
        console.warn('Error fetching groups:', groupsError.message);
      }

      // Create lookup map for groups
      const groupMap = new Map((groups || []).map(group => [group.id, group.name]));

      // Get all assignments count
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

      // Get all submissions for users in this organization
      const userIds = students.map((user: any) => user.user_id);
      
      let allSubmissions: Array<{
        user_id: string;
        assignment_id: number;
        submission_date: string;
        status: string;
      }> = [];

      if (userIds.length > 0) {
        const { data: submissions, error: submissionsError } = await rlsSupabase
          .from('assignment_submissions')
          .select('user_id, assignment_id, submission_date, status')
          .in('user_id', userIds) as { 
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

        allSubmissions = submissions || [];
      }

      // Group submissions by user
      const submissionsByUser = new Map<string, Array<{
        user_id: string;
        assignment_id: number;
        submission_date: string;
        status: string;
      }>>();
      allSubmissions.forEach(submission => {
        if (!submissionsByUser.has(submission.user_id)) {
          submissionsByUser.set(submission.user_id, []);
        }
        submissionsByUser.get(submission.user_id)!.push(submission);
      });

      // Build stats for each user
      const userStats: UserSubmissionStats[] = students.map((user: any) => {
        const userSubmissions = submissionsByUser.get(user.user_id) || [];
        const submittedAssignments = userSubmissions.length;
        const pendingAssignments = totalAssignments - submittedAssignments;
        const submissionRate = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;

        // Find last submission date
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
          organizationId: user.organization_id,
          organizationName: organization?.name,
          groupId: user.group_id,
          groupName: user.group_id ? groupMap.get(user.group_id) : undefined,
          totalAssignments,
          submittedAssignments,
          pendingAssignments,
          submissionRate,
          lastSubmissionDate
        };
      });

      return userStats;
    } catch (error) {
      console.error('Error in getOrganizationUsersSubmissionStats:', error);
      throw error;
    }
  }

  /**
   * Get submission statistics for all users (admin view)
   */
  async getAllUsersSubmissionStats(): Promise<UserSubmissionStats[]> {
    try {
      // Get all users with student role - fetch basic data first
      const { data: users, error: usersError } = await rlsSupabase
        .from('user_profile')
        .select(`
          user_id, 
          user_name, 
          email, 
          role,
          organization_id,
          group_id
        `)
        .eq('role', 'student')
        .order('user_name', { ascending: true }) as { 
          data: Array<{
            user_id: string;
            user_name: string;
            email: string;
            role: string;
            organization_id?: string;
            group_id?: string;
          }> | null;
          error: any;
        };

      if (usersError) {
        throw new Error(`Error fetching users: ${usersError.message}`);
      }

      // Get all organizations separately
      const { data: organizations, error: orgsError } = await rlsSupabase
        .from('organizations')
        .select('id, name') as {
          data: Array<{ id: string; name: string }> | null;
          error: any;
        };

      if (orgsError) {
        console.warn('Error fetching organizations:', orgsError.message);
      }

      // Get all groups separately
      const { data: groups, error: groupsError } = await rlsSupabase
        .from('groups')
        .select('id, name') as {
          data: Array<{ id: string; name: string }> | null;
          error: any;
        };

      if (groupsError) {
        console.warn('Error fetching groups:', groupsError.message);
      }

      // Create lookup maps
      const orgMap = new Map((organizations || []).map(org => [org.id, org.name]));
      const groupMap = new Map((groups || []).map(group => [group.id, group.name]));

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
          organizationId: user.organization_id,
          organizationName: user.organization_id ? orgMap.get(user.organization_id) : undefined,
          groupId: user.group_id,
          groupName: user.group_id ? groupMap.get(user.group_id) : undefined,
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
   * Get set of user IDs who have logged in (have record in course_acknowledgments)
   */
  async getUsersWhoLoggedIn(): Promise<Set<string>> {
    try {
      const { data: acknowledgments, error } = await rlsSupabase
        .from('course_acknowledgments')
        .select('user_id') as {
          data: Array<{ user_id: string }> | null;
          error: any;
        };

      if (error) {
        console.error('Error fetching logged in users:', error);
        return new Set();
      }

      return new Set((acknowledgments || []).map(ack => ack.user_id));
    } catch (error) {
      console.error('Error in getUsersWhoLoggedIn:', error);
      return new Set();
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
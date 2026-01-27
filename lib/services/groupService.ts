import { getSupabaseAdmin } from '../supabase';
import { Group, GroupInsert, GroupUpdate } from '../types/database.types';

export interface CreateGroupData {
  name: string;
  organizationId: string;
}

export interface UpdateGroupData {
  name?: string;
  // organizationId is not allowed to be changed
}

export interface GroupWithUserCount extends Group {
  userCount?: number;
}

export class GroupService {
  private getSupabaseAdmin() {
    return getSupabaseAdmin();
  }
  /**
   * Create a new group
   * Requirements: 1.2 - Group creation with required data
   */
  async createGroup(data: CreateGroupData): Promise<Group> {
    try {
      const admin = this.getSupabaseAdmin();
      const insertData: GroupInsert = {
        name: data.name,
        organization_id: data.organizationId
      };

      const { data: result, error } = await admin
        .from('groups')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating group:', error);
        throw error;
      }

      return result as Group;
    } catch (error) {
      console.error('Error in createGroup:', error);
      throw error;
    }
  }

  /**
   * Update an existing group
   * Requirements: 1.3 - Group update (name only, not organization)
   */
  async updateGroup(id: string, data: UpdateGroupData): Promise<Group> {
    try {
      const admin = this.getSupabaseAdmin();
      const updateData: GroupUpdate = {
        name: data.name,
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await admin
        .from('groups')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating group:', error);
        throw error;
      }

      return result as Group;
    } catch (error) {
      console.error('Error in updateGroup:', error);
      throw error;
    }
  }

  /**
   * Delete a group
   * Requirements: 1.4 - Group deletion with user validation
   */
  async deleteGroup(id: string): Promise<void> {
    try {
      const admin = this.getSupabaseAdmin();
      // First validate that the group can be deleted
      const canDelete = await this.validateGroupDeletion(id);
      if (!canDelete) {
        throw new Error('לא ניתן למחוק קבוצה שיש בה משתמשים משויכים');
      }

      const { error } = await admin
        .from('groups')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting group:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteGroup:', error);
      throw error;
    }
  }

  /**
   * Get a group by ID
   */
  async getGroupById(id: string): Promise<Group | null> {
    try {
      const admin = this.getSupabaseAdmin();
      const { data, error } = await admin
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching group by ID:', error);
        throw error;
      }

      return (data as Group) || null;
    } catch (error) {
      console.error('Error in getGroupById:', error);
      throw error;
    }
  }

  /**
   * Get groups by organization
   * Requirements: 1.5, 2.2 - List groups with organization filtering
   * Uses supabaseAdmin for admin interfaces to bypass RLS
   */
  async getGroupsByOrganization(orgId: string): Promise<GroupWithUserCount[]> {
    try {
      const admin = this.getSupabaseAdmin();
      // Use supabaseAdmin for admin interfaces - bypasses RLS
      const { data, error } = await admin
        .from('groups')
        .select(`
          *,
          user_profile!user_profile_group_id_fkey(count)
        `)
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (error) {
        console.error('GroupService: Error fetching groups by organization:', error);
        throw error;
      }

      // Transform the data to include user count
      const groupsWithCount = (data || []).map((group: any) => ({
        ...group,
        userCount: group.user_profile?.[0]?.count || 0
      }));

      return groupsWithCount as GroupWithUserCount[];
    } catch (error) {
      console.error('Error in getGroupsByOrganization:', error);
      throw error;
    }
  }

  /**
   * Get all groups (for system admins)
   * Requirements: 1.5 - List groups with required data
   */
  async getAllGroups(): Promise<GroupWithUserCount[]> {
    try {
      const admin = this.getSupabaseAdmin();
      const { data, error } = await admin
        .from('groups')
        .select(`
          *,
          organizations!groups_organization_id_fkey(name),
          user_profile!user_profile_group_id_fkey(count)
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching all groups:', error);
        throw error;
      }

      // Transform the data to include organization name and user count
      const groupsWithDetails = (data || []).map((group: any) => ({
        ...group,
        organizationName: group.organizations?.name,
        userCount: group.user_profile?.[0]?.count || 0
      }));

      return groupsWithDetails as GroupWithUserCount[];
    } catch (error) {
      console.error('Error in getAllGroups:', error);
      throw error;
    }
  }

  /**
   * Validate if a group can be deleted
   * Requirements: 1.4 - Prevent deletion of groups with users
   */
  async validateGroupDeletion(id: string): Promise<boolean> {
    try {
      const userCount = await this.getUserCountByGroup(id);
      return userCount === 0;
    } catch (error) {
      console.error('Error in validateGroupDeletion:', error);
      throw error;
    }
  }

  /**
   * Get count of users in a group
   */
  async getUserCountByGroup(id: string): Promise<number> {
    try {
      const admin = this.getSupabaseAdmin();
      const { count, error } = await admin
        .from('user_profile')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', id);

      if (error) {
        console.error('Error getting user count by group:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUserCountByGroup:', error);
      throw error;
    }
  }
}

export const groupService = new GroupService();
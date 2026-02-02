import { getSupabaseAdmin } from '@/lib/supabase';

export interface OrganizationDetails {
  id: string;
  name: string;
}

export interface GroupDetails {
  id: string;
  name: string;
  organizationId: string;
}

export interface OrganizationWithStats extends OrganizationDetails {
  userCount?: number;
  groupCount?: number;
}

export async function getOrganizationById(organizationId: string): Promise<OrganizationDetails | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getOrganizationById:', error);
    return null;
  }
}

export async function getGroupById(groupId: string): Promise<GroupDetails | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data, error } = await supabaseAdmin
      .from('groups')
      .select('id, name, organization_id')
      .eq('id', groupId)
      .single();

    if (error) {
      console.error('Error fetching group:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      organizationId: data.organization_id
    };
  } catch (error) {
    console.error('Error in getGroupById:', error);
    return null;
  }
}

// organizationService object for compatibility
export const organizationService = {
  async getAllOrganizations(): Promise<OrganizationWithStats[]> {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching organizations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllOrganizations:', error);
      return [];
    }
  },

  async createOrganization(orgData: { name: string }): Promise<OrganizationDetails> {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .insert({ name: orgData.name })
        .select('id, name')
        .single();

      if (error) {
        throw new Error(`Error creating organization: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createOrganization:', error);
      throw error;
    }
  },

  async updateOrganization(orgId: string, orgData: { name: string }): Promise<OrganizationDetails> {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .update({ name: orgData.name })
        .eq('id', orgId)
        .select('id, name')
        .single();

      if (error) {
        throw new Error(`Error updating organization: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateOrganization:', error);
      throw error;
    }
  },

  async deleteOrganization(orgId: string): Promise<void> {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      
      const { error } = await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', orgId);

      if (error) {
        throw new Error(`Error deleting organization: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteOrganization:', error);
      throw error;
    }
  }
};
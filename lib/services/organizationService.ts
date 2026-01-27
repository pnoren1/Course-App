import { rlsSupabase } from '@/lib/supabase';
import { Organization, OrganizationInsert } from '@/lib/types/database.types';

export interface OrganizationWithStats extends Organization {
  groupCount: number;
  userCount: number;
}

export interface CreateOrganizationData {
  name: string;
}

export interface UpdateOrganizationData {
  name?: string;
}

export const organizationService = {
  /**
   * שליפת כל הארגונים עם סטטיסטיקות
   */
  async getAllOrganizations(): Promise<OrganizationWithStats[]> {
    const result = await rlsSupabase.rpc('get_all_organizations');
    
    if (result.error) {
      throw new Error(`שגיאה בשליפת הארגונים: ${result.error.message}`);
    }

    // הוספת סטטיסטיקות לכל ארגון
    const organizations = result.data || [];
    const organizationsWithStats: OrganizationWithStats[] = [];

    for (const org of organizations) {
      // ספירת קבוצות
      const { count: groupCount } = await rlsSupabase.raw
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      // ספירת משתמשים
      const { count: userCount } = await rlsSupabase.raw
        .from('user_profile')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      organizationsWithStats.push({
        ...org,
        groupCount: groupCount || 0,
        userCount: userCount || 0
      });
    }

    return organizationsWithStats;
  },

  /**
   * יצירת ארגון חדש
   */
  async createOrganization(data: CreateOrganizationData): Promise<string> {
    const result = await rlsSupabase.rpc('create_organization', {
      org_name: data.name.trim()
    });

    if (result.error) {
      throw new Error(`שגיאה ביצירת הארגון: ${result.error.message}`);
    }

    return result.data;
  },

  /**
   * עדכון ארגון
   */
  async updateOrganization(id: string, data: UpdateOrganizationData): Promise<void> {
    const { error } = await rlsSupabase.raw
      .from('organizations')
      .update({
        name: data.name?.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`שגיאה בעדכון הארגון: ${error.message}`);
    }
  },

  /**
   * מחיקת ארגון
   */
  async deleteOrganization(id: string): Promise<void> {
    // בדיקה שאין קבוצות או משתמשים בארגון
    const { count: groupCount } = await rlsSupabase.raw
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id);

    const { count: userCount } = await rlsSupabase.raw
      .from('user_profile')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id);

    if ((groupCount || 0) > 0) {
      throw new Error('לא ניתן למחוק ארגון שיש בו קבוצות. יש למחוק תחילה את כל הקבוצות.');
    }

    if ((userCount || 0) > 0) {
      throw new Error('לא ניתן למחוק ארגון שיש בו משתמשים. יש להעביר תחילה את כל המשתמשים לארגון אחר.');
    }

    const { error } = await rlsSupabase.raw
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`שגיאה במחיקת הארגון: ${error.message}`);
    }
  },

  /**
   * שליפת ארגון לפי ID
   */
  async getOrganizationById(id: string): Promise<Organization | null> {
    const { data, error } = await rlsSupabase.raw
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // לא נמצא
      }
      throw new Error(`שגיאה בשליפת הארגון: ${error.message}`);
    }

    return data;
  }
};
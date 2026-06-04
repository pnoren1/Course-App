import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/utils/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/grade-report
 * Returns a CSV file with one row per student.
 * Grade = percentage of assignments submitted (0–100).
 *
 * Query params (optional):
 *   organizationId  – filter to org
 *   groupId         – filter to group
 *   userIds         – comma-separated list of specific user IDs
 */
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireAdminAuth(request);
    const admin = supabaseAdmin!;

    const { searchParams } = new URL(request.url);
    const orgFilter = searchParams.get('organizationId') || null;
    const groupFilter = searchParams.get('groupId') || null;
    const userIdsParam = searchParams.get('userIds') || null;

    const effectiveOrgFilter =
      profile.role === 'org_admin' ? profile.organization_id : orgFilter;

    // ── 1. Students ──────────────────────────────────────────────────────────
    let studentsQuery = admin
      .from('user_profile')
      .select('user_id, user_name, email, organization_id, group_id')
      .eq('role', 'student')
      .order('user_name', { ascending: true });

    if (effectiveOrgFilter) {
      studentsQuery = studentsQuery.eq('organization_id', effectiveOrgFilter);
    }
    if (groupFilter) {
      studentsQuery = studentsQuery.eq('group_id', groupFilter);
    }
    if (userIdsParam) {
      const ids = userIdsParam.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length > 0) studentsQuery = studentsQuery.in('user_id', ids);
    }

    const { data: students, error: studentsError } = await studentsQuery;
    if (studentsError) throw studentsError;

    // ── 2. Total assignments ─────────────────────────────────────────────────
    const { data: assignments, error: assignmentsError } = await admin
      .from('assignments')
      .select('id');
    if (assignmentsError) throw assignmentsError;
    const totalAssignments = assignments?.length ?? 0;

    // ── 3. Submissions ───────────────────────────────────────────────────────
    const userIds = (students ?? []).map((s) => s.user_id);
    let submissionCountByUser = new Map<string, number>();

    if (userIds.length > 0) {
      const { data: submissions, error: submissionsError } = await admin
        .from('assignment_submissions')
        .select('user_id, assignment_id')
        .in('user_id', userIds);
      if (submissionsError) throw submissionsError;

      (submissions ?? []).forEach((sub) => {
        submissionCountByUser.set(
          sub.user_id,
          (submissionCountByUser.get(sub.user_id) ?? 0) + 1
        );
      });
    }

    // ── 4. Org / Group name lookup ───────────────────────────────────────────
    const { data: orgs } = await admin.from('organizations').select('id, name');
    const { data: groups } = await admin.from('groups').select('id, name');
    const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]));
    const groupMap = new Map((groups ?? []).map((g) => [g.id, g.name]));

    // ── 5. Build CSV ─────────────────────────────────────────────────────────
    const BOM = '\uFEFF'; // UTF-8 BOM so Excel opens Hebrew correctly
    const headers = ['שם', 'אימייל', 'ארגון', 'קבוצה', 'מטלות שהוגשו', 'סה"כ מטלות', 'ציון (%)'];

    const rows = (students ?? []).map((s) => {
      const submitted = submissionCountByUser.get(s.user_id) ?? 0;
      const grade = totalAssignments > 0 ? Math.round((submitted / totalAssignments) * 100) : 0;
      const orgName = s.organization_id ? (orgMap.get(s.organization_id) ?? '') : '';
      const groupName = s.group_id ? (groupMap.get(s.group_id) ?? '') : '';

      return [
        csvEscape(s.user_name ?? ''),
        csvEscape(s.email ?? ''),
        csvEscape(orgName),
        csvEscape(groupName),
        submitted,
        totalAssignments,
        grade,
      ].join(',');
    });

    const csv = BOM + [headers.join(','), ...rows].join('\r\n');

    const now = new Date().toISOString().slice(0, 10);
    const filename = `grade-report-${now}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error as any;
    console.error('Error in grade-report:', error);
    return NextResponse.json({ error: 'שגיאה בהפקת הדוח' }, { status: 500 });
  }
}

function csvEscape(value: string): string {
  // Wrap in quotes if value contains comma, quote, or newline
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

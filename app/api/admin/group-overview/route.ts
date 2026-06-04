import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/utils/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/group-overview
 * Returns a full picture of students grouped by org/group:
 * submission rates, video views, login status, progress distribution.
 *
 * Query params (optional):
 *   organizationId  – filter to a single org
 *   groupId         – filter to a single group (requires organizationId)
 */
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireAdminAuth(request);
    const admin = supabaseAdmin!;

    const { searchParams } = new URL(request.url);
    const orgFilter = searchParams.get('organizationId') || null;
    const groupFilter = searchParams.get('groupId') || null;

    // org_admin can only see their own organization
    const effectiveOrgFilter =
      profile.role === 'org_admin' ? profile.organization_id : orgFilter;

    // ── 1. Students ──────────────────────────────────────────────────────────
    let studentsQuery = admin
      .from('user_profile')
      .select('user_id, user_name, email, organization_id, group_id')
      .eq('role', 'student');

    if (effectiveOrgFilter) {
      studentsQuery = studentsQuery.eq('organization_id', effectiveOrgFilter);
    }
    if (groupFilter) {
      studentsQuery = studentsQuery.eq('group_id', groupFilter);
    }

    const { data: students, error: studentsError } = await studentsQuery;
    if (studentsError) throw studentsError;
    if (!students || students.length === 0) {
      return NextResponse.json({ students: [], summary: buildEmptySummary() });
    }

    const userIds = students.map((s) => s.user_id);

    // ── 2. Assignments (total count) ─────────────────────────────────────────
    const { data: assignments, error: assignmentsError } = await admin
      .from('assignments')
      .select('id, title, unit_id, units!inner(title, order)');

    if (assignmentsError) throw assignmentsError;
    const totalAssignments = assignments?.length ?? 0;

    // ── 3. Submissions ───────────────────────────────────────────────────────
    const { data: submissions, error: submissionsError } = await admin
      .from('assignment_submissions')
      .select('user_id, assignment_id, submission_date, status')
      .in('user_id', userIds);

    if (submissionsError) throw submissionsError;

    // ── 4. Video views ───────────────────────────────────────────────────────
    const { data: videoViews, error: videoViewsError } = await admin
      .from('video_views')
      .select('user_id, lesson_id')
      .in('user_id', userIds);

    if (videoViewsError) throw videoViewsError;

    // Total lessons
    const { data: lessons, error: lessonsError } = await admin
      .from('lessons')
      .select('id');
    const totalLessons = lessons?.length ?? 0;

    // ── 5. Login status (course_acknowledgments) ──────────────────────────────
    const { data: acks, error: acksError } = await admin
      .from('course_acknowledgments')
      .select('user_id')
      .in('user_id', userIds);

    const loggedInSet = new Set((acks ?? []).map((a) => a.user_id));

    // ── 6. Organizations & Groups lookup ─────────────────────────────────────
    const { data: orgs } = await admin.from('organizations').select('id, name');
    const { data: groups } = await admin.from('groups').select('id, name, organization_id');

    const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]));
    const groupMap = new Map((groups ?? []).map((g) => [g.id, { name: g.name, orgId: g.organization_id }]));

    // ── 7. Build per-student data ─────────────────────────────────────────────
    const submissionsByUser = new Map<string, number>();
    const lastSubmissionByUser = new Map<string, string>();

    (submissions ?? []).forEach((sub) => {
      submissionsByUser.set(sub.user_id, (submissionsByUser.get(sub.user_id) ?? 0) + 1);
      const existing = lastSubmissionByUser.get(sub.user_id);
      if (!existing || sub.submission_date > existing) {
        lastSubmissionByUser.set(sub.user_id, sub.submission_date);
      }
    });

    const videosByUser = new Map<string, number>();
    (videoViews ?? []).forEach((v) => {
      videosByUser.set(v.user_id, (videosByUser.get(v.user_id) ?? 0) + 1);
    });

    // Unit-level progress: which unit are students currently "at"
    // (determined by the last unit that has at least one submission)
    const unitOrderMap = new Map<number, number>();
    const unitTitleMap = new Map<number, string>();
    (assignments ?? []).forEach((a: any) => {
      unitOrderMap.set(a.unit_id, a.units?.order ?? 999);
      unitTitleMap.set(a.unit_id, a.units?.title ?? `יחידה ${a.unit_id}`);
    });

    // For each student: find the highest unit they submitted to
    const submittedAssignmentIds = new Set(
      (submissions ?? []).map((s) => `${s.user_id}:${s.assignment_id}`)
    );
    const assignmentUnitMap = new Map<number, number>(
      (assignments ?? []).map((a: any) => [a.id, a.unit_id])
    );

    const studentCurrentUnit = new Map<string, { unitId: number; unitTitle: string; unitOrder: number }>();
    (submissions ?? []).forEach((sub) => {
      const unitId = assignmentUnitMap.get(sub.assignment_id);
      if (!unitId) return;
      const existing = studentCurrentUnit.get(sub.user_id);
      const order = unitOrderMap.get(unitId) ?? 999;
      if (!existing || order > existing.unitOrder) {
        studentCurrentUnit.set(sub.user_id, {
          unitId,
          unitTitle: unitTitleMap.get(unitId) ?? `יחידה ${unitId}`,
          unitOrder: order,
        });
      }
    });

    const studentRows = students.map((s) => {
      const submitted = submissionsByUser.get(s.user_id) ?? 0;
      const watched = videosByUser.get(s.user_id) ?? 0;
      const submissionRate = totalAssignments > 0 ? Math.round((submitted / totalAssignments) * 100) : 0;
      const viewingRate = totalLessons > 0 ? Math.round((watched / totalLessons) * 100) : 0;

      return {
        userId: s.user_id,
        userName: s.user_name ?? 'לא ידוע',
        userEmail: s.email ?? '',
        organizationId: s.organization_id ?? null,
        organizationName: s.organization_id ? (orgMap.get(s.organization_id) ?? null) : null,
        groupId: s.group_id ?? null,
        groupName: s.group_id ? (groupMap.get(s.group_id)?.name ?? null) : null,
        hasLoggedIn: loggedInSet.has(s.user_id),
        totalAssignments,
        submittedAssignments: submitted,
        submissionRate,
        totalLessons,
        watchedLessons: watched,
        viewingRate,
        lastSubmissionDate: lastSubmissionByUser.get(s.user_id) ?? null,
        currentUnit: studentCurrentUnit.get(s.user_id) ?? null,
      };
    });

    // ── 8. Summary ────────────────────────────────────────────────────────────
    const summary = buildSummary(studentRows, totalAssignments, totalLessons);

    return NextResponse.json({ students: studentRows, summary, totalAssignments, totalLessons });
  } catch (error) {
    if (error instanceof Response) return error as any;
    console.error('Error in group-overview:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הנתונים' }, { status: 500 });
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildEmptySummary() {
  return {
    totalStudents: 0,
    loggedIn: 0,
    notLoggedIn: 0,
    avgSubmissionRate: 0,
    avgViewingRate: 0,
    excellent: 0,   // ≥ 80%
    good: 0,        // 60–79%
    attention: 0,   // < 60%
    unitDistribution: [],
  };
}

function buildSummary(students: any[], totalAssignments: number, totalLessons: number) {
  if (students.length === 0) return buildEmptySummary();

  const loggedIn = students.filter((s) => s.hasLoggedIn).length;
  const avgSubmissionRate = Math.round(
    students.reduce((sum, s) => sum + s.submissionRate, 0) / students.length
  );
  const avgViewingRate = Math.round(
    students.reduce((sum, s) => sum + s.viewingRate, 0) / students.length
  );
  const excellent = students.filter((s) => s.submissionRate >= 80).length;
  const good = students.filter((s) => s.submissionRate >= 60 && s.submissionRate < 80).length;
  const attention = students.filter((s) => s.submissionRate < 60).length;

  // Unit distribution: how many students are "at" each unit
  const unitCounts = new Map<string, { unitTitle: string; unitOrder: number; count: number }>();
  const noUnit = { unitTitle: 'טרם הגיש', unitOrder: 0, count: 0 };
  students.forEach((s) => {
    if (!s.currentUnit) {
      noUnit.count++;
    } else {
      const key = String(s.currentUnit.unitId);
      const existing = unitCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        unitCounts.set(key, { unitTitle: s.currentUnit.unitTitle, unitOrder: s.currentUnit.unitOrder, count: 1 });
      }
    }
  });

  const unitDistribution = [
    noUnit,
    ...Array.from(unitCounts.values()).sort((a, b) => a.unitOrder - b.unitOrder),
  ].filter((u) => u.count > 0);

  return {
    totalStudents: students.length,
    loggedIn,
    notLoggedIn: students.length - loggedIn,
    avgSubmissionRate,
    avgViewingRate,
    excellent,
    good,
    attention,
    unitDistribution,
  };
}

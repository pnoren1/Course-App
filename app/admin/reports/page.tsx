'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { authenticatedFetch } from '@/lib/utils/api-helpers';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentRow {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string | null;
  organizationName: string | null;
  groupId: string | null;
  groupName: string | null;
  hasLoggedIn: boolean;
  totalAssignments: number;
  submittedAssignments: number;
  submissionRate: number;
  totalLessons: number;
  watchedLessons: number;
  viewingRate: number;
  lastSubmissionDate: string | null;
  currentUnit: { unitId: number; unitTitle: string; unitOrder: number } | null;
}

interface UnitDistItem {
  unitTitle: string;
  unitOrder: number;
  count: number;
}

interface Summary {
  totalStudents: number;
  loggedIn: number;
  notLoggedIn: number;
  avgSubmissionRate: number;
  avgViewingRate: number;
  excellent: number;
  good: number;
  attention: number;
  unitDistribution: UnitDistItem[];
}

interface OverviewData {
  students: StudentRow[];
  summary: Summary;
  totalAssignments: number;
  totalLessons: number;
}

interface OrgOption { id: string; name: string }
interface GroupOption { id: string; name: string; organizationId: string }

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { role, organizationId: myOrgId, isLoading: roleLoading } = useUserRole();
  const router = useRouter();

  // Tab: 'overview' | 'grades'
  const [activeTab, setActiveTab] = useState<'overview' | 'grades'>('overview');

  // Filters
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);

  // Overview data
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Grades tab
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [gradeLoading, setGradeLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'rate'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // Redirect non-admins
  useEffect(() => {
    if (!roleLoading && role !== 'admin' && role !== 'org_admin') {
      router.push('/course');
    }
  }, [role, roleLoading, router]);

  // Load orgs & groups for filter dropdowns (admin only – org_admin sees only their org)
  useEffect(() => {
    if (roleLoading) return;
    if (role === 'org_admin' && myOrgId) {
      setSelectedOrg(myOrgId);
      loadGroups(myOrgId);
    } else if (role === 'admin') {
      loadOrgs();
    }
  }, [role, myOrgId, roleLoading]);

  // Auto-load overview when filters change
  useEffect(() => {
    if (roleLoading) return;
    if (role === 'admin' || role === 'org_admin') {
      loadOverview();
    }
  }, [selectedOrg, selectedGroup, role, roleLoading]);

  // When org changes, reset group
  useEffect(() => {
    setSelectedGroup('');
    if (selectedOrg) loadGroups(selectedOrg);
    else setGroups([]);
  }, [selectedOrg]);

  const loadOrgs = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/organizations');
      if (res.ok) {
        const data = await res.json();
        // API returns a plain array
        setOrgs(Array.isArray(data) ? data : (data.organizations ?? []));
      }
    } catch (e) {
      console.error('Error loading orgs', e);
    }
  };

  const loadGroups = async (orgId: string) => {
    try {
      const res = await authenticatedFetch(`/api/admin/groups/by-organization/${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups ?? []);
      }
    } catch (e) {
      console.error('Error loading groups', e);
    }
  };

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const params = new URLSearchParams();
      if (selectedOrg) params.set('organizationId', selectedOrg);
      if (selectedGroup) params.set('groupId', selectedGroup);

      const res = await authenticatedFetch(`/api/admin/group-overview?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'שגיאה בטעינת הנתונים');
      }
      const data: OverviewData = await res.json();
      setOverviewData(data);
      // Select all students by default for grade report
      setSelectedStudents(new Set(data.students.map((s) => s.userId)));
    } catch (e: any) {
      setOverviewError(e.message);
    } finally {
      setOverviewLoading(false);
    }
  }, [selectedOrg, selectedGroup]);

  const downloadGradeReport = async () => {
    setGradeLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedOrg) params.set('organizationId', selectedOrg);
      if (selectedGroup) params.set('groupId', selectedGroup);
      if (selectedStudents.size > 0 && overviewData && selectedStudents.size < overviewData.students.length) {
        params.set('userIds', Array.from(selectedStudents).join(','));
      }

      const res = await authenticatedFetch(`/api/admin/grade-report?${params}`);
      if (!res.ok) throw new Error('שגיאה בהפקת הדוח');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date().toISOString().slice(0, 10);
      a.download = `grade-report-${now}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGradeLoading(false);
    }
  };

  const toggleStudent = (userId: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleAll = () => {
    if (!overviewData) return;
    const visible = filteredStudents.map((s) => s.userId);
    const allSelected = visible.every((id) => selectedStudents.has(id));
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (allSelected) visible.forEach((id) => next.delete(id));
      else visible.forEach((id) => next.add(id));
      return next;
    });
  };

  // Filtered + sorted students for the grades table
  const filteredStudents = (overviewData?.students ?? [])
    .filter((s) => {
      if (!searchTerm) return true;
      const t = searchTerm.toLowerCase();
      return s.userName.toLowerCase().includes(t) || s.userEmail.toLowerCase().includes(t);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.userName.localeCompare(b.userName, 'he');
      else cmp = a.submissionRate - b.submissionRate;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  // ─── Render ──────────────────────────────────────────────────────────────

  if (roleLoading) return null;

  return (
    <AdminLayout
      title="דוחות וסטטיסטיקות"
      description="תמונת מצב לפי קבוצה/ארגון והפקת דוח ציונים"
      icon={
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      }
      breadcrumbActions={
        <button
          onClick={loadOverview}
          disabled={overviewLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${overviewLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {overviewLoading ? 'טוען...' : 'רענן'}
        </button>
      }
    >
      <div className="space-y-4">
        {/* ── Filters ── */}
        <FilterBar
          role={role}
          orgs={orgs}
          groups={groups}
          selectedOrg={selectedOrg}
          selectedGroup={selectedGroup}
          onOrgChange={setSelectedOrg}
          onGroupChange={setSelectedGroup}
        />

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-200">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            📊 תמונת מצב
          </TabButton>
          <TabButton active={activeTab === 'grades'} onClick={() => setActiveTab('grades')}>
            🎓 דוח ציונים
          </TabButton>
        </div>

        {/* ── Error ── */}
        {overviewError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {overviewError}
          </div>
        )}

        {/* ── Loading ── */}
        {overviewLoading && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            <p className="text-gray-500 text-sm">טוען נתונים...</p>
          </div>
        )}

        {/* ── Overview Tab ── */}
        {!overviewLoading && activeTab === 'overview' && overviewData && (
          <OverviewTab data={overviewData} />
        )}

        {/* ── Grades Tab ── */}
        {!overviewLoading && activeTab === 'grades' && overviewData && (
          <GradesTab
            students={filteredStudents}
            selectedStudents={selectedStudents}
            searchTerm={searchTerm}
            sortBy={sortBy}
            sortDir={sortDir}
            gradeLoading={gradeLoading}
            onToggleStudent={toggleStudent}
            onToggleAll={toggleAll}
            onSearchChange={setSearchTerm}
            onSortByChange={setSortBy}
            onSortDirChange={setSortDir}
            onDownload={downloadGradeReport}
          />
        )}

        {/* ── Empty state ── */}
        {!overviewLoading && !overviewData && !overviewError && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
            בחר ארגון או קבוצה כדי לטעון נתונים
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

function FilterBar({
  role, orgs, groups, selectedOrg, selectedGroup, onOrgChange, onGroupChange,
}: {
  role: string | null;
  orgs: OrgOption[];
  groups: GroupOption[];
  selectedOrg: string;
  selectedGroup: string;
  onOrgChange: (v: string) => void;
  onGroupChange: (v: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">ארגון</label>
        {role === 'org_admin' ? (
          <span className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
            {orgs.find((o) => o.id === selectedOrg)?.name ?? 'הארגון שלי'}
          </span>
        ) : (
          <select
            value={selectedOrg}
            onChange={(e) => onOrgChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
          >
            <option value="">כל הארגונים</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">קבוצה</label>
        <select
          value={selectedGroup}
          onChange={(e) => onGroupChange(e.target.value)}
          disabled={!selectedOrg && groups.length === 0}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px] disabled:opacity-50"
        >
          <option value="">כל הקבוצות</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: OverviewData }) {
  const { summary, students } = data;

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="סה״כ תלמידים" value={summary.totalStudents} icon="👥" color="blue" />
        <KpiCard label="נכנסו למערכת" value={summary.loggedIn} icon="✅" color="green" />
        <KpiCard label="טרם נכנסו" value={summary.notLoggedIn} icon="🔴" color="red" />
        <KpiCard label="ממוצע הגשות" value={`${summary.avgSubmissionRate}%`} icon="📝" color="purple" />
        <KpiCard label="ממוצע צפייה" value={`${summary.avgViewingRate}%`} icon="🎬" color="indigo" />
        <KpiCard label="זקוקים לתשומת לב" value={summary.attention} icon="⚠️" color="orange" />
      </div>

      {/* Distribution bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">פיזור תלמידים לפי אחוז הגשה</h3>
        <DistributionBar excellent={summary.excellent} good={summary.good} attention={summary.attention} total={summary.totalStudents} />
      </div>

      {/* Unit distribution */}
      {summary.unitDistribution.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">היכן נמצאים התלמידים (יחידה אחרונה שהוגשה)</h3>
          <UnitDistribution items={summary.unitDistribution} total={summary.totalStudents} />
        </div>
      )}

      {/* Student table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">רשימת תלמידים</h3>
        </div>
        <StudentTable students={students} />
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    red: 'bg-red-50 border-red-100',
    purple: 'bg-purple-50 border-purple-100',
    indigo: 'bg-indigo-50 border-indigo-100',
    orange: 'bg-orange-50 border-orange-100',
  };
  return (
    <div className={`rounded-lg border p-3 ${colorMap[color] ?? 'bg-gray-50 border-gray-100'}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 leading-tight">{label}</div>
    </div>
  );
}

function DistributionBar({ excellent, good, attention, total }: { excellent: number; good: number; attention: number; total: number }) {
  if (total === 0) return <p className="text-sm text-gray-400">אין נתונים</p>;
  const pExcellent = Math.round((excellent / total) * 100);
  const pGood = Math.round((good / total) * 100);
  const pAttention = Math.round((attention / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex h-6 rounded-full overflow-hidden gap-0.5">
        {pExcellent > 0 && <div style={{ width: `${pExcellent}%` }} className="bg-green-500 flex items-center justify-center text-xs text-white font-medium">{pExcellent > 8 ? `${pExcellent}%` : ''}</div>}
        {pGood > 0 && <div style={{ width: `${pGood}%` }} className="bg-yellow-400 flex items-center justify-center text-xs text-white font-medium">{pGood > 8 ? `${pGood}%` : ''}</div>}
        {pAttention > 0 && <div style={{ width: `${pAttention}%` }} className="bg-red-400 flex items-center justify-center text-xs text-white font-medium">{pAttention > 8 ? `${pAttention}%` : ''}</div>}
      </div>
      <div className="flex gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />מצוין (≥80%) — {excellent}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />בינוני (60–79%) — {good}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />זקוק לתשומת לב (&lt;60%) — {attention}</span>
      </div>
    </div>
  );
}

function UnitDistribution({ items, total }: { items: UnitDistItem[]; total: number }) {
  const maxCount = Math.max(...items.map((i) => i.count));
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = Math.round((item.count / total) * 100);
        const barWidth = Math.round((item.count / maxCount) * 100);
        return (
          <div key={item.unitTitle} className="flex items-center gap-3">
            <div className="w-36 text-xs text-gray-600 truncate text-right shrink-0">{item.unitTitle}</div>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 w-20 shrink-0">{item.count} תלמידים ({pct}%)</div>
          </div>
        );
      })}
    </div>
  );
}

function StudentTable({ students }: { students: StudentRow[] }) {
  if (students.length === 0) {
    return <p className="text-sm text-gray-400 p-4 text-center">אין תלמידים</p>;
  }

  const rateColor = (rate: number) =>
    rate >= 80 ? 'text-green-700 bg-green-50' : rate >= 60 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-2 text-right font-medium">שם</th>
            <th className="px-4 py-2 text-right font-medium">קבוצה</th>
            <th className="px-4 py-2 text-center font-medium">כניסה</th>
            <th className="px-4 py-2 text-center font-medium">% הגשות</th>
            <th className="px-4 py-2 text-center font-medium">מטלות</th>
            <th className="px-4 py-2 text-center font-medium">% צפייה</th>
            <th className="px-4 py-2 text-center font-medium">סרטונים</th>
            <th className="px-4 py-2 text-right font-medium">הגשה אחרונה</th>
            <th className="px-4 py-2 text-right font-medium">יחידה נוכחית</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.map((s) => (
            <tr key={s.userId} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2.5">
                <div className="font-medium text-gray-900">{s.userName}</div>
                <div className="text-xs text-gray-400">{s.userEmail}</div>
              </td>
              <td className="px-4 py-2.5 text-gray-500 text-xs">{s.groupName ?? s.organizationName ?? '—'}</td>
              <td className="px-4 py-2.5 text-center">{s.hasLoggedIn ? '✅' : '🔴'}</td>
              <td className="px-4 py-2.5 text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${rateColor(s.submissionRate)}`}>
                  {s.submissionRate}%
                </span>
              </td>
              <td className="px-4 py-2.5 text-center text-gray-600">{s.submittedAssignments}/{s.totalAssignments}</td>
              <td className="px-4 py-2.5 text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${rateColor(s.viewingRate)}`}>
                  {s.viewingRate}%
                </span>
              </td>
              <td className="px-4 py-2.5 text-center text-gray-600">{s.watchedLessons}/{s.totalLessons}</td>
              <td className="px-4 py-2.5 text-xs text-gray-500">
                {s.lastSubmissionDate
                  ? new Date(s.lastSubmissionDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-500">{s.currentUnit?.unitTitle ?? 'טרם הגיש'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Grades Tab ───────────────────────────────────────────────────────────────

function GradesTab({
  students,
  selectedStudents,
  searchTerm,
  sortBy,
  sortDir,
  gradeLoading,
  onToggleStudent,
  onToggleAll,
  onSearchChange,
  onSortByChange,
  onSortDirChange,
  onDownload,
}: {
  students: StudentRow[];
  selectedStudents: Set<string>;
  searchTerm: string;
  sortBy: 'name' | 'rate';
  sortDir: 'asc' | 'desc';
  gradeLoading: boolean;
  onToggleStudent: (id: string) => void;
  onToggleAll: () => void;
  onSearchChange: (v: string) => void;
  onSortByChange: (v: 'name' | 'rate') => void;
  onSortDirChange: (v: 'asc' | 'desc') => void;
  onDownload: () => void;
}) {
  const allSelected = students.length > 0 && students.every((s) => selectedStudents.has(s.userId));

  const rateColor = (rate: number) =>
    rate >= 80 ? 'text-green-700 bg-green-50' : rate >= 60 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            placeholder="חיפוש לפי שם / אימייל..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as 'name' | 'rate')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">מיון: שם</option>
            <option value="rate">מיון: ציון</option>
          </select>
          <button
            onClick={() => onSortDirChange(sortDir === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {sortDir === 'asc' ? '↑ עולה' : '↓ יורד'}
          </button>
          <span className="text-xs text-gray-400">{selectedStudents.size} תלמידים נבחרו</span>
        </div>

        <button
          onClick={onDownload}
          disabled={gradeLoading || selectedStudents.size === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {gradeLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          הורד CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-right">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-2 text-right font-medium">שם</th>
                <th className="px-4 py-2 text-right font-medium">ארגון</th>
                <th className="px-4 py-2 text-right font-medium">קבוצה</th>
                <th className="px-4 py-2 text-center font-medium">הוגשו</th>
                <th className="px-4 py-2 text-center font-medium">סה״כ</th>
                <th className="px-4 py-2 text-center font-medium">ציון (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => {
                const grade = s.totalAssignments > 0
                  ? Math.round((s.submittedAssignments / s.totalAssignments) * 100)
                  : 0;
                return (
                  <tr
                    key={s.userId}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedStudents.has(s.userId) ? 'bg-blue-50' : ''}`}
                    onClick={() => onToggleStudent(s.userId)}
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(s.userId)}
                        onChange={() => onToggleStudent(s.userId)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{s.userName}</div>
                      <div className="text-xs text-gray-400">{s.userEmail}</div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{s.organizationName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{s.groupName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center text-gray-700">{s.submittedAssignments}</td>
                    <td className="px-4 py-2.5 text-center text-gray-700">{s.totalAssignments}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${rateColor(grade)}`}>
                        {grade}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {students.length === 0 && (
            <p className="text-sm text-gray-400 p-8 text-center">אין תלמידים</p>
          )}
        </div>
      </div>
    </div>
  );
}

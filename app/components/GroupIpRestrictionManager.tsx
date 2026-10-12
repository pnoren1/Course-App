'use client';

import { useState, useCallback } from 'react';
import { authenticatedFetchJson } from '@/lib/utils/api-helpers';
import { isValidIpPattern } from '@/lib/utils/ip-utils';
import { GroupIpAllowlist } from '@/lib/types/database.types';

interface GroupIpRestrictionManagerProps {
  groupId: string;
  groupName: string;
  ipRestrictionEnabled: boolean;
  onRestrictionToggled: (newValue: boolean) => void;
}

export default function GroupIpRestrictionManager({
  groupId,
  groupName,
  ipRestrictionEnabled,
  onRestrictionToggled,
}: GroupIpRestrictionManagerProps) {
  const [patterns, setPatterns] = useState<GroupIpAllowlist[]>([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [newPattern, setNewPattern] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Optimistic local state — mirrors ipRestrictionEnabled but updates immediately on click
  const [localEnabled, setLocalEnabled] = useState(ipRestrictionEnabled);

  const fetchPatterns = useCallback(async () => {
    setLoadingPatterns(true);
    setActionError(null);
    try {
      const { data, error } = await authenticatedFetchJson(
        `/api/admin/groups/${groupId}/ip-restrictions`
      );
      if (error) {
        setActionError(error);
      } else {
        setPatterns(data?.patterns ?? []);
      }
    } finally {
      setLoadingPatterns(false);
    }
  }, [groupId]);

  const handleToggleExpanded = async () => {
    if (!expanded) {
      setExpanded(true);
      await fetchPatterns();
    } else {
      setExpanded(false);
    }
  };

  const handleToggleRestriction = async () => {
    const newValue = !localEnabled;
    // Optimistic update — show change immediately
    setLocalEnabled(newValue);
    setToggling(true);
    setActionError(null);
    try {
      const { error } = await authenticatedFetchJson(
        `/api/admin/groups/${groupId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ ip_restriction_enabled: newValue }),
        }
      );
      if (error) {
        // Revert on failure
        setLocalEnabled(!newValue);
        setActionError(error);
      } else {
        onRestrictionToggled(newValue);
      }
    } finally {
      setToggling(false);
    }
  };

  const handleAddPattern = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = newPattern.trim();
    if (!trimmed) {
      setValidationError('יש להזין כתובת IP');
      return;
    }
    if (!isValidIpPattern(trimmed)) {
      setValidationError('כתובת IP לא תקינה. הזן כתובת IPv4 תקינה (לדוגמה: 192.168.1.1) או טווח CIDR (לדוגמה: 10.0.0.0/24)');
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      const { error } = await authenticatedFetchJson(
        `/api/admin/groups/${groupId}/ip-restrictions`,
        {
          method: 'POST',
          body: JSON.stringify({
            ip_pattern: trimmed,
            description: newDescription.trim() || undefined,
          }),
        }
      );
      if (error) {
        setActionError(error);
      } else {
        setNewPattern('');
        setNewDescription('');
        await fetchPatterns();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePattern = async (patternId: string) => {
    setDeletingId(patternId);
    setActionError(null);
    try {
      const { error } = await authenticatedFetchJson(
        `/api/admin/groups/${groupId}/ip-restrictions/${patternId}`,
        { method: 'DELETE' }
      );
      if (error) {
        setActionError(error);
      } else {
        await fetchPatterns();
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-2 border-t border-slate-200">
      {/* Section header / expand button */}
      <button
        type="button"
        onClick={handleToggleExpanded}
        className="flex items-center gap-2 w-full px-1 py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        aria-expanded={expanded}
        aria-label={`הגדרות הגבלת IP לקבוצה ${groupName}`}
      >
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>הגבלת גישה לפי IP</span>
        {localEnabled && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
            מופעלת
          </span>
        )}
      </button>

      {expanded && (
        <div className="pb-3 px-1 space-y-3">
          {/* Toggle switch */}
          <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-800">הגבלת גישה לפי כתובת IP</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {localEnabled
                  ? 'הגישה לקבוצה זו מוגבלת לכתובות IP המורשות בלבד'
                  : 'הגישה לקבוצה זו פתוחה מכל כתובת IP'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleRestriction}
              disabled={toggling}
              aria-pressed={localEnabled}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                localEnabled ? 'bg-orange-500' : 'bg-slate-300'
              }`}
            >
              <span className="sr-only">
                {localEnabled ? 'כבה הגבלת IP' : 'הפעל הגבלת IP'}
              </span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                  localEnabled ? '-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Error message */}
          {actionError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {actionError}
            </div>
          )}

          {/* Patterns list — visible only when restriction is enabled */}
          {localEnabled && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-700">כתובות IP מורשות:</p>

              {loadingPatterns ? (
                <div className="space-y-1">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : patterns.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  ⚠️ לא הוגדרו כתובות IP מורשות. כל הגישה תיחסם!
                </div>
              ) : (
                <ul className="space-y-1">
                  {patterns.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <svg
                          className="w-3.5 h-3.5 text-green-500 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                        <span className="font-mono font-medium text-slate-800">{p.ip_pattern}</span>
                        {p.description && (
                          <span className="text-slate-400 truncate">— {p.description}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePattern(p.id)}
                        disabled={deletingId === p.id}
                        className="flex-shrink-0 p-1 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="מחק כתובת"
                        aria-label={`מחק כתובת ${p.ip_pattern}`}
                      >
                        {deletingId === p.id ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add pattern form */}
              <form onSubmit={handleAddPattern} className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="כתובת IP (לדוגמה: 192.168.1.1 או 10.0.0.0/24)"
                    value={newPattern}
                    onChange={(e) => {
                      setNewPattern(e.target.value);
                      setValidationError(null);
                    }}
                    className="flex-1 min-w-0 px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    dir="ltr"
                    disabled={saving}
                  />
                  <input
                    type="text"
                    placeholder="תיאור (אופציונלי)"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-32 px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                  <button
                    type="submit"
                    disabled={saving || !newPattern.trim()}
                    className="flex-shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded text-xs font-medium transition-colors"
                  >
                    {saving ? 'מוסיף...' : 'הוספה'}
                  </button>
                </div>
                {validationError && (
                  <p className="text-xs text-red-600">{validationError}</p>
                )}
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

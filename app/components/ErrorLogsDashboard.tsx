"use client";

import { useState, useEffect } from 'react';
import { SystemLog, ErrorStats } from '@/lib/types/logging';
import { authenticatedFetch } from '@/lib/utils/api-helpers';

interface ErrorStatsResponse {
  success: boolean;
  stats24h: ErrorStats[];
  stats7d: ErrorStats[];
  affectedUsers: { log_type: string; affected_users: number }[];
}

interface ErrorLogsResponse {
  success: boolean;
  logs: SystemLog[];
  count: number;
}

export default function ErrorLogsDashboard() {
  const [stats, setStats] = useState<ErrorStatsResponse | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedLogType, setSelectedLogType] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('24h');
  const [limit, setLimit] = useState<number>(50);

  useEffect(() => {
    loadStats();
    loadLogs();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [selectedLogType, dateRange, limit]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/admin/error-stats');
      
      if (!response.ok) {
        throw new Error('נכשל בטעינת סטטיסטיקות שגיאות');
      }

      const data: ErrorStatsResponse = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('נכשל בטעינת סטטיסטיקות שגיאות');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('log_level', 'critical');
      params.append('limit', limit.toString());
      
      if (selectedLogType) {
        params.append('log_type', selectedLogType);
      }
      
      // Calculate date range
      if (dateRange !== 'all') {
        const now = new Date();
        const hours = dateRange === '24h' ? 24 : dateRange === '7d' ? 168 : 720; // 30d = 720h
        const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);
        params.append('start_date', startDate.toISOString());
      }

      const response = await authenticatedFetch(`/api/admin/error-logs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('נכשל בטעינת לוגים');
      }

      const data: ErrorLogsResponse = await response.json();
      setLogs(data.logs);
      setError(null);
    } catch (err) {
      console.error('Error loading logs:', err);
      setError('נכשל בטעינת לוגים');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStats();
    loadLogs();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLogTypeColor = (logType: string) => {
    const colors: Record<string, string> = {
      'SUPABASE_INIT_ERROR': 'bg-red-100 text-red-800',
      'API_ERROR': 'bg-orange-100 text-orange-800',
      'REACT_ERROR_BOUNDARY': 'bg-purple-100 text-purple-800',
    };
    return colors[logType] || 'bg-slate-100 text-slate-800';
  };

  // Get unique log types from stats
  const uniqueLogTypes = stats 
    ? Array.from(new Set([
        ...stats.stats24h.map(s => s.log_type),
        ...stats.stats7d.map(s => s.log_type)
      ]))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-red-100 rounded-lg">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">לוגים של שגיאות קריטיות</h2>
            <p className="text-sm text-slate-600">מעקב אחר שגיאות קריטיות במערכת</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          רענן
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 24h Stats */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-medium text-slate-600">24 שעות אחרונות</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-3">
              {stats.stats24h.reduce((sum, stat) => sum + stat.count, 0)}
            </p>
            <div className="space-y-1">
              {stats.stats24h.map(stat => (
                <div key={stat.log_type} className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLogTypeColor(stat.log_type)}`}>
                    {stat.log_type}
                  </span>
                  <span className="font-semibold text-slate-700">{stat.count}</span>
                </div>
              ))}
              {stats.stats24h.length === 0 && (
                <p className="text-sm text-slate-500">אין שגיאות</p>
              )}
            </div>
          </div>

          {/* 7d Stats */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-sm font-medium text-slate-600">7 ימים אחרונים</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-3">
              {stats.stats7d.reduce((sum, stat) => sum + stat.count, 0)}
            </p>
            <div className="space-y-1">
              {stats.stats7d.map(stat => (
                <div key={stat.log_type} className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLogTypeColor(stat.log_type)}`}>
                    {stat.log_type}
                  </span>
                  <span className="font-semibold text-slate-700">{stat.count}</span>
                </div>
              ))}
              {stats.stats7d.length === 0 && (
                <p className="text-sm text-slate-500">אין שגיאות</p>
              )}
            </div>
          </div>

          {/* Affected Users */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <h3 className="text-sm font-medium text-slate-600">משתמשים מושפעים</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-3">
              {stats.affectedUsers.reduce((sum, stat) => sum + stat.affected_users, 0)}
            </p>
            <div className="space-y-1">
              {stats.affectedUsers.map(stat => (
                <div key={stat.log_type} className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLogTypeColor(stat.log_type)}`}>
                    {stat.log_type}
                  </span>
                  <span className="font-semibold text-slate-700">{stat.affected_users}</span>
                </div>
              ))}
              {stats.affectedUsers.length === 0 && (
                <p className="text-sm text-slate-500">אין משתמשים מושפעים</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              סוג לוג
            </label>
            <select
              value={selectedLogType}
              onChange={(e) => setSelectedLogType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">כל הסוגים</option>
              {uniqueLogTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              טווח תאריכים
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="24h">24 שעות אחרונות</option>
              <option value="7d">7 ימים אחרונים</option>
              <option value="30d">30 ימים אחרונים</option>
              <option value="all">כל הזמן</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              מגבלה
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="25">25 לוגים</option>
              <option value="50">50 לוגים</option>
              <option value="100">100 לוגים</option>
              <option value="200">200 לוגים</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Logs Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">שגיאות קריטיות אחרונות</h3>
          <p className="text-xs text-slate-600 mt-1">מציג {logs.length} לוגים</p>
        </div>

        {logsLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-slate-600">לא נמצאו לוגים</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    זמן
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    סוג
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    הודעה
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    משתמש
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    כתובת
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getLogTypeColor(log.log_type)}`}>
                        {log.log_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 max-w-md truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {log.user_email || log.user_id || 'אנונימי'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={log.url}>
                      {log.url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

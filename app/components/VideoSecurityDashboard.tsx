'use client';

import { useState, useEffect } from 'react';
import { SecurityAlert, AlertSummary } from '@/lib/services/videoSecurityAlertService';

interface SecurityDashboardProps {
  className?: string;
}

export default function VideoSecurityDashboard({ className = '' }: SecurityDashboardProps) {
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load summary
      const summaryResponse = await fetch('/api/video/security/alerts?action=summary');
      if (summaryResponse.ok) {
        const { summary } = await summaryResponse.json();
        setSummary(summary);
      }

      // Load alerts for review
      const alertsResponse = await fetch('/api/video/security/alerts?action=for-review&limit=100');
      if (alertsResponse.ok) {
        const { alerts } = await alertsResponse.json();
        setAlerts(alerts);
      }
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAlertStatus = async (alertId: string, status: string, notes?: string) => {
    try {
      const response = await fetch('/api/video/security/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, status, notes })
      });

      if (response.ok) {
        // Refresh alerts
        await loadSecurityData();
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error('Failed to update alert status:', error);
    }
  };

  const runMaintenance = async () => {
    try {
      const response = await fetch('/api/video/security/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'maintenance' })
      });

      if (response.ok) {
        const { result } = await response.json();
        alert(`Maintenance completed:\n${result.maintenanceLog.join('\n')}`);
        await loadSecurityData();
      }
    } catch (error) {
      console.error('Failed to run maintenance:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredAlerts = alerts.filter(alert => 
    filter === 'all' || alert.severity === filter
  );

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">מרכז אבטחת וידאו</h2>
        <button
          onClick={runMaintenance}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          הרץ תחזוקה
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            <div className="text-sm text-gray-600">סה"כ התראות</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
            <div className="text-sm text-gray-600">קריטיות</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-orange-600">{summary.high}</div>
            <div className="text-sm text-gray-600">גבוהות</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-green-600">{summary.active}</div>
            <div className="text-sm text-gray-600">פעילות</div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4">
        {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
          <button
            key={severity}
            onClick={() => setFilter(severity as any)}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === severity
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {severity === 'all' ? 'הכל' : severity}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            התראות לבדיקה ({filteredAlerts.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredAlerts.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              אין התראות להצגה
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-sm text-gray-600">{alert.alert_type}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-900">{alert.description}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {alert.created_at && new Date(alert.created_at).toLocaleString('he-IL')}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    משתמש: {alert.user_id.substring(0, 8)}...
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">פרטי התראה</h3>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">סוג התראה</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedAlert.alert_type}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">רמת חומרה</label>
                  <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedAlert.severity)}`}>
                    {selectedAlert.severity}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">תיאור</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedAlert.description}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">ראיות</label>
                  <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedAlert.evidence, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => updateAlertStatus(selectedAlert.id!, 'reviewed')}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                סמן כנבדק
              </button>
              <button
                onClick={() => updateAlertStatus(selectedAlert.id!, 'dismissed')}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                דחה
              </button>
              <button
                onClick={() => updateAlertStatus(selectedAlert.id!, 'resolved')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                פתור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
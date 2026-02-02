'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Video,
  TrendingUp,
  Eye
} from 'lucide-react';

interface SuspiciousActivityItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  videoId: string;
  videoTitle: string;
  activityType: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  status: 'pending' | 'approved' | 'dismissed';
  details: {
    sessionId: string;
    eventCount: number;
    playbackRate?: number;
    seekCount?: number;
    tabSwitches?: number;
    additionalData?: any;
  };
}

interface ActivitySummary {
  totalActivities: number;
  pendingReview: number;
  highSeverity: number;
  dismissedActivities: number;
  topActivityTypes: { type: string; count: number }[];
  recentTrends: { date: string; count: number }[];
}

interface VideoSuspiciousActivityProps {
  organizationId?: string;
}

export default function VideoSuspiciousActivity({ organizationId }: VideoSuspiciousActivityProps) {
  const [activities, setActivities] = useState<SuspiciousActivityItem[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchSuspiciousActivities();
  }, [organizationId]);

  const fetchSuspiciousActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (organizationId) {
        params.append('organizationId', organizationId);
      }
      
      const response = await fetch(`/api/video/security/suspicious-activities?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch suspicious activities');
      }
      
      const data = await response.json();
      setActivities(data.activities);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching suspicious activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateActivityStatus = async (activityId: string, status: 'approved' | 'dismissed') => {
    try {
      const response = await fetch(`/api/video/security/suspicious-activities/${activityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update activity status');
      }

      // Update local state
      setActivities(prev => 
        prev.map(activity => 
          activity.id === activityId 
            ? { ...activity, status }
            : activity
        )
      );

      // Update summary
      if (summary) {
        setSummary(prev => prev ? {
          ...prev,
          pendingReview: prev.pendingReview - 1,
          dismissedActivities: status === 'dismissed' ? prev.dismissedActivities + 1 : prev.dismissedActivities
        } : null);
      }
    } catch (error) {
      console.error('Error updating activity status:', error);
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.videoTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = severityFilter === 'all' || activity.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    const matchesType = typeFilter === 'all' || activity.activityType === typeFilter;

    return matchesSearch && matchesSeverity && matchesStatus && matchesType;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'dismissed': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const uniqueActivityTypes = [...new Set(activities.map(a => a.activityType))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Suspicious Activity Monitor</h1>
        <Button onClick={fetchSuspiciousActivities} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalActivities}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.pendingReview}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Severity</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.highSeverity}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dismissed</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.dismissedActivities}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities">Activity List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search activities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Activity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueActivityTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Activities List */}
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activities ({filteredActivities.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredActivities.map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{activity.activityType}</h3>
                          <Badge variant={getSeverityColor(activity.severity) as any}>
                            {activity.severity.toUpperCase()}
                          </Badge>
                          <Badge variant={getStatusColor(activity.status) as any}>
                            {activity.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                      </div>
                      
                      {activity.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateActivityStatus(activity.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateActivityStatus(activity.id, 'dismissed')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Student</p>
                        <p className="font-medium">{activity.userName}</p>
                        <p className="text-xs text-gray-500">{activity.userEmail}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Video</p>
                        <p className="font-medium">{activity.videoTitle}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Timestamp</p>
                        <p className="font-medium">{new Date(activity.timestamp).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Session Details</p>
                        <p className="text-xs">Events: {activity.details.eventCount}</p>
                        {activity.details.seekCount && (
                          <p className="text-xs">Seeks: {activity.details.seekCount}</p>
                        )}
                        {activity.details.playbackRate && (
                          <p className="text-xs">Speed: {activity.details.playbackRate}x</p>
                        )}
                      </div>
                    </div>

                    {activity.details.additionalData && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm font-medium mb-1">Additional Details:</p>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {JSON.stringify(activity.details.additionalData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}

                {filteredActivities.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No suspicious activities found matching your criteria
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {summary && (
            <>
              {/* Top Activity Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Common Activity Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.topActivityTypes.map((type, index) => (
                      <div key={type.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{index + 1}</span>
                          <span>{type.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{type.count}</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${(type.count / Math.max(...summary.topActivityTypes.map(t => t.count))) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Trends (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.recentTrends.map((trend) => (
                      <div key={trend.date} className="flex items-center justify-between">
                        <span className="text-sm">{new Date(trend.date).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{trend.count}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full" 
                              style={{ 
                                width: `${(trend.count / Math.max(...summary.recentTrends.map(t => t.count))) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
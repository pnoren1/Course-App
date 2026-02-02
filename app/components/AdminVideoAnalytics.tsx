'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, Filter, Download, AlertTriangle, Eye, Clock, Users } from 'lucide-react';

interface VideoAnalyticsData {
  totalStudents: number;
  totalVideos: number;
  averageCompletion: number;
  suspiciousActivities: number;
  studentsProgress: StudentProgress[];
  videoStats: VideoStats[];
}

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  totalVideosWatched: number;
  averageCompletion: number;
  suspiciousActivityCount: number;
  lastActivity: string;
  organizationId?: string;
}

interface VideoStats {
  id: string;
  title: string;
  totalViews: number;
  averageCompletion: number;
  averageWatchTime: number;
  suspiciousActivities: number;
}

interface AdminVideoAnalyticsProps {
  organizationId?: string;
}

export default function AdminVideoAnalytics({ organizationId }: AdminVideoAnalyticsProps) {
  const [data, setData] = useState<VideoAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'completed' | 'incomplete' | 'suspicious'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'completion' | 'activity'>('name');

  useEffect(() => {
    fetchAnalyticsData();
  }, [organizationId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (organizationId) {
        params.append('organizationId', organizationId);
      }
      
      const response = await fetch(`/api/video/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = data?.studentsProgress.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (filterBy) {
      case 'completed':
        return matchesSearch && student.averageCompletion >= 80;
      case 'incomplete':
        return matchesSearch && student.averageCompletion < 80;
      case 'suspicious':
        return matchesSearch && student.suspiciousActivityCount > 0;
      default:
        return matchesSearch;
    }
  }).sort((a, b) => {
    switch (sortBy) {
      case 'completion':
        return b.averageCompletion - a.averageCompletion;
      case 'activity':
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      default:
        return a.name.localeCompare(b.name);
    }
  }) || [];

  const exportData = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (organizationId) {
        params.append('organizationId', organizationId);
      }
      
      const response = await fetch(`/api/video/analytics/export?${params}`);
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-analytics.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Failed to load analytics data</p>
        <Button onClick={fetchAnalyticsData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Video Analytics Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportData('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportData('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalVideos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Completion</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageCompletion.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activities</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.suspiciousActivities}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Student Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="completed">Completed (≥80%)</SelectItem>
                <SelectItem value="incomplete">Incomplete (&lt;80%)</SelectItem>
                <SelectItem value="suspicious">Suspicious Activity</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="completion">Completion</SelectItem>
                <SelectItem value="activity">Last Activity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Students List */}
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <div key={student.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{student.name}</h3>
                    <p className="text-sm text-gray-600">{student.email}</p>
                  </div>
                  <div className="flex gap-2">
                    {student.suspiciousActivityCount > 0 && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {student.suspiciousActivityCount} suspicious
                      </Badge>
                    )}
                    <Badge variant={student.averageCompletion >= 80 ? "default" : "secondary"}>
                      {student.averageCompletion.toFixed(1)}% complete
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Videos Watched</p>
                    <p className="font-medium">{student.totalVideosWatched}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Activity</p>
                    <p className="font-medium">{new Date(student.lastActivity).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Progress</p>
                    <Progress value={student.averageCompletion} className="mt-1" />
                  </div>
                </div>
              </div>
            ))}
            
            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No students found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Video Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.videoStats.map((video) => (
              <div key={video.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{video.title}</h3>
                  {video.suspiciousActivities > 0 && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {video.suspiciousActivities} suspicious
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Views</p>
                    <p className="font-medium">{video.totalViews}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Completion</p>
                    <p className="font-medium">{video.averageCompletion.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Watch Time</p>
                    <p className="font-medium">{Math.round(video.averageWatchTime / 60)}m</p>
                  </div>
                  <div>
                    <Progress value={video.averageCompletion} className="mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
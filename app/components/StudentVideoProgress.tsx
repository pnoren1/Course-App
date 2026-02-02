'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Clock, 
  Play, 
  Pause, 
  SkipForward, 
  Eye, 
  Calendar,
  TrendingUp,
  Activity
} from 'lucide-react';

interface StudentVideoProgressProps {
  userId: string;
  studentName?: string;
}

interface VideoProgressDetail {
  id: string;
  videoTitle: string;
  lessonId: string;
  totalWatchedSeconds: number;
  completionPercentage: number;
  isCompleted: boolean;
  firstWatchStarted: string | null;
  lastWatchUpdated: string;
  suspiciousActivityCount: number;
  gradeContribution: number;
  videoDurationSeconds: number;
  viewingSessions: ViewingSession[];
}

interface ViewingSession {
  id: string;
  startedAt: string;
  lastHeartbeat: string;
  isActive: boolean;
  events: ViewingEvent[];
}

interface ViewingEvent {
  id: string;
  eventType: string;
  timestampInVideo: number;
  clientTimestamp: string;
  isTabVisible: boolean;
  playbackRate: number;
  suspiciousFlag?: boolean;
}

interface SuspiciousActivity {
  type: string;
  description: string;
  timestamp: string;
  videoTitle: string;
  severity: 'low' | 'medium' | 'high';
}

export default function StudentVideoProgress({ userId, studentName }: StudentVideoProgressProps) {
  const [progressData, setProgressData] = useState<VideoProgressDetail[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentProgress();
  }, [userId]);

  const fetchStudentProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/video/progress/student/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch student progress');
      }
      
      const data = await response.json();
      setProgressData(data.progress);
      setSuspiciousActivities(data.suspiciousActivities);
    } catch (error) {
      console.error('Error fetching student progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'play': return <Play className="h-3 w-3" />;
      case 'pause': return <Pause className="h-3 w-3" />;
      case 'seek': return <SkipForward className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalVideos = progressData.length;
  const completedVideos = progressData.filter(v => v.isCompleted).length;
  const averageCompletion = totalVideos > 0 
    ? progressData.reduce((sum, v) => sum + v.completionPercentage, 0) / totalVideos 
    : 0;
  const totalSuspicious = progressData.reduce((sum, v) => sum + v.suspiciousActivityCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Student Progress: {studentName || 'Unknown Student'}
        </h1>
        <Button onClick={fetchStudentProgress} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Watched</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedVideos}/{totalVideos}</div>
            <p className="text-xs text-muted-foreground">
              {totalVideos > 0 ? ((completedVideos / totalVideos) * 100).toFixed(1) : 0}% completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageCompletion.toFixed(1)}%</div>
            <Progress value={averageCompletion} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Watch Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(progressData.reduce((sum, v) => sum + v.totalWatchedSeconds, 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activities</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalSuspicious > 0 ? 'text-red-600' : ''}`}>
              {totalSuspicious}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress">Video Progress</TabsTrigger>
          <TabsTrigger value="history">Viewing History</TabsTrigger>
          <TabsTrigger value="suspicious">Suspicious Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Video Progress Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressData.map((video) => (
                  <div key={video.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{video.videoTitle}</h3>
                        <p className="text-sm text-gray-600">Lesson: {video.lessonId}</p>
                      </div>
                      <div className="flex gap-2">
                        {video.suspiciousActivityCount > 0 && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {video.suspiciousActivityCount} suspicious
                          </Badge>
                        )}
                        <Badge variant={video.isCompleted ? "default" : "secondary"}>
                          {video.completionPercentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Watch Time</p>
                        <p className="font-medium">{formatDuration(video.totalWatchedSeconds)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-medium">{formatDuration(video.videoDurationSeconds)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">First Watched</p>
                        <p className="font-medium">
                          {video.firstWatchStarted 
                            ? new Date(video.firstWatchStarted).toLocaleDateString()
                            : 'Never'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Activity</p>
                        <p className="font-medium">
                          {new Date(video.lastWatchUpdated).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{video.completionPercentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={video.completionPercentage} />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setSelectedVideo(selectedVideo === video.id ? null : video.id)}
                    >
                      {selectedVideo === video.id ? 'Hide Details' : 'Show Details'}
                    </Button>

                    {selectedVideo === video.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-3">Viewing Sessions</h4>
                        <div className="space-y-3">
                          {video.viewingSessions.map((session) => (
                            <div key={session.id} className="border rounded p-3 bg-white">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">
                                  Session {session.id.slice(-8)}
                                </span>
                                <Badge variant={session.isActive ? "default" : "secondary"}>
                                  {session.isActive ? "Active" : "Ended"}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-600 mb-2">
                                Started: {new Date(session.startedAt).toLocaleString()}
                                <br />
                                Last Activity: {new Date(session.lastHeartbeat).toLocaleString()}
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium">Recent Events:</p>
                                {session.events.slice(-5).map((event) => (
                                  <div key={event.id} className="flex items-center gap-2 text-xs">
                                    {getEventIcon(event.eventType)}
                                    <span className="capitalize">{event.eventType}</span>
                                    <span>at {formatDuration(event.timestampInVideo)}</span>
                                    <span className="text-gray-500">
                                      ({event.playbackRate}x speed)
                                    </span>
                                    {!event.isTabVisible && (
                                      <Badge variant="outline" className="text-xs">
                                        Tab Hidden
                                      </Badge>
                                    )}
                                    {event.suspiciousFlag && (
                                      <Badge variant="destructive" className="text-xs">
                                        Suspicious
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Viewing History Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressData
                  .sort((a, b) => new Date(b.lastWatchUpdated).getTime() - new Date(a.lastWatchUpdated).getTime())
                  .map((video) => (
                    <div key={video.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{video.videoTitle}</h4>
                        <p className="text-sm text-gray-600">
                          Last watched: {new Date(video.lastWatchUpdated).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{video.completionPercentage.toFixed(1)}%</p>
                        <p className="text-sm text-gray-600">
                          {formatDuration(video.totalWatchedSeconds)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspicious" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activity Report</CardTitle>
            </CardHeader>
            <CardContent>
              {suspiciousActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No suspicious activities detected
                </div>
              ) : (
                <div className="space-y-4">
                  {suspiciousActivities.map((activity, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{activity.type}</h4>
                          <p className="text-sm text-gray-600">{activity.videoTitle}</p>
                        </div>
                        <Badge variant={getSeverityColor(activity.severity) as any}>
                          {activity.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
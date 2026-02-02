'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminVideoAnalytics from '@/app/components/AdminVideoAnalytics';
import StudentVideoProgress from '@/app/components/StudentVideoProgress';
import VideoSuspiciousActivity from '@/app/components/VideoSuspiciousActivity';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { Shield, BarChart3, User, AlertTriangle } from 'lucide-react';

interface VideoSecurityPageProps {
  userRoleData?: {
    role: string | null;
    userName: string | null;
    userEmail: string | null;
    organizationName: string | null;
    organizationId: string | null;
    groupName: string | null;
    groupId: string | null;
    userId: string | null;
    isLoading: boolean;
    error: string | null;
  };
}

export default function VideoSecurityPage({ userRoleData }: VideoSecurityPageProps) {
  // השתמש ב-props אם קיים, אחרת ב-hook
  const hookData = useUserRole();
  const { role, isLoading: roleLoading, organizationId: userOrgId } = userRoleData || hookData;
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<string>('');

  // Check if user has admin or org_admin role
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!role || !['admin', 'org_admin'].includes(role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              You don't have permission to access the video security dashboard. 
              This page is only available to administrators and organization administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleStudentSelect = (studentId: string, studentName: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Video Security Dashboard</h1>
        </div>
        <p className="text-gray-600">
          Monitor video viewing activities, detect suspicious behavior, and analyze student engagement.
        </p>
      </div>

      {/* Organization Filter for Admin */}
      {role === 'admin' && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Filter by Organization:</label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Organizations</SelectItem>
                  {/* In a real implementation, you'd fetch organizations from the API */}
                  <SelectItem value="org1">Organization 1</SelectItem>
                  <SelectItem value="org2">Organization 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics Overview
          </TabsTrigger>
          <TabsTrigger value="student-progress" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Student Progress
          </TabsTrigger>
          <TabsTrigger value="suspicious-activity" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Suspicious Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <AdminVideoAnalytics 
            organizationId={role === 'org_admin' ? userOrgId || undefined : organizationId}
          />
        </TabsContent>

        <TabsContent value="student-progress" className="space-y-6">
          {!selectedStudentId ? (
            <Card>
              <CardHeader>
                <CardTitle>Select a Student</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Choose a student from the analytics overview to view their detailed progress, 
                  or use the student selector below.
                </p>
                
                {/* Student Selector Component */}
                <StudentSelector 
                  organizationId={role === 'org_admin' ? userOrgId || undefined : organizationId}
                  onStudentSelect={handleStudentSelect}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Student Progress Details</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedStudentId('')}
                >
                  Back to Student List
                </Button>
              </div>
              <StudentVideoProgress 
                userId={selectedStudentId}
                studentName={selectedStudentName}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="suspicious-activity" className="space-y-6">
          <VideoSuspiciousActivity 
            organizationId={role === 'org_admin' ? userOrgId || undefined : organizationId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Simple student selector component
function StudentSelector({ 
  organizationId, 
  onStudentSelect 
}: { 
  organizationId?: string;
  onStudentSelect: (studentId: string, studentName: string) => void;
}) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (organizationId) {
        params.append('organizationId', organizationId);
      }
      
      const response = await fetch(`/api/video/students?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStudents();
  }, [organizationId]);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-4">Loading students...</div>;
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search students..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {filteredStudents.map((student) => (
          <Card 
            key={student.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onStudentSelect(student.id, student.name)}
          >
            <CardContent className="pt-4">
              <h3 className="font-medium">{student.name}</h3>
              <p className="text-sm text-gray-600">{student.email}</p>
              {student.videosWatched !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  {student.videosWatched} videos watched
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredStudents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No students found
        </div>
      )}
    </div>
  );
}
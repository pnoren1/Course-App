'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import VideoGradingConfig from '@/app/components/VideoGradingConfig';
import VideoGradeDisplay from '@/app/components/VideoGradeDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { Search, Users, Settings, BarChart3 } from 'lucide-react';

interface VideoGradingAdminPageProps {
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

export default function VideoGradingAdminPage({ userRoleData }: VideoGradingAdminPageProps) {
  // השתמש ב-props אם קיים, אחרת ב-hook
  const hookData = useUserRole();
  const finalUserRoleData = userRoleData || hookData;
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = finalUserRoleData.role === 'admin' || finalUserRoleData.role === 'org_admin';

  useEffect(() => {
    const fetchStudents = async () => {
      if (!isAdmin) return;

      try {
        setLoading(true);
        const response = await fetch('/api/admin/organization-students');
        if (response.ok) {
          const data = await response.json();
          setStudents(data.students || []);
        }
      } catch (error) {
        console.error('Failed to fetch students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [isAdmin]);

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <AdminLayout title="ניהול ציוני צפייה" description="הגדרת פרמטרי ציון ומעקב אחר התקדמות הסטודנטים בצפיית הסרטונים" icon={<BarChart3 className="w-5 h-5 text-blue-600" />}>
        <div className="text-center py-16">
          <div className="text-red-600 mb-4">
            <Settings className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">אין הרשאה</h2>
            <p className="text-gray-600 mt-2">אין לך הרשאה לגשת לעמוד זה</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="ניהול ציוני צפייה" description="הגדרת פרמטרי ציון ומעקב אחר התקדמות הסטודנטים בצפיית הסרטונים" icon={<BarChart3 className="w-5 h-5 text-blue-600" />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ניהול ציוני צפייה</h1>
            <p className="text-gray-600 mt-1">
              הגדרת פרמטרי ציון ומעקב אחר התקדמות הסטודנטים בצפיית הסרטונים
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            מערכת ציונים
          </Badge>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              הגדרות ציון
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              ציוני סטודנטים
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              סטטיסטיקות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <VideoGradingConfig isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  ציוני צפייה - סטודנטים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="חיפוש סטודנט..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <Badge variant="outline">
                    {filteredStudents.length} סטודנטים
                  </Badge>
                </div>

                {loading ? (
                  <div className="text-center py-8">טוען רשימת סטודנטים...</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900">בחר סטודנט:</h3>
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredStudents.map((student) => (
                          <div
                            key={student.user_id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedStudent === student.user_id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedStudent(student.user_id)}
                          >
                            <div className="font-medium">{student.name || 'ללא שם'}</div>
                            <div className="text-sm text-gray-600">{student.email}</div>
                            {student.group_name && (
                              <Badge variant="outline" className="mt-1">
                                {student.group_name}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      {selectedStudent ? (
                        <VideoGradeDisplay
                          userId={selectedStudent}
                          showDetails={true}
                          isAdmin={true}
                        />
                      ) : (
                        <div className="text-center py-16 text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>בחר סטודנט כדי לראות את ציוני הצפייה שלו</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  סטטיסטיקות כלליות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>סטטיסטיקות מפורטות יתווספו בגרסאות עתידיות</p>
                  <p className="text-sm mt-2">
                    כרגע ניתן לצפות בציוני סטודנטים בודדים בלשונית "ציוני סטודנטים"
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
import { Suspense } from 'react';
import VideoOptimizationDashboard from '@/app/components/VideoOptimizationDashboard';
import AdminLayout from '@/app/components/AdminLayout';

export default function VideoOptimizationPage() {
  return (
    <AdminLayout title="אופטימיזציית וידאו" description="ניהול וניטור ביצועי מערכת הווידאו">
      <div className="container mx-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        }>
          <VideoOptimizationDashboard />
        </Suspense>
      </div>
    </AdminLayout>
  );
}
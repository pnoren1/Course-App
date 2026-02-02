"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  memory_usage_mb: number;
  hit_rate: number;
}

interface DatabaseMetrics {
  table_sizes: Array<{ table_name: string; size_mb: number; row_count: number }>;
  index_usage: Array<{ index_name: string; scans: number; tuples_read: number }>;
  slow_queries: Array<{ query: string; avg_time_ms: number; calls: number }>;
}

interface OptimizationData {
  cache_statistics: CacheStats;
  database_metrics: DatabaseMetrics;
  partition_info: Array<{ table_name: string; partition_name: string; row_count: number }>;
  timestamp: string;
}

export default function VideoOptimizationDashboard() {
  const [data, setData] = useState<OptimizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastOperation, setLastOperation] = useState<string | null>(null);

  const fetchOptimizationData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/video-optimization');
      
      if (!response.ok) {
        throw new Error('Failed to fetch optimization data');
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async (operation: string, options: any = {}) => {
    try {
      setOperationLoading(operation);
      setError(null);
      
      const response = await fetch('/api/admin/video-optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operation, options }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Operation failed');
      }
      
      const result = await response.json();
      setLastOperation(`${operation}: ${result.message}`);
      
      // Refresh data after operation
      await fetchOptimizationData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setOperationLoading(null);
    }
  };

  useEffect(() => {
    fetchOptimizationData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Video System Optimization</h1>
        <Button onClick={fetchOptimizationData} disabled={loading}>
          Refresh Data
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {lastOperation && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800">✓ {lastOperation}</p>
        </div>
      )}

      {data && (
        <>
          {/* Cache Statistics */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Cache Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.cache_statistics.hit_rate}%</div>
                <div className="text-sm text-gray-600">Hit Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.cache_statistics.hits}</div>
                <div className="text-sm text-gray-600">Cache Hits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{data.cache_statistics.misses}</div>
                <div className="text-sm text-gray-600">Cache Misses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{data.cache_statistics.entries}</div>
                <div className="text-sm text-gray-600">Entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{data.cache_statistics.memory_usage_mb} MB</div>
                <div className="text-sm text-gray-600">Memory Usage</div>
              </div>
            </div>
          </Card>

          {/* Database Tables */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Database Table Sizes</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Table Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size (MB)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Row Count
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.database_metrics.table_sizes.map((table, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {table.table_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {table.size_mb}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {table.row_count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Index Usage */}
          {data.database_metrics.index_usage.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Index Usage Statistics</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Index Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scans
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tuples Read
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.database_metrics.index_usage.map((index, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index.index_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {index.scans.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {index.tuples_read.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Optimization Operations */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Database Optimization Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                onClick={() => runOptimization('create_indexes')}
                disabled={operationLoading === 'create_indexes'}
                className="w-full"
              >
                {operationLoading === 'create_indexes' ? 'Creating...' : 'Create Indexes'}
              </Button>
              
              <Button
                onClick={() => runOptimization('create_partitions', { months: 12 })}
                disabled={operationLoading === 'create_partitions'}
                className="w-full"
              >
                {operationLoading === 'create_partitions' ? 'Creating...' : 'Create Partitions'}
              </Button>
              
              <Button
                onClick={() => runOptimization('archive_events', { days: 90 })}
                disabled={operationLoading === 'archive_events'}
                className="w-full"
                variant="outline"
              >
                {operationLoading === 'archive_events' ? 'Archiving...' : 'Archive Old Events'}
              </Button>
              
              <Button
                onClick={() => runOptimization('archive_sessions', { days: 30 })}
                disabled={operationLoading === 'archive_sessions'}
                className="w-full"
                variant="outline"
              >
                {operationLoading === 'archive_sessions' ? 'Archiving...' : 'Archive Old Sessions'}
              </Button>
              
              <Button
                onClick={() => runOptimization('update_statistics')}
                disabled={operationLoading === 'update_statistics'}
                className="w-full"
                variant="outline"
              >
                {operationLoading === 'update_statistics' ? 'Updating...' : 'Update Statistics'}
              </Button>
              
              <Button
                onClick={() => runOptimization('cleanup_archives', { months: 12 })}
                disabled={operationLoading === 'cleanup_archives'}
                className="w-full"
                variant="outline"
              >
                {operationLoading === 'cleanup_archives' ? 'Cleaning...' : 'Cleanup Archives'}
              </Button>
            </div>
          </Card>

          {/* Partition Information */}
          {data.partition_info.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Table Partitions</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Partition Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Row Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.partition_info.map((partition, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {partition.partition_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {partition.row_count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="text-sm text-gray-500 text-center">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
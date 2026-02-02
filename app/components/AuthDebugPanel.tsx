"use client";

import React from 'react';
import { useAuthDebug } from '@/lib/hooks/useAuthDebug';

interface AuthDebugPanelProps {
  className?: string;
}

export default function AuthDebugPanel({ className = '' }: AuthDebugPanelProps) {
  const { debugInfo, isLoading, runDebug, clearDebug } = useAuthDebug();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className={`bg-slate-100 border border-slate-300 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">🔍 Auth Debug Panel</h3>
        <div className="flex gap-2">
          <button
            onClick={runDebug}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Running...' : 'Run Debug'}
          </button>
          {debugInfo && (
            <button
              onClick={clearDebug}
              className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {debugInfo && (
        <div className="space-y-3 text-xs">
          {/* Client Session Info */}
          <div className="bg-white rounded p-3 border">
            <h4 className="font-medium text-slate-700 mb-2">📱 Client Session</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span>Has Session:</span>
                <span className={debugInfo.clientSession.hasSession ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.clientSession.hasSession ? '✅' : '❌'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Has Token:</span>
                <span className={debugInfo.clientSession.hasToken ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.clientSession.hasToken ? '✅' : '❌'}
                </span>
              </div>
              <div className="col-span-2">
                <span>Token: </span>
                <span className="font-mono text-slate-600">{debugInfo.clientSession.tokenStart}</span>
              </div>
              <div className="col-span-2">
                <span>Expires: </span>
                <span className="font-mono text-slate-600">{debugInfo.clientSession.expiresAt}</span>
              </div>
              <div className="col-span-2">
                <span>User: </span>
                <span className="font-mono text-slate-600">
                  {debugInfo.clientSession.userEmail || debugInfo.clientSession.userId || 'N/A'}
                </span>
              </div>
              {debugInfo.clientSession.error && (
                <div className="col-span-2 text-red-600">
                  <span>Error: </span>
                  <span>{debugInfo.clientSession.error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Server Debug Info */}
          {debugInfo.serverDebug && (
            <div className="bg-white rounded p-3 border">
              <h4 className="font-medium text-slate-700 mb-2">🖥️ Server Debug</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>Has Token:</span>
                  <span className={debugInfo.serverDebug.hasToken ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.serverDebug.hasToken ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Has User:</span>
                  <span className={debugInfo.serverDebug.hasUser ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.serverDebug.hasUser ? '✅' : '❌'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span>Token: </span>
                  <span className="font-mono text-slate-600">{debugInfo.serverDebug.tokenStart}</span>
                </div>
                <div className="col-span-2">
                  <span>Cookies: </span>
                  <span className="font-mono text-slate-600">
                    {debugInfo.serverDebug.cookieNames.join(', ') || 'None'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span>User: </span>
                  <span className="font-mono text-slate-600">
                    {debugInfo.serverDebug.userEmail || debugInfo.serverDebug.userId || 'N/A'}
                  </span>
                </div>
                {debugInfo.serverDebug.authError && (
                  <div className="col-span-2 text-red-600">
                    <span>Error: </span>
                    <span>{debugInfo.serverDebug.authError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* API Test Info */}
          {debugInfo.apiTest && (
            <div className="bg-white rounded p-3 border">
              <h4 className="font-medium text-slate-700 mb-2">🌐 API Test</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={debugInfo.apiTest.ok ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.apiTest.status} {debugInfo.apiTest.statusText}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Success:</span>
                  <span className={debugInfo.apiTest.ok ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.apiTest.ok ? '✅' : '❌'}
                  </span>
                </div>
                {debugInfo.apiTest.error && (
                  <div className="col-span-2 text-red-600">
                    <span>Error: </span>
                    <span>{debugInfo.apiTest.error}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-yellow-50 rounded p-3 border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">🔧 Quick Actions</h4>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => window.location.reload()}
                className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
              >
                Clear Storage & Reload
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
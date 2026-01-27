"use client";

import { useState, useEffect } from 'react';
import { rlsSupabase } from '@/lib/supabase';
import { SubmissionFile } from '@/lib/types/database.types';

interface FileViewerProps {
  file: SubmissionFile;
  onClose: () => void;
}

export default function FileViewer({ file, onClose }: FileViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  useEffect(() => {
    loadFile();
    return () => {
      // Cleanup URL when component unmounts
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [file.id]);

  const loadFile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get signed URL for the file
      const { data: signedUrlData, error: urlError } = await rlsSupabase.storage
        .from('assignment-submissions')
        .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

      if (urlError) {
        throw urlError;
      }

      if (signedUrlData?.signedUrl) {
        setFileUrl(signedUrlData.signedUrl);

        // For text files, fetch content to display
        if (file.file_type.startsWith('text/') || 
            file.file_type.includes('json') || 
            file.file_type.includes('xml') ||
            file.original_filename.endsWith('.md') ||
            file.original_filename.endsWith('.txt') ||
            file.original_filename.endsWith('.js') ||
            file.original_filename.endsWith('.ts') ||
            file.original_filename.endsWith('.jsx') ||
            file.original_filename.endsWith('.tsx') ||
            file.original_filename.endsWith('.css') ||
            file.original_filename.endsWith('.html') ||
            file.original_filename.endsWith('.py') ||
            file.original_filename.endsWith('.java') ||
            file.original_filename.endsWith('.cpp') ||
            file.original_filename.endsWith('.c') ||
            file.original_filename.endsWith('.sql')) {
          
          try {
            const response = await fetch(signedUrlData.signedUrl);
            const text = await response.text();
            setFileContent(text);
          } catch (textError) {
            console.error('Error loading text content:', textError);
          }
        }
      }
    } catch (err) {
      console.error('Error loading file:', err);
      setError('שגיאה בטעינת הקובץ');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (!fileUrl) return;

    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFileContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="inline-flex items-center gap-2 text-slate-600">
            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            טוען קובץ...
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      );
    }

    // Image files
    if (file.file_type.startsWith('image/') && fileUrl) {
      return (
        <div className="flex items-center justify-center p-4">
          <img
            src={fileUrl}
            alt={file.original_filename}
            className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
          />
        </div>
      );
    }

    // PDF files
    if (file.file_type.includes('pdf') && fileUrl) {
      return (
        <div className="h-[70vh]">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0 rounded-lg"
            title={file.original_filename}
          />
        </div>
      );
    }

    // Text files
    if (fileContent !== null) {
      return (
        <div className="bg-slate-50 rounded-lg p-4 max-h-[60vh] overflow-auto">
          <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono">
            {fileContent}
          </pre>
        </div>
      );
    }

    // Video files
    if (file.file_type.startsWith('video/') && fileUrl) {
      return (
        <div className="flex items-center justify-center p-4">
          <video
            src={fileUrl}
            controls
            className="max-w-full max-h-[60vh] rounded-lg shadow-lg"
          >
            הדפדפן שלך לא תומך בהצגת וידאו
          </video>
        </div>
      );
    }

    // Audio files
    if (file.file_type.startsWith('audio/') && fileUrl) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <audio
              src={fileUrl}
              controls
              className="w-full max-w-md"
            >
              הדפדפן שלך לא תומך בהשמעת אודיו
            </audio>
          </div>
        </div>
      );
    }

    // Unsupported file type
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium mb-2">לא ניתן להציג קובץ זה בדפדפן</p>
          <p className="text-sm text-slate-500 mb-4">
            ניתן להוריד את הקובץ כדי לצפות בו
          </p>
          <button
            onClick={downloadFile}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            הורד קובץ
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {file.original_filename}
              </h3>
              <p className="text-sm text-slate-600">
                {formatFileSize(file.file_size_bytes)} • {file.file_type}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={downloadFile}
              disabled={!fileUrl}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              הורד
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {renderFileContent()}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import type { Lesson, LessonFile } from "../types";
import { supabase } from "@/lib/supabase";
import AudioHelpLink from "./AudioHelpLink";
import VideoPlayerWithTracking from "./VideoPlayerWithTracking";
import VideoProgress from "./VideoProgress";

type Props = {
  lesson: Lesson;
  isOpen: boolean;
  userId?: string;
};

export default function LessonPanel({ lesson, isOpen, userId }: Props) {
  const [files, setFiles] = useState<LessonFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const isLab = lesson.is_lab;
  const hasVideo = !!lesson.embedUrl;
  const hasDescription = !!lesson.description;

  // Extract Spotlightr video ID from embed URL
  const getSpotlightrVideoId = (embedUrl: string): string | null => {
    try {
      const url = new URL(embedUrl);
      const pathParts = url.pathname.split('/');
      const watchIndex = pathParts.indexOf('watch');
      if (watchIndex !== -1 && pathParts[watchIndex + 1]) {
        return pathParts[watchIndex + 1];
      }
      return null;
    } catch {
      return null;
    }
  };

  const spotlightrVideoId = hasVideo ? getSpotlightrVideoId(lesson.embedUrl) : null;

  // Load lesson files
  useEffect(() => {
    if (isOpen && lesson.id) {
      const fetchFiles = async () => {
        setLoadingFiles(true);
        try {
          const { data: files } = await supabase
            .from("lesson_files")
            .select("*")
            .eq("lesson_id", lesson.id);
          
          setFiles(files || []);
        } catch (error) {
          console.error("Error fetching lesson files:", error);
          setFiles([]);
        } finally {
          setLoadingFiles(false);
        }
      };

      fetchFiles();
    }
  }, [isOpen, lesson.id]);

  if (!isOpen) return null;

  return (
    <div className={`mt-6 p-6 rounded-2xl border shadow-sm ${
      isLab 
        ? "bg-gradient-to-br from-orange-50 to-slate-50 border-orange-200" 
        : "bg-gradient-to-br from-slate-50 to-zinc-50 border-slate-200"
    }`}>
      {/* LAB Header */}
      {isLab && (
        <div className="mb-6 pb-4 border-b border-orange-200">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200 rounded-xl">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.78 0-2.678-2.153-1.415-3.414l5-5A2 2 0 009 9.586V5L8 4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-orange-900">מעבדה מעשית</h3>
              <p className="text-sm text-orange-700">תרגול מעשי עם הוראות שלב אחר שלב</p>
            </div>
          </div>
        </div>
      )}

      {/* Content Layout - Stack video and description */}
      <div className="space-y-6">
        {/* Video Content */}
        {hasVideo && spotlightrVideoId && (
          <div>
            <div className="relative">
              <VideoPlayerWithTracking
                videoLessonId={lesson.id.toString()}
                spotlightrVideoId={spotlightrVideoId}
                onProgressUpdate={setVideoProgress}
                onSessionStart={(token) => console.log('Video session started:', token)}
                onSessionEnd={() => console.log('Video session ended')}
              />
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{isLab ? "צפה בהדגמה" : "צפה בשיעור"}</span>
              </div>
              <div className="text-xs text-slate-500">
                <span>לחץ על מסך מלא לחוויה טובה יותר</span>
              </div>
            </div>

            {/* Video Progress */}
            {userId && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <VideoProgress
                  userId={userId}
                  videoLessonId={lesson.id.toString()}
                  showDetails={true}
                />
              </div>
            )}

            {/* Audio Help Link */}
            <AudioHelpLink />
          </div>
        )}

        {/* Fallback for non-Spotlightr videos */}
        {hasVideo && !spotlightrVideoId && (
          <div>
            <div className="relative">
              <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-black border border-slate-200">
                <iframe
                  src={lesson.embedUrl}
                  className="w-full h-full"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={lesson.title}
                />
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{isLab ? "צפה בהדגמה" : "צפה בשיעור"}</span>
              </div>
              <div className="text-xs text-slate-500">
                <span>לחץ על מסך מלא לחוויה טובה יותר</span>
              </div>
            </div>

            {/* Audio Help Link */}
            <AudioHelpLink />
          </div>
        )}

        {/* Files Section */}
        {files.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className={`text-base font-semibold mb-4 flex items-center gap-2 ${
              isLab ? "text-orange-900" : "text-slate-900"
            }`}>
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              קבצים להורדה
            </h4>
            
            {loadingFiles ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                טוען קבצים...
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors duration-200">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 rounded-lg">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{file.file_name}</p>
                        {file.file_size && (
                          <p className="text-xs text-slate-500">
                            {(file.file_size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        )}
                      </div>
                    </div>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-25 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium hover:from-indigo-100 hover:to-indigo-50 transition-all duration-200"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      הורד
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Instructions/Description Section */}
        {hasDescription && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className={`text-base font-semibold mb-4 flex items-center gap-2 ${
              isLab ? "text-orange-900" : "text-slate-900"
            }`}>
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isLab ? "הוראות ביצוע" : "תיאור השיעור"}
            </h4>
            <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
              isLab ? "text-slate-800" : "text-slate-700"
            }`} style={{ lineHeight: '1.7' }}>
              {lesson.description}
            </div>
            
            {/* LAB Footer - moved inside description section */}
            {isLab && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">עקוב אחר ההוראות בקפידה לקבלת התוצאה הטובה ביותר</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Content State */}
        {!hasVideo && !hasDescription && (
          <div className="flex items-center justify-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium text-slate-600">תוכן יתווסף בקרוב</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
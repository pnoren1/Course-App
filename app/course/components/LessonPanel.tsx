"use client";

import React from "react";
import type { Lesson } from "../types";

type Props = {
  lesson: Lesson;
  isOpen: boolean;
};

export default function LessonPanel({ lesson, isOpen }: Props) {
  if (!isOpen) return null;

  const isLab = lesson.is_lab;

  return (
    <div className={`mt-6 p-6 rounded-2xl border ${isLab
        ? "bg-gradient-to-br from-blue-50 to-slate-50 border-blue-100"
        : "bg-slate-50 border-slate-100"
      }`}>
      {/* LAB Header */}
      {isLab && (
        <div className="mb-6 pb-4 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.78 0-2.678-2.153-1.415-3.414l5-5A2 2 0 009 9.586V5L8 4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900">מעבדה מעשית</h3>
              <p className="text-sm text-blue-700">תרגול מעשי עם הוראות שלב אחר שלב</p>
            </div>
          </div>
        </div>
      )}

      {/* Video Content */}
      {lesson.embedUrl && (
        <div className="mb-6">
          <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-black">
            <iframe
              src={lesson.embedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
              title={lesson.title}
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
              לחץ על מסך מלא לחוויה טובה יותר
            </div>
          </div>
        </div>
      )}

      {/* Instructions/Description Section */}
      {lesson.description && (
        <div className={`bg-white rounded-xl border border-slate-200 p-6 ${lesson.embedUrl ? 'mt-0' : 'mt-6'}`}>
          <h4 className={`text-base font-semibold mb-4 flex items-center gap-2 ${isLab ? "text-blue-900" : "text-slate-900"
            }`}>
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isLab ? "הוראות ביצוע" : "תיאור השיעור"}
          </h4>
          <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isLab ? "text-slate-800" : "text-slate-700"
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

      {/* Show placeholder if no content */}
      {!lesson.embedUrl && !lesson.description && (
        <div className="flex items-center justify-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="text-center">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium text-slate-600">תוכן יתווסף בקרוב</p>
          </div>
        </div>
      )}
    </div>
  );
}
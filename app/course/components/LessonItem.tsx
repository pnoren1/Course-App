"use client";

import React from "react";
import type { Lesson } from "../types";
import LessonPanel from "./LessonPanel";

type Props = {
  lesson: Lesson;
  unitId: number;
  isOpen: boolean;
  isLocked: boolean;
  duration: string;
  onToggleLesson: (next: number | null) => void;
  onSetOpenUnit: (id: number) => void;
};

export default function LessonItem({
  lesson,
  unitId,
  isOpen,
  isLocked,
  duration,
  onToggleLesson,
  onSetOpenUnit,
}: Props) {
  const handleClick = () => {
    if (isLocked) return;
    onToggleLesson(isOpen ? null : lesson.id);
    onSetOpenUnit(unitId);
  };

  const handleKeyDown: React.KeyboardEventHandler = (e) => {
    if ((e.key === "Enter" || e.key === " ") && !isLocked) {
      onToggleLesson(isOpen ? null : lesson.id);
      onSetOpenUnit(unitId);
    }
  };

  return (
    <li key={lesson.id} className={`p-6 transition-all duration-200 ${
      isOpen ? "bg-white" : "hover:bg-white/60"
    } ${lesson.is_lab ? "border-l-4 border-l-orange-300" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-4 min-w-0 cursor-pointer flex-1"
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-controls={`lesson-panel-${lesson.id}`}
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full text-xs font-semibold transition-all duration-200 border ${
              isLocked 
                ? "bg-slate-100 text-slate-400 border-slate-200" 
                : isOpen 
                  ? lesson.is_lab 
                    ? "bg-gradient-to-br from-orange-100 to-orange-50 text-orange-700 border-orange-200" 
                    : "bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 border-blue-200"
                  : lesson.is_lab
                    ? "bg-gradient-to-br from-orange-50 to-slate-50 text-orange-600 border-orange-200"
                    : "bg-gradient-to-br from-blue-50 to-slate-50 text-blue-600 border-blue-200"
            }`}
            aria-hidden
          >
            {lesson.order}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-base font-medium ${
                isLocked ? "text-slate-400" : "text-slate-900"
              }`}>
                {lesson.title}
              </h3>
              {lesson.is_lab && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 border border-orange-200 rounded-md text-xs font-semibold">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.78 0-2.678-2.153-1.415-3.414l5-5A2 2 0 009 9.586V5L8 4z" />
                  </svg>
                  LAB
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                משך: <span className="font-medium">{duration}</span>
              </span>
              {isOpen && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${
                  lesson.is_lab 
                    ? "bg-gradient-to-r from-orange-50 to-orange-25 text-orange-700 border-orange-200" 
                    : "bg-gradient-to-r from-blue-50 to-blue-25 text-blue-700 border-blue-200"
                }`}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  פתוח
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLocked ? (
            <div className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>נעול</span>
            </div>
          ) : (
            <button
              onClick={() => {
                onToggleLesson(isOpen ? null : lesson.id);
                onSetOpenUnit(unitId);
              }}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 border ${
                isOpen 
                  ? lesson.is_lab
                    ? "bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 rotate-90 border-orange-200"
                    : "bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 rotate-90 border-blue-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200"
              }`}
              aria-label={isOpen ? "סגור שיעור" : "פתח שיעור"}
              aria-expanded={isOpen}
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M6 4l8 6-8 6V4z" />
              </svg>
              <span className="sr-only">{isOpen ? "סגור" : "פתח"}</span>
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div id={`lesson-panel-${lesson.id}`}>
          <LessonPanel lesson={lesson} isOpen={isOpen} />
        </div>
      )}
    </li>
  );
}
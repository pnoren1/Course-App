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
    <li key={lesson.id} className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-150">
      <div className="flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-4 min-w-0 cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-controls={`lesson-panel-${lesson.id}`}
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
              isLocked ? "bg-gray-100 dark:bg-slate-700 text-gray-500" : isOpen ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700"
            }`}
            aria-hidden
          >
            {lesson.id}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 truncate">{lesson.title}</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              משך: <span className="font-medium">{duration}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLocked ? (
            <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-600">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6-6v4a2 2 0 002 2h8a2 2 0 002-2v-4a4 4 0 00-8 0" />
              </svg>
              <span>נעול</span>
            </span>
          ) : (
            <button
              onClick={() => {
                onToggleLesson(isOpen ? null : lesson.id);
                onSetOpenUnit(unitId);
              }}
              className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 focus:outline-none"
              aria-label={isOpen ? "סגור שיעור" : "פתח שיעור"}
              aria-expanded={isOpen}
            >
              <svg className={`w-5 h-5 transform transition-transform duration-200 ${isOpen ? "rotate-90" : "rotate-0"}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M6 4l8 6-8 6V4z" />
              </svg>
              <span className="sr-only">{isOpen ? "סגור" : "פתח"}</span>
            </button>
          )}
        </div>
      </div>

      <div id={`lesson-panel-${lesson.id}`} className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[720px] opacity-100" : "max-h-0 opacity-0"}`}>
        <LessonPanel lesson={lesson} isOpen={isOpen} />
      </div>
    </li>
  );
}
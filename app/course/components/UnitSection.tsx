"use client";

import React, { useState, useEffect } from "react";
import type { Unit } from "../types";
import { Assignment, AssignmentSubmission } from "../../../lib/types/assignment";
import { assignmentService } from "../../../lib/services/assignmentService";
import LessonItem from "./LessonItem";
import dynamic from "next/dynamic";

// Use dynamic import to avoid potential issues
const AssignmentDisplay = dynamic(() => import("./AssignmentDisplay"), {
  loading: () => (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  ),
  ssr: false
});

type Props = {
  unit: Unit;
  unitOpen: boolean;
  onToggleUnit: (next: number | string | null) => void;
  openLesson: number | null;
  setOpenLesson: (id: number | null) => void;
  setOpenUnit: (id: number | string | null) => void;
  userId?: string;
  userSubmissions?: Map<number, any>;
  onRefreshSubmissions?: () => Promise<void>;
};

export default function UnitSection({ 
  unit, 
  unitOpen, 
  onToggleUnit, 
  openLesson, 
  setOpenLesson, 
  setOpenUnit,
  userId,
  userSubmissions: propUserSubmissions,
  onRefreshSubmissions
}: Props) {
  console.log('UnitSection unit:', unit);
  console.log('UnitSection assignments:', unit.assignments);
  
  const [userSubmissions, setUserSubmissions] = useState<Map<number, AssignmentSubmission>>(propUserSubmissions || new Map());
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Update local submissions when props change
  useEffect(() => {
    if (propUserSubmissions) {
      setUserSubmissions(propUserSubmissions);
    }
  }, [propUserSubmissions]);

  const handleSubmissionComplete = async (submission: AssignmentSubmission) => {
    // Update the submissions map
    setUserSubmissions(prev => new Map(prev.set(submission.assignment_id, submission)));
    
    // Also refresh the parent component's submissions
    if (onRefreshSubmissions) {
      await onRefreshSubmissions();
    }
  };

  // Calculate total duration for the unit
  const calculateTotalDuration = (lessons: Unit['lessons']) => {
    let totalSeconds = 0;
    
    lessons.forEach(lesson => {
      if (lesson.duration && lesson.duration !== "—") {
        // Parse duration string in hh:mm:ss format
        const duration = lesson.duration.trim();
        const parts = duration.split(':');
        
        if (parts.length === 3) {
          const hours = parseInt(parts[0]) || 0;
          const minutes = parseInt(parts[1]) || 0;
          const seconds = parseInt(parts[2]) || 0;
          
          totalSeconds += (hours * 3600) + (minutes * 60) + seconds;
        }
      }
    });
    
    if (totalSeconds === 0) return "—";
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}:${minutes.toString().padStart(2, '0')} שעות` : `${hours} שעות`;
    }
    return `${minutes} דקות`;
  };

  const totalDuration = calculateTotalDuration(unit.lessons);

  return (
    <section
      key={unit.id}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      aria-labelledby={`unit-${unit.id}-title`}
    >
      <div
        className={`flex items-center justify-between p-6 cursor-pointer transition-all duration-200 border-r-4 ${
          unitOpen 
            ? "bg-gradient-to-l from-indigo-50 to-slate-50 border-r-indigo-400 border-b border-indigo-100" 
            : "hover:bg-slate-50 border-r-slate-200"
        }`}
        role="button"
        tabIndex={0}
        onClick={() => {
          const next = unitOpen ? null : unit.id;
          onToggleUnit(next);
        }}
      >
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-14 h-10 rounded-xl font-medium text-sm transition-all duration-200 ${
            unitOpen 
              ? "bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border border-indigo-200 shadow-sm" 
              : "bg-gradient-to-r from-indigo-25 to-blue-25 text-indigo-600 border border-indigo-150 hover:border-indigo-200 hover:shadow-sm"
          }`}>
            יח׳ {unit.order}
          </div>

          <div>
            <h2 id={`unit-${unit.id}-title`} className="text-lg font-semibold text-slate-900 mb-1">
              {unit.title}
            </h2>
            {unit.description && (
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl whitespace-pre-line">
                {unit.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {unit.lessons.length} שיעורים
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {totalDuration}
              </span>
              {/* Assignment indicator */}
              {unit.assignments && unit.assignments.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {unit.assignments.length} מטלות
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 border ${
            unitOpen 
              ? "bg-indigo-100 text-indigo-600 rotate-90 border-indigo-200" 
              : "bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200"
          }`}
          aria-expanded={unitOpen}
          aria-controls={`unit-${unit.id}-panel`}
          onClick={(e) => {
            e.stopPropagation();
            const next = unitOpen ? null : unit.id;
            onToggleUnit(next);
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M6 4l8 6-8 6V4z" />
          </svg>
          <span className="sr-only">{unitOpen ? "סגור יחידה" : "פתח יחידה"}</span>
        </button>
      </div>

      {unitOpen && (
        <div id={`unit-${unit.id}-panel`} className="bg-slate-25">
          {/* Lessons */}
          <ol className="divide-y divide-slate-200">
            {unit.lessons.map((lesson) => {
              const isLocked = lesson.locked ?? true;
              const duration = lesson.duration ?? "—";
              const isOpen = openLesson === lesson.id;

              return (
                <LessonItem
                  key={lesson.id}
                  lesson={lesson}
                  unitId={unit.id}
                  isOpen={isOpen}
                  isLocked={isLocked}
                  duration={duration}
                  onToggleLesson={(next) => setOpenLesson(next)}
                  onSetOpenUnit={(id) => setOpenUnit(id)}
                  userId={userId}
                />
              );
            })}
          </ol>

          {/* Assignments Section */}
          {((unit.assignments && unit.assignments.length > 0) || loadingAssignments) && (
            <div className="border-t border-slate-200 bg-slate-50 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  📝 מטלות היחידה
                </h3>
                <p className="text-sm text-slate-600">
                  מטלות שיש להגיש עבור יחידה זו
                </p>
              </div>

              {loadingAssignments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-slate-600">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium">טוען מטלות...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {unit.assignments && unit.assignments.map((assignment: any) => (
                    <AssignmentDisplay
                      key={assignment.id}
                      assignment={assignment}
                      userSubmission={userSubmissions.get(assignment.id)}
                      onSubmissionComplete={handleSubmissionComplete}
                      userId={userId || ''}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
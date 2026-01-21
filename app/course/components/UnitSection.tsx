"use client";

import React from "react";
import type { Unit } from "../types";
import LessonItem from "./LessonItem";

type Props = {
  unit: Unit;
  unitOpen: boolean;
  onToggleUnit: (next: number | null) => void;
  openLesson: number | null;
  setOpenLesson: (id: number | null) => void;
  setOpenUnit: (id: number | null) => void;
};

export default function UnitSection({ unit, unitOpen, onToggleUnit, openLesson, setOpenLesson, setOpenUnit }: Props) {
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
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
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
                />
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
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
  return (
    <section
      key={unit.id}
      className="rounded-lg shadow-sm overflow-hidden ring-1 ring-gray-100 dark:ring-slate-700 bg-white dark:bg-slate-800"
      aria-labelledby={`unit-${unit.id}-title`}
    >
      <div
        className="flex items-center justify-between p-5 bg-gray-50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700 cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={() => {
          const next = unitOpen ? null : unit.id;
          onToggleUnit(next);
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-100 border border-slate-200">
              <span className="sr-only">יחידה</span>
              <span className="font-semibold">יחידה {unit.id}</span>
            </span>

            <div>
              <h2 id={`unit-${unit.id}-title`} className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                {unit.title}
              </h2>
              {unit.description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{unit.description}</p>}
            </div>
          </div>
        </div>

        <button
          className={`inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 focus:outline-none ${unitOpen ? "rotate-90 transform" : ""}`}
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

      <div id={`unit-${unit.id}-panel`} className={`overflow-hidden transition-all duration-300 ease-in-out ${unitOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <ol className="divide-y divide-gray-100 dark:divide-slate-700">
          {unit.lessons.map((lesson) => {
            const isLocked = lesson.locked ?? lesson.id !== 1;
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
    </section>
  );
}
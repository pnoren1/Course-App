"use client";

import React from "react";
import type { Lesson } from "../types";

type Props = {
  lesson: Lesson;
  isOpen: boolean;
};

export default function LessonPanel({ lesson, isOpen }: Props) {
  if (!isOpen) return null;

  return (
    <div className="mt-3 p-3 sm:p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 rounded-md">
      <div className="w-full aspect-video rounded-md overflow-hidden">
        <iframe
          src={lesson.embedUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          title={lesson.title}
        />
      </div>
    </div>
  );
}
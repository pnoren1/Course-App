"use client";

import AuthGuard from "../components/AuthGuardClient";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import data from "./lessons.json";

import CourseHeader from "./components/CourseHeader";
import UnitSection from "./components/UnitSection";
import type { Lesson, Unit } from "./types";

// Build units from JSON with sensible fallbacks and stable ordering
function unitsFromData(src: any): Unit[] {
  if (src && Array.isArray(src.units) && src.units.length > 0) {
    return src.units
      .slice()
      .sort((a: Unit, b: Unit) => (a.order ?? a.id) - (b.order ?? b.id))
      .map((u: Unit) => ({
        ...u,
        lessons: (u.lessons || [])
          .slice()
          .sort((a: Lesson, b: Lesson) => (a.order ?? a.id) - (b.order ?? b.id)),
      }));
  }

  const flat = (src && Array.isArray(src.lessons) ? src.lessons : [])
    .slice()
    .sort((a: Lesson, b: Lesson) => (a.order ?? a.id) - (b.order ?? b.id));

  return [
    {
      id: 1,
      title: "יחידה 1",
      lessons: flat,
    },
  ];
}

export default function CoursePage() {
  const router = useRouter();
  const [openUnit, setOpenUnit] = useState<number | null>(null);
  const [openLesson, setOpenLesson] = useState<number | null>(null);

  const units = unitsFromData(data);

  const handleSignOut = () => {
    supabase.auth.signOut();
    router.push("/");
  };

  return (
    <AuthGuard>
      <main className="max-w-5xl mx-auto px-4 py-12">
        <CourseHeader onSignOut={handleSignOut} />

        <div className="space-y-8">
          {units.map((unit) => {
            const unitOpen = openUnit === unit.id;
            return (
              <UnitSection
                key={unit.id}
                unit={unit}
                unitOpen={unitOpen}
                onToggleUnit={(next) => {
                  setOpenUnit(next);
                  if (!next) {
                    setOpenLesson((ol) => (unit.lessons.some((l) => l.id === ol) ? null : ol));
                  }
                }}
                openLesson={openLesson}
                setOpenLesson={(next) => setOpenLesson(next)}
                setOpenUnit={(id) => setOpenUnit(id)}
              />
            );
          })}
        </div>
      </main>
    </AuthGuard>
  );
}

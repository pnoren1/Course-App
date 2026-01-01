"use client";

import AuthGuard from "../components/AuthGuardClient";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
// import data from "./lessons.json";

import CourseHeader from "./components/CourseHeader";
import UnitSection from "./components/UnitSection";
import type { Lesson, Unit } from "./types";


export default function CoursePage() {
  const router = useRouter();
  const [openUnit, setOpenUnit] = useState<number | null>(null);
  const [openLesson, setOpenLesson] = useState<number | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const { data, error } = await supabase
          .from('units')
          .select(`
            id,
            title,
            order,
            description,
            lessons (
              id,
              title,
              order,
              duration,
              locked,
              embedUrl,
              notes,
              description,
              is_lab
            )
          `)
          .order('order', { ascending: true })
          .order('order', { foreignTable: 'lessons', ascending: true });

        if (error) throw error;

        setUnits(data ?? []);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, []);
  

  const handleSignOut = () => {
    supabase.auth.signOut();
    router.push("/");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <CourseHeader onSignOut={handleSignOut} />

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3 text-slate-600">
                <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium">טוען קורס...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-8 rounded-xl bg-red-50 border border-red-100 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800 mb-1">שגיאה בטעינת הקורס</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
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
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

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
              embedUrl
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
